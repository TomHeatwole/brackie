-- Bracket structure: which region name appears in each quadrant (top-left, top-right, bottom-left, bottom-right)
-- and thus who faces who in the Final Four (top row: top_left vs top_right, bottom row: bottom_left vs bottom_right).
alter table public.tournaments
  add column if not exists region_top_left character varying not null default 'East',
  add column if not exists region_top_right character varying not null default 'West',
  add column if not exists region_bottom_left character varying not null default 'South',
  add column if not exists region_bottom_right character varying not null default 'Midwest';

comment on column public.tournaments.region_top_left is 'Region name displayed in top-left quadrant of bracket';
comment on column public.tournaments.region_top_right is 'Region name displayed in top-right quadrant';
comment on column public.tournaments.region_bottom_left is 'Region name displayed in bottom-left quadrant';
comment on column public.tournaments.region_bottom_right is 'Region name displayed in bottom-right quadrant';
