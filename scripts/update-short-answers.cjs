// scripts/update-short-answers.cjs - Update answer_short_md for APEX FAQs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const updates = [
  {
    id: 'fc6cb870-1364-4db7-b092-c341c9aa726d',
    answer_short_md: `- **25K**: $147/mes
- **50K**: $167/mes  
- **100K**: $207/mes
- **150K**: $297/mes
- **250K**: $517/mes
- **300K**: $657/mes
- **100K Static**: $137/mes

Evaluación de una fase, tiempo ilimitado.`
  },
  {
    id: 'b0410c27-2dad-44c1-9031-52c4a56f2fc3',
    answer_short_md: `**Trailing Drawdown (se congela en balance inicial + $100):**
- 25K: -$1,500
- 50K: -$2,500  
- 100K: -$3,000
- 150K: -$5,000
- 250K: -$6,500
- 300K: -$8,000

**Static:** 100K Static: -$625 fijo`
  },
  {
    id: 'cc3365a5-da92-45b5-b48c-8f89cd64a5ba',
    answer_short_md: `- **No hay fase LIVE obligatoria** en APEX.
- Solo evaluación → cuenta PA (financiada).
- APEX puede promoverte a LIVE basado en tu consistencia, pero no hay criterios públicos fijos.`
  },
  {
    id: '26099319-b39e-4553-8219-1087d440c787',
    answer_short_md: `**Contratos máximos por cuenta:**
- 25K: 4 contratos
- 50K: 10 contratos
- 100K: 14 contratos  
- 150K: 17 contratos
- 250K: 27 contratos
- 300K: 35 contratos
- 100K Static: 2 contratos

**Nota:** Solo 50% disponible hasta alcanzar Safety Net.`
  },
  {
    id: '547a10ad-ffac-40ac-8170-240fd01244b1',
    answer_short_md: `- **Overnight NO permitido** en cuenta PA (debe cerrar antes de 5PM ET).
- Si dejas posición abierta por error:
  - Primera vez: advertencia
  - Reincidencia: posible suspensión
- Usa stops estrictos y alertas para evitarlo.`
  },
  {
    id: '9ea973b6-d106-4b54-9cf7-d75805c5d394',
    answer_short_md: `**Cuentas disponibles:**
- $25,000 ($147/mes)
- $50,000 ($167/mes)
- $100,000 ($207/mes)
- $150,000 ($297/mes)
- $250,000 ($517/mes)
- $300,000 ($657/mes)
- $100,000 Static ($137/mes)

Una fase, tiempo ilimitado, trailing drawdown.`
  },
  {
    id: 'da173bf4-8852-4ffc-847f-67486bf3ffd7',
    answer_short_md: `**Safety Net (umbral para retiros):**
- 25K: $26,600
- 50K: $52,600
- 100K: $103,100
- 150K: $155,100
- 250K: $256,600
- 300K: $307,600
- 100K Static: $102,600

Debes alcanzarlo para poder retirar.`
  },
  {
    id: 'b8336088-d2ad-4bc0-9141-b46d516c7a32',
    answer_short_md: `**Regla de consistencia 30%:**
- El día de mayor profit no puede representar >30% del total acumulado.
- Se evalúa al solicitar retiro.
- NO elimina la cuenta, solo bloquea el retiro.
- Ejemplo: Si ganaste $10K total, ningún día puede tener >$3K de profit.`
  },
  {
    id: 'f125dcbc-ca2c-4e8e-8004-1fa36c7b73b2',
    answer_short_md: `- **Automatización total prohibida** (bots, algos, HFT).
- **Semi-automatización permitida** con supervisión constante.
- Debes estar presente y tomar decisiones.
- Violación = eliminación inmediata de cuenta.`
  },
  {
    id: '615ada0a-564f-4ce0-9c70-9f4918b19d0b',
    answer_short_md: `- **Copy trading prohibido** entre diferentes personas.
- **Permitido**: replicar TU estrategia en TUS cuentas.
- **Prohibido**: compartir cuentas o copiar de otros.
- Máximo 20 cuentas por hogar.`
  },
  {
    id: '5b235d0a-b257-4292-adae-df65c21e689c',
    answer_short_md: `**Escalado de contratos:**
- Antes del Safety Net: 50% de contratos máximos.
- Después del Safety Net: 100% disponible.
- Al duplicar Safety Net: bonus adicional de contratos.

Ejemplo 50K: 5 contratos → 10 al alcanzar $52,600.`
  },
  {
    id: 'b8cae97b-9fa7-48cb-895b-cfbb81720724',
    answer_short_md: `**Safety Net por tamaño:**
- $25K → $26,600 (profit $1,600)
- $50K → $52,600 (profit $2,600)
- $100K → $103,100 (profit $3,100)
- $150K → $155,100 (profit $5,100)
- $250K → $256,600 (profit $6,600)
- $300K → $307,600 (profit $7,600)
- $100K Static → $102,600 (profit $2,600)`
  }
];

async function updateShortAnswers() {
  console.log('Starting update of answer_short_md for 12 FAQs...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .update({ answer_short_md: update.answer_short_md })
        .eq('id', update.id)
        .select();
      
      if (error) {
        console.error(`✗ Error updating ${update.id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Updated FAQ ${update.id}`);
        successCount++;
      }
    } catch (err) {
      console.error(`✗ Exception updating ${update.id}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✓ Success: ${successCount}/${updates.length}`);
  console.log(`✗ Errors: ${errorCount}/${updates.length}`);
  
  // Verify coverage
  console.log('\nVerifying coverage...');
  const { data: coverageData, error: coverageError } = await supabase
    .from('faqs')
    .select('id, slug, answer_short_md')
    .eq('firm_id', '854bf730-8420-4297-86f8-3c4a972edcf2')
    .is('answer_short_md', null);
  
  if (coverageError) {
    console.error('Error checking coverage:', coverageError);
  } else {
    if (coverageData && coverageData.length > 0) {
      console.log(`\n⚠️  Still ${coverageData.length} FAQs without answer_short_md:`);
      coverageData.forEach(faq => {
        console.log(`  - ${faq.slug} (${faq.id})`);
      });
    } else {
      console.log('\n✅ All APEX FAQs now have answer_short_md!');
    }
  }
}

updateShortAnswers().catch(console.error);