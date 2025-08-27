const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertActivationFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Cuánto cuesta activar la cuenta PA después de pasar la evaluación?',
        answer_md: `**Opciones de Activación PA (Cuenta Financiada):**

**Opción 1 - Pago Único:**
- 25K: $130
- 50K: $140
- 100K: $220
- 150K: $260
- 250K: $300
- 300K: $340
- 100K Static: $220

**Opción 2 - Suscripción Mensual:**
- **$85/mes** para TODOS los tamaños

💡 La mayoría elige $85/mes por la flexibilidad de pausar cuando quieran.`,
        slug: 'apex-activation-fees',
        effective_from: new Date().toISOString(),
        source_url: 'https://myapextraderfunding.com/pricing'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Activation FAQ inserted');
}

insertActivationFAQ();