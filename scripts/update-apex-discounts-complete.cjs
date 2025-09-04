const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateDiscountsComplete() {
  const updatedAnswerMd = `### 🎁 Descuentos y Promociones APEX

**¿Dónde encontrar descuentos activos?**
En el **grupo de descuentos** de nuestra comunidad de Telegram podrás encontrar los descuentos activos a día de hoy.

**¿Cómo funciona?**
- ✅ Tenemos un grupo dedicado donde cada día se actualizan los descuentos vigentes
- 📅 Actualización diaria con códigos verificados
- 🔒 Solo códigos oficiales de APEX
- 💰 Descuentos reales y funcionando

**Importante:**
- Solo usa códigos verificados en el grupo
- Los descuentos cambian frecuentemente
- APEX anuncia promociones en sus canales oficiales (web, email, redes)`;

  const updatedAnswerShortMd = `### 🎁 Descuentos APEX

**¿Dónde encontrar descuentos activos?**
En el grupo de descuentos de nuestra comunidad de Telegram podrás encontrar los descuentos activos a día de hoy.

✅ Tenemos un grupo dedicado donde cada día se actualizan los descuentos vigentes.

💡 **Nota:** Solo usa códigos oficiales verificados en el grupo.`;

  console.log('Actualizando FAQ de descuentos (completa)...\n');

  const { data, error } = await supabase
    .from('faqs')
    .update({ 
      answer_md: updatedAnswerMd,
      answer_short_md: updatedAnswerShortMd 
    })
    .eq('id', 'a5c42153-0610-4192-b149-26bd9914e700')
    .select();

  if (error) {
    console.error('Error actualizando FAQ:', error.message);
  } else {
    console.log('✅ FAQ de descuentos actualizada completamente');
    console.log('   - answer_md actualizado');
    console.log('   - answer_short_md actualizado');
    console.log('   - Referencia al grupo de Telegram añadida\n');
  }
}

updateDiscountsComplete().catch(console.error);