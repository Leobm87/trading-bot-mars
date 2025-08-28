require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('Checking if embedding column exists...');
  
  try {
    // Test if embedding column exists by trying to select it
    const { data, error } = await supabase.from('faqs').select('embedding').limit(1);
    
    if (error && error.code === 'PGRST204') {
      console.log('Embedding column does not exist. It needs to be added manually in Supabase dashboard.');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log('');
      console.log('-- Enable pgvector extension');
      console.log('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('');
      console.log('-- Add embedding column');
      console.log('ALTER TABLE faqs ADD COLUMN embedding vector(1536);');
      console.log('');
      console.log('-- Create index');
      console.log('CREATE INDEX faqs_embedding_ivfflat ON faqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);');
      console.log('');
      console.log('-- Create vector retrieval function');
      console.log(`CREATE OR REPLACE FUNCTION public.faq_vec_retrieve(
  q float4[],
  firm uuid,
  cats text[] DEFAULT NULL,
  k int DEFAULT 8
)
RETURNS TABLE (id uuid, question text, answer_md text, category text, slug text, vscore double precision)
LANGUAGE sql STABLE AS $$
SELECT
  id, question, answer_md, category, slug,
  1 - (embedding <=> (q::vector(1536))) AS vscore
FROM faqs
WHERE firm_id = firm
  AND embedding IS NOT NULL
  AND (cats IS NULL OR category = ANY(cats))
ORDER BY embedding <=> (q::vector(1536)) ASC
LIMIT k;
$$;`);
      process.exit(1);
    } else if (error) {
      throw error;
    }
    
    console.log('Embedding column exists!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();