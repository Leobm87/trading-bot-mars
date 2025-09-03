async function formatFromFAQ(faq, opts = {}) {
  const style = (process.env.RESPONSE_STYLE || 'short').toLowerCase();
  let answer_short_md = faq.answer_short_md;
  
  // TEMPORAL: Si no tenemos answer_short_md, buscarlo en la BD
  if (!answer_short_md && style === 'short' && !opts.forceFull) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data } = await supa
        .from('faqs')
        .select('answer_short_md')
        .eq('id', faq.id)
        .single();
      answer_short_md = data?.answer_short_md;
    } catch (e) {
      // Ignorar error, usar respuesta larga
    }
  }
  
  const useShort = style === 'short' && answer_short_md && !opts.forceFull;
  const text = useShort ? answer_short_md : faq.answer_md;
  return { ok: true, source: "db", faq_id: faq.id, response: text, text };
}

function notFound() {
  const msg = "No encuentro esa info exacta en la base. Reformula o especifica la firma/tamaño.";
  return { ok: false, source: "none", response: msg, text: msg };
}

module.exports = { formatFromFAQ, notFound };