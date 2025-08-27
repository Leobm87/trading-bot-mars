const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertResetFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Cómo funciona el reset de cuenta y cuánto cuesta?',
        answer_md: `**Reset de Evaluación:**

**Opciones:**
- Esperar renovación mensual (gratis con suscripción)
- Pago inmediato: **$80** (todos los tamaños)

**Condiciones:**
✅ Disponible si no violaste reglas de conducta
✅ Te devuelve al día 1 con balance original
✅ Mantiene tu historial de trading

⚠️ Si violaste reglas graves (HFT, copy trading prohibido), no hay reset disponible`,
        slug: 'apex-reset',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/reset-policy'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Reset FAQ inserted');
}

insertResetFAQ();