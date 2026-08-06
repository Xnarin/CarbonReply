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

create table if not exists public.activity_revisions (
  id uuid primary key default gen_random_uuid(),
  monthly_activity_id uuid not null references public.monthly_activity(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  month date not null,
  previous_kwh numeric(14, 3) not null check (previous_kwh >= 0),
  new_kwh numeric(14, 3) not null check (new_kwh >= 0),
  previous_confirmed boolean not null,
  new_confirmed boolean not null,
  change_type text not null check (change_type in ('confirmed', 'corrected')),
  created_at timestamptz not null default now()
);
create index if not exists activity_revisions_project_id_created_at_idx
  on public.activity_revisions (project_id, created_at desc);
create index if not exists activity_revisions_monthly_activity_id_idx
  on public.activity_revisions (monthly_activity_id);

create or replace function public.log_monthly_activity_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_revisions (
    monthly_activity_id,
    project_id,
    month,
    previous_kwh,
    new_kwh,
    previous_confirmed,
    new_confirmed,
    change_type
  ) values (
    new.id,
    new.project_id,
    new.month,
    old.kwh,
    new.kwh,
    old.confirmed,
    new.confirmed,
    case when old.kwh is distinct from new.kwh then 'corrected' else 'confirmed' end
  );

  return new;
end;
$$;
revoke all on function public.log_monthly_activity_revision() from public, anon, authenticated;

drop trigger if exists monthly_activity_revision_trigger on public.monthly_activity;
create trigger monthly_activity_revision_trigger
after update of kwh, confirmed on public.monthly_activity
for each row
when (old.kwh is distinct from new.kwh or old.confirmed is distinct from new.confirmed)
execute function public.log_monthly_activity_revision();

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
alter table public.activity_revisions enable row level security;
grant select on public.activity_revisions to authenticated;
grant select, insert, update, delete on public.activity_revisions to service_role;
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
  contact_email text not null unique,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists companies_company_name_normalized_idx on public.companies (lower(company_name));
alter table public.companies enable row level security;
alter table public.projects add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.projects alter column company_id set not null;
create index if not exists projects_company_id_created_at_idx on public.projects (company_id, created_at desc);
create policy "company owner can read company" on public.companies for select to authenticated using ((select auth.uid()) = auth_user_id);
create policy "company members can manage projects" on public.projects for all to authenticated using (exists (select 1 from public.companies c where c.id = projects.company_id and c.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.companies c where c.id = projects.company_id and c.auth_user_id = (select auth.uid())));
create policy "company members can manage documents" on public.documents for all to authenticated using (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = documents.project_id and c.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = documents.project_id and c.auth_user_id = (select auth.uid())));
create policy "company members can manage monthly activity" on public.monthly_activity for all to authenticated using (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = monthly_activity.project_id and c.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = monthly_activity.project_id and c.auth_user_id = (select auth.uid())));
create policy "company members can read activity revisions" on public.activity_revisions for select to authenticated using (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = activity_revisions.project_id and c.auth_user_id = (select auth.uid())));
create policy "company members can manage issues" on public.issues for all to authenticated using (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = issues.project_id and c.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id and c.auth_user_id = (select auth.uid())));
create policy "company members can manage reports" on public.reports for all to authenticated using (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id where p.id = reports.project_id and c.auth_user_id = (select auth.uid()))) with check (exists (select 1 from public.projects p join public.companies c on c.id = p.company_id and c.auth_user_id = (select auth.uid())));
