-- PRD-006: Add short answer column for concise responses
alter table public.faqs
  add column if not exists answer_short_md text;