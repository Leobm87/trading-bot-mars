-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Spanish text search configuration with unaccent support
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS public.es_unaccent ( COPY = pg_catalog.spanish );
ALTER TEXT SEARCH CONFIGURATION public.es_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, spanish_stem;

-- FTS index using the es_unaccent configuration
-- IMPORTANT: Using the config in to_tsvector, NOT calling unaccent() directly
CREATE INDEX IF NOT EXISTS faqs_fts_idx ON faqs USING GIN (
  to_tsvector('public.es_unaccent', coalesce(question,'') || ' ' || coalesce(answer_md,''))
);

-- Trigram index for fuzzy matching on question field
CREATE INDEX IF NOT EXISTS faqs_q_trgm_idx
  ON faqs USING GIN (question gin_trgm_ops);

-- Hybrid retrieval RPC function (BM25 + trigram scoring)
CREATE OR REPLACE FUNCTION public.faq_retrieve_es(q text, cats text[] DEFAULT NULL, k int DEFAULT 8)
RETURNS TABLE (id uuid, question text, answer_md text, category text, score double precision)
LANGUAGE sql STABLE AS $$
WITH qn AS (SELECT websearch_to_tsquery('public.es_unaccent', q) AS qt),
s AS (
  SELECT id, question, answer_md, category,
         to_tsvector('public.es_unaccent', coalesce(question,'') || ' ' || coalesce(answer_md,'')) AS vec
  FROM faqs
  WHERE cats IS NULL OR category = ANY(cats)
)
SELECT id, question, answer_md, category,
       0.7 * ts_rank_cd(vec, (SELECT qt FROM qn)) +
       0.3 * similarity(question, q) AS score
FROM s
ORDER BY score DESC
LIMIT k;
$$;