require('dotenv').config();
const fs = require('fs'); 
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function strongTokens(s) {
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/).filter(t => t.length>=4 && !['apex','cuenta','trader','reglas','pregunta','respuesta'].includes(t));
}

function phraseAlias(q) {
  const txt = String(q||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\p{L}\p{N}\s%-]/gu,' ')
    .replace(/\s+/g,' ').trim();
  const words = txt.split(' ');
  // exigimos al menos 2 palabras y longitud total ≥ 10 chars para evitar ruido
  if (words.length < 2 || txt.length < 10) return null;
  return txt;
}

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const rpt = JSON.parse(fs.readFileSync('logs/analysis/PRD-005a-apex-report.json','utf8'));
  const misses = rpt.misses || [];
  if (!misses.length) { console.log(JSON.stringify({ ok:true, preview: [] }, null, 2)); return; }

  // Cargamos mapping id->faq
  let faqs, error;
  try {
    const result = await supabase.from('faqs').select('id,slug,aliases').eq('firm_id','854bf730-8420-4297-86f8-3c4a972edcf2');
    faqs = result.data;
    error = result.error;
  } catch (e) {
    // Si la columna aliases no existe, cargamos sin ella
    if (e.message && e.message.includes('aliases')) {
      console.log('Column aliases does not exist, using fallback mode...');
      const fallbackResult = await supabase.from('faqs').select('id,slug').eq('firm_id','854bf730-8420-4297-86f8-3c4a972edcf2');
      faqs = fallbackResult.data.map(f => ({...f, aliases: []}));
      error = fallbackResult.error;
    } else {
      throw e;
    }
  }
  if (!faqs && error && error.message && error.message.includes('aliases')) {
    console.log('Column aliases does not exist, using fallback mode...');
    const fallbackResult = await supabase.from('faqs').select('id,slug').eq('firm_id','854bf730-8420-4297-86f8-3c4a972edcf2');
    faqs = fallbackResult.data.map(f => ({...f, aliases: []}));
    error = fallbackResult.error;
  }
  if (error) throw error;
  const byId = new Map(faqs.map(f => [f.id, f]));
  const bySlug = new Map(faqs.map(f => [f.slug, f]));

  // Proponemos alias por expected slug
  const proposals = new Map(); // slug -> Set(tokens)
  for (const m of misses) {
    const exp = byId.get(m.expected);
    if (!exp) continue;
    const toks = strongTokens(m.q);
    const set = proposals.get(exp.slug) || new Set();
    toks.forEach(t => set.add(t));
    const pa = phraseAlias(m.q);
    if (pa) set.add(pa);
    proposals.set(exp.slug, set);
  }

  const preview = [];
  for (const [slug, set] of proposals.entries()) {
    const cur = bySlug.get(slug);
    const add = [...set].filter(t => !(cur.aliases||[]).includes(t));
    if (add.length) preview.push({ slug, add, count: add.length });
  }

  const apply = process.argv.includes('--apply');
  if (!apply) { console.log(JSON.stringify({ ok:true, preview }, null, 2)); return; }

  let updated=0;
  for (const { slug, add } of preview) {
    const row = bySlug.get(slug);
    const next = Array.from(new Set([...(row.aliases||[]), ...add]));
    try {
      const { error: upErr } = await supabase.from('faqs').update({ aliases: next }).eq('id', row.id);
      if (upErr) {
        if (upErr.message && upErr.message.includes('aliases')) {
          console.log(`Column aliases doesn't exist yet. Skipping update for ${slug}. Please run the migration manually in Supabase SQL editor first.`);
          continue;
        }
        throw upErr;
      }
      updated++;
    } catch (e) {
      if (e.message && e.message.includes('aliases')) {
        console.log(`Column aliases doesn't exist yet. Skipping update for ${slug}. Please run the migration manually in Supabase SQL editor first.`);
        continue;
      }
      throw e;
    }
  }
  console.log(JSON.stringify({ ok:true, updated }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });