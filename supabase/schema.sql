-- CarbonReply MVP schema. Application writes use a server-only secret key.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(trim(company_name)) between 1 and 120),
  target_year integer not null check (target_year between 2020 and 2100),
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  parsed_month date,
  parsed_kwh numeric(14, 3),
  parse_status text not null default 'uploading' check (parse_status in ('uploading', 'pending', 'completed', 'failed')),
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists documents_project_id_created_at_idx on public.documents (project_id, created_at desc);

create table if not exists public.monthly_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  month date not null,
  kwh numeric(14, 3) not null check (kwh >= 0),
  source text not null check (source in ('gemini', 'manual')),
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, month)
);
create index if not exists monthly_activity_project_id_month_idx on public.monthly_activity (project_id, month);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_type text not null check (issue_type in ('missing', 'outlier', 'parse_failed')),
  month date,
  status text not null default 'open' check (status in ('open', 'resolved', 'confirmed')),
  asked_count integer not null default 0 check (asked_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists issues_project_id_status_idx on public.issues (project_id, status);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  total_kwh numeric(14, 3) not null check (total_kwh >= 0),
  total_tco2e numeric(14, 6) not null check (total_tco2e >= 0),
  grade text not null check (grade in ('A', 'B', 'C')),
  factor_value numeric(14, 8) not null check (factor_value > 0),
  factor_version text not null,
  calculated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.monthly_activity enable row level security;
alter table public.issues enable row level security;
alter table public.reports enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('electricity-bills', 'electricity-bills', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Company credentials and row ownership. This migration is applied after the base schema.
create table if not exists public.companies (
  id uuid primary key,
  company_name text not null check (char_length(trim(company_name)) between 1 and 120),
  login_email text not null unique,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists companies_company_name_normalized_idx on public.companies (lower(company_name));
alter table public.companies enable row level security;
alter table public.projects add column if not exists company_id uuid references public.companies(id) on delete cascade;
create index if not exists projects_company_id_created_at_idx on public.projects (company_id, created_at desc);
