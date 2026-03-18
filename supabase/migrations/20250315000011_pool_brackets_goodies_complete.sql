-- Track whether a pool member has completed all required user-input goodies for their pool bracket.

alter table public.pool_brackets
  add column if not exists goodies_complete boolean not null default false;

