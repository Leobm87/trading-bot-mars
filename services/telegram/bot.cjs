// services/telegram/bot.cjs
require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL; // p.ej. https://trading-bot-mars-production.up.railway.app
const PORT = Number(process.env.PORT || 3000);
const USE_WEBHOOK = String(process.env.TG_USE_WEBHOOK || 'true') === 'true';

// Guardarraíles básicos (whitelist, rate, sanitize)
const ALLOWED = new Set(String(process.env.TG_ALLOWED_CHATS||'').split(',').map(s=>s.trim()).filter(Boolean));
const RATE_RPM = Number(process.env.TG_RATE_RPM || 6);
const bucket = new Map();
function withinRate(chatId){
  const now = Date.now();
  const rec = bucket.get(chatId) || { count:0, ts:now };
  if (now - rec.ts > 60_000) { rec.count=0; rec.ts=now; }
  rec.count++; bucket.set(chatId, rec);
  return rec.count <= RATE_RPM;
}
function sanitize(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u200B/g,'').replace(/[`*_~]/g,'').replace(/\s+/g,' ').trim().slice(0,500);
}

// Tu pipeline existente
async function processQueryFirm(q){
  const svc = require('../firms/apex/index.js');
  const out = await svc.processQuery(q);
  const { createClient } = require('@supabase/supabase-js');
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  async function renderById(id){
    const { data } = await supa.from('faqs').select('id,answer_short_md,answer_md').eq('id', id).single();
    if (!data) return { faq_id:null, md:'No encontrado.' };
    return { faq_id:data.id, md: data.answer_short_md || data.answer_md || 'No encontrado.' };
  }
  if (Array.isArray(out) && out[0]?.id) return renderById(out[0].id);
  if (out?.faq_id && !out?.md) return renderById(out.faq_id);
  if (out?.response?.faq_id && !out?.response?.md) return renderById(out.response.faq_id);
  if (out?.response?.md) return { faq_id: out.response.faq_id || null, md: out.response.md };
  if (out?.md) return { faq_id: out.faq_id || null, md: out.md };
  return { faq_id:null, md:'No encontrado.' };
}

if (!TOKEN) { console.error('Missing TELEGRAM_BOT_TOKEN'); process.exit(1); }

const bot = new Telegraf(TOKEN);
const app = express();
app.use(express.json());

// HANDLERS
bot.start(async (ctx)=>{
  const id = String(ctx.chat?.id);
  if (ALLOWED.size && !ALLOWED.has(id)) return;
  ctx.reply('MARS listo (APEX). Envíame tu pregunta.').catch(()=>{});
});
bot.on('text', async (ctx)=>{
  const id = String(ctx.chat?.id);
  if (ALLOWED.size && !ALLOWED.has(id)) return;
  if (!withinRate(id)) return ctx.reply('⏳ Límite temporal. Intenta en unos segundos.').catch(()=>{});
  const q = sanitize(ctx.message?.text || '');
  if (!q) return ctx.reply('Escribe una pregunta.').catch(()=>{});
  try {
    const res = await processQueryFirm(q);
    ctx.replyWithMarkdown(String(res.md).slice(0,3800)).catch(()=>{});
    console.log(JSON.stringify({ ts:new Date().toISOString(), chat:id, ok:true, faq_id:res.faq_id||null, q }));
  } catch (e) {
    console.error('ERR', e);
    ctx.reply('Lo siento, hubo un error. Intenta de nuevo.').catch(()=>{});
  }
});

// === WEBHOOK/POLLING INIT (ÚNICA APP + ÚNICO LISTEN) ===
(async ()=>{
  if (USE_WEBHOOK) {
    if (!PUBLIC_URL) { console.error('Set PUBLIC_URL'); process.exit(1); }
    const path = '/webhook';

    // Parser + ACK inmediato
    app.use(express.json({ limit: '1mb' }));
    app.post(path, (req, res) => {
      // 1) ACK inmediato para evitar 502
      res.status(200).end();
      // 2) Log de recepción
      console.log('🎯 POST /webhook', { hasBody: !!req.body, ts: new Date().toISOString() });
      // 3) Procesado asíncrono del update
      bot.handleUpdate(req.body).catch(err => {
        console.error('handleUpdate error', err);
      });
    });

    // Limpieza + registro del webhook
    await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(()=>{});
    await bot.telegram.setWebhook(`${PUBLIC_URL}${path}`, {
      allowed_updates: ['message','edited_message']
    });
    console.log('Webhook set to', `${PUBLIC_URL}${path}`);
  } else {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(()=>{});
    await bot.launch();
    console.log('Bot launched with long polling');
  }

  // Health y único listen
  app.get('/health', (_req, res)=>res.json({ ok:true, ts:new Date().toISOString() }));
  app.listen(PORT, ()=> console.log('HTTP listening on', PORT));
})();