-- The RETURN TABLE output parameter `report_id` shares a name with the
-- snapshot column, so qualify the column in the delete statement.
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
  if p_grade not in ('A', 'B', 'C') then raise exception 'invalid validation grade'; end if;
  if p_factor_value <= 0 or p_factor_year not between 2020 and 2100 then raise exception 'invalid emission factor'; end if;
  select * into locked_project from public.projects where id = p_project_id and company_id = p_company_id for update;
  if not found then raise exception 'project not found'; end if;
  if locked_project.status = 'completed' then
    select * into saved_report from public.reports where project_id = p_project_id;
    if not found then raise exception 'completed project has no report'; end if;
    return query select saved_report.id, saved_report.version, saved_report.calculated_at;
    return;
  end if;
  select count(*), coalesce(bool_and(confirmed), false), coalesce(sum(kwh), 0)
  into activity_count, all_confirmed, total_usage
  from public.monthly_activity where project_id = p_project_id and extract(year from month)::integer = locked_project.target_year;
  if activity_count = 0 then raise exception 'no monthly activity'; end if;
  if not all_confirmed then raise exception 'all monthly activity must be confirmed'; end if;
  if exists (select 1 from public.monthly_activity where project_id = p_project_id and extract(year from month)::integer <> locked_project.target_year) then
    raise exception 'monthly activity year does not match project year';
  end if;
  insert into public.reports (project_id, total_kwh, total_tco2e, grade, factor_value, factor_year, factor_version, validation_notes, version, calculated_at)
  values (p_project_id, total_usage, total_usage * p_factor_value / 1000, p_grade, p_factor_value, p_factor_year, p_factor_version, coalesce(p_validation_notes, ''), 1, now())
  on conflict (project_id) do update set total_kwh = excluded.total_kwh, total_tco2e = excluded.total_tco2e, grade = excluded.grade, factor_value = excluded.factor_value, factor_year = excluded.factor_year, factor_version = excluded.factor_version, validation_notes = excluded.validation_notes, version = 1, calculated_at = excluded.calculated_at
  returning * into saved_report;
  delete from public.report_activity_snapshots as snapshots where snapshots.report_id = saved_report.id;
  insert into public.report_activity_snapshots (report_id, project_id, month, kwh, emissions_kg, source, created_at)
  select saved_report.id, a.project_id, a.month, a.kwh, a.kwh * p_factor_value, a.source, saved_report.calculated_at
  from public.monthly_activity a where a.project_id = p_project_id order by a.month;
  update public.projects set status = 'completed' where id = p_project_id;
  return query select saved_report.id, saved_report.version, saved_report.calculated_at;
end;
$$;
