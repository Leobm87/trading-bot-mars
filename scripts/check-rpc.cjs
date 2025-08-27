require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  try {
    const { data, error } = await supabase.rpc('faq_retrieve_es', { q: 'umbral minimo', cats: null, k: 3 });
    if (error) throw error;
    console.log(JSON.stringify({ ok: true, rows: (data||[]).length }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }, null, 2));
    process.exit(1);
  }
})();