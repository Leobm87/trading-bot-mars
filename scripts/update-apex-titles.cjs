const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateApexTitles() {
  const updates = [
    {
      id: '9ea973b6-d106-4b54-9cf7-d75805c5d394',
      answer_short_md: `### 💰 Precios de Evaluación APEX

**Cuentas disponibles:**
- $25,000 ($147/mes)
- $50,000 ($167/mes)
- $100,000 ($207/mes)
- $150,000 ($297/mes)
- $250,000 ($517/mes)
- $300,000 ($657/mes)
- $100,000 Static ($137/mes)

✅ Una fase, tiempo ilimitado, trailing drawdown.`
    },
    {
      id: 'b0410c27-2dad-44c1-9031-52c4a56f2fc3',
      answer_short_md: `### 📊 Tipos de Drawdown en APEX

**Trailing Drawdown (se congela en balance inicial + $100):**
- 25K: -$1,500
- 50K: -$2,500  
- 100K: -$3,000
- 150K: -$5,000
- 250K: -$6,500
- 300K: -$8,000

**Static Drawdown:**
- 100K Static: -$625 fijo`
    },
    {
      id: '07a149b0-1866-42f0-b5ff-1320a57cb7b7',
      answer_short_md: `### 💸 Cómo Retirar Dinero en APEX

**Métodos de Retiro:**
- **WISE (Solo USA):** Rápido, para traders de EE. UU.
- **PLANE (Internacional):** Seguro, para traders fuera de EE. UU.

**Requisitos para Retirar:**
- Mínimo 8 días de trading activo tras activar cuenta PA
- Al menos 5 días con ganancias de $50+ cada uno
- El día con mayor beneficio no puede ser >30% del total acumulado

**Proceso:**
- Frecuencia: A demanda (cuando quieras)
- Mínimo: $500 por retiro
- Primeros 5 retiros limitados por tamaño de cuenta`
    },
    {
      id: '35c71f9d-57ae-42e3-a24f-c99810e47915',
      answer_short_md: `### ✅ Requisitos para Retirar en APEX

**Condiciones obligatorias:**
- Mínimo 8 días de trading activo
- Al menos 5 días con profit de $50+
- Alcanzar el Safety Net de tu cuenta
- Cumplir regla de consistencia 30%
- Retiro mínimo: $500

**Límites primeros 5 retiros:**
- 25K: máx $1,500
- 50K: máx $2,000
- 100K: máx $2,500
- 150K: máx $2,750
- 250K: máx $3,000
- 300K: máx $3,500

**Después del 6º retiro:** Sin límite máximo
**Profit Split:** 100% primeros $25K, luego 90/10`
    },
    {
      id: 'b8336088-d2ad-4bc0-9141-b46d516c7a32',
      answer_short_md: `### ⚖️ Regla de Consistencia 30% APEX

**¿Qué es?**
El día de mayor profit no puede representar >30% del total acumulado.

**Características:**
- Se evalúa al solicitar retiro
- NO elimina la cuenta, solo bloquea el retiro
- Ejemplo: Si ganaste $10K total, ningún día puede tener >$3K de profit`
    },
    {
      id: '4d503259-dd0e-4807-b8bf-89c18a39253d',
      answer_short_md: `### 💵 Comisiones de Trading en APEX

**Comisiones en Rithmic:**
- ES (E-mini S&P 500): $3.98
- MES (Micro E-mini S&P): $1.02
- NQ (E-mini NASDAQ): $3.98
- MNQ (Micro NASDAQ): $1.02
- CL (Crude Oil): $3.96
- GC (Gold): $4.62

**Comisiones en Tradovate:**
- ES (E-mini S&P 500): $3.10
- MES (Micro E-mini S&P): $1.04
- NQ (E-mini NASDAQ): $3.10
- MNQ (Micro NASDAQ): $1.04
- CL (Crude Oil): $3.34
- GC (Gold): $3.54

💡 **Nota:** Tradovate es 15-25% más barato que Rithmic`
    },
    {
      id: '80d9c0e7-c37e-459d-a28d-f70a169fe3df',
      answer_short_md: `### 🚀 Costos de Activación PA en APEX

**Opción 1 - Pago Único:**
- 25K: $130
- 50K: $140
- 100K: $220
- 150K: $260
- 250K: $300
- 300K: $340
- 100K Static: $220

**Opción 2 - Suscripción Mensual:**
- $85/mes para todos los tamaños`
    },
    {
      id: 'b8cae97b-9fa7-48cb-895b-cfbb81720724',
      answer_short_md: `### 🛡️ Safety Net (Umbral) por Cuenta

**Safety Net por tamaño:**
- $25K → $26,600 (profit $1,600)
- $50K → $52,600 (profit $2,600)
- $100K → $103,100 (profit $3,100)
- $150K → $155,100 (profit $5,100)
- $250K → $256,600 (profit $6,600)
- $300K → $307,600 (profit $7,600)
- $100K Static → $102,600 (profit $2,600)

✅ Al alcanzarlo, desbloqueas el 100% de contratos disponibles`
    },
    {
      id: '21a7f8bc-22c8-4032-a3a2-862b7182e3f9',
      answer_short_md: `### 📝 Requisitos para Retirar en APEX

**Condiciones obligatorias:**
- Mínimo 8 días de trading activo
- Al menos 5 días con profit de $50 o más
- Alcanzar el Safety Net de tu cuenta
- Cumplir regla de consistencia (30%)

✅ Todos los requisitos deben cumplirse para solicitar un retiro`
    },
    {
      id: '8ed04281-8628-4787-ad5e-ed7e5938afd3',
      answer_short_md: `### ⏰ Frecuencia de Retiros en APEX

**Sistema de retiros:**
- Retiro a demanda (cuando quieras)
- Requiere mínimo 8 días de trading activo
- Debe haber al menos 5 días con profit de $50+
- Métodos de retiro: WISE (USA), PLANE (Internacional)`
    },
    {
      id: '79b0be6c-7365-4845-a5bc-88a35ae6b10c',
      answer_short_md: `### 💰 Tamaños y Precios de Cuentas APEX

**1-Step Evaluation:**
- $25,000: $147 (hasta 4 contratos)
- $50,000: $167 (hasta 10 contratos)
- $100,000: $207 (hasta 14 contratos)
- $150,000: $297 (hasta 17 contratos)
- $250,000: $517 (hasta 27 contratos)
- $300,000: $657 (hasta 35 contratos)

**1-Step Static Drawdown:**
- $100,000 Static: $137 (hasta 2 contratos)`
    }
  ];

  console.log('Actualizando answer_short_md con títulos descriptivos...\n');

  for (const update of updates) {
    const { data, error } = await supabase
      .from('faqs')
      .update({ answer_short_md: update.answer_short_md })
      .eq('id', update.id)
      .select();

    if (error) {
      console.error(`Error actualizando FAQ ${update.id}:`, error.message);
    } else {
      console.log(`✅ FAQ actualizada: ${update.id}`);
      if (data && data[0]) {
        console.log(`   Título: ${update.answer_short_md.split('\n')[0]}\n`);
      }
    }
  }

  console.log('\n✅ Proceso completado');
}

updateApexTitles().catch(console.error);