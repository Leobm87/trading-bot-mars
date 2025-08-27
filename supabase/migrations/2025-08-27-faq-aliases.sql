-- Add aliases array and indexes
ALTER TABLE faqs
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS faqs_aliases_trgm_idx
  ON faqs USING GIN ((array_to_string(aliases,' ')) gin_trgm_ops);

-- FTS index v2 that also includes aliases (keep the original index too)
CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING GIN (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);