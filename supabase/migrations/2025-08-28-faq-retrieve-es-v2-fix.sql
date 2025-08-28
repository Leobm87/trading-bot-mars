create or replace function public.faq_retrieve_es_v2(
  q     text,
  firm  uuid,
  cats  text[] default null,
  k     int    default 8
)
returns table (
  id uuid,
  question text,
  answer_md text,
  category text,
  slug text,
  score double precision
)
language sql stable as $$
with qn as (
  select websearch_to_tsquery('public.es_unaccent', q) as qt
),
s as (
  select id, question, answer_md, category, slug,
         to_tsvector('public.es_unaccent',
           coalesce(question,'') || ' ' ||
           coalesce(array_to_string_immutable(aliases,' '),'') || ' ' ||
           coalesce(answer_md,'')
         ) as vec,
         similarity(
           coalesce(question,'') || ' ' ||
           coalesce(array_to_string_immutable(aliases,' '),''),
           q
         ) as trig
  from public.faqs
  where firm_id = firm
    and (cats is null or category = any(cats))
)
select id, question, answer_md, category, slug,
       0.7 * ts_rank_cd(vec, (select qt from qn))
     + 0.3 * trig as score
from s
order by score desc
limit k;
$$;

-- sanity check
select to_regprocedure('public.faq_retrieve_es_v2(text,uuid,text[],integer)') as rpc_ok;