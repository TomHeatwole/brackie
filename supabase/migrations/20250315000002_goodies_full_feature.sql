-- Goodies full feature: input_type/config on goody_types, stroke_rule on pool_goodies,
-- pool_bracket_goody_answers table, and seed 10 goody types.

-- goody_types: add input_type and optional config
alter table public.goody_types
  add column if not exists input_type character varying not null default 'bracket_derived',
  add column if not exists config jsonb null;

-- pool_goodies: add stroke_rule_enabled
alter table public.pool_goodies
  add column if not exists stroke_rule_enabled boolean not null default false;

-- pool_bracket_goody_answers: user-input goody answers per bracket submission
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

-- RLS for pool_bracket_goody_answers: user can manage their own submission's answers
alter table public.pool_bracket_goody_answers enable row level security;

create policy pool_bracket_goody_answers_select on public.pool_bracket_goody_answers
  for select using (
    exists (
      select 1 from public.pool_brackets pb
      where pb.id = pool_bracket_goody_answers.pool_bracket_id
        and pb.user_id = (select auth.uid())
    )
  );

create policy pool_bracket_goody_answers_insert on public.pool_bracket_goody_answers
  for insert with check (
    exists (
      select 1 from public.pool_brackets pb
      where pb.id = pool_bracket_goody_answers.pool_bracket_id
        and pb.user_id = (select auth.uid())
    )
  );

create policy pool_bracket_goody_answers_update on public.pool_bracket_goody_answers
  for update using (
    exists (
      select 1 from public.pool_brackets pb
      where pb.id = pool_bracket_goody_answers.pool_bracket_id
        and pb.user_id = (select auth.uid())
    )
  );

create policy pool_bracket_goody_answers_delete on public.pool_bracket_goody_answers
  for delete using (
    exists (
      select 1 from public.pool_brackets pb
      where pb.id = pool_bracket_goody_answers.pool_bracket_id
        and pb.user_id = (select auth.uid())
    )
  );

-- Seed goody types (upsert by key so migration is idempotent)
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
