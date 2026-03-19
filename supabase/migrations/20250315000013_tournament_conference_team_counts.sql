-- Add conference_team_counts JSONB column to tournaments.
-- Stores how many teams each elite conference has in the tournament field,
-- e.g. {"ACC": 7, "SEC": 8, "Big Ten": 6, "Big Twelve": 7, "Big East": 4}.
-- Used by the conference_multiplier goody scoring mode.
alter table public.tournaments
  add column if not exists conference_team_counts jsonb null;
