-- Fix 1: Set search_path for update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix 2 & 3: Revoke execution rights on SECURITY DEFINER functions
-- rls_auto_enable is a SECURITY DEFINER function that should only be used by system processes or service_role
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;

-- Ensure service_role can still execute it if needed (though it's an event trigger)
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- Fix 4: Set search_path for rls_auto_enable if not already set (it was SET search_path TO 'pg_catalog' in the definition I saw, but let's be explicit)
ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog;

-- Additional security: ensure standard trigger functions have limited search path
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
