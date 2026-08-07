alter table public.documents
  add column if not exists parse_error_code text;
