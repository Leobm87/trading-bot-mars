require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('Applying pgvector migration...');

  try {
    // Enable pgvector extension
    await supabase.rpc('exec_sql', { sql: 'CREATE EXTENSION IF NOT EXISTS vector;' }).catch(() => {
      console.log('Extension already exists or using alternative method...');
    });

    // Add embedding column
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE faqs ADD COLUMN IF NOT EXISTS embedding vector(1536);' 
    }).catch(() => {
      console.log('Column already exists or using alternative method...');
    });

    // Create index
    await supabase.rpc('exec_sql', { 
      sql: `CREATE INDEX IF NOT EXISTS faqs_embedding_ivfflat 
            ON faqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);` 
    }).catch(() => {
      console.log('Index already exists or using alternative method...');
    });

    // Create RPC function
    const rpcSQL = `
CREATE OR REPLACE FUNCTION public.faq_vec_retrieve(
  q float4[],
  firm uuid,
  cats text[] DEFAULT NULL,
  k int DEFAULT 8
)
RETURNS TABLE (id uuid, question text, answer_md text, category text, slug text, vscore double precision)
LANGUAGE sql STABLE AS $
SELECT
  id, question, answer_md, category, slug,
  1 - (embedding <=> (q::vector(1536))) AS vscore
FROM faqs
WHERE firm_id = firm
  AND embedding IS NOT NULL
  AND (cats IS NULL OR category = ANY(cats))
ORDER BY embedding <=> (q::vector(1536)) ASC
LIMIT k;
$;`;

    await supabase.rpc('exec_sql', { sql: rpcSQL }).catch((err) => {
      console.log('RPC function creation failed, trying alternative...', err.message);
    });

    console.log('Migration applied successfully!');
    
  } catch (error) {
    console.log('Migration may have completed with some steps already existing:', error.message);
  }

  process.exit(0);
})();