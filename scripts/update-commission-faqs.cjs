#!/usr/bin/env node
/**
 * Actualizar todas las FAQs de comisiones con enlaces oficiales
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const OFFICIAL_LINKS = `

📎 **Enlaces oficiales para comisiones actualizadas**:
- **Rithmic**: https://support.apextraderfunding.com/hc/en-us/articles/4404825514139-Commissions-for-Rithmic
- **Tradovate**: https://support.apextraderfunding.com/hc/en-us/articles/24511326984091-Commissions-for-Tradovate

⚠️ **Importante**: Las comisiones pueden cambiar. Siempre verifica los enlaces oficiales arriba para la información más actualizada.`;

async function updateCommissionFAQs() {
  console.log('🔄 Actualizando FAQs de comisiones con enlaces oficiales\n');
  console.log('=' .repeat(70));
  
  try {
    // 1. Buscar todas las FAQs relacionadas con comisiones
    const { data: faqs, error: searchError } = await supabase
      .from('faqs')
      .select('id, question, answer_md, answer_short_md')
      .eq('firm_id', APEX_FIRM_ID)
      .or('question.ilike.%comision%,question.ilike.%commission%,answer_md.ilike.%comision%,answer_md.ilike.%commission%,answer_md.ilike.%per contrato%,answer_md.ilike.%por contrato%');
    
    if (searchError) {
      console.error('❌ Error buscando FAQs:', searchError);
      return;
    }
    
    console.log(`📊 Encontradas ${faqs?.length || 0} FAQs relacionadas con comisiones\n`);
    
    if (!faqs || faqs.length === 0) {
      console.log('No se encontraron FAQs de comisiones');
      return;
    }
    
    let updated = 0;
    let failed = 0;
    
    for (const faq of faqs) {
      console.log(`\n📝 Procesando: "${faq.question.substring(0, 60)}..."`);
      
      // Verificar si ya tiene los enlaces
      if (faq.answer_md?.includes('support.apextraderfunding.com')) {
        console.log('   ℹ️  Ya tiene enlaces oficiales, verificando actualización...');
        
        // Verificar si tiene AMBOS enlaces
        if (!faq.answer_md.includes('4404825514139') || !faq.answer_md.includes('24511326984091')) {
          console.log('   ⚠️  Falta algún enlace, actualizando...');
        } else {
          console.log('   ✓ Enlaces correctos, saltando...');
          continue;
        }
      }
      
      // Actualizar answer_md agregando los enlaces si no están
      let updatedAnswerMd = faq.answer_md || '';
      
      // Remover enlaces antiguos si existen (para evitar duplicados)
      updatedAnswerMd = updatedAnswerMd
        .replace(/📎.*?Enlaces oficiales.*?más actualizada\./gs, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Agregar enlaces al final
      updatedAnswerMd += OFFICIAL_LINKS;
      
      // Actualizar answer_short_md si existe
      let updatedAnswerShortMd = faq.answer_short_md;
      if (updatedAnswerShortMd && !updatedAnswerShortMd.includes('Verifica enlaces oficiales')) {
        updatedAnswerShortMd += '\n\n📎 Verifica enlaces oficiales en support.apextraderfunding.com para comisiones actualizadas.';
      }
      
      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('faqs')
        .update({
          answer_md: updatedAnswerMd,
          answer_short_md: updatedAnswerShortMd
        })
        .eq('id', faq.id);
      
      if (updateError) {
        console.log(`   ❌ Error actualizando: ${updateError.message}`);
        failed++;
      } else {
        console.log('   ✅ Actualizada exitosamente');
        updated++;
      }
    }
    
    // También actualizar FAQs que mencionan costos/fees aunque no digan "comisión"
    console.log('\n🔍 Buscando FAQs adicionales sobre costos/fees...\n');
    
    const { data: additionalFaqs } = await supabase
      .from('faqs')
      .select('id, question, answer_md, answer_short_md')
      .eq('firm_id', APEX_FIRM_ID)
      .or('answer_md.ilike.%$3.50%,answer_md.ilike.%$0.75%,answer_md.ilike.%rithmic%,answer_md.ilike.%tradovate%')
      .not('answer_md', 'ilike', '%support.apextraderfunding.com%');
    
    if (additionalFaqs && additionalFaqs.length > 0) {
      console.log(`📊 Encontradas ${additionalFaqs.length} FAQs adicionales con información de costos\n`);
      
      for (const faq of additionalFaqs) {
        // Solo actualizar si realmente menciona comisiones/costos de trading
        const mentionsTrading = /contrato|trade|trading|comision|commission|fee|costo.*operaci/i.test(faq.answer_md);
        
        if (mentionsTrading) {
          console.log(`📝 Actualizando: "${faq.question.substring(0, 60)}..."`);
          
          let updatedAnswerMd = faq.answer_md + OFFICIAL_LINKS;
          
          const { error } = await supabase
            .from('faqs')
            .update({ answer_md: updatedAnswerMd })
            .eq('id', faq.id);
          
          if (!error) {
            console.log('   ✅ Actualizada con enlaces oficiales');
            updated++;
          } else {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
          }
        }
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('📊 RESUMEN');
    console.log('=' .repeat(70));
    console.log(`✅ FAQs actualizadas: ${updated}`);
    console.log(`❌ Errores: ${failed}`);
    console.log('\n💡 Todas las FAQs de comisiones ahora incluyen enlaces oficiales de APEX');
    
    return { updated, failed };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    return { updated: 0, failed: 1 };
  }
}

// Ejecutar
if (require.main === module) {
  updateCommissionFAQs()
    .then(result => {
      console.log('\n✅ Proceso completado\n');
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { updateCommissionFAQs };