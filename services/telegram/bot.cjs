require('dotenv').config();
const { Telegraf } = require('telegraf');
const { performance } = require('perf_hooks');
const { createClient } = require('@supabase/supabase-js');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('Missing TELEGRAM_BOT_TOKEN'); process.exit(1); }

const ALLOWED = new Set(String(process.env.TG_ALLOWED_CHATS||'').split(',').map(s=>s.trim()).filter(Boolean));
const MODE = (process.env.TG_MODE||'shadow').toLowerCase();   // shadow|live
const RATE_RPM = Number(process.env.TG_RATE_RPM || 6);
const FIRM = (process.env.BOT_FIRM||'apex').toLowerCase();
const FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// health server
require('./health.cjs');

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
  if (ALLOWED.size && !ALLOWED.has(chatId)) { if (MODE==='live') return; else return; }
  await ctx.reply('MARS listo. Pregunta sobre APEX (respuestas breves).');
});

bot.on('text', async (ctx) => {
  const chatId = String(ctx.chat?.id);
  if (ALLOWED.size && !ALLOWED.has(chatId)) { if (MODE==='live') return; else return; }
  if (!withinRate(chatId)) return ctx.reply('⏳ Límite temporal. Inténtalo en unos segundos.');

  const qRaw = ctx.message?.text || '';
  const q = sanitize(qRaw);
  if (!q) return ctx.reply('Escribe una pregunta.');

  const t0 = performance.now();
  try {
    const res = await processQueryFirm(q);
    const ms = Math.round(performance.now() - t0);
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
    console.error('ERR', e);
    await ctx.reply('Lo siento, hubo un error. Intenta de nuevo.');
  }
});

bot.launch().then(()=> console.log('Telegram bot up (APEX)'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));