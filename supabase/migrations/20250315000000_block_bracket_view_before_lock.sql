-- Block viewing someone else's bracket picks before the tournament lock date.
-- Owners can always see their own picks. Others can only see picks after lock_date.
-- Admins can always see everything.

-- Drop existing SELECT policy (by known name); pg_policies uses "policyname" not "polname"
DROP POLICY IF EXISTS "bracket_picks_select" ON public.bracket_picks;

-- Create restricted SELECT policy for bracket_picks
CREATE POLICY "bracket_picks_select" ON public.bracket_picks
  FOR SELECT
  USING (
    -- Owner of the bracket
    EXISTS (
      SELECT 1 FROM public.brackets b
      WHERE b.id = bracket_picks.bracket_id AND b.user_id = auth.uid()
    )
    OR
    -- Tournament has locked (games have started)
    EXISTS (
      SELECT 1 FROM public.brackets b
      JOIN public.tournaments t ON t.id = b.tournament_id
      WHERE b.id = bracket_picks.bracket_id
        AND t.lock_date IS NOT NULL
        AND t.lock_date <= now()
    )
    OR
    -- Site admin
    EXISTS (
      SELECT 1 FROM public.user_info
      WHERE user_info.id = auth.uid() AND user_info.is_site_admin = true
    )
  );
