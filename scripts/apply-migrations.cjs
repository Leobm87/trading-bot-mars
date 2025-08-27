// scripts/apply-migrations.cjs - Manual migration script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('⚠️  Manual migration required:');
  console.log('Please run these SQL commands in Supabase SQL Editor:');
  console.log('');
  console.log('-- Migration 1: Add aliases column and indexes');
  console.log(`ALTER TABLE faqs 
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS faqs_aliases_trgm_idx
  ON faqs USING GIN ((array_to_string(aliases,' ')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING GIN (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);`);

  console.log('');
  console.log('-- Migration 2: Update RPC function');
  console.log(`CREATE OR REPLACE FUNCTION public.faq_retrieve_es(
  q    text,
  cats text[] DEFAULT NULL,
  k    int    DEFAULT 8
)
RETURNS TABLE (
  id         uuid,
  question   text,
  answer_md  text,
  category   text,
  slug       text,
  score      double precision
)
LANGUAGE sql STABLE AS $$
WITH qn AS (SELECT websearch_to_tsquery('public.es_unaccent', q) AS qt),
s AS (
  SELECT
    id, question, answer_md, category, slug,
    array_to_string(aliases,' ') AS aliases_join,
    to_tsvector('public.es_unaccent',
      coalesce(question,'') || ' ' ||
      coalesce(array_to_string(aliases,' '),'') || ' ' ||
      coalesce(answer_md,'')
    ) AS vec
  FROM faqs
  WHERE cats IS NULL OR category = ANY(cats)
)
SELECT
  id, question, answer_md, category, slug,
  0.7 * ts_rank_cd(vec, (SELECT qt FROM qn)) +
  0.3 * GREATEST(similarity(question, q), similarity(aliases_join, q)) AS score
FROM s
ORDER BY score DESC
LIMIT k;
$$;`);

  console.log('');
  console.log('After applying migrations manually, run:');
  console.log('  npm run seed:aliases:apex');
  console.log('  npm run try:apex');
  console.log('  npm run eval:apex');
})();