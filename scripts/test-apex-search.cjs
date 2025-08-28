require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('Testing APEX-specific queries...');
  
  // Test with APEX-specific question
  const queries = [
    'instrumentos apex',
    'microfuturos',
    'evaluacion minima dias',
    'futuros disponibles'
  ];
  
  for (const query of queries) {
    console.log(`\nTesting query: "${query}"`);
    const { data, error } = await supabase.rpc('faq_retrieve_es', { 
      q: query, 
      cats: null, 
      k: 3 
    });
    
    if (error) {
      console.error('Error:', error);
      continue;
    }
    
    const apexResults = data.filter(item => 
      item.question && item.question.toLowerCase().includes('apex') ||
      item.question === 'instrumentos apex' ||
      item.slug && ['evaluacion-minima', 'que-instrumentos-tradear', 'microfuturos-disponibles', 'futuros-disponibles'].includes(item.slug)
    );
    
    console.log(`Found ${data.length} total results, ${apexResults.length} APEX-related:`);
    apexResults.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.question} (${item.slug}) - score: ${item.score}`);
    });
    
    if (apexResults.length === 0 && data.length > 0) {
      console.log('  No APEX results, showing top result:');
      console.log(`    ${data[0].question} (${data[0].slug || 'no-slug'}) - score: ${data[0].score}`);
    }
  }
  
})().catch(console.error);