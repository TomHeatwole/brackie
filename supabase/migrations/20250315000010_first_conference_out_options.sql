-- First conference out goody: restrict conference options to the five elite conferences.
update public.goody_types
set config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{conference_options}',
  '["ACC", "SEC", "Big Ten", "Big 12", "Big East"]'::jsonb
)
where key = 'first_conference_out';
