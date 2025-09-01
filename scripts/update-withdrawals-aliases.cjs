// scripts/update-withdrawals-aliases.cjs - Update específico para 385d0f21
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const targetId = '385d0f21-fee7-4acb-9f69-a70051e3ad38';
  
  const newAliases = [
    "mínimo para retirar", "mínimo de retiro", "primer retiro", "primer payout", "primer cobro",
    "cash out mínimo", "monto mínimo retirar", "cuánto cobrar primer payout", 
    "cuando puedo retirar primera vez", "importe mínimo retiro", "mínimo para cobrar",
    "primer pago mínimo", "primer pago en apex", "cuánto es el mínimo para retirar",
    "cuánto puedo cobrar la primera vez", "retiro inicial mínimo", "cuanto cobrar primer payout",
    "monto minimo primer retiro", "minimo retiro apex", "primer cobro cuanto", "monto minimo retirar"
  ];

  // Get current FAQ
  let { data: faq, error } = await supabase
    .from('faqs')
    .select('aliases')
    .eq('id', targetId)
    .single();
  if (error) throw error;

  // Merge with existing aliases
  const existingAliases = Array.isArray(faq.aliases) ? faq.aliases : [];
  const mergedAliases = Array.from(new Set([...existingAliases, ...newAliases]));

  // Update only aliases
  const { error: updateError } = await supabase
    .from('faqs')
    .update({ aliases: mergedAliases })
    .eq('id', targetId);

  if (updateError) throw updateError;

  console.log(JSON.stringify({ 
    ok: true, 
    faq_id: targetId, 
    aliases_count: mergedAliases.length,
    new_aliases_added: newAliases.length
  }, null, 2));
})().catch(e => { 
  console.error(JSON.stringify({ ok:false, error:String(e.message||e) })); 
  process.exit(1); 
});