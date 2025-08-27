CREATE OR REPLACE FUNCTION public.faq_retrieve_es(
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
LANGUAGE sql STABLE AS $
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
$;