-- Make pending_login_redirect RLS policies case-insensitive so JWT email
-- (which may be original case) matches stored lowercase email.
-- Enables redirect-after-magic-link to work when link is opened in another browser.

drop policy if exists "pending_login_redirect_select" on public.pending_login_redirect;
create policy "pending_login_redirect_select" on public.pending_login_redirect
  for select using (lower(auth.jwt()->>'email') = lower(email));

drop policy if exists "pending_login_redirect_delete" on public.pending_login_redirect;
create policy "pending_login_redirect_delete" on public.pending_login_redirect
  for delete using (lower(auth.jwt()->>'email') = lower(email));
