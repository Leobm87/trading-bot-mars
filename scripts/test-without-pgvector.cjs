require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  console.log('Testing hybrid retrieval without pgvector (will skip vector search)...');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  // Test lexical search first
  console.log('Testing lexical search...');
  const { data, error } = await supabase.rpc('faq_retrieve_es', { 
    q: 'cuanto cuesta', 
    cats: null, 
    k: 3 
  });
  
  if (error) {
    console.error('Lexical search failed:', error);
    return;
  }
  
  console.log(`Found ${data.length} results via lexical search:`);
  data.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.question} (score: ${item.score})`);
  });
  
  console.log('\nTest completed. Lexical search is working.');
  console.log('Note: Vector search requires pgvector extension and embedding column.');
  
})().catch(console.error);