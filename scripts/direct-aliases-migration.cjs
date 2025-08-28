require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('Applying aliases migration directly...');

  try {
    // Try direct SQL execution  
    const { data, error } = await supabase.rpc('sql_exec', {
      query: "ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];"
    });

    console.log('sql_exec result:', { data, error });

    if (error) {
      // Try alternative method
      const { data: data2, error: error2 } = await supabase
        .from('faqs')
        .select('id')
        .limit(1);
      
      if (error2 && error2.message.includes('aliases')) {
        console.log('Column aliases does not exist. Need manual SQL execution.');
        console.log('Please run this SQL in Supabase SQL editor:');
        console.log("ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];");
        console.log("CREATE INDEX IF NOT EXISTS faqs_aliases_gin ON public.faqs USING gin (aliases);");
        console.log(`CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING gin (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);`);
        process.exit(2);
      }
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.log('Error applying migration:', error.message);
    console.log('Please run this SQL manually in Supabase SQL editor:');
    console.log("ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];");
    process.exit(1);
  }

  process.exit(0);
})();