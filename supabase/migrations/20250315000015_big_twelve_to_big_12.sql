-- Normalize "Big Twelve" → "Big 12" everywhere to match the real conference name.
-- Fixes mismatch between admin-set conference_team_counts and user goody picks.

-- 1. Rename key in tournaments.conference_team_counts
update public.tournaments
set conference_team_counts = (conference_team_counts - 'Big Twelve') || jsonb_build_object('Big 12', conference_team_counts->'Big Twelve')
where conference_team_counts ? 'Big Twelve';

-- 2. Update goody_types.config.conference_options
update public.goody_types
set config = jsonb_set(
  config,
  '{conference_options}',
  '["ACC", "SEC", "Big Ten", "Big 12", "Big East"]'::jsonb
)
where key = 'first_conference_out'
  and config->'conference_options' @> '"Big Twelve"'::jsonb;

-- 3. Update any saved goody answers that used "Big Twelve"
update public.pool_bracket_goody_answers
set value = jsonb_set(value, '{conference_key}', '"Big 12"'::jsonb)
where value->>'conference_key' = 'Big Twelve';

-- 4. Update any goody_results that reference "Big Twelve"
update public.goody_results
set value = replace(value::text, 'Big Twelve', 'Big 12')::jsonb
where value::text like '%Big Twelve%';
