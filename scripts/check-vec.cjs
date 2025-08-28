require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { embedText } = require('../services/common/embeddings.cjs');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2';
  const emb = await embedText("umbral minimo apex");
  const { data, error } = await supabase.rpc('faq_vec_retrieve', {
    q: emb, firm: firmId, cats: null, k: 3
  });
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify({ ok: true, top: data?.map(x => ({ id:x.id, slug:x.slug, vscore:x.vscore })) }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });