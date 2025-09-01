// scripts/seed-aliases-apex-hotfix.cjs - Solo aliases, sin category
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','aliases-apex.json'),'utf8'));
  const firmId = cfg.meta.firm_id;

  // 1) pull faqs for APEX
  let { data: faqs, error } = await supabase
    .from('faqs')
    .select('id, slug, question, answer_md, aliases, firm_id')
    .eq('firm_id', firmId);
  if (error) throw error;

  const bySlug = cfg.by_slug || {};
  const updates = [];

  for (const f of faqs) {
    let ali = Array.isArray(f.aliases) ? [...f.aliases] : [];

    if (f.slug && bySlug[f.slug]) {
      const rule = bySlug[f.slug];
      ali = Array.from(new Set([...(ali||[]), ...(rule.aliases||[])]));
    }

    // normalize: lowercase, dedupe, trim
    ali = Array.from(new Set((ali||[]).map(s => String(s||'').toLowerCase().trim()).filter(Boolean)));

    // skip if no change
    const changed = (JSON.stringify(ali) !== JSON.stringify(f.aliases||[]));
    if (changed) {
      updates.push({ 
        id: f.id, 
        aliases: ali, 
        firm_id: f.firm_id, 
        slug: f.slug,
        question: f.question,
        answer_md: f.answer_md
      });
    }
  }

  // 2) batch updates (chunked)
  const chunk = 100;
  for (let i=0;i<updates.length;i+=chunk) {
    const part = updates.slice(i,i+chunk);
    const { error: upErr } = await supabase.from('faqs').upsert(part, { onConflict: 'id' });
    if (upErr) throw upErr;
  }

  console.log(JSON.stringify({ ok: true, updated: updates.length }, null, 2));
})().catch(e => { console.error(JSON.stringify({ ok:false, error:String(e.message||e) })); process.exit(1); });