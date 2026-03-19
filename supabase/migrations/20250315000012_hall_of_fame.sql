-- Hall of Fame: stores previous season winners per pool (write-in names).

create table if not exists public.pool_hall_of_fame (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  year integer not null,
  first_place character varying not null,
  second_place character varying not null,
  third_place character varying null,
  created_at timestamp with time zone not null default now(),
  constraint pool_hall_of_fame_pkey primary key (id),
  constraint pool_hall_of_fame_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_hall_of_fame_pool_year_unique unique (pool_id, year)
);

-- RLS: readable by anyone, writable by pool creator or site admin.
alter table public.pool_hall_of_fame enable row level security;

drop policy if exists "pool_hall_of_fame_select" on public.pool_hall_of_fame;
create policy "pool_hall_of_fame_select" on public.pool_hall_of_fame for select using (true);

drop policy if exists "pool_hall_of_fame_insert" on public.pool_hall_of_fame;
create policy "pool_hall_of_fame_insert" on public.pool_hall_of_fame for insert with check (
  exists (select 1 from public.pools where pools.id = pool_hall_of_fame.pool_id and pools.creator_id = auth.uid())
  or exists (select 1 from public.user_info where user_info.id = auth.uid() and user_info.is_site_admin = true)
);

drop policy if exists "pool_hall_of_fame_update" on public.pool_hall_of_fame;
create policy "pool_hall_of_fame_update" on public.pool_hall_of_fame for update using (
  exists (select 1 from public.pools where pools.id = pool_hall_of_fame.pool_id and pools.creator_id = auth.uid())
  or exists (select 1 from public.user_info where user_info.id = auth.uid() and user_info.is_site_admin = true)
);

drop policy if exists "pool_hall_of_fame_delete" on public.pool_hall_of_fame;
create policy "pool_hall_of_fame_delete" on public.pool_hall_of_fame for delete using (
  exists (select 1 from public.pools where pools.id = pool_hall_of_fame.pool_id and pools.creator_id = auth.uid())
  or exists (select 1 from public.user_info where user_info.id = auth.uid() and user_info.is_site_admin = true)
);
