const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertEvaluationFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Cuáles son las reglas de la evaluación?',
        answer_md: `**Reglas de Evaluación Apex:**

**Objetivos por cuenta:**
- 25K: $1,500
- 50K: $3,000
- 100K: $6,000
- 150K: $9,000
- 250K: $15,000
- 300K: $20,000
- 100K Static: $2,000

**Condiciones:**
✅ Mínimo 1 día de trading
✅ Tiempo ilimitado
✅ News trading permitido
✅ Sin límite de pérdida diaria
✅ Trailing drawdown (excepto Static)

**Restricciones:**
❌ NO overnight/swing (cerrar antes de las 5PM ET)
❌ Máximo 20 cuentas simultáneas`,
        slug: 'apex-evaluation-rules',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/evaluation-rules'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Evaluation rules FAQ inserted');
}

insertEvaluationFAQ();