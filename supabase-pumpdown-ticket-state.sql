create table if not exists public.pumpdown_ticket_state (
  id text primary key,
  tickets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pumpdown_ticket_state enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_ticket_state'
      and policyname = 'Allow public pumpdown ticket reads'
  ) then
    create policy "Allow public pumpdown ticket reads"
      on public.pumpdown_ticket_state
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_ticket_state'
      and policyname = 'Allow public pumpdown ticket writes'
  ) then
    create policy "Allow public pumpdown ticket writes"
      on public.pumpdown_ticket_state
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pumpdown_ticket_state'
      and policyname = 'Allow public pumpdown ticket updates'
  ) then
    create policy "Allow public pumpdown ticket updates"
      on public.pumpdown_ticket_state
      for update
      using (true)
      with check (true);
  end if;
end $$;

insert into public.pumpdown_ticket_state (id, tickets, updated_at)
values (
  'current',
  $tickets$
[
  {"id":"ticket-1779075347476-acdca1993f7788","fleet":"Misc","sourceFleet":"Misc","customer":"Diamondback","customerOther":"","job":"Andretti Rigdown Forklift","startMode":"tbd","startDate":"","endMode":"tbd","endDate":"","ticket":"200024","status":"running"},
  {"id":"ticket-1779075339178-ba8897228f75b","fleet":"Misc","sourceFleet":"Misc","customer":"Diamondback","customerOther":"","job":"Marion East Rig up Forklift","startMode":"tbd","startDate":"","endMode":"tbd","endDate":"","ticket":"200025","status":"running"},
  {"id":"ticket-1779046141063-d20c24a79c7c4","fleet":"3","sourceFleet":"3","customer":"Apache","customerOther":"","job":"Balagrave","startMode":"date","startDate":"2026-05-15","endMode":"date","endDate":"2026-05-17","ticket":"200018","status":"sent to customer"},
  {"id":"ticket-1779035267154-aa1b7b391c11f8","fleet":"2","sourceFleet":"2","customer":"Coterra","customerOther":"","job":"Tres Equis 5-8 State Com","startMode":"tbd","startDate":"","endMode":"tbd","endDate":"","ticket":"200017","status":"running"},
  {"id":"ticket-1779035018148-b402135ab16898","fleet":"5","sourceFleet":"5","customer":"Diamondback","customerOther":"","job":"Marion East","startMode":"date","startDate":"2026-05-16","endMode":"tbd","endDate":"","ticket":"200012","status":"running"},
  {"id":"ticket-1779035014561-a554a907ccb53","fleet":"1","sourceFleet":"1","customer":"Diamondback","customerOther":"","job":"Marion East","startMode":"date","startDate":"2026-05-16","endMode":"tbd","endDate":"","ticket":"200011","status":"running"},
  {"id":"ticket-1779034838867-46f0f01c7ab758","fleet":"8","sourceFleet":"8","customer":"Coterra","customerOther":"","job":"State Road Runner C403H","startMode":"date","startDate":"2026-05-18","endMode":"tbd","endDate":"","ticket":"200016","status":"running"},
  {"id":"ticket-1779034418370-2d73ee7cd83ec","fleet":"4","sourceFleet":"4","customer":"Matador","customerOther":"","job":"Gus Fed Com 0731 211H","startMode":"date","startDate":"2026-05-16","endMode":"tbd","endDate":"","ticket":"200013","status":"running"},
  {"id":"ticket-1779034417971-d45d8835836e7","fleet":"4","sourceFleet":"4","customer":"Matador","customerOther":"","job":"Gus Federal Com 0731 205H","startMode":"tbd","startDate":"","endMode":"tbd","endDate":"","ticket":"200014","status":"running"},
  {"id":"ticket-1779034417620-68bd665934e0d8","fleet":"4","sourceFleet":"4","customer":"Matador","customerOther":"","job":"Gus Federal Com 0731 225H","startMode":"tbd","startDate":"","endMode":"tbd","endDate":"","ticket":"200015","status":"running"},
  {"id":"ticket-1779033363266-7a190db6e9c36","fleet":"4","sourceFleet":"4","customer":"Matador","customerOther":"","job":"Gus Fed Com 0731 131H","startMode":"date","startDate":"2026-05-11","endMode":"date","endDate":"2026-05-15","ticket":"60298","status":"in IDK"},
  {"id":"ticket-1778722232214-e1cf60e53a195","fleet":"6","sourceFleet":"6","customer":"Matador","customerOther":"","job":"Kyle Pipken 202H, 203H","startMode":"date","startDate":"2026-05-04","endMode":"date","endDate":"2026-05-05","ticket":"68557","status":"in IDK"},
  {"id":"ticket-1778716741601-4310673ec48fd8","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0081WA Pumps","startMode":"date","startDate":"2026-05-10","endMode":"date","endDate":"2026-05-11","ticket":"68642","status":"sent to customer"},
  {"id":"ticket-1778716670764-76a21f61534868","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0084WA Pumps","startMode":"date","startDate":"2026-05-12","endMode":"date","endDate":"2026-05-13","ticket":"68645","status":"sent to customer"},
  {"id":"ticket-1778716669306-932b4264f018c","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0081WA Chems","startMode":"date","startDate":"2026-05-10","endMode":"date","endDate":"2026-05-11","ticket":"68643","status":"sent to customer"},
  {"id":"ticket-1778716668580-c9d6a1e810dc6","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0081WA Fuel","startMode":"date","startDate":"2026-05-10","endMode":"date","endDate":"2026-05-11","ticket":"68644","status":"sent to customer"},
  {"id":"ticket-1778716655414-e9234ac802f7c","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0085WA Pumps","startMode":"date","startDate":"2026-05-13","endMode":"date","endDate":"2026-05-14","ticket":"68648","status":"sent to customer"},
  {"id":"ticket-1778716655164-13551fbcb4d81","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0085WA Chems","startMode":"date","startDate":"2026-05-13","endMode":"date","endDate":"2026-05-14","ticket":"68649","status":"sent to customer"},
  {"id":"ticket-1778716654814-8e362459af7b68","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0084WA Chems","startMode":"date","startDate":"2026-05-12","endMode":"date","endDate":"2026-05-13","ticket":"68646","status":"sent to customer"},
  {"id":"ticket-1778716654556-98fa99a4fe92b","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0084WA Fuel","startMode":"date","startDate":"2026-05-12","endMode":"date","endDate":"2026-05-13","ticket":"68647","status":"sent to customer"},
  {"id":"ticket-1778716653747-bdec9302054f2","fleet":"6","sourceFleet":"6","customer":"Chevron","customerOther":"","job":"REV Dragon Breath 0085WA Fuel","startMode":"date","startDate":"2026-05-13","endMode":"date","endDate":"2026-05-14","ticket":"68650","status":"sent to customer"},
  {"id":"ticket-1778715105818-d6712fd554a9b8","fleet":"8","sourceFleet":"8","customer":"Coterra","customerOther":"","job":"State Road Runner D404H","startMode":"date","startDate":"2026-05-09","endMode":"date","endDate":"2026-05-17","ticket":"68641","status":"in IDK"},
  {"id":"ticket-1778714975731-9975a3eb327758","fleet":"3","sourceFleet":"3","customer":"Apache","customerOther":"","job":"Frederick Lindsey","startMode":"date","startDate":"2026-05-12","endMode":"date","endDate":"2026-05-17","ticket":"60310","status":"in IDK"},
  {"id":"ticket-1778714129746-935609bd833b2","fleet":"2","sourceFleet":"2","customer":"Coterra","customerOther":"","job":"State Kingman 5H, 6H, 7H, 8H","startMode":"date","startDate":"2026-05-14","endMode":"date","endDate":"2026-05-16","ticket":"200001","status":"pending approval"},
  {"id":"ticket-1778713498925-e383394ee871a","fleet":"2","sourceFleet":"2","customer":"Coterra","customerOther":"","job":"Needles 14H, 16H","startMode":"date","startDate":"2026-05-10","endMode":"date","endDate":"2026-05-13","ticket":"68639","status":"in IDK"},
  {"id":"fleet-1-68532","fleet":"1","sourceFleet":"1","customer":"Diamondback","customerOther":"","job":"Andretti","startMode":"date","startDate":"2026-05-01","endMode":"date","endDate":"2026-05-15","ticket":"68532","status":"in IDK"},
  {"id":"fleet-5-68533","fleet":"5","sourceFleet":"5","customer":"Diamondback","customerOther":"","job":"Andretti","startMode":"date","startDate":"2026-05-01","endMode":"date","endDate":"2026-05-15","ticket":"68533","status":"in IDK"},
  {"id":"fleet-6-68557","fleet":"7","sourceFleet":"7","customer":"Matador","customerOther":"","job":"Kyle Pipken 202H, 203H","startMode":"date","startDate":"2026-05-11","endMode":"tbd","endDate":"","ticket":"68557","status":"in IDK"},
  {"id":"fleet-8-66781","fleet":"8","sourceFleet":"8","customer":"Coterra","customerOther":"","job":"Vagrant Acid","startMode":"date","startDate":"2026-04-30","endMode":"date","endDate":"2026-05-05","ticket":"66781","status":"in IDK"},
  {"id":"pending-68415","fleet":"Misc","sourceFleet":"Misc","customer":"Exxon","customerOther":"","job":"Mabee PKR flush","startMode":"date","startDate":"2026-04-17","endMode":"date","endDate":"2026-04-17","ticket":"68415","status":"sent to customer"},
  {"id":"pending-67912","fleet":"Misc","sourceFleet":"Misc","customer":"Chevron","customerOther":"","job":"CT Unit #2","startMode":"date","startDate":"2026-04-09","endMode":"date","endDate":"2026-04-13","ticket":"67912","status":"sent to customer"},
  {"id":"pending-68531","fleet":"Misc","sourceFleet":"Misc","customer":"Apache","customerOther":"","job":"Fraser Pad 2","startMode":"date","startDate":"2026-04-30","endMode":"date","endDate":"2026-05-02","ticket":"68531","status":"in IDK"},
  {"id":"pending-66790","fleet":"Misc","sourceFleet":"Misc","customer":"Apache","customerOther":"","job":"Coleman Acid Flush","startMode":"date","startDate":"2026-04-29","endMode":"date","endDate":"2026-05-01","ticket":"66790","status":"in IDK"}
]
  $tickets$::jsonb,
  now()
)
on conflict (id) do nothing;
