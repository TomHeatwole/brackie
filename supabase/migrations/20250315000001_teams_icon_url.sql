-- Add optional team icon URL (e.g. transparent logo). When null, UI shows circular initial.
alter table public.teams add column if not exists icon_url text;
