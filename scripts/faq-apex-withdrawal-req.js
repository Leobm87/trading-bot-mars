const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertWithdrawalReqFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Qué requisitos debo cumplir para retirar?',
        answer_md: `**Requisitos para Retiro:**

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
**Profit Split:** 100% primeros $25K, luego 90/10`,
        slug: 'apex-withdrawal-requirements',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/withdrawal-requirements'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Withdrawal req FAQ inserted');
}

insertWithdrawalReqFAQ();