const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function insertInstrumentsFAQ() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    const faq = {
        firm_id: apexId,
        question: '¿Qué instrumentos puedo operar y en qué plataformas?',
        answer_md: `**Instrumentos Permitidos:**
- **Futuros**: ES, NQ, YM, RTY, CL, GC, SI, NG
- **Micros**: MES, MNQ, MYM, M2K, MCL, MGC
- **Forex**: 6E, 6B, 6J, 6A, 6C (futuros)
- **Crypto**: MBT, MET (micro Bitcoin/Ethereum)

❌ **NO permitido**: Acciones individuales, opciones

**Plataformas Disponibles:**
- NinjaTrader (gratis)
- Tradovate (gratis)
- Rithmic (gratis)
- TradingView
- QuantTower
- BookMap
- Sierra Chart
- ATAS

**Data:** Rithmic o Tradovate incluido`,
        slug: 'apex-instruments-platforms',
        effective_from: new Date().toISOString(),
        source_url: 'https://apex.com/instruments-platforms'
    };
    
    const { error } = await supabase.from('faqs').insert(faq);
    console.log(error ? `Error: ${error.message}` : '✅ Instruments FAQ inserted');
}

insertInstrumentsFAQ();