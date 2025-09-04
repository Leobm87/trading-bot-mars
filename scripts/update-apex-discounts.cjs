const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateDiscountsFAQ() {
  const newAnswerShortMd = `### 🎁 Descuentos APEX

**¿Dónde encontrar descuentos activos?**
En el grupo de descuentos de nuestra comunidad de Telegram podrás encontrar los descuentos activos a día de hoy.

✅ Tenemos un grupo dedicado donde cada día se actualizan los descuentos vigentes.

💡 **Nota:** Solo usa códigos oficiales verificados en el grupo.`;

  console.log('Actualizando FAQ de descuentos...\n');

  // Primero buscar la FAQ de descuentos
  const { data: faqs, error: searchError } = await supabase
    .from('faqs')
    .select('id, question')
    .eq('firm_id', '854bf730-8420-4297-86f8-3c4a972edcf2')
    .ilike('question', '%descuento%');

  if (searchError) {
    console.error('Error buscando FAQ:', searchError);
    return;
  }

  console.log(`Encontradas ${faqs.length} FAQs sobre descuentos\n`);

  // Actualizar la FAQ específica (ID: a5c42153-0610-4192-b149-26bd9914e700)
  const { data, error } = await supabase
    .from('faqs')
    .update({ answer_short_md: newAnswerShortMd })
    .eq('id', 'a5c42153-0610-4192-b149-26bd9914e700')
    .select();

  if (error) {
    console.error('Error actualizando FAQ de descuentos:', error.message);
  } else {
    console.log('✅ FAQ de descuentos actualizada');
    console.log('   Ahora direcciona al grupo de Telegram');
    console.log('   Menciona actualización diaria de códigos\n');
  }
}

updateDiscountsFAQ().catch(console.error);