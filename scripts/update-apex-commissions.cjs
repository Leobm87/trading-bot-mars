const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateCommissionsWithLinks() {
  const newAnswerShortMd = `### 💵 Comisiones de Trading en APEX

**Lista completa de comisiones:**
- **Rithmic:** https://support.apextraderfunding.com/hc/en-us/articles/4404825514139-Commissions-for-Rithmic
- **Tradovate:** https://support.apextraderfunding.com/hc/en-us/articles/24511326984091-Commissions-for-Tradovate

**Ejemplos principales:**
- ES (E-mini S&P 500): ~$3-4 por contrato
- MES (Micro E-mini S&P): ~$1 por contrato
- NQ (E-mini NASDAQ): ~$3-4 por contrato
- MNQ (Micro NASDAQ): ~$1 por contrato

💡 **Nota:** Tradovate es generalmente 15-25% más barato que Rithmic`;

  console.log('Actualizando FAQ de comisiones con links...\n');

  const { data, error } = await supabase
    .from('faqs')
    .update({ answer_short_md: newAnswerShortMd })
    .eq('id', '4d503259-dd0e-4807-b8bf-89c18a39253d')
    .select();

  if (error) {
    console.error('Error actualizando FAQ de comisiones:', error.message);
  } else {
    console.log('✅ FAQ de comisiones actualizada con links');
    console.log('   - Link Rithmic añadido');
    console.log('   - Link Tradovate añadido\n');
  }
}

updateCommissionsWithLinks().catch(console.error);