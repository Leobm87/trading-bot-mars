const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Apex firm ID from CLAUDE.md
const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

async function auditApexFAQs() {
    // Create Supabase client
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('🔍 Analyzing Apex FAQs from Supabase...\n');
    
    try {
        // Query all FAQs for Apex firm
        const { data: faqs, error } = await supabase
            .from('faqs')
            .select('*')
            .eq('firm_id', APEX_FIRM_ID);
            
        if (error) {
            console.error('❌ Error fetching FAQs:', error.message);
            return;
        }
        
        console.log(`📊 Total Apex FAQs found: ${faqs.length}\n`);
        
        // Define keyword groups
        const keywordGroups = {
            'activation/PA/funded': ['activation', 'pa', 'funded', 'activacion', 'fondeo', 'activar'],
            'safety/umbral/retiro': ['safety', 'umbral', 'retiro', 'withdrawal', 'seguridad', 'retirar'],
            'rules/reglas': ['rules', 'reglas', 'normas', 'rule', 'regulation'],
            'cost/price': ['cost', 'price', 'precio', 'costo', 'cuanto', 'pagar', 'payment']
        };
        
        // Group FAQs by keywords
        const groupedFAQs = {};
        
        // Initialize groups
        Object.keys(keywordGroups).forEach(group => {
            groupedFAQs[group] = [];
        });
        
        // Categorize each FAQ
        faqs.forEach(faq => {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer_md ? faq.answer_md.toLowerCase() : '';
            
            Object.keys(keywordGroups).forEach(groupName => {
                const keywords = keywordGroups[groupName];
                const hasKeyword = keywords.some(keyword => 
                    questionLower.includes(keyword) || answerLower.includes(keyword)
                );
                
                if (hasKeyword) {
                    groupedFAQs[groupName].push({
                        id: faq.id,
                        question: faq.question,
                        category: faq.category,
                        slug: faq.slug
                    });
                }
            });
        });
        
        // Display results
        Object.keys(groupedFAQs).forEach(groupName => {
            console.log(`🏷️  GROUP: ${groupName.toUpperCase()}`);
            console.log(`   Count: ${groupedFAQs[groupName].length}`);
            console.log('   ─────────────────────────────────────────');
            
            if (groupedFAQs[groupName].length > 0) {
                groupedFAQs[groupName].forEach((faq, index) => {
                    console.log(`   ${index + 1}. ${faq.question}`);
                    console.log(`      Category: ${faq.category || 'N/A'} | Slug: ${faq.slug || 'N/A'}`);
                });
            } else {
                console.log('   ❌ No FAQs found for this group');
            }
            console.log('\n');
        });
        
        // Summary statistics
        const totalCategorized = Object.values(groupedFAQs)
            .reduce((sum, group) => sum + group.length, 0);
        const uncategorized = faqs.filter(faq => {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer_md ? faq.answer_md.toLowerCase() : '';
            
            return !Object.values(keywordGroups).flat().some(keyword =>
                questionLower.includes(keyword) || answerLower.includes(keyword)
            );
        });
        
        console.log('📈 SUMMARY:');
        console.log(`   Total FAQs: ${faqs.length}`);
        console.log(`   Categorized: ${totalCategorized}`);
        console.log(`   Uncategorized: ${uncategorized.length}`);
        
        if (uncategorized.length > 0) {
            console.log('\n🔍 UNCATEGORIZED FAQs:');
            uncategorized.forEach((faq, index) => {
                console.log(`   ${index + 1}. ${faq.question}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error during audit:', error.message);
    }
}

// Run the audit
auditApexFAQs();