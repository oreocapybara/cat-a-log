-- ============================================================
-- Supabase grants EXECUTE on public-schema functions to anon/authenticated
-- explicitly (not via the PUBLIC pseudo-role), so REVOKE ... FROM PUBLIC in
-- the previous migration didn't actually remove access. Revoke it from the
-- specific roles instead.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.increment_tags_count() FROM anon, authenticated;
