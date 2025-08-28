CREATE OR REPLACE FUNCTION public.faq_vec_retrieve(
  p_q        float4[],
  p_firm_id  uuid,
  p_cats     text[] DEFAULT NULL,
  p_k        int    DEFAULT 8
)
RETURNS TABLE (
  id uuid, question text, answer_md text, category text, slug text, vscore double precision
)
LANGUAGE sql STABLE AS $
SELECT
  id, question, answer_md, category, slug,
  1 - (embedding <=> (p_q::vector(1536))) AS vscore
FROM faqs
WHERE firm_id = p_firm_id
  AND embedding IS NOT NULL
  AND (p_cats IS NULL OR category = ANY(p_cats))
ORDER BY embedding <=> (p_q::vector(1536)) ASC
LIMIT p_k;
$;

-- Optional sanity
SELECT to_regprocedure('public.faq_vec_retrieve(real[],uuid,text[],integer)') AS rpc_vec_ok;