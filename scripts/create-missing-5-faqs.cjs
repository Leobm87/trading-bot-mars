#!/usr/bin/env node
/**
 * Crear 5 FAQs críticas para resolver fallas identificadas
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const criticalFAQs = [
  {
    id: 'COSTOS_PLATAFORMA',
    question: '¿Hay costos adicionales por plataformas o data feed?',
    answer_md: `**No hay costos adicionales** para la mayoría de plataformas y data:

📊 **Plataformas incluidas sin costo**:
- NinjaTrader: Gratis con tu cuenta APEX
- Tradovate: Incluido (plan básico)
- Rithmic: Incluido para cuentas PA
- TradingView: Requiere suscripción propia

📡 **Data feed**:
- CME data feed: **Incluido gratis**
- Sin cargos mensuales adicionales
- Tiempo real para futuros

💡 **Nota**: Solo pagas la suscripción mensual de APEX ($165-$210 según tamaño).`,
    answer_short_md: 'NinjaTrader y data feed CME están **incluidos gratis**. Solo pagas la mensualidad de APEX.',
    aliases: ['ninjatrader costo', 'data feed', 'pagar extra plataforma', 'costos adicionales', 'feed gratis', 'cme data']
  },
  {
    id: 'BLACKLIST_ESTRATEGIAS',
    question: '¿Existe una blacklist de estrategias prohibidas?',
    answer_md: `Sí, APEX tiene **reglas estrictas** sobre estrategias prohibidas:

🚫 **Completamente prohibidas**:
- HFT malicioso (>200 trades/día consistentemente)
- Tick scalping excesivo
- Explotar gaps de datos
- Manipulación de mercado
- Trading durante mantenimiento de brokers
- Uso de múltiples cuentas coordinadas

✅ **Permitido**:
- Scalping normal (<200 trades/día)
- Day trading estándar
- Swing trading
- Uso de EAs/robots honestos
- Cualquier estrategia legítima de mercado

⚠️ Violar estas reglas resulta en **pérdida inmediata de cuenta sin reembolso**.`,
    answer_short_md: 'Prohibido: HFT excesivo (>200 trades/día), tick scalping, exploits. Permitido: scalping normal, day trading, swing.',
    aliases: ['blacklist', 'estrategias prohibidas', 'que no puedo hacer', 'reglas prohibidas', 'banned strategies']
  },
  {
    id: 'CAMBIO_ESTRATEGIA', 
    question: '¿Puedo cambiar mi estrategia después de empezar?',
    answer_md: `✅ **Sí, puedes cambiar tu estrategia** en cualquier momento:

🔄 **Durante la evaluación**:
- Cambio libre de estrategia
- No hay restricciones
- Puedes probar diferentes enfoques
- Solo respeta las reglas generales (drawdown, etc.)

📈 **En cuenta PA (funded)**:
- Igual flexibilidad total
- Puedes adaptar tu trading al mercado
- Cambiar de scalping a swing o viceversa
- Sin notificación requerida

💡 **Recomendación**: Mantén consistencia en tu gestión de riesgo aunque cambies de estrategia.`,
    answer_short_md: '✅ Sí, puedes cambiar tu estrategia cuando quieras, tanto en evaluación como en cuenta PA.',
    aliases: ['cambiar estrategia', 'modificar trading', 'nueva estrategia', 'cambio de plan', 'estrategia diferente']
  },
  {
    id: 'METODOS_PAGO_ALTERNATIVOS',
    question: '¿Aceptan PayPal o crypto para pagar?',
    answer_md: `APEX tiene **métodos de pago limitados**:

✅ **Métodos aceptados**:
- Tarjetas de crédito/débito (Visa, MasterCard)
- Wire transfer (transferencia bancaria)
- Algunos procesadores locales según país

❌ **NO aceptan**:
- PayPal
- Criptomonedas (Bitcoin, USDT, etc.)
- Skrill, Neteller, u otros e-wallets

💡 **Alternativas para Latinoamérica**:
- Usa tarjetas internacionales (Visa/MC)
- Considera tarjetas virtuales (Wise, Payoneer)
- Wire transfer para montos grandes

⚠️ Los pagos son procesados de forma segura por su procesador oficial.`,
    answer_short_md: 'NO aceptan PayPal ni crypto. Solo tarjetas Visa/MC y wire transfer.',
    aliases: ['paypal', 'crypto', 'bitcoin', 'metodos pago', 'usdt', 'criptomonedas', 'formas de pago']
  },
  {
    id: 'LIMITE_TRADES_DIARIO',
    question: '¿Hay un límite máximo de trades por día?',
    answer_md: `APEX tiene un **límite suave** de trades diarios:

📊 **Límite recomendado**:
- Máximo sugerido: **200 trades/día**
- Promedio saludable: 20-50 trades/día

⚠️ **Qué pasa si excedes 200 trades**:
- Una vez: Sin problema
- Ocasionalmente: Aceptable
- Consistentemente: Revisión de cuenta
- Puede considerarse HFT prohibido

✅ **Sin límites para**:
- Day trading normal (10-50 trades)
- Scalping moderado (50-150 trades)
- Swing trading (1-10 trades)

🚫 **Evita**:
- Trading algorítmico excesivo
- Tick scalping agresivo
- Bots descontrolados

💡 Calidad > Cantidad. Enfócate en trades rentables, no en volumen.`,
    answer_short_md: 'Límite suave de 200 trades/día. Excederlo consistentemente puede considerarse HFT prohibido.',
    aliases: ['limite trades', 'maximo trades dia', 'cuantos trades', 'trades por dia', 'limite diario']
  }
];

async function createFAQs() {
  console.log('📝 Creando 5 FAQs críticas para APEX\n');
  console.log('=' .repeat(60));
  
  let created = 0;
  let failed = 0;
  
  for (const faq of criticalFAQs) {
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
          created++;
          
          // Actualizar PIN si corresponde
          if (faq.id !== faq.id.toLowerCase()) {
            console.log(`  📌 Recuerda actualizar PIN ${faq.id} → ${newFaq.id}`);
          }
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
  console.log('\n💡 Nota: Actualiza los PINs con los IDs reales de las FAQs creadas');
  
  return { created, failed };
}

// Ejecutar
if (require.main === module) {
  createFAQs()
    .then(result => {
      console.log('\n✅ Proceso completado\n');
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createFAQs };