const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function debugFAQs() {
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    
    // Get all Apex FAQs
    const { data: faqs, error } = await supabase
        .from('faqs')
        .select('question, answer_md, slug')
        .eq('firm_id', apexId)
        .order('created_at', { ascending: false })
        .limit(10);
    
    console.log('\n=== LAST 10 APEX FAQs ===');
    faqs.forEach((faq, i) => {
        console.log(`\n${i+1}. ${faq.question}`);
        console.log(`   Answer length: ${faq.answer_md?.length || 0} chars`);
        console.log(`   Slug: ${faq.slug}`);
        if (faq.answer_md) {
            console.log(`   Preview: ${faq.answer_md.substring(0, 100)}...`);
        }
    });
    
    // Test specific queries
    console.log('\n=== TESTING KEYWORDS ===');
    const testWords = ['umbral', 'safety', 'financiada', 'pa', 'métodos'];
    
    for (const word of testWords) {
        const { data } = await supabase
            .from('faqs')
            .select('question')
            .eq('firm_id', apexId)
            .or(`question.ilike.%${word}%,answer_md.ilike.%${word}%`);
        
        console.log(`\n"${word}" found in ${data?.length || 0} FAQs`);
        if (data?.length > 0) {
            console.log(`  - ${data[0].question}`);
        }
    }
}

debugFAQs();