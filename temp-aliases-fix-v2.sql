-- Add aliases column
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS faqs_aliases_gin ON public.faqs USING gin (aliases);

-- Crear función IMMUTABLE para convertir array a string  
CREATE OR REPLACE FUNCTION array_to_string_immutable(text[], text) 
RETURNS text AS $$
  SELECT array_to_string($1, $2)
$$ LANGUAGE SQL IMMUTABLE;

-- FTS index v2 con función IMMUTABLE
CREATE INDEX IF NOT EXISTS faqs_fts_idx_v2 ON faqs USING gin (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string_immutable(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);