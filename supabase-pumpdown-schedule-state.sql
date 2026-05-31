create table if not exists public.pumpdown_schedule_state (
  id text primary key,
  schedule jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pumpdown_schedule_state enable row level security;

create or replace function public.set_pumpdown_schedule_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pumpdown_schedule_updated_at
  on public.pumpdown_schedule_state;

create trigger set_pumpdown_schedule_updated_at
  before update on public.pumpdown_schedule_state
  for each row
  execute function public.set_pumpdown_schedule_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_schedule_state'
      and policyname = 'Allow public pumpdown schedule reads'
  ) then
    create policy "Allow public pumpdown schedule reads"
      on public.pumpdown_schedule_state
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_schedule_state'
      and policyname = 'Allow public pumpdown schedule writes'
  ) then
    create policy "Allow public pumpdown schedule writes"
      on public.pumpdown_schedule_state
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_schedule_state'
      and policyname = 'Allow public pumpdown schedule updates'
  ) then
    create policy "Allow public pumpdown schedule updates"
      on public.pumpdown_schedule_state
      for update
      using (true)
      with check (true);
  end if;
end $$;

insert into public.pumpdown_schedule_state (id, schedule, updated_at)
values ('current', '{}'::jsonb, now())
on conflict (id) do nothing;

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
      and tablename = 'pumpdown_schedule_state'
  ) then
    alter publication supabase_realtime add table public.pumpdown_schedule_state;
  end if;
exception
  when duplicate_object then
    null;
end $$;
