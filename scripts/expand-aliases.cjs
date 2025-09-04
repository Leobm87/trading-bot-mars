#!/usr/bin/env node
/**
 * Expandir aliases en FAQs existentes para mejorar cobertura
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const aliasExpansions = [
  {
    targetQuestions: ['hay', 'existe'],
    newAliases: ['tienen', 'ofrecen', 'cuentan con', 'disponible', 'está disponible']
  },
  {
    targetQuestions: ['retir', 'payout', 'cobr'],
    newAliases: ['withdrawal', 'payout', 'cobro', 'sacar dinero', 'retirar fondos', 'sacar plata']
  },
  {
    targetQuestions: ['drawdown', 'pérdida'],
    newAliases: ['limite de perdida', 'max loss', 'perdida maxima', 'dd', 'máximo drawdown']
  },
  {
    targetQuestions: ['reset'],
    newAliases: ['reiniciar', 'empezar de nuevo', 'restart', 'comenzar otra vez', 'volver a empezar']
  },
  {
    targetQuestions: ['costo', 'precio', 'cuanto'],
    newAliases: ['vale', 'sale', 'cobran', 'cuanto es', 'que precio', 'cual es el costo']
  },
  {
    targetQuestions: ['ninjatrader'],
    newAliases: ['ninja trader', 'ninja', 'nt', 'plataforma ninja']
  },
  {
    targetQuestions: ['tradingview'],
    newAliases: ['trading view', 'tv', 'tradingview']
  },
  {
    targetQuestions: ['soporte'],
    newAliases: ['ayuda', 'asistencia', 'support', 'atención al cliente']
  }
];

async function expandAliases() {
  console.log('🔧 Expandiendo aliases en FAQs de APEX\n');
  console.log('=' .repeat(60));
  
  let totalUpdated = 0;
  let totalFailed = 0;
  
  for (const expansion of aliasExpansions) {
    console.log(`\n📝 Buscando FAQs con: ${expansion.targetQuestions.join(', ')}`);
    
    // Construir query
    let query = supabase
      .from('faqs')
      .select('id, question, aliases')
      .eq('firm_id', APEX_FIRM_ID)
      .eq('lang', 'es');
    
    // Buscar FAQs que contengan los términos objetivo
    const { data: faqs, error } = await query;
    
    if (error) {
      console.log(`  ❌ Error buscando: ${error.message}`);
      totalFailed++;
      continue;
    }
    
    // Filtrar manualmente por términos en la pregunta
    const matchingFaqs = faqs.filter(faq => 
      expansion.targetQuestions.some(term => 
        faq.question.toLowerCase().includes(term.toLowerCase())
      )
    );
    
    console.log(`  📊 Encontradas: ${matchingFaqs.length} FAQs`);
    
    for (const faq of matchingFaqs) {
      const currentAliases = faq.aliases || [];
      const newAliases = [...new Set([...currentAliases, ...expansion.newAliases])];
      
      // Solo actualizar si hay nuevos aliases
      if (newAliases.length > currentAliases.length) {
        const { error: updateError } = await supabase
          .from('faqs')
          .update({ aliases: newAliases })
          .eq('id', faq.id);
        
        if (updateError) {
          console.log(`  ❌ Error actualizando FAQ ${faq.id}: ${updateError.message}`);
          totalFailed++;
        } else {
          console.log(`  ✅ FAQ actualizada: "${faq.question.substring(0, 50)}..."`);
          console.log(`     Aliases: ${currentAliases.length} → ${newAliases.length}`);
          totalUpdated++;
        }
      }
    }
  }
  
  // Expansiones específicas para FAQs problemáticas
  const specificUpdates = [
    {
      questionLike: '%descuento%activacion%',
      addAliases: ['ofrecen descuento', 'tienen descuento', 'hay descuento', 'descuento pa']
    },
    {
      questionLike: '%tiempo%activar%',
      addAliases: ['cuanto tiempo activar', 'plazo para activar', 'cuando activar']
    },
    {
      questionLike: '%pausar%cuenta%',
      addAliases: ['pausar cuenta', 'reactivar cuenta', 'cuenta pausada', 'suspender cuenta']
    }
  ];
  
  console.log('\n📌 Aplicando expansiones específicas...');
  
  for (const update of specificUpdates) {
    const { data: faqs, error } = await supabase
      .from('faqs')
      .select('id, question, aliases')
      .eq('firm_id', APEX_FIRM_ID)
      .ilike('question', update.questionLike);
    
    if (error || !faqs || faqs.length === 0) continue;
    
    for (const faq of faqs) {
      const currentAliases = faq.aliases || [];
      const newAliases = [...new Set([...currentAliases, ...update.addAliases])];
      
      if (newAliases.length > currentAliases.length) {
        await supabase
          .from('faqs')
          .update({ aliases: newAliases })
          .eq('id', faq.id);
        
        console.log(`  ✅ Actualizada: "${faq.question.substring(0, 50)}..."`);
        totalUpdated++;
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO');
  console.log('=' .repeat(60));
  console.log(`✅ FAQs actualizadas: ${totalUpdated}`);
  console.log(`❌ Errores: ${totalFailed}`);
  
  return { updated: totalUpdated, failed: totalFailed };
}

// Ejecutar
if (require.main === module) {
  expandAliases()
    .then(result => {
      console.log('\n✅ Proceso completado\n');
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { expandAliases };