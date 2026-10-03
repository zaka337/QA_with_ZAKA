-- Fixes the Supabase Advisor "Security Definer View" finding on
-- public.lessons_secure. Views default to running with their OWNER's
-- privileges rather than the querying user's — Postgres/Supabase's
-- recommended best practice is security_invoker = true, so the view runs
-- with the actual caller's own permissions on the underlying tables.
--
-- Not an active exploit here (lessons/modules already allow any
-- authenticated user to read rows via their own RLS — there's no row-level
-- restriction being bypassed), but it closes the flagged gap cleanly.
-- The real protection — the CASE-masked paid columns, backed by the
-- private.is_admin()/has_course_access()/is_first_module() helper
-- functions — is unaffected either way, since those functions carry their
-- own SECURITY DEFINER property independent of this setting.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

ALTER VIEW public.lessons_secure SET (security_invoker = true);

-- Verify: run as yourself afterward to confirm the view still works and
-- still masks correctly for non-paying access.
-- SELECT id, title, (content_markdown IS NOT NULL) AS has_content FROM lessons_secure LIMIT 5;
