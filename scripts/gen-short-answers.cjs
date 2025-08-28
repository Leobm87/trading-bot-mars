#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const FIRM='854bf730-8420-4297-86f8-3c4a972edcf2';
const APPLY = process.argv.includes('--apply');
const MAXLEN = 600; // límite conservador

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function prompt(q, md){
  return `Eres un asistente que reescribe respuestas en español de forma breve y exacta.
Debes extraer SOLO la información del texto dado (sin inventar nada).
Formatea la salida en 3–5 bullets en Markdown. Máx ${MAXLEN} caracteres.
Mantén números, límites, nombres, y condiciones. Nada de opiniones.

PREGUNTA:
${q}

TEXTO FUENTE (Markdown):
${md}

SALIDA (Markdown, 3–5 bullets, sin intro):`;
}

(async ()=>{
  const { data: faqs } = await supa
    .from('faqs')
    .select('id,question,answer_md,answer_short_md')
    .eq('firm_id', FIRM);
    
  console.log('DEBUG: Found FAQs:', faqs?.length || 0);
  
  const out = [];
  for (const f of (faqs||[])) {
    if (!f.answer_md) {
      console.log('DEBUG: Skipping FAQ without answer_md:', f.id);
      continue;
    }

    // si ya existe short y no forzamos, saltamos
    if (f.answer_short_md && !process.argv.includes('--force')) {
      out.push({ id:f.id, skipped:true }); continue;
    }

    const p = prompt(f.question, f.answer_md);
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'text' },
      messages: [{ role: 'user', content: p }]
    });

    let short = (resp.choices?.[0]?.message?.content || '').trim();

    // Validaciones mínimas
    if (!/^[-*]/m.test(short)) {
      short = '- ' + short.replace(/\n+/g,' ').slice(0, MAXLEN);
    }
    if (short.length > MAXLEN) short = short.slice(0, MAXLEN) + '…';

    out.push({ id:f.id, len: short.length });

    if (APPLY) {
      const { error } = await supa.from('faqs')
        .update({ answer_short_md: short })
        .eq('id', f.id);
      if (error) throw error;
    }
  }

  // snapshot
  fs.mkdirSync('out/short', { recursive:true });
  fs.writeFileSync('out/short/apex.json', JSON.stringify(out,null,2));
  console.log(JSON.stringify({
    ok:true, firm:'apex', total: out.length,
    applied: APPLY ? out.filter(x=>!x.skipped).length : 0,
    skipped: out.filter(x=>x.skipped).length
  }, null, 2));
})().catch(e=>{ console.error(e); process.exit(1); });