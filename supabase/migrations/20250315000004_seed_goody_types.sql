-- Ensure goody_types table exists and is seeded with the 10 goodie types.
-- Safe to run multiple times (CREATE IF NOT EXISTS, INSERT ON CONFLICT DO UPDATE).

-- Create table if it was never created by an earlier migration or schema apply
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

-- Add columns in case table existed from an older schema without them
alter table public.goody_types
  add column if not exists input_type character varying not null default 'bracket_derived',
  add column if not exists config jsonb null;

-- Seed the 10 goodie types (idempotent)
insert into public.goody_types (key, name, description, default_points, input_type, config)
values
  ('lowest_seed_first_round', 'Lowest seed to win first round', 'Lowest seed correctly picked to win in the first round.', 10, 'bracket_derived', null),
  ('lowest_seed_sweet_16', 'Lowest seed to Sweet 16', 'Lowest seed correctly picked to make it to the Sweet 16.', 15, 'bracket_derived', null),
  ('lowest_seed_elite_eight', 'Lowest seed to Elite Eight', 'Lowest seeded team correctly picked to make it to the Elite Eight.', 20, 'bracket_derived', null),
  ('lowest_seed_final_four', 'Lowest seed to Final Four', 'Lowest seeded team correctly picked to make it to the Final Four.', 25, 'bracket_derived', null),
  ('best_region_bracket', 'Best region bracket', 'Most correct picks in a single region.', 15, 'bracket_derived', null),
  ('sixteen_seed_bonus', '16-seed bonus', 'Points per correctly picked game won by a 16-seed.', 5, 'bracket_derived', null),
  ('nit_champion', 'NIT champion', 'Correctly pick the NIT champion.', 20, 'user_input', null),
  ('biggest_first_round_blowout', 'Biggest first round blowout', 'Correctly pick the first round game with the largest margin of victory.', 15, 'user_input', null),
  ('first_conference_out', 'First conference out', 'Correctly pick the first elite conference to have all teams eliminated.', 20, 'user_input', '{"conference_options": ["ACC", "Big Ten", "Big 12", "SEC", "Big East", "Pac-12", "American", "Mountain West", "WCC"]}'::jsonb),
  ('dark_horse_champion', 'Dark Horse National Champion', 'Your second pick for national champion (dark horse).', 30, 'user_input', null)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  default_points = excluded.default_points,
  input_type = excluded.input_type,
  config = excluded.config;
