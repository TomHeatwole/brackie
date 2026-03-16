-- Sync RLS policies to match db/rls.txt.
-- Drops existing policies then recreates them. Safe to run repeatedly.
--
-- When you change db/rls.txt, update this file: add/change the corresponding
-- DROP POLICY IF EXISTS and CREATE POLICY statements. Policy names must match
-- the drop names (e.g. "tablename_select") so re-runs replace cleanly.

-- =============================================================================
-- user_info
-- =============================================================================
alter table public.user_info enable row level security;
drop policy if exists "user_info_select" on public.user_info;
drop policy if exists "user_info_insert" on public.user_info;
drop policy if exists "user_info_update" on public.user_info;
drop policy if exists "user_info_delete" on public.user_info;
create policy "user_info_select" on public.user_info for select using (true);
create policy "user_info_insert" on public.user_info for insert with check ((select auth.uid()) = id);
create policy "user_info_update" on public.user_info for update using ((select auth.uid()) = id);
create policy "user_info_delete" on public.user_info for delete using ((select auth.uid()) = id);

-- =============================================================================
-- tournaments
-- =============================================================================
alter table public.tournaments enable row level security;
drop policy if exists "tournaments_select" on public.tournaments;
drop policy if exists "tournaments_insert" on public.tournaments;
drop policy if exists "tournaments_update" on public.tournaments;
drop policy if exists "tournaments_delete" on public.tournaments;
create policy "tournaments_select" on public.tournaments for select using (true);
create policy "tournaments_insert" on public.tournaments for insert with check (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "tournaments_update" on public.tournaments for update using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "tournaments_delete" on public.tournaments for delete using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- teams
-- =============================================================================
alter table public.teams enable row level security;
drop policy if exists "teams_select" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
drop policy if exists "teams_delete" on public.teams;
create policy "teams_select" on public.teams for select using (true);
create policy "teams_insert" on public.teams for insert with check (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "teams_update" on public.teams for update using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "teams_delete" on public.teams for delete using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- tournament_games
-- =============================================================================
alter table public.tournament_games enable row level security;
drop policy if exists "tournament_games_select" on public.tournament_games;
drop policy if exists "tournament_games_insert" on public.tournament_games;
drop policy if exists "tournament_games_update" on public.tournament_games;
drop policy if exists "tournament_games_delete" on public.tournament_games;
create policy "tournament_games_select" on public.tournament_games for select using (true);
create policy "tournament_games_insert" on public.tournament_games for insert with check (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "tournament_games_update" on public.tournament_games for update using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "tournament_games_delete" on public.tournament_games for delete using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- brackets
-- =============================================================================
alter table public.brackets enable row level security;
drop policy if exists "brackets_select" on public.brackets;
drop policy if exists "brackets_insert" on public.brackets;
drop policy if exists "brackets_update" on public.brackets;
drop policy if exists "brackets_delete" on public.brackets;
create policy "brackets_select" on public.brackets for select using (true);
create policy "brackets_insert" on public.brackets for insert with check ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "brackets_update" on public.brackets for update using ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "brackets_delete" on public.brackets for delete using ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- bracket_picks (SELECT: owner or lock_date passed or admin)
-- =============================================================================
alter table public.bracket_picks enable row level security;
drop policy if exists "bracket_picks_select" on public.bracket_picks;
drop policy if exists "bracket_picks_insert" on public.bracket_picks;
drop policy if exists "bracket_picks_update" on public.bracket_picks;
drop policy if exists "bracket_picks_delete" on public.bracket_picks;
create policy "bracket_picks_select" on public.bracket_picks for select using (
  exists (select 1 from public.brackets b where b.id = bracket_picks.bracket_id and b.user_id = auth.uid())
  or exists (select 1 from public.brackets b join public.tournaments t on t.id = b.tournament_id where b.id = bracket_picks.bracket_id and t.lock_date is not null and t.lock_date <= now())
  or exists (select 1 from public.user_info where user_info.id = auth.uid() and user_info.is_site_admin = true)
);
create policy "bracket_picks_insert" on public.bracket_picks for insert with check (exists (select 1 from public.brackets where brackets.id = bracket_picks.bracket_id and brackets.user_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "bracket_picks_update" on public.bracket_picks for update using (exists (select 1 from public.brackets where brackets.id = bracket_picks.bracket_id and brackets.user_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "bracket_picks_delete" on public.bracket_picks for delete using (exists (select 1 from public.brackets where brackets.id = bracket_picks.bracket_id and brackets.user_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- pools
-- =============================================================================
alter table public.pools enable row level security;
drop policy if exists "pools_select" on public.pools;
drop policy if exists "pools_insert" on public.pools;
drop policy if exists "pools_update" on public.pools;
drop policy if exists "pools_delete" on public.pools;
create policy "pools_select" on public.pools for select using (true);
create policy "pools_insert" on public.pools for insert with check ((select auth.uid()) = creator_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pools_update" on public.pools for update using ((select auth.uid()) = creator_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pools_delete" on public.pools for delete using ((select auth.uid()) = creator_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- pool_members
-- =============================================================================
alter table public.pool_members enable row level security;
drop policy if exists "pool_members_select" on public.pool_members;
drop policy if exists "pool_members_insert" on public.pool_members;
drop policy if exists "pool_members_update" on public.pool_members;
drop policy if exists "pool_members_delete" on public.pool_members;
create policy "pool_members_select" on public.pool_members for select using (true);
create policy "pool_members_insert" on public.pool_members for insert with check ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_members_update" on public.pool_members for update using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_members_delete" on public.pool_members for delete using ((select auth.uid()) = user_id or exists (select 1 from public.pools where pools.id = pool_members.pool_id and pools.creator_id = (select auth.uid())));

-- =============================================================================
-- pool_brackets
-- =============================================================================
alter table public.pool_brackets enable row level security;
drop policy if exists "pool_brackets_select" on public.pool_brackets;
drop policy if exists "pool_brackets_insert" on public.pool_brackets;
drop policy if exists "pool_brackets_update" on public.pool_brackets;
drop policy if exists "pool_brackets_delete" on public.pool_brackets;
create policy "pool_brackets_select" on public.pool_brackets for select using (true);
create policy "pool_brackets_insert" on public.pool_brackets for insert with check ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_brackets_update" on public.pool_brackets for update using ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_brackets_delete" on public.pool_brackets for delete using ((select auth.uid()) = user_id or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true) or exists (select 1 from public.pools where pools.id = pool_brackets.pool_id and pools.creator_id = (select auth.uid())));

-- =============================================================================
-- goody_types
-- =============================================================================
alter table public.goody_types enable row level security;
drop policy if exists "goody_types_select" on public.goody_types;
drop policy if exists "goody_types_insert" on public.goody_types;
drop policy if exists "goody_types_update" on public.goody_types;
drop policy if exists "goody_types_delete" on public.goody_types;
create policy "goody_types_select" on public.goody_types for select using (true);
create policy "goody_types_insert" on public.goody_types for insert with check (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "goody_types_update" on public.goody_types for update using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "goody_types_delete" on public.goody_types for delete using (exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- pool_goodies
-- =============================================================================
alter table public.pool_goodies enable row level security;
drop policy if exists "pool_goodies_select" on public.pool_goodies;
drop policy if exists "pool_goodies_insert" on public.pool_goodies;
drop policy if exists "pool_goodies_update" on public.pool_goodies;
drop policy if exists "pool_goodies_delete" on public.pool_goodies;
create policy "pool_goodies_select" on public.pool_goodies for select using (true);
create policy "pool_goodies_insert" on public.pool_goodies for insert with check (exists (select 1 from public.pools where pools.id = pool_goodies.pool_id and pools.creator_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_goodies_update" on public.pool_goodies for update using (exists (select 1 from public.pools where pools.id = pool_goodies.pool_id and pools.creator_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));
create policy "pool_goodies_delete" on public.pool_goodies for delete using (exists (select 1 from public.pools where pools.id = pool_goodies.pool_id and pools.creator_id = (select auth.uid())) or exists (select 1 from public.user_info where user_info.id = (select auth.uid()) and user_info.is_site_admin = true));

-- =============================================================================
-- pool_bracket_goody_answers
-- =============================================================================
alter table public.pool_bracket_goody_answers enable row level security;
drop policy if exists "pool_bracket_goody_answers_select" on public.pool_bracket_goody_answers;
drop policy if exists "pool_bracket_goody_answers_insert" on public.pool_bracket_goody_answers;
drop policy if exists "pool_bracket_goody_answers_update" on public.pool_bracket_goody_answers;
drop policy if exists "pool_bracket_goody_answers_delete" on public.pool_bracket_goody_answers;
create policy "pool_bracket_goody_answers_select" on public.pool_bracket_goody_answers for select using (exists (select 1 from public.pool_brackets pb where pb.id = pool_bracket_goody_answers.pool_bracket_id and pb.user_id = (select auth.uid())));
create policy "pool_bracket_goody_answers_insert" on public.pool_bracket_goody_answers for insert with check (exists (select 1 from public.pool_brackets pb where pb.id = pool_bracket_goody_answers.pool_bracket_id and pb.user_id = (select auth.uid())));
create policy "pool_bracket_goody_answers_update" on public.pool_bracket_goody_answers for update using (exists (select 1 from public.pool_brackets pb where pb.id = pool_bracket_goody_answers.pool_bracket_id and pb.user_id = (select auth.uid())));
create policy "pool_bracket_goody_answers_delete" on public.pool_bracket_goody_answers for delete using (exists (select 1 from public.pool_brackets pb where pb.id = pool_bracket_goody_answers.pool_bracket_id and pb.user_id = (select auth.uid())));

-- =============================================================================
-- pending_login_redirect
-- =============================================================================
alter table public.pending_login_redirect enable row level security;
drop policy if exists "pending_login_redirect_select" on public.pending_login_redirect;
drop policy if exists "pending_login_redirect_insert" on public.pending_login_redirect;
drop policy if exists "pending_login_redirect_update" on public.pending_login_redirect;
drop policy if exists "pending_login_redirect_delete" on public.pending_login_redirect;
create policy "pending_login_redirect_select" on public.pending_login_redirect for select using ((auth.jwt() ->> 'email') = email);
create policy "pending_login_redirect_insert" on public.pending_login_redirect for insert with check (true);
create policy "pending_login_redirect_update" on public.pending_login_redirect for update using (false);
create policy "pending_login_redirect_delete" on public.pending_login_redirect for delete using ((auth.jwt() ->> 'email') = email);
