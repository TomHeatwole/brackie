-- Allow pool creator to remove members from their pool.
-- Add additional DELETE policies (existing policies remain; Postgres ORs them).
-- 1) pool_members: creator can delete any member in their pool.
-- 2) pool_brackets: creator can delete any bracket in their pool (when removing a member).

create policy "pool_members_delete_creator" on public.pool_members
  for delete
  using (
    exists (select 1 from public.pools where pools.id = pool_members.pool_id and pools.creator_id = auth.uid())
  );

create policy "pool_brackets_delete_creator" on public.pool_brackets
  for delete
  using (
    exists (select 1 from public.pools where pools.id = pool_brackets.pool_id and pools.creator_id = auth.uid())
  );
