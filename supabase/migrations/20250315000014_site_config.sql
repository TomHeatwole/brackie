-- Global site configuration singleton.
-- Exactly one row (enforced by CHECK on id) holding the active tournament.

create table if not exists public.site_config (
  id integer not null default 1,
  active_tournament_id uuid null,
  constraint site_config_pkey primary key (id),
  constraint site_config_singleton check (id = 1),
  constraint site_config_active_tournament_id_fkey
    foreign key (active_tournament_id) references public.tournaments (id)
    on update cascade on delete set null
);

-- Seed the singleton row (no-op if already present).
insert into public.site_config (id, active_tournament_id)
values (1, null)
on conflict (id) do nothing;

-- RLS: everyone can read, only admins can update.
alter table public.site_config enable row level security;

drop policy if exists "site_config_select" on public.site_config;
create policy "site_config_select" on public.site_config for select using (true);

drop policy if exists "site_config_update" on public.site_config;
create policy "site_config_update" on public.site_config for update using (
  exists (select 1 from public.user_info where user_info.id = auth.uid() and user_info.is_site_admin = true)
);
