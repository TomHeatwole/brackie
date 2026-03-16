-- Add tournament_id to bracket_picks for direct filtering/joins.
alter table public.bracket_picks
  add column if not exists tournament_id uuid;

update public.bracket_picks
set tournament_id = (select tournament_id from public.brackets where brackets.id = bracket_picks.bracket_id)
where tournament_id is null;

alter table public.bracket_picks
  alter column tournament_id set not null,
  add constraint bracket_picks_tournament_id_fkey
    foreign key (tournament_id) references public.tournaments (id) on update cascade on delete cascade;
