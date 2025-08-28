CREATE OR REPLACE FUNCTION public.faq_retrieve_es_v2(
  q text,
  firm uuid,
  cats text[] default null,
  k int default 8
)
RETURNS TABLE (
  id uuid,
  question text,
  answer_md text,
  category text,
  slug text,
  score double precision
)
LANGUAGE sql STABLE AS $$
WITH qn AS (
  SELECT websearch_to_tsquery('public.es_unaccent', q) AS qt
),
s AS (
  SELECT id, question, answer_md, slug as category, slug,
         to_tsvector('public.es_unaccent',
           coalesce(question,'') || ' ' ||
           coalesce(array_to_string_immutable(aliases,' '),'') || ' ' ||
           coalesce(answer_md,'')
         ) AS vec,
         similarity(coalesce(question,'') || ' ' || coalesce(array_to_string_immutable(aliases,' '),''), q) AS trig
  FROM public.faqs
  WHERE firm_id = firm
    AND (cats IS NULL OR slug = ANY(cats))
)
SELECT id, question, answer_md, category, slug,
       0.7 * ts_rank_cd(vec, (SELECT qt FROM qn))
     + 0.3 * trig AS score
FROM s
ORDER BY score DESC
LIMIT k;
$$;

-- Verificación rápida:
SELECT to_regprocedure('public.faq_retrieve_es_v2(text,uuid,text[],integer)') AS rpc_ok;
SELECT column_name FROM information_schema.columns
 WHERE table_name='faqs' AND column_name='aliases';