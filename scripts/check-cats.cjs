// CJS
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const goldenPath = process.env.GOLDEN_APEX_PATH || 'tests/golden/apex.jsonl';
  const raw = fs.readFileSync(goldenPath,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

  const { data: faqs } = await supa.from('faqs').select('id,slug,category').eq('firm_id','854bf730-8420-4297-86f8-3c4a972edcf2');
  const byId = new Map((faqs||[]).map(f=>[f.id,f]));
  const gate = require('../services/common/intent-gate.cjs');

  const mismatches = [];
  for (const g of raw) {
    const exp = byId.get(g.expected_faq_id);
    if (!exp) continue;
    const cats = gate.detectCategories ? gate.detectCategories('apex', g.q) : [];
    const ok = cats.length===0 || cats.includes(exp.category);
    if (!ok) mismatches.push({ q:g.q, gateCats:cats, expectedCategory:exp.category, slug:exp.slug });
  }
  const byCat = {};
  mismatches.forEach(m => { 
    byCat[m.expectedCategory] = (byCat[m.expectedCategory] || 0) + 1; 
  });
  console.log(JSON.stringify({ n: raw.length, mismatches: mismatches.length, by_expected_category: byCat, sample: mismatches.slice(0,10) }, null, 2));
})().catch(e=>{ console.error(e); process.exit(1); });