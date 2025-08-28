-- Add aliases column and FTS index v2 including aliases
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS faqs_aliases_gin ON public.faqs USING gin (aliases);

-- FTS que incluya aliases (deja el índice antiguo si quieres; este será el "v2")
CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING gin (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);