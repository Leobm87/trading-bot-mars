const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertPaymentsFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Qué métodos de pago y retiro están disponibles?',
        answer_md: `**Métodos de Pago (Evaluación):**
✅ Tarjeta de crédito/débito
✅ PayPal (según disponibilidad)

**Métodos de Retiro:**
- **USA**: WISE
- **Internacional**: PLANE
- Frecuencia: A demanda (después de 8 días trading)
- Sin comisiones en retiros

**Importante:**
- Debes alcanzar Safety Net primero
- Mínimo $500 por retiro
- Procesamiento: 1-3 días hábiles`,
        slug: 'apex-payment-methods',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/payment-methods'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Payments FAQ inserted');
}

insertPaymentsFAQ();