create table if not exists public.fleet_audits (
  id uuid primary key default gen_random_uuid(),
  audit_date date,
  fleet text,
  customer text,
  auditor text,
  day_shift_operator text,
  night_shift_operator text,
  audit_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fleet_audits enable row level security;

create or replace function public.set_fleet_audits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_fleet_audits_updated_at
  on public.fleet_audits;

create trigger set_fleet_audits_updated_at
  before update on public.fleet_audits
  for each row
  execute function public.set_fleet_audits_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fleet_audits'
      and policyname = 'Allow public fleet audit reads'
  ) then
    create policy "Allow public fleet audit reads"
      on public.fleet_audits
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fleet_audits'
      and policyname = 'Allow public fleet audit writes'
  ) then
    create policy "Allow public fleet audit writes"
      on public.fleet_audits
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fleet_audits'
      and policyname = 'Allow public fleet audit updates'
  ) then
    create policy "Allow public fleet audit updates"
      on public.fleet_audits
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fleet_audits'
      and policyname = 'Allow public fleet audit deletes'
  ) then
    create policy "Allow public fleet audit deletes"
      on public.fleet_audits
      for delete
      using (true);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fleet_audits'
  ) then
    alter publication supabase_realtime add table public.fleet_audits;
  end if;
exception
  when duplicate_object then
    null;
end $$;
