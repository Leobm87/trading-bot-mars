-- Add aliases column and FTS index v2 including aliases
alter table public.faqs add column if not exists aliases text[] default '{}'::text[];
create index if not exists faqs_aliases_gin on public.faqs using gin (aliases);

-- FTS que incluya aliases (deja el índice antiguo si quieres; este será el "v2")
create index if not exists faqs_fts_idx_v2 on faqs using gin (
  to_tsvector('public.es_unaccent',
    coalesce(question,'') || ' ' ||
    coalesce(array_to_string(aliases,' '),'') || ' ' ||
    coalesce(answer_md,'')
  )
);