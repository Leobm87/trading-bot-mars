const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://zkqfyyvpyecueybxoqrt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw'
);

async function analyzeDatabase() {
    console.log('=== SUPABASE DATABASE INVENTORY ===\n');
    
    // 1. Analyze FAQs table
    const { data: faqs, error: faqError } = await supabase
        .from('faqs')
        .select('*');
    
    console.log('📚 FAQs TABLE:');
    console.log(`- Total FAQs: ${faqs?.length || 0}`);
    
    // Count by firm
    const faqsByFirm = {};
    faqs?.forEach(faq => {
        faqsByFirm[faq.firm_id] = (faqsByFirm[faq.firm_id] || 0) + 1;
    });
    console.log('- FAQs by firm:', faqsByFirm);
    
    // Sample content length
    if (faqs?.length > 0) {
        const avgLength = faqs.reduce((sum, faq) => sum + (faq.answer_md?.length || 0), 0) / faqs.length;
        console.log(`- Average answer length: ${Math.round(avgLength)} characters`);
        console.log('- Sample FAQ:', {
            question: faqs[0].question.substring(0, 100),
            answer_preview: faqs[0].answer_md?.substring(0, 200) + '...'
        });
    }
    
    // 2. Analyze prop_firms table
    console.log('\n🏢 PROP_FIRMS TABLE:');
    const { data: firms } = await supabase
        .from('prop_firms')
        .select('*');
    
    console.log(`- Total firms: ${firms?.length || 0}`);
    firms?.forEach(firm => {
        console.log(`  • ${firm.name}: ${firm.description?.substring(0, 100) || 'No description'}...`);
    });
    
    // 3. Analyze account_plans table
    console.log('\n💰 ACCOUNT_PLANS TABLE:');
    const { data: plans } = await supabase
        .from('account_plans')
        .select('*');
    
    console.log(`- Total plans: ${plans?.length || 0}`);
    const plansByFirm = {};
    plans?.forEach(plan => {
        plansByFirm[plan.firm_id] = (plansByFirm[plan.firm_id] || 0) + 1;
    });
    console.log('- Plans by firm:', plansByFirm);
    
    // 4. Check for other tables with content
    console.log('\n🔍 CHECKING FOR OTHER CONTENT TABLES...');
    
    // Try common table names
    const tablesToCheck = [
        'documents', 'firm_documents', 'knowledge_base', 
        'content', 'information', 'rules', 'policies',
        'evaluations', 'requirements', 'pricing'
    ];
    
    for (const table of tablesToCheck) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (!error && data) {
                console.log(`✅ Found table: ${table} (investigating...)`);
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                console.log(`   - Records: ${count}`);
            }
        } catch (e) {
            // Table doesn't exist, skip
        }
    }
    
    // 5. Analyze data completeness
    console.log('\n📊 DATA ANALYSIS:');
    console.log('- FAQ Coverage:');
    const keywords = ['precio', 'costo', 'evaluacion', 'requisitos', 'drawdown', 'dias minimos'];
    for (const keyword of keywords) {
        const matches = faqs?.filter(f => 
            f.question.toLowerCase().includes(keyword) || 
            f.answer_md?.toLowerCase().includes(keyword)
        ).length || 0;
        console.log(`  • "${keyword}": ${matches} FAQs`);
    }
    
    // 6. Summary
    console.log('\n📈 SUMMARY:');
    const totalContent = (faqs?.length || 0) + (plans?.length || 0);
    console.log(`- Total content items: ${totalContent}`);
    console.log(`- Average FAQ answer length: ${Math.round(faqs?.reduce((sum, f) => sum + (f.answer_md?.length || 0), 0) / faqs?.length || 0)} chars`);
    console.log(`- Data structure: ${faqs?.some(f => f.answer_md?.length > 1000) ? 'Detailed FAQs' : 'Brief FAQs'}`);
    
    // Check if there's enough content for comprehensive answers
    const hasComprehensiveData = faqs?.some(f => f.answer_md?.length > 500);
    const coversAllTopics = keywords.every(k => 
        faqs?.some(f => f.question.toLowerCase().includes(k))
    );
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (!hasComprehensiveData) {
        console.log('⚠️ FAQ answers are too brief for comprehensive responses');
    }
    if (!coversAllTopics) {
        console.log('⚠️ Missing FAQs for common query types');
    }
    console.log(`📝 Need approximately ${7 * 30 - (faqs?.length || 0)} more FAQs for complete coverage`);
}

analyzeDatabase().catch(console.error);