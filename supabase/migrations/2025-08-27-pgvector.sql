CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS faqs_embedding_ivfflat
  ON faqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.faq_vec_retrieve(
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
$$;