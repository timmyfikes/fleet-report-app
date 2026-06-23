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

alter table public.fleet_audits
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists last_autosaved_at timestamptz;

update public.fleet_audits
set
  status = 'completed',
  completed_at = coalesce(completed_at, updated_at, created_at),
  last_autosaved_at = coalesce(last_autosaved_at, updated_at, created_at)
where status is null;

alter table public.fleet_audits
  alter column status set default 'draft',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fleet_audits_status_check'
      and conrelid = 'public.fleet_audits'::regclass
  ) then
    alter table public.fleet_audits
      add constraint fleet_audits_status_check
      check (status in ('draft', 'completed'));
  end if;
end $$;

create index if not exists fleet_audits_status_updated_at_idx
  on public.fleet_audits (status, updated_at desc);

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

delete from public.fleet_audits
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by audit_date, fleet
        order by updated_at desc, created_at desc, id desc
      ) as duplicate_rank
    from public.fleet_audits
    where audit_date is not null
      and fleet is not null
  ) ranked_audits
  where duplicate_rank > 1
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fleet_audits_audit_date_fleet_key'
      and conrelid = 'public.fleet_audits'::regclass
  ) then
    alter table public.fleet_audits
      add constraint fleet_audits_audit_date_fleet_key
      unique (audit_date, fleet);
  end if;
end $$;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fleet-audit-photos',
  'fleet-audit-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public fleet audit photo reads'
  ) then
    create policy "Allow public fleet audit photo reads"
      on storage.objects
      for select
      using (bucket_id = 'fleet-audit-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public fleet audit photo writes'
  ) then
    create policy "Allow public fleet audit photo writes"
      on storage.objects
      for insert
      with check (bucket_id = 'fleet-audit-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public fleet audit photo updates'
  ) then
    create policy "Allow public fleet audit photo updates"
      on storage.objects
      for update
      using (bucket_id = 'fleet-audit-photos')
      with check (bucket_id = 'fleet-audit-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public fleet audit photo deletes'
  ) then
    create policy "Allow public fleet audit photo deletes"
      on storage.objects
      for delete
      using (bucket_id = 'fleet-audit-photos');
  end if;
end $$;
