-- ============================================================
-- rls_auto_enable() is Supabase's own event-trigger function (fires on
-- ddl_command_end via the ensure_rls event trigger to auto-enable RLS on
-- new public tables). It only needs to run as that trigger, never as a
-- direct RPC call, and event triggers don't require the firing session to
-- hold EXECUTE. Revoking here only closes the /rest/v1/rpc/rls_auto_enable
-- surface — it does not change when or how RLS gets auto-enabled.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
