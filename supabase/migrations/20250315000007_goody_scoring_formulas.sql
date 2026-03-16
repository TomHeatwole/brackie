-- Add optional formula-based scoring for goodies (First Conference Out, Dark Horse Champion).
-- scoring_mode: 'fixed' = use points; 'conference_multiplier' = points = teams_in_conference * multiplier; 'bracket_upset_points' = use bracket+upset points for dark horse.
-- scoring_config: when mode is 'conference_multiplier', { "conference_multiplier": number }; otherwise null.

alter table public.pool_goodies
  add column if not exists scoring_mode character varying not null default 'fixed',
  add column if not exists scoring_config jsonb null;

comment on column public.pool_goodies.scoring_mode is 'fixed | conference_multiplier (first_conference_out) | bracket_upset_points (dark_horse_champion)';
comment on column public.pool_goodies.scoring_config is 'When scoring_mode=conference_multiplier: { "conference_multiplier": number }; else null';
