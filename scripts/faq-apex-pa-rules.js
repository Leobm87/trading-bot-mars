const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertPARulesFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Cuáles son las reglas de la cuenta financiada PA?',
        answer_md: `**Reglas Cuenta PA (Financiada):**

**Drawdown y Trading:**
- Trailing se congela en balance inicial + $100
- Sin límite de pérdida diaria
- Ratio máximo riesgo/beneficio: 5:1
- Pérdidas abiertas max: 30% del saldo inicial del día

**Regla de Consistencia (NO eliminatoria):**
- El día de mayor profit no puede ser >30% del total
- Solo afecta retiros, no elimina cuenta
- Fórmula: Ganancia mayor día / 0.30 = profit mínimo total

**Restricciones:**
- Regla One-Direction durante noticias (solo long o short)
- NO overnight (cerrar antes 5PM ET)
- 50% contratos hasta alcanzar Safety Net

**Fase LIVE:**
- Apex puede promoverte a cuenta LIVE
- Sin criterios fijos públicos
- Decisión basada en consistencia y rentabilidad`,
        slug: 'apex-pa-rules',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/pa-rules'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ PA rules FAQ inserted');
}

insertPARulesFAQ();