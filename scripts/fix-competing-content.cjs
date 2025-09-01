// Fix competing FAQ 4d45a7ec - remove "mínimo" from content and focus on frequency
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const competitorId = '4d45a7ec-0812-48cf-b9f0-117f42158615';
  
  // Get current content
  const { data: faq } = await supabase
    .from('faqs')
    .select('answer_md')
    .eq('id', competitorId)
    .single();
  
  console.log('Current answer:', faq.answer_md);
  
  // Update content to focus ONLY on frequency and remove mínimo references
  const newAnswer = `**Frecuencia y condiciones de retiro:**

- **Frecuencia:** A demanda (cuando quieras)
- **Requisito:** 8 días de trading activo

**Profit split:**
- 100% para ti en los primeros $25,000 de ganancias
- 90% trader y 10% APEX después

**Nota:** Para información sobre montos mínimos específicos por tamaño de cuenta, consulta límites de retiro.`;

  const { error } = await supabase
    .from('faqs')
    .update({ answer_md: newAnswer })
    .eq('id', competitorId);

  if (error) throw error;

  console.log(JSON.stringify({ 
    ok: true, 
    faq_id: competitorId, 
    change: "Removed 'Monto mínimo' from content and focused on frequency only"
  }, null, 2));
})().catch(e => { 
  console.error(JSON.stringify({ ok:false, error:String(e.message||e) })); 
  process.exit(1); 
});