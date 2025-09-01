// Fix competing FAQ 4d45a7ec - remove ambiguous "minimo" terms
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const competitorId = '4d45a7ec-0812-48cf-b9f0-117f42158615';
  
  // Update question to remove ambiguous "mínimo" term
  const newQuestion = '¿Cada cuánto puedo retirar en APEX? (frecuencia de pagos, no safety net)';
  
  const { error } = await supabase
    .from('faqs')
    .update({ question: newQuestion })
    .eq('id', competitorId);

  if (error) throw error;

  console.log(JSON.stringify({ 
    ok: true, 
    faq_id: competitorId, 
    old_question: "¿Cada cuánto puedo retirar y cuál es el mínimo en APEX? (cada cuánto pagan, no safety net)",
    new_question: newQuestion,
    reason: "Removed ambiguous 'mínimo' to avoid conflicts with limites-retiro FAQ"
  }, null, 2));
})().catch(e => { 
  console.error(JSON.stringify({ ok:false, error:String(e.message||e) })); 
  process.exit(1); 
});