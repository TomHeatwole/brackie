-- Sync table structures to match db/db.txt.
-- Safe to run repeatedly. Creates missing tables and adds missing columns.
-- Does not drop columns or change existing column types.
--
-- When you change db/db.txt, update this file: add new tables (CREATE TABLE IF NOT EXISTS)
-- and new columns (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).

-- =============================================================================
-- 1. CREATE TABLE IF NOT EXISTS (creates any missing tables)
-- =============================================================================

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
  constraint tournaments_pkey primary key (id)
);

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
);

create table if not exists public.teams (
  id uuid not null default gen_random_uuid(),
  tournament_id uuid not null,
  name character varying not null,
  seed integer not null,
  region character varying not null,
  icon_url text,
  constraint teams_pkey primary key (id),
  constraint teams_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade
);

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
);

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
);

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
);

create table if not exists public.pool_members (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  user_id uuid not null,
  joined_at timestamp with time zone not null default now(),
  constraint pool_members_pkey primary key (id),
  constraint pool_members_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_members_user_id_fkey foreign key (user_id) references auth.users (id) on update cascade on delete cascade,
  constraint pool_members_pool_user_unique unique (pool_id, user_id)
);

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
);

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
);

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
);

create table if not exists public.pool_goodies (
  id uuid not null default gen_random_uuid(),
  pool_id uuid not null,
  goody_type_id uuid not null,
  points integer not null default 5,
  stroke_rule_enabled boolean not null default false,
  constraint pool_goodies_pkey primary key (id),
  constraint pool_goodies_pool_id_fkey foreign key (pool_id) references public.pools (id) on update cascade on delete cascade,
  constraint pool_goodies_goody_type_id_fkey foreign key (goody_type_id) references public.goody_types (id) on update cascade on delete cascade,
  constraint pool_goodies_pool_goody_unique unique (pool_id, goody_type_id)
);

create table if not exists public.pool_bracket_goody_answers (
  id uuid not null default gen_random_uuid(),
  pool_bracket_id uuid not null,
  goody_type_id uuid not null,
  value jsonb not null,
  constraint pool_bracket_goody_answers_pkey primary key (id),
  constraint pool_bracket_goody_answers_pool_bracket_id_fkey foreign key (pool_bracket_id) references public.pool_brackets (id) on update cascade on delete cascade,
  constraint pool_bracket_goody_answers_goody_type_id_fkey foreign key (goody_type_id) references public.goody_types (id) on update cascade on delete cascade,
  constraint pool_bracket_goody_answers_pool_bracket_goody_unique unique (pool_bracket_id, goody_type_id)
);

create table if not exists public.pending_login_redirect (
  email text not null,
  next_path text not null,
  expires_at timestamp with time zone not null,
  constraint pending_login_redirect_pkey primary key (email)
);

-- =============================================================================
-- 2. ADD COLUMN IF NOT EXISTS (for existing tables missing newer columns)
-- =============================================================================

alter table public.tournaments
  add column if not exists region_top_left character varying not null default 'East',
  add column if not exists region_top_right character varying not null default 'West',
  add column if not exists region_bottom_left character varying not null default 'South',
  add column if not exists region_bottom_right character varying not null default 'Midwest';

alter table public.bracket_picks
  add column if not exists tournament_id uuid null;
-- Backfill + constraint: run only if you need to enforce FK (optional)
-- update public.bracket_picks bp set tournament_id = (select b.tournament_id from public.brackets b where b.id = bp.bracket_id) where tournament_id is null;
-- alter table public.bracket_picks add constraint bracket_picks_tournament_id_fkey foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade;

alter table public.goody_types
  add column if not exists input_type character varying not null default 'bracket_derived',
  add column if not exists config jsonb null;

alter table public.pool_goodies
  add column if not exists stroke_rule_enabled boolean not null default false,
  add column if not exists scoring_mode character varying not null default 'fixed',
  add column if not exists scoring_config jsonb null;
