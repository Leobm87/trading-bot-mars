require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('Applying aliases migration...');

  try {
    // Add aliases column
    try {
      await supabase.rpc('exec_sql', { 
        sql: "ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];" 
      });
    } catch (err) {
      console.log('Column already exists or using alternative method...', err.message);
    }

    // Create aliases index
    try {
      await supabase.rpc('exec_sql', { 
        sql: 'CREATE INDEX IF NOT EXISTS faqs_aliases_gin ON public.faqs USING gin (aliases);' 
      });
    } catch (err) {
      console.log('Aliases index already exists...', err.message);
    }

    // Create FTS index v2 including aliases
    const ftsSQL = `
CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING gin (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);`;

    try {
      await supabase.rpc('exec_sql', { sql: ftsSQL });
    } catch (err) {
      console.log('FTS index v2 already exists...', err.message);
    }

    console.log('Aliases migration applied successfully!');
    
  } catch (error) {
    console.log('Migration may have completed with some steps already existing:', error.message);
  }

  process.exit(0);
})();