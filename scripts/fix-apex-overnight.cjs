const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixOvernightFAQ() {
  console.log('🔧 Corrigiendo FAQ de overnight en APEX...\n');

  const correctAnswer = `### ❌ Posiciones Overnight en APEX

**NO PERMITIDO**
- Todas las posiciones DEBEN cerrarse antes del cierre de sesión (5:00 PM ET)
- No se permite swing trading ni mantener posiciones overnight
- Violación puede resultar en eliminación de cuenta

**Horario de trading:**
- 6:00 PM ET a 4:59 PM ET
- Cierre obligatorio antes de 5:00 PM ET`;

  const { data, error } = await supabase
    .from('faqs')
    .update({ answer_short_md: correctAnswer })
    .eq('id', 'af40dafa-27ed-4674-bccc-431c5766a5bf')
    .select();

  if (error) {
    console.error('Error actualizando FAQ overnight:', error.message);
  } else {
    console.log('✅ FAQ de overnight corregida');
    console.log('   Antes: Permitido pero no recomendado');
    console.log('   Ahora: NO PERMITIDO - debe cerrar antes de 5PM ET\n');
  }

  // Buscar otras FAQs que puedan tener info incorrecta sobre overnight
  const { data: otherFaqs, error: searchError } = await supabase
    .from('faqs')
    .select('id, question, answer_short_md')
    .eq('firm_id', '854bf730-8420-4297-86f8-3c4a972edcf2')
    .ilike('answer_short_md', '%overnight%');

  if (!searchError && otherFaqs) {
    console.log(`📋 Encontradas ${otherFaqs.length} FAQs que mencionan overnight:\n`);
    
    for (const faq of otherFaqs) {
      console.log(`ID: ${faq.id}`);
      console.log(`Pregunta: ${faq.question}`);
      console.log(`Respuesta actual: ${faq.answer_short_md?.substring(0, 150)}...`);
      console.log('---');
      
      // Si la respuesta dice que está permitido, necesitamos corregirla
      if (faq.answer_short_md && 
          (faq.answer_short_md.includes('permitido') || 
           faq.answer_short_md.includes('no recomendado'))) {
        console.log('⚠️  Esta FAQ podría necesitar corrección\n');
      }
    }
  }
}

fixOvernightFAQ().catch(console.error);