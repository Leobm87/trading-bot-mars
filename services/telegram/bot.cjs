require('dotenv').config();
const { Telegraf } = require('telegraf');
const { performance } = require('perf_hooks');
const { createClient } = require('@supabase/supabase-js');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('Missing TELEGRAM_BOT_TOKEN'); process.exit(1); }

const ALLOWED = new Set(String(process.env.TG_ALLOWED_CHATS||'').split(',').map(s=>s.trim()).filter(Boolean));
const MODE = (process.env.TG_MODE||'live').toLowerCase();   // shadow|live
const RATE_RPM = Number(process.env.TG_RATE_RPM || 6);
const FIRM = (process.env.BOT_FIRM||'apex').toLowerCase();
const FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// health server integrado
const express = require('express');
const app = express();

// Middleware para parsear JSON (necesario para webhooks de Telegram)
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString(), bot: 'telegram-apex' }));

// Endpoint de test para verificar que el servidor funciona
app.get('/test', (_req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ 
    message: 'Bot server is working!',
    timestamp: new Date().toISOString(),
    webhookPath: '/webhook'
  });
});

// Test webhook manual
app.post('/test-webhook', (req, res) => {
  console.log('🧪 Test webhook called with body:', JSON.stringify(req.body, null, 2));
  res.json({ received: true, body: req.body });
});
const healthPort = process.env.PORT || 3000;
app.listen(healthPort, () => console.log('health on', healthPort));

// rate limit por chat
const bucket = new Map();
function withinRate(chatId) {
  const now = Date.now();
  const rec = bucket.get(chatId) || { count: 0, ts: now };
  if (now - rec.ts > 60_000) { rec.count = 0; rec.ts = now; }
  rec.count++;
  bucket.set(chatId, rec);
  return rec.count <= RATE_RPM;
}

// sanitizado defensivo (preserva texto simple/bullets)
function sanitize(s) {
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // unaccent
    .replace(/\u200B/g,'')                           // zero-width
    .replace(/[`*_~]/g,'')                           // markdown conflictivo
    .replace(/\s+/g,' ')
    .trim()
    .slice(0, 500);
}

// render directo desde DB (short si existe)
async function renderById(id){
  const { data, error } = await supa
    .from('faqs')
    .select('id, answer_short_md, answer_md')
    .eq('id', id).single();
  if (error || !data) return { faq_id: null, md: 'No encontrado.' };
  const md = data.answer_short_md || data.answer_md || 'No encontrado.';
  return { faq_id: data.id, md };
}

// pipeline firma (usa lógica RAG-STRICT directa)
async function processQueryFirm(query) {
  if (FIRM !== 'apex') throw new Error('Unsupported firm');
  
  const { resolvePin } = require('../common/pinner.cjs');
  const { gateIntent } = require('../common/intent-gate.cjs');
  const { retrieveTopK, confidentTop1 } = require('../common/retriever.cjs');
  const { llmSelectFAQ } = require('../common/llm-selector.cjs');
  const { formatFromFAQ, notFound } = require('../common/format.cjs');
  const { embedText } = require('../common/embeddings.cjs');

  const firmId = FIRM_ID;
  
  // 0) Pinner determinista
  const pinId = resolvePin('apex', query);
  if (pinId) {
    const res = await formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
    return { faq_id: res.faq_id || null, md: res.text };
  }

  const cats = gateIntent(query);
  if (!supa) return { faq_id: null, md: 'No encontrado.' };

  const cands = await retrieveTopK(supa, query, cats, firmId, embedText);
  if (!cands || cands.length === 0) {
    const res = notFound();
    return { faq_id: null, md: res.text };
  }

  // Early-accept check for confident top1 based on lexical score
  const accepted = confidentTop1(Array.isArray(cands) ? cands : []);
  if (accepted) {
    const res = await formatFromFAQ(accepted);
    return { faq_id: res.faq_id || null, md: res.text };
  }

  const pick = await llmSelectFAQ(query, cands);
  if (pick && pick.type === 'FAQ_ID') {
    const hit = cands.find(c => c.id === pick.id);
    if (hit) {
      const res = await formatFromFAQ(hit);
      return { faq_id: res.faq_id || null, md: res.text };
    }
  }
  
  const res = notFound();
  return { faq_id: null, md: res.text };
}

const bot = new Telegraf(TOKEN);

bot.start(async (ctx) => {
  const chatId = String(ctx.chat?.id);
  if (ALLOWED.size && !ALLOWED.has(chatId)) { 
    if (MODE==='shadow') return; // En shadow mode, ignora chats no permitidos
    // En live mode, responde a todos
  }
  await ctx.reply('MARS listo. Pregunta sobre APEX (respuestas breves).');
});

bot.on('text', async (ctx) => {
  console.log('📨 Received text message:', ctx.message?.text);
  
  const chatId = String(ctx.chat?.id);
  console.log('👤 Chat ID:', chatId);
  
  if (ALLOWED.size && !ALLOWED.has(chatId)) { 
    console.log('🚫 Chat not in whitelist, mode:', MODE);
    if (MODE==='shadow') return; // En shadow mode, ignora chats no permitidos
    // En live mode, responde a todos
  }
  
  if (!withinRate(chatId)) {
    console.log('⏳ Rate limit exceeded for chat:', chatId);
    return ctx.reply('⏳ Límite temporal. Inténtalo en unos segundos.');
  }

  const qRaw = ctx.message?.text || '';
  const q = sanitize(qRaw);
  console.log('🧹 Sanitized query:', q);
  
  if (!q) {
    console.log('❌ Empty query after sanitization');
    return ctx.reply('Escribe una pregunta.');
  }

  console.log('🔍 Processing query:', q);
  const t0 = performance.now();
  try {
    const res = await processQueryFirm(q);
    const ms = Math.round(performance.now() - t0);
    console.log('✅ Query processed in', ms, 'ms, faq_id:', res.faq_id);
    
    const payload = String(res.md || 'No encontrado.').slice(0, 3800); // límite TG
    await ctx.replyWithMarkdown(payload);

    // telemetría a stdout (Railway recoge)
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      firm: FIRM,
      chat: chatId,
      ms,
      faq_id: res.faq_id || null,
      q
    }));
  } catch (e) {
    console.error('❌ ERR processing query:', e);
    await ctx.reply('Lo siento, hubo un error. Intenta de nuevo.');
  }
});

// Usar webhook en lugar de polling para evitar conflictos en Railway
const PORT = process.env.PORT || 3000;

// Debug: añadir middleware para ver requests
app.use((req, res, next) => {
  console.log('🌐 HTTP Request:', req.method, req.url, 'from', req.ip);
  if (req.url.includes('/webhook')) {
    console.log('🎣 Webhook request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
  // En producción usar webhook integrado con health server
  const webhookPath = `/webhook`;
  
  // Configurar webhook con Telegram primero
  const webhookUrl = `https://trading-bot-mars-production.up.railway.app${webhookPath}`;
  
  bot.telegram.setWebhook(webhookUrl)
    .then((result) => {
      console.log('✅ Webhook configured successfully:', result);
      console.log('🎣 Webhook URL:', webhookUrl);
      
      // Verificar webhook info
      return bot.telegram.getWebhookInfo();
    })
    .then((webhookInfo) => {
      console.log('📋 Webhook info:', JSON.stringify(webhookInfo, null, 2));
      
      // Luego configurar el callback
      app.use(webhookPath, bot.webhookCallback(webhookPath));
      console.log('🤖 Telegram bot up (APEX) - webhook mode');
    })
    .catch(err => {
      console.error('❌ Webhook setup failed:', err);
      // Fallback a polling si webhook falla
      bot.launch().then(() => console.log('🤖 Telegram bot up (APEX) - polling fallback mode'));
    });
} else {
  // Localmente usar polling
  bot.launch().then(() => console.log('🤖 Telegram bot up (APEX) - polling mode'));
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));