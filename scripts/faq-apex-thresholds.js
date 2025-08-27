const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertThresholdsFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Cuál es el umbral mínimo (Safety Net) para poder retirar?',
        answer_md: `**Umbrales Mínimos para Retiro:**

Una vez alcanzado el umbral, puedes retirar **$500 mínimo**:

- **25K**: $26,600 ($1,600 profit)
- **50K**: $52,600 ($2,600 profit)
- **100K**: $103,100 ($3,100 profit)
- **150K**: $155,100 ($5,100 profit)
- **250K**: $256,600 ($6,600 profit)
- **300K**: $307,600 ($7,600 profit)
- **100K Static**: $102,600 ($2,600 profit)

⚠️ **Importante**: 
- Solo 50% de contratos hasta alcanzar Safety Net
- Al superarlo: 100% contratos disponibles
- Si caes debajo, mantienes contratos completos`,
        slug: 'apex-safety-net',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/safety-net'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Thresholds FAQ inserted');
}

insertThresholdsFAQ();