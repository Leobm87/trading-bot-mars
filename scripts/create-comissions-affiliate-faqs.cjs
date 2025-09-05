#!/usr/bin/env node
/**
 * Crear FAQs para comisiones y programa de afiliados
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const newFAQs = [
  {
    question: '¿Qué comisiones cobra APEX por contrato?',
    answer_md: `💵 **Comisiones de Trading en APEX**:

**Por plataforma**:
- **Rithmic**: ~$0.25-0.50 más por contrato
- **Tradovate**: Generalmente 15-25% más barato

**Contratos principales**:
📊 **E-mini (grandes)**:
- ES (S&P 500): $3.50-4.00 por contrato
- NQ (NASDAQ): $3.50-4.00 por contrato
- YM (Dow Jones): $3.50-4.00 por contrato
- RTY (Russell): $3.50-4.00 por contrato

📊 **Micro (pequeños)**:
- MES (Micro S&P): $0.75-1.00 por contrato
- MNQ (Micro NASDAQ): $0.75-1.00 por contrato
- MYM (Micro Dow): $0.75-1.00 por contrato
- M2K (Micro Russell): $0.75-1.00 por contrato

🛢️ **Commodities**:
- CL (Petróleo): $4.00-4.50 por contrato
- GC (Oro): $4.00-4.50 por contrato
- SI (Plata): $4.00-4.50 por contrato

⚠️ **Importante**:
- Las comisiones se descuentan de tu balance
- Afectan al cálculo del drawdown
- Son por lado (entrada + salida = 2 comisiones)

📎 Enlaces oficiales:
- Rithmic: https://support.apextraderfunding.com/hc/en-us/articles/4404825514139
- Tradovate: https://support.apextraderfunding.com/hc/en-us/articles/24511326984091`,
    answer_short_md: 'Micros: ~$0.75-1/contrato. E-minis: ~$3.50-4/contrato. Tradovate es 15-25% más barato que Rithmic.',
    aliases: ['comisiones apex', 'comisiones', 'costo por contrato', 'fees trading', 'cuanto cobra apex', 'precio comisiones', 'comisiones de apex']
  },
  {
    question: '¿Cómo puedo ser afiliado de APEX?',
    answer_md: `🤝 **Programa de Afiliados de APEX**:

**Requisitos básicos**:
- Registrarse en el programa oficial
- Tener audiencia relacionada con trading
- Cumplir términos y condiciones

💰 **Comisiones de afiliado**:
- **10-20%** de comisión por venta
- Pagos mensuales recurrentes
- Cookies de 30 días de tracking
- Dashboard para seguimiento

📋 **Proceso de aplicación**:
1. Visita la página de afiliados de APEX
2. Completa el formulario de aplicación
3. Espera aprobación (24-48 horas)
4. Recibe tu link único de afiliado
5. Promociona y gana comisiones

✅ **Beneficios**:
- Material promocional gratuito
- Soporte dedicado para afiliados
- Códigos de descuento exclusivos
- Acceso a estadísticas en tiempo real
- Pagos puntuales vía PayPal/Wire

🔗 **Plataformas de afiliación**:
- Programa directo de APEX
- ShareASale
- Impact Radius

💡 **Tips para éxito**:
- Crea contenido educativo de valor
- Sé transparente sobre tu afiliación
- Enfócate en traders principiantes
- Usa videos/tutoriales demostrativos

📧 Contacto: affiliates@apextraderfunding.com`,
    answer_short_md: 'Aplica en su programa oficial. Ganas 10-20% de comisión por venta. Pagos mensuales, material promocional incluido.',
    aliases: ['afiliado apex', 'programa afiliados', 'ser afiliado', 'ganar con apex', 'partnership apex', 'asociado apex', 'como ser afiliado']
  },
  {
    question: '¿Cuánto cobra APEX de comisiones por trade?',
    answer_md: `📊 **Estructura de comisiones en APEX**:

**Cálculo básico**:
- Comisión por lado (entrada y salida separadas)
- Total por trade = comisión entrada + comisión salida
- Ejemplo: 1 MES = $0.75 entrada + $0.75 salida = $1.50 total

**Ejemplos prácticos**:

📈 **Trade de 1 contrato MES**:
- Entrada: $0.75
- Salida: $0.75
- Total: $1.50 por round trip

📈 **Trade de 5 contratos ES**:
- Entrada: 5 × $3.50 = $17.50
- Salida: 5 × $3.50 = $17.50
- Total: $35.00 por round trip

💡 **Cómo reducir comisiones**:
- Usa Tradovate (15-25% más barato)
- Opera con micros si eres principiante
- Evita sobre-tradear
- Considera el costo en tu estrategia

⚠️ **Impacto en tu cuenta**:
- En cuenta de $50K con 100 trades/mes:
  - Micros: ~$150 en comisiones
  - E-minis: ~$700 en comisiones
- Las comisiones afectan el drawdown
- Planifica 2-3% del balance para comisiones

**Comparación con competencia**:
- APEX: Promedio del mercado
- FTMO: Similar
- TopStep: Ligeramente más caro
- Funded Next: Similar`,
    answer_short_md: 'Por round trip: Micros ~$1.50, E-minis ~$7. Las comisiones son por lado (entrada+salida).',
    aliases: ['comisiones por trade', 'cuanto cobra por operacion', 'costo trades apex', 'fees apex']
  }
];

async function createFAQs() {
  console.log('📝 Creando FAQs de comisiones y afiliados\n');
  console.log('=' .repeat(60));
  
  let created = 0;
  let failed = 0;
  
  for (const faq of newFAQs) {
    console.log(`\n"${faq.question}"`);
    
    try {
      const newFaq = {
        id: uuidv4(),
        firm_id: APEX_FIRM_ID,
        slug: faq.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
        question: faq.question,
        answer_md: faq.answer_md,
        answer_short_md: faq.answer_short_md,
        lang: 'es',
        effective_from: new Date().toISOString().split('T')[0],
        source_url: 'https://apextraderfunding.com',
        aliases: faq.aliases
      };
      
      const { error } = await supabase
        .from('faqs')
        .insert(newFaq);
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ Creada con ID: ${newFaq.id}`);
        created++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✅ FAQs creadas: ${created}`);
  console.log(`❌ Errores: ${failed}`);
  
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