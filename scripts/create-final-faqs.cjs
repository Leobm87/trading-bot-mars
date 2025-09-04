#!/usr/bin/env node
/**
 * Script para crear las últimas 8 FAQs faltantes
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

const finalFAQs = [
  {
    question: "cual es la cuenta mas barata?",
    answer_md: `### 💰 Cuenta Más Económica en APEX

**La cuenta más barata es la de $25,000:**
- **Costo:** $147/mes
- **Pago total (3 meses):** $441
- **Profit target:** $1,500 (6%)

**Ventajas de la cuenta $25K:**
- Menor inversión inicial
- Mismo trailing drawdown system
- Acceso a todos los instrumentos
- 90% profit split igual que cuentas grandes

**Comparación rápida:**
- $25K: $147/mes ✅ Más barata
- $50K: $167/mes
- $100K Static: $137/mes (pero requiere más experiencia)`,
    answer_short_md: "La cuenta de **$25,000** ($147/mes) es la más barata. Total 3 meses: $441. Mismo sistema y beneficios que cuentas grandes."
  },
  
  {
    question: "que diferencia hay entre normal y static?",
    answer_md: `### 🎯 Normal vs Static en APEX

**CUENTA NORMAL (Trailing):**
- Trailing drawdown que se mueve con profits
- Se congela al alcanzar balance inicial
- Más flexible para principiantes
- Disponible en todos los tamaños

**CUENTA STATIC (100K only):**
- Drawdown fijo desde el inicio
- NO se mueve con ganancias
- $137/mes (más barata que normal)
- Solo disponible en $100K
- Requiere mejor gestión de riesgo

**¿Cuál elegir?**
- **Normal:** Si eres principiante o prefieres flexibilidad
- **Static:** Si tienes experiencia y quieres drawdown predecible`,
    answer_short_md: "**Normal:** Trailing drawdown que se congela. **Static:** Drawdown fijo, solo $100K, $137/mes. Normal mejor para principiantes."
  },
  
  {
    question: "puedo pasar solo con micros?",
    answer_md: `### 🎯 Pasar Evaluación con Micros

**✅ SÍ, puedes pasar solo con micros:**

**Ventajas de usar micros:**
- Menor riesgo por trade ($1.25-$2/tick)
- Mejor control del drawdown
- Misma liquidez que minis
- Ideal para cuentas pequeñas

**Estrategia con micros:**
- Cuenta $25K: 2-3 micros máximo
- Cuenta $50K: 4-6 micros
- Cuenta $100K: 8-10 micros

**Tiempo estimado:**
- Con 2-3% mensual: 2-3 meses
- Más seguro que usar minis
- Menor estrés psicológico

Muchos traders prefieren micros para evaluación y luego escalan en PA.`,
    answer_short_md: "✅ Sí, puedes pasar solo con micros. Menor riesgo ($1.25/tick), mejor control. Toma más tiempo pero es más seguro."
  },
  
  {
    question: "que pasa si violo una regla?",
    answer_md: `### ⚠️ Consecuencias por Violar Reglas

**Consecuencias según la violación:**

**Violaciones GRAVES (cierre inmediato):**
- Exceder drawdown máximo
- Uso de EAs prohibidos
- Copy trading no autorizado
- Compartir cuenta

**Violaciones MENORES (advertencia):**
- Primera vez overnight accidental
- Errores técnicos menores

**En evaluación:**
- Cuenta cerrada
- Opción de reset (~$85)

**En cuenta PA:**
- Pérdida total de la cuenta
- Nueva evaluación requerida
- Posible ban por violaciones repetidas

⚠️ APEX audita todos los trades automáticamente.`,
    answer_short_md: "**Graves:** Cierre inmediato (drawdown, EAs, copy trade). **Menores:** Advertencia. En evaluación: reset $85. En PA: pérdida total."
  },
  
  {
    question: "que pasa si no pago la mensualidad?",
    answer_md: `### 💳 No Pagar Mensualidad PA

**Consecuencias de no pagar:**

**Primer mes sin pago:**
- Cuenta suspendida temporalmente
- No puedes tradear
- Acceso bloqueado a la plataforma

**Período de gracia:**
- 7-14 días para regularizar
- Puedes reactivar pagando
- Sin penalidades adicionales

**Después del período de gracia:**
- Cuenta cerrada permanentemente
- Pierdes acceso definitivo
- Necesitas nueva evaluación

**Recomendación:**
- Configura pago automático
- O elige pago único inicial
- Mantén calendario de pagos`,
    answer_short_md: "Cuenta suspendida inmediatamente. 7-14 días de gracia para pagar. Después se cierra permanentemente y necesitas nueva evaluación."
  },
  
  {
    question: "pierdo la cuenta si no pago un mes?",
    answer_md: `### ⏰ Pérdida de Cuenta por No Pago

**Proceso de suspensión:**

**Día 1-7 sin pago:**
- Cuenta suspendida (no trading)
- Aún recuperable pagando

**Día 8-14:**
- Último aviso
- Período de gracia final

**Día 15+:**
- ❌ Cuenta cerrada permanentemente
- No recuperable
- Nueva evaluación necesaria

**Para evitarlo:**
- Pago único inicial (no mensualidades)
- Autopago con tarjeta
- Recordatorios en calendario
- Fondos suficientes en cuenta

**Tip:** El pago único ($130-$340) evita este problema completamente.`,
    answer_short_md: "No inmediatamente. 14 días de gracia. Día 15: pérdida permanente. Mejor usar pago único para evitar problemas."
  },
  
  {
    question: "apex funciona en españa y latinoamerica?",
    answer_md: `### 🌍 APEX en España y Latinoamérica

**✅ SÍ funciona en:**

**ESPAÑA:**
- Totalmente disponible
- Pagos via Wise/transferencia
- Soporte en inglés
- Horario trading compatible

**LATINOAMÉRICA (confirmados):**
- 🇲🇽 México
- 🇨🇴 Colombia
- 🇨🇱 Chile
- 🇦🇷 Argentina
- 🇵🇪 Perú
- 🇧🇷 Brasil
- 🇺🇾 Uruguay
- 🇵🇾 Paraguay

**Métodos de pago LATAM:**
- Wise (recomendado)
- Tarjeta internacional
- PayPal (algunos países)

**Restricciones:** Cuba, Venezuela (verificar caso por caso).`,
    answer_short_md: "✅ Sí, disponible en España y toda LATAM (excepto Cuba/Venezuela). Paga con Wise o tarjeta internacional."
  },
  
  {
    question: "es apex bueno para principiantes?",
    answer_md: `### 🎓 APEX para Principiantes

**✅ SÍ, APEX es ideal para principiantes por:**

**Ventajas para novatos:**
- ⏰ Tiempo ilimitado (sin presión)
- 📊 Una sola fase de evaluación
- 💰 Cuenta desde $25K ($147)
- 🎯 Puedes usar solo micros
- 📈 Sin regla de consistencia estricta

**Lo que lo hace amigable:**
- No hay límite diario de pérdida
- Trailing drawdown (más flexible)
- 7 días mínimos (no máximos)
- Reset disponible si fallas

**Recomendaciones para principiantes:**
- Empieza con $25K
- Usa solo micros (MES, MNQ)
- Practica 3-6 meses en demo primero
- Target: 1-2% mensual

**Desventaja:** Trailing puede ser confuso al inicio.`,
    answer_short_md: "✅ Sí, ideal para principiantes. Tiempo ilimitado, una fase, desde $147, puedes usar micros. Practica en demo primero."
  }
];

async function createFinalFAQs() {
  console.log('📝 Creando las últimas 8 FAQs...\n');
  
  const created = [];
  const failed = [];
  
  for (const faq of finalFAQs) {
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
        source_url: 'https://apextraderco.com',
        aliases: []
      };
      
      const { data, error } = await supabase
        .from('faqs')
        .insert(newFaq)
        .select();
      
      if (error) {
        console.error(`❌ Error: ${faq.question}`);
        console.error(error);
        failed.push(faq.question);
      } else {
        console.log(`✅ Creada: ${faq.question}`);
        created.push({
          id: data[0].id,
          question: faq.question
        });
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      failed.push(faq.question);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ FAQs creadas: ${created.length}`);
  console.log(`❌ FAQs fallidas: ${failed.length}`);
  
  return { created, failed };
}

// Ejecutar
if (require.main === module) {
  createFinalFAQs()
    .then(result => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createFinalFAQs };