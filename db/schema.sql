-- =============================================================================
-- BRACKIE — IDEMPOTENT DATABASE SCHEMA
-- =============================================================================
-- Run this in Supabase SQL Editor to make the remote DB match this schema.
-- Safe regardless of current state: creates tables/columns if missing, no-ops if present.
--
-- Keep in sync with db/db.txt when you change the schema.
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE TABLES (IF NOT EXISTS)
-- =============================================================================

-- tournaments (no deps on other app tables)
create table if not exists public.tournaments (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name character varying not null,
  year integer not null,
  lock_date timestamp with time zone null,
  status character varying not null default 'upcoming',
  region_top_left character varying not null default 'East',
  region_top_right character varying not null default 'West',
  region_bottom_left character varying not null default 'South',
  region_bottom_right character varying not null default 'Midwest',
  conference_team_counts jsonb null,
  constraint tournaments_pkey primary key (id)
) TABLESPACE pg_default;

-- user_info (references auth.users)
create table if not exists public.user_info (
  id uuid not null,
  created_at timestamp with time zone not null default now(),
  first_name character varying null,
  last_name character varying null,
  username character varying null,
  avatar_url character varying null,
  is_site_admin boolean not null default false,
  constraint user_info_pkey primary key (id),
  constraint user_info_id_fkey foreign key (id) references auth.users (id) on update restrict on delete restrict
) TABLESPACE pg_default;

-- teams (references tournaments)
create table if not exists public.teams (
  id uuid not null default gen_random_uuid(),
  tournament_id uuid not null,
  name character varying not null,
  seed integer not null,
  region character varying not null,
  icon_url text,
  constraint teams_pkey primary key (id),
  constraint teams_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade
) TABLESPACE pg_default;

-- tournament_games (references tournaments, teams)
create table if not exists public.tournament_games (
  id uuid not null default gen_random_uuid(),
  tournament_id uuid not null,
  round integer not null,
  position integer not null,
  region character varying null,
  team1_id uuid null,
  team2_id uuid null,
  winner_id uuid null,
  constraint tournament_games_pkey primary key (id),
  constraint tournament_games_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade,
  constraint tournament_games_team1_id_fkey foreign key (team1_id) references public.teams (id) on update cascade on delete set null,
  constraint tournament_games_team2_id_fkey foreign key (team2_id) references public.teams (id) on update cascade on delete set null,
  constraint tournament_games_winner_id_fkey foreign key (winner_id) references public.teams (id) on update cascade on delete set null
) TABLESPACE pg_default;

-- brackets (references auth.users, tournaments)
create table if not exists public.brackets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  tournament_id uuid not null,
  name character varying not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint brackets_pkey primary key (id),
  constraint brackets_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
  constraint brackets_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade
) TABLESPACE pg_default;

-- pools (references auth.users, tournaments)
create table if not exists public.pools (
  id uuid not null default gen_random_uuid(),
  name character varying not null,
  creator_id uuid not null,
  tournament_id uuid not null,
  invite_code character varying not null,
  round_points jsonb not null default '{"1":10,"2":20,"3":30,"4":50,"5":80,"6":130}',
  upset_points_enabled boolean not null default true,
  upset_multipliers jsonb not null default '{"1":1,"2":3,"3":5,"4":10,"5":15,"6":20}',
  goodies_enabled boolean not null default false,
  image_url character varying null,
  created_at timestamp with time zone not null default now(),
  constraint pools_pkey primary key (id),
  constraint pools_creator_id_fkey foreign key (creator_id) references auth.users (id) on update cascade on delete cascade,
  constraint pools_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade,
  constraint pools_invite_code_unique unique (invite_code)
) TABLESPACE pg_default;

-- pool_members (references pools, auth.users)
create table if not exists public.pool_members (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  user_id uuid not null,
  joined_at timestamp with time zone not null default now(),
  constraint pool_members_pkey primary key (id),
  constraint pool_members_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_members_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
  constraint pool_members_pool_user_unique unique (pool_id, user_id)
) TABLESPACE pg_default;

-- pool_brackets (references pools, brackets, auth.users)
create table if not exists public.pool_brackets (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  bracket_id uuid not null,
  user_id uuid not null,
  constraint pool_brackets_pkey primary key (id),
  constraint pool_brackets_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_brackets_bracket_id_fkey foreign key (bracket_id) references public.brackets (id) on update cascade on delete cascade,
  constraint pool_brackets_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
  constraint pool_brackets_pool_user_unique unique (pool_id, user_id)
) TABLESPACE pg_default;

-- bracket_picks (references brackets, tournaments, tournament_games, teams)
create table if not exists public.bracket_picks (
  id uuid not null default gen_random_uuid(),
  bracket_id uuid not null,
  tournament_id uuid not null,
  game_id uuid not null,
  picked_team_id uuid not null,
  constraint bracket_picks_pkey primary key (id),
  constraint bracket_picks_bracket_id_fkey foreign key (bracket_id) references public.brackets (id) on update cascade on delete cascade,
  constraint bracket_picks_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade,
  constraint bracket_picks_game_id_fkey foreign key (game_id) references public.tournament_games (id) on update cascade on delete cascade,
  constraint bracket_picks_picked_team_id_fkey foreign key (picked_team_id) references public.teams (id) on update cascade on delete cascade,
  constraint bracket_picks_bracket_game_unique unique (bracket_id, game_id)
) TABLESPACE pg_default;

-- goody_types (no deps on other app tables)
create table if not exists public.goody_types (
  id uuid not null default gen_random_uuid(),
  key character varying not null,
  name character varying not null,
  description text null,
  default_points integer not null default 5,
  input_type character varying not null default 'bracket_derived',
  config jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint goody_types_pkey primary key (id),
  constraint goody_types_key_unique unique (key)
) TABLESPACE pg_default;

-- goody_results (references tournaments, goody_types)
-- Canonical tournament-level outcomes for goodies that cannot be derived
-- implicitly from bracket/tournament data (e.g. NIT champion, first conference
-- out, biggest first-round blowout).
create table if not exists public.goody_results (
  id uuid not null default gen_random_uuid(),
  tournament_id uuid not null,
  goody_type_id uuid not null,
  value jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint goody_results_pkey primary key (id),
  constraint goody_results_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade,
  constraint goody_results_goody_type_id_fkey foreign key (goody_type_id) references public.goody_types (id) on update cascade on delete cascade,
  constraint goody_results_tournament_goody_unique unique (tournament_id, goody_type_id)
) TABLESPACE pg_default;

-- pool_goodies (references pools, goody_types)
create table if not exists public.pool_goodies (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  goody_type_id uuid not null,
  points integer not null default 5,
  stroke_rule_enabled boolean not null default false,
  scoring_mode character varying not null default 'fixed',
  scoring_config jsonb null,
  constraint pool_goodies_pkey primary key (id),
  constraint pool_goodies_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_goodies_goody_type_id_fkey foreign key (goody_type_id) references public.goody_types (id) on update cascade on delete cascade,
  constraint pool_goodies_pool_goody_unique unique (pool_id, goody_type_id)
) TABLESPACE pg_default;

-- pool_bracket_goody_answers (references pool_brackets, goody_types)
create table if not exists public.pool_bracket_goody_answers (
  id uuid not null default gen_random_uuid(),
  pool_bracket_id uuid not null,
  goody_type_id uuid not null,
  value jsonb not null,
  constraint pool_bracket_goody_answers_pkey primary key (id),
  constraint pool_bracket_goody_answers_pool_bracket_id_fkey foreign key (pool_bracket_id) references public.pool_brackets (id) on update cascade on delete cascade,
  constraint pool_bracket_goody_answers_goody_type_id_fkey foreign key (goody_type_id) references public.goody_types (id) on update cascade on delete cascade,
  constraint pool_bracket_goody_answers_pool_bracket_goody_unique unique (pool_bracket_id, goody_type_id)
) TABLESPACE pg_default;

-- pool_hall_of_fame (references pools)
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
) TABLESPACE pg_default;

-- pending_login_redirect (no deps; used to persist "next" by email across magic-link open)
create table if not exists public.pending_login_redirect (
  email text not null,
  next_path text not null,
  expires_at timestamp with time zone not null,
  constraint pending_login_redirect_pkey primary key (email)
) TABLESPACE pg_default;

-- site_config (singleton; references tournaments)
create table if not exists public.site_config (
  id integer not null default 1,
  active_tournament_id uuid null,
  constraint site_config_pkey primary key (id),
  constraint site_config_singleton check (id = 1),
  constraint site_config_active_tournament_id_fkey foreign key (active_tournament_id) references public.tournaments (id) on update cascade on delete set null
) TABLESPACE pg_default;

-- Seed the singleton row
insert into public.site_config (id, active_tournament_id)
values (1, null)
on conflict (id) do nothing;

-- =============================================================================
-- PART 2: ADD MISSING COLUMNS (existing tables get new columns; no-op if present)
-- =============================================================================

-- tournaments
alter table public.tournaments add column if not exists id uuid not null default gen_random_uuid();
alter table public.tournaments add column if not exists created_at timestamp with time zone not null default now();
alter table public.tournaments add column if not exists name character varying not null default '';
alter table public.tournaments add column if not exists year integer not null default 0;
alter table public.tournaments add column if not exists lock_date timestamp with time zone null;
alter table public.tournaments add column if not exists status character varying not null default 'upcoming';
alter table public.tournaments add column if not exists region_top_left character varying not null default 'East';
alter table public.tournaments add column if not exists region_top_right character varying not null default 'West';
alter table public.tournaments add column if not exists region_bottom_left character varying not null default 'South';
alter table public.tournaments add column if not exists region_bottom_right character varying not null default 'Midwest';
alter table public.tournaments add column if not exists conference_team_counts jsonb null;

-- user_info
alter table public.user_info add column if not exists id uuid not null;
alter table public.user_info add column if not exists created_at timestamp with time zone not null default now();
alter table public.user_info add column if not exists first_name character varying null;
alter table public.user_info add column if not exists last_name character varying null;
alter table public.user_info add column if not exists username character varying null;
alter table public.user_info add column if not exists avatar_url character varying null;
alter table public.user_info add column if not exists is_site_admin boolean not null default false;

-- teams
alter table public.teams add column if not exists id uuid not null default gen_random_uuid();
alter table public.teams add column if not exists tournament_id uuid not null;
alter table public.teams add column if not exists name character varying not null default '';
alter table public.teams add column if not exists seed integer not null default 0;
alter table public.teams add column if not exists region character varying not null default '';
alter table public.teams add column if not exists icon_url text;

-- tournament_games
alter table public.tournament_games add column if not exists id uuid not null default gen_random_uuid();
alter table public.tournament_games add column if not exists tournament_id uuid not null;
alter table public.tournament_games add column if not exists round integer not null default 0;
alter table public.tournament_games add column if not exists position integer not null default 0;
alter table public.tournament_games add column if not exists region character varying null;
alter table public.tournament_games add column if not exists team1_id uuid null;
alter table public.tournament_games add column if not exists team2_id uuid null;
alter table public.tournament_games add column if not exists winner_id uuid null;

-- brackets
alter table public.brackets add column if not exists id uuid not null default gen_random_uuid();
alter table public.brackets add column if not exists user_id uuid not null;
alter table public.brackets add column if not exists tournament_id uuid not null;
alter table public.brackets add column if not exists name character varying not null default '';
alter table public.brackets add column if not exists created_at timestamp with time zone not null default now();
alter table public.brackets add column if not exists updated_at timestamp with time zone not null default now();

-- pools
alter table public.pools add column if not exists id uuid not null default gen_random_uuid();
alter table public.pools add column if not exists name character varying not null default '';
alter table public.pools add column if not exists creator_id uuid not null;
alter table public.pools add column if not exists tournament_id uuid not null;
alter table public.pools add column if not exists invite_code character varying not null default '';
alter table public.pools add column if not exists round_points jsonb not null default '{"1":10,"2":20,"3":30,"4":50,"5":80,"6":130}';
alter table public.pools add column if not exists upset_points_enabled boolean not null default true;
alter table public.pools add column if not exists upset_multipliers jsonb not null default '{"1":1,"2":3,"3":5,"4":10,"5":15,"6":20}';
alter table public.pools add column if not exists goodies_enabled boolean not null default false;
alter table public.pools add column if not exists image_url character varying null;
alter table public.pools add column if not exists created_at timestamp with time zone not null default now();

-- pool_members
alter table public.pool_members add column if not exists id uuid not null default gen_random_uuid();
alter table public.pool_members add column if not exists pool_id uuid not null;
alter table public.pool_members add column if not exists user_id uuid not null;
alter table public.pool_members add column if not exists joined_at timestamp with time zone not null default now();

-- pool_brackets
alter table public.pool_brackets add column if not exists id uuid not null default gen_random_uuid();
alter table public.pool_brackets add column if not exists pool_id uuid not null;
alter table public.pool_brackets add column if not exists bracket_id uuid not null;
alter table public.pool_brackets add column if not exists user_id uuid not null;
alter table public.pool_brackets add column if not exists goodies_complete boolean not null default false;

-- bracket_picks
alter table public.bracket_picks add column if not exists id uuid not null default gen_random_uuid();
alter table public.bracket_picks add column if not exists bracket_id uuid not null;
alter table public.bracket_picks add column if not exists tournament_id uuid;
alter table public.bracket_picks add column if not exists game_id uuid not null;
alter table public.bracket_picks add column if not exists picked_team_id uuid not null;

-- goody_types
alter table public.goody_types add column if not exists id uuid not null default gen_random_uuid();
alter table public.goody_types add column if not exists key character varying not null default '';
alter table public.goody_types add column if not exists name character varying not null default '';
alter table public.goody_types add column if not exists description text null;
alter table public.goody_types add column if not exists default_points integer not null default 5;
alter table public.goody_types add column if not exists input_type character varying not null default 'bracket_derived';
alter table public.goody_types add column if not exists config jsonb null;
alter table public.goody_types add column if not exists created_at timestamp with time zone not null default now();

-- goody_results
alter table public.goody_results add column if not exists id uuid not null default gen_random_uuid();
alter table public.goody_results add column if not exists tournament_id uuid not null;
alter table public.goody_results add column if not exists goody_type_id uuid not null;
alter table public.goody_results add column if not exists value jsonb not null default 'null'::jsonb;
alter table public.goody_results add column if not exists created_at timestamp with time zone not null default now();

-- pool_goodies
alter table public.pool_goodies add column if not exists id uuid not null default gen_random_uuid();
alter table public.pool_goodies add column if not exists pool_id uuid not null;
alter table public.pool_goodies add column if not exists goody_type_id uuid not null;
alter table public.pool_goodies add column if not exists points integer not null default 5;
alter table public.pool_goodies add column if not exists stroke_rule_enabled boolean not null default false;
alter table public.pool_goodies add column if not exists scoring_mode character varying not null default 'fixed';
alter table public.pool_goodies add column if not exists scoring_config jsonb null;

-- pool_bracket_goody_answers
alter table public.pool_bracket_goody_answers add column if not exists id uuid not null default gen_random_uuid();
alter table public.pool_bracket_goody_answers add column if not exists pool_bracket_id uuid not null;
alter table public.pool_bracket_goody_answers add column if not exists goody_type_id uuid not null;
alter table public.pool_bracket_goody_answers add column if not exists value jsonb not null default 'null'::jsonb;

-- pool_hall_of_fame
alter table public.pool_hall_of_fame add column if not exists id uuid not null default gen_random_uuid();
alter table public.pool_hall_of_fame add column if not exists pool_id uuid not null;
alter table public.pool_hall_of_fame add column if not exists year integer not null default 0;
alter table public.pool_hall_of_fame add column if not exists first_place character varying not null default '';
alter table public.pool_hall_of_fame add column if not exists second_place character varying not null default '';
alter table public.pool_hall_of_fame add column if not exists third_place character varying null;
alter table public.pool_hall_of_fame add column if not exists created_at timestamp with time zone not null default now();

-- pending_login_redirect
alter table public.pending_login_redirect add column if not exists email text not null;
alter table public.pending_login_redirect add column if not exists next_path text not null default '';
alter table public.pending_login_redirect add column if not exists expires_at timestamp with time zone not null default now();

-- site_config
alter table public.site_config add column if not exists id integer not null default 1;
alter table public.site_config add column if not exists active_tournament_id uuid null;

-- =============================================================================
-- PART 3: ADD MISSING CONSTRAINTS (no-op if constraint already exists)
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bracket_picks_tournament_id_fkey') then
    alter table public.bracket_picks add constraint bracket_picks_tournament_id_fkey
      foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade;
  end if;
end $$;
