-- 탄소길잡이 MVP 초기 스키마
-- Supabase Dashboard > SQL Editor에서 한 번 실행합니다.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  target_year integer not null check (target_year between 2020 and 2100),
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  parsed_month date,
  parsed_kwh numeric,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  month date not null,
  kwh numeric not null check (kwh >= 0),
  source text not null check (source in ('gemini', 'manual')),
  confirmed boolean not null default false,
  unique (project_id, month)
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_type text not null check (issue_type in ('missing', 'outlier', 'parse_failed')),
  month date,
  status text not null default 'open' check (status in ('open', 'resolved', 'confirmed')),
  asked_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  total_kwh numeric not null,
  total_tco2e numeric not null,
  grade text not null check (grade in ('A', 'B', 'C')),
  factor_value numeric not null,
  factor_version text not null,
  calculated_at timestamptz not null default now()
);

-- MVP 데모용 업로드 버킷. 실제 서비스에서는 로그인과 사용자별 RLS 정책을 추가합니다.
insert into storage.buckets (id, name, public)
values ('electricity-bills', 'electricity-bills', false)
on conflict (id) do nothing;
