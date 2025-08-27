const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function verifyFAQs() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    // Check critical FAQs
    const criticalQuestions = [
        'umbral',
        'safety net',
        'activación',
        'reglas.*financiada',
        'métodos.*pago',
        'reset'
    ];
    
    console.log('=== CHECKING CRITICAL FAQs ===');
    
    for (const pattern of criticalQuestions) {
        const { data, error } = await supabase
            .from('faqs')
            .select('id, question, slug')
            .eq('firm_id', apexId)
            .ilike('question', `%${pattern.replace('.*', '%')}%`);
        
        console.log(`\n"${pattern}": ${data?.length || 0} FAQs found`);
        if (data?.length > 0) {
            data.forEach(faq => {
                console.log(`  - [${faq.id}] ${faq.question.substring(0, 60)}...`);
            });
        }
    }
    
    // Count total
    const { count } = await supabase
        .from('faqs')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', apexId);
    
    console.log(`\n=== TOTAL APEX FAQs: ${count} ===`);
}

verifyFAQs();