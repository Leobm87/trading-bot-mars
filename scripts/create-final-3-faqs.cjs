#!/usr/bin/env node
/**
 * Crear 3 FAQs finales para alcanzar 95%+ de cobertura
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const finalFAQs = [
  {
    id: 'DIAS_MINIMOS_TRADING',
    question: '¿Cuántos días mínimos de trading necesito en la evaluación?',
    answer_md: `📅 **Requisitos de días de trading en APEX**:

**Evaluación (todas las cuentas)**:
- Mínimo: **7 días de trading**
- Máximo: 90 días calendario para completar
- No tienen que ser consecutivos
- Un día cuenta si abres al menos 1 posición

📊 **Definición de "día de trading"**:
- Debes abrir y cerrar al menos una operación
- El P&L del día puede ser positivo o negativo
- No hay mínimo de trades por día
- Trades de práctica/sim no cuentan

⚠️ **Importante**:
- Aunque alcances el profit target antes, debes completar los 7 días
- Los fines de semana cuentan si el mercado está abierto
- Días festivos con mercado cerrado no cuentan

💡 **Estrategia común**: Muchos traders completan el profit en 3-4 días y luego hacen microtrades los días restantes para cumplir el requisito.`,
    answer_short_md: '**Mínimo 7 días de trading** (no consecutivos). Un día cuenta si abres al menos 1 posición.',
    aliases: ['dias minimos', 'cuantos dias trading', 'minimo dias', 'requisito dias', '7 dias', 'dias necesarios', 'dias de tradeo']
  },
  {
    id: 'PROFIT_TARGETS_CUENTAS',
    question: '¿Cuál es el profit target de cada tamaño de cuenta?',
    answer_md: `🎯 **Profit Targets por cuenta en APEX**:

**Cuentas Normales (1 fase)**:
- $25K → Target: **$1,500** (6%)
- $50K → Target: **$3,000** (6%)
- $75K → Target: **$4,500** (6%)
- $100K → Target: **$6,000** (6%)
- $150K → Target: **$9,000** (6%)
- $250K → Target: **$15,000** (6%)
- $300K → Target: **$20,000** (6.67%)

**Cuentas Static (1 fase)**:
- Los mismos targets que las normales
- Diferencia: el trailing drawdown se congela

📊 **Características**:
- Una sola fase de evaluación
- 90 días máximo para alcanzar el target
- Sin profit target en cuenta PA (funded)
- El target incluye comisiones pagadas

💡 **Tips**:
- El 6% es alcanzable en 5-10 días con buena estrategia
- No hay bonus por superar el target
- En PA no hay límite de ganancias`,
    answer_short_md: 'Todas las cuentas: **6% del balance** ($1,500 para 25K, $3,000 para 50K, $6,000 para 100K, etc.)',
    aliases: ['profit target', 'objetivo ganancia', 'meta profit', 'target cuenta', 'cuanto ganar', 'objetivo por cuenta', 'meta evaluacion']
  },
  {
    id: 'TIEMPO_ACTIVACION_PA',
    question: '¿Cuánto tiempo tengo para activar la cuenta PA después de pasar?',
    answer_md: `⏰ **Plazos para activación de cuenta PA en APEX**:

**Tiempo límite**:
- **14 días** desde que pasas la evaluación
- El contador empieza cuando recibes el email de aprobación
- Si no activas en 14 días, pierdes la oportunidad

💰 **Costo de activación**:
- Depende del tamaño de cuenta:
  - $25K-50K: ~$130-150
  - $75K-100K: ~$150-170
  - $150K+: ~$170-210
- Pago único al activar
- Luego es mensualidad recurrente

🔄 **¿Qué pasa si no activo?**
- Después de 14 días la aprobación expira
- Tendrías que comprar y pasar otra evaluación
- No hay extensiones ni excepciones
- No se puede "guardar" para después

⚠️ **Importante**:
- La fecha límite aparece en tu dashboard
- Recibes recordatorios por email
- Puedes activar inmediatamente si estás listo
- Una vez activada, empieza el cobro mensual

💡 **Recomendación**: Si pasaste la evaluación, activa lo antes posible para no perder la oportunidad. El costo de rehacer la evaluación es mayor que unos meses de mensualidad.`,
    answer_short_md: '**14 días máximo** para activar después de pasar. Si no activas, pierdes la aprobación.',
    aliases: ['tiempo activar', 'plazo activacion', 'cuando activar pa', 'dias para activar', '14 dias', 'limite activacion', 'cuanto tiempo activar funded']
  }
];

async function createFinalFAQs() {
  console.log('📝 Creando 3 FAQs finales para APEX (95%+ cobertura)\n');
  console.log('=' .repeat(60));
  
  let created = 0;
  let failed = 0;
  const createdIds = [];
  
  for (const faq of finalFAQs) {
    console.log(`\n[${faq.id}] "${faq.question}"`);
    
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('faqs')
        .select('id')
        .eq('question', faq.question)
        .eq('firm_id', APEX_FIRM_ID)
        .single();
      
      if (existing) {
        console.log('  ⚠️  Ya existe, actualizando...');
        
        // Actualizar
        const { error } = await supabase
          .from('faqs')
          .update({
            answer_md: faq.answer_md,
            answer_short_md: faq.answer_short_md,
            aliases: faq.aliases
          })
          .eq('id', existing.id);
        
        if (error) {
          console.log(`  ❌ Error actualizando: ${error.message}`);
          failed++;
        } else {
          console.log('  ✅ Actualizada exitosamente');
          createdIds.push({ placeholder: faq.id, real: existing.id });
          created++;
        }
      } else {
        // Crear nueva
        const newFaq = {
          id: uuidv4(),
          firm_id: APEX_FIRM_ID,
          slug: faq.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
          question: faq.question,
          answer_md: faq.answer_md,
          answer_short_md: faq.answer_short_md,
          lang: 'es',
          effective_from: new Date().toISOString().split('T')[0],
          source_url: 'https://apextraderco.com',
          aliases: faq.aliases
        };
        
        const { error } = await supabase
          .from('faqs')
          .insert(newFaq);
        
        if (error) {
          console.log(`  ❌ Error creando: ${error.message}`);
          failed++;
        } else {
          console.log(`  ✅ Creada con ID: ${newFaq.id}`);
          createdIds.push({ placeholder: faq.id, real: newFaq.id });
          created++;
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO');
  console.log('=' .repeat(60));
  console.log(`✅ FAQs creadas/actualizadas: ${created}`);
  console.log(`❌ Errores: ${failed}`);
  
  if (createdIds.length > 0) {
    console.log('\n📌 IDs para actualizar en PINs:');
    createdIds.forEach(item => {
      console.log(`   ${item.placeholder} → ${item.real}`);
    });
  }
  
  console.log('\n🎯 Con estas FAQs, la cobertura debería superar el 95%');
  
  return { created, failed, ids: createdIds };
}

// Ejecutar
if (require.main === module) {
  createFinalFAQs()
    .then(result => {
      console.log('\n✅ Proceso completado\n');
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createFinalFAQs };