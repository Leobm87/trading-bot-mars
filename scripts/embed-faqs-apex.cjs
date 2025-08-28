require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { embedText } = require('../services/common/embeddings.cjs');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const FIRM = '854bf730-8420-4297-86f8-3c4a972edcf2';
  const { data: faqs, error } = await supabase.from('faqs')
    .select('id,question,answer_md')
    .eq('firm_id', FIRM);
  if (error) throw error;

  let updated = 0;
  for (const f of faqs) {
    const txt = `${f.question}\n${String(f.answer_md||'').slice(0,600)}`;
    const emb = await embedText(txt);
    const { error: uerr } = await supabase.from('faqs').update({ embedding: emb }).eq('id', f.id);
    if (uerr) throw uerr;
    updated++;
  }
  console.log(JSON.stringify({ ok: true, updated }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });