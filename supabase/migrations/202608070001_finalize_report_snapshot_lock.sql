-- Freeze finalized Scope 2 results as an immutable, versioned snapshot.
alter table public.reports
  add column if not exists version integer not null default 1,
  add column if not exists factor_year integer,
  add column if not exists validation_notes text not null default '';

alter table public.reports drop constraint if exists reports_version_check;
alter table public.reports add constraint reports_version_check check (version > 0);
alter table public.reports drop constraint if exists reports_factor_year_check;
alter table public.reports add constraint reports_factor_year_check check (factor_year between 2020 and 2100);

update public.reports r
set factor_year = case
  when p.target_year <= 2021 then 2021
  when p.target_year = 2022 then 2022
  when p.target_year = 2023 then 2023
  when p.target_year = 2024 then 2024
  else 2025
end
from public.projects p
where p.id = r.project_id
  and r.factor_year is null;

alter table public.reports alter column factor_year set not null;

create table if not exists public.report_activity_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  month date not null,
  kwh numeric(14, 3) not null check (kwh >= 0),
  emissions_kg numeric(14, 6) not null check (emissions_kg >= 0),
  source text not null check (source in ('gemini', 'manual')),
  created_at timestamptz not null default now(),
  unique (report_id, month)
);
create index if not exists report_activity_snapshots_report_id_idx
  on public.report_activity_snapshots (report_id);
create index if not exists report_activity_snapshots_project_id_month_idx
  on public.report_activity_snapshots (project_id, month);

insert into public.report_activity_snapshots (report_id, project_id, month, kwh, emissions_kg, source, created_at)
select r.id, a.project_id, a.month, a.kwh, a.kwh * r.factor_value, a.source, r.calculated_at
from public.reports r
join public.monthly_activity a on a.project_id = r.project_id
on conflict (report_id, month) do nothing;

alter table public.report_activity_snapshots enable row level security;
grant select on public.report_activity_snapshots to authenticated;
grant select, insert, update, delete on public.report_activity_snapshots to service_role;

drop policy if exists "company members can read report snapshots" on public.report_activity_snapshots;
create policy "company members can read report snapshots"
on public.report_activity_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.companies c on c.id = p.company_id
    where p.id = report_activity_snapshots.project_id
      and c.auth_user_id = (select auth.uid())
  )
);

create or replace function public.finalize_project_report(
  p_project_id uuid,
  p_company_id uuid,
  p_grade text,
  p_factor_value numeric,
  p_factor_year integer,
  p_factor_version text,
  p_validation_notes text
)
returns table (report_id uuid, report_version integer, finalized_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_project public.projects%rowtype;
  saved_report public.reports%rowtype;
  activity_count integer;
  all_confirmed boolean;
  total_usage numeric(14, 3);
begin
  if p_grade not in ('A', 'B', 'C') then
    raise exception 'invalid validation grade';
  end if;
  if p_factor_value <= 0 or p_factor_year not between 2020 and 2100 then
    raise exception 'invalid emission factor';
  end if;

  select * into locked_project
  from public.projects
  where id = p_project_id and company_id = p_company_id
  for update;

  if not found then
    raise exception 'project not found';
  end if;

  if locked_project.status = 'completed' then
    select * into saved_report from public.reports where project_id = p_project_id;
    if not found then
      raise exception 'completed project has no report';
    end if;
    return query select saved_report.id, saved_report.version, saved_report.calculated_at;
    return;
  end if;

  select count(*), coalesce(bool_and(confirmed), false), coalesce(sum(kwh), 0)
  into activity_count, all_confirmed, total_usage
  from public.monthly_activity
  where project_id = p_project_id
    and extract(year from month)::integer = locked_project.target_year;

  if activity_count = 0 then
    raise exception 'no monthly activity';
  end if;
  if not all_confirmed then
    raise exception 'all monthly activity must be confirmed';
  end if;
  if exists (
    select 1 from public.monthly_activity
    where project_id = p_project_id
      and extract(year from month)::integer <> locked_project.target_year
  ) then
    raise exception 'monthly activity year does not match project year';
  end if;

  insert into public.reports (
    project_id, total_kwh, total_tco2e, grade, factor_value, factor_year,
    factor_version, validation_notes, version, calculated_at
  ) values (
    p_project_id, total_usage, total_usage * p_factor_value / 1000,
    p_grade, p_factor_value, p_factor_year, p_factor_version,
    coalesce(p_validation_notes, ''), 1, now()
  )
  on conflict (project_id) do update set
    total_kwh = excluded.total_kwh,
    total_tco2e = excluded.total_tco2e,
    grade = excluded.grade,
    factor_value = excluded.factor_value,
    factor_year = excluded.factor_year,
    factor_version = excluded.factor_version,
    validation_notes = excluded.validation_notes,
    version = 1,
    calculated_at = excluded.calculated_at
  returning * into saved_report;

  delete from public.report_activity_snapshots where report_id = saved_report.id;
  insert into public.report_activity_snapshots (
    report_id, project_id, month, kwh, emissions_kg, source, created_at
  )
  select saved_report.id, a.project_id, a.month, a.kwh,
    a.kwh * p_factor_value, a.source, saved_report.calculated_at
  from public.monthly_activity a
  where a.project_id = p_project_id
  order by a.month;

  update public.projects set status = 'completed' where id = p_project_id;
  return query select saved_report.id, saved_report.version, saved_report.calculated_at;
end;
$$;

revoke all on function public.finalize_project_report(uuid, uuid, text, numeric, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_project_report(uuid, uuid, text, numeric, integer, text, text)
  to service_role;

create or replace function public.block_completed_project_content_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  related_project_id uuid;
  related_status text;
begin
  related_project_id := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  select status into related_status
  from public.projects
  where id = related_project_id
  for key share;
  if related_status = 'completed' then
    raise exception 'finalized project content is locked';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.block_completed_project_content_changes() from public, anon, authenticated;

drop trigger if exists lock_completed_monthly_activity on public.monthly_activity;
create trigger lock_completed_monthly_activity
before insert or update or delete on public.monthly_activity
for each row execute function public.block_completed_project_content_changes();

drop trigger if exists lock_completed_documents on public.documents;
create trigger lock_completed_documents
before insert or update or delete on public.documents
for each row execute function public.block_completed_project_content_changes();

drop trigger if exists lock_completed_reports on public.reports;
create trigger lock_completed_reports
before insert or update or delete on public.reports
for each row execute function public.block_completed_project_content_changes();

drop trigger if exists lock_completed_report_snapshots on public.report_activity_snapshots;
create trigger lock_completed_report_snapshots
before insert or update or delete on public.report_activity_snapshots
for each row execute function public.block_completed_project_content_changes();

create or replace function public.block_completed_project_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'completed' and new is distinct from old then
    raise exception 'finalized project is locked';
  end if;
  return new;
end;
$$;
revoke all on function public.block_completed_project_update() from public, anon, authenticated;

drop trigger if exists lock_completed_project on public.projects;
create trigger lock_completed_project
before update on public.projects
for each row execute function public.block_completed_project_update();
