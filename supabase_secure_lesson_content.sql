-- Real database-level enforcement of the free-preview access model.
--
-- Until now, "module 1 is free, the rest requires payment" was enforced only
-- in the app's UI (CoursePlayer.tsx) — the lessons table's own RLS policy
-- ("Authenticated users can view lessons") allows ANY logged-in user to read
-- every column of every lesson, including content_markdown/starter_code/
-- solution_code/quiz_data, regardless of whether they've paid. A student
-- could bypass the UI paywall entirely by querying the Supabase REST API
-- directly with their own session token.
--
-- Row Level Security can only allow/deny a whole row, not individual
-- columns, so a view is used instead: it nulls out the paid-content columns
-- for lessons the querying user (auth.uid()) doesn't have access to, while
-- still returning id/title/duration/order_index so the syllabus sidebar can
-- render locked lessons with their titles visible. Admins always see full
-- content (via private.is_admin(), same helper the rest of the schema uses).
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- 1. Does auth.uid() have full (paid) access to this course? —
--    lifetime/monthly plan, or an explicit per-course enrollment grant.
CREATE OR REPLACE FUNCTION private.has_course_access(p_course_id uuid)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND plan IN ('lifetime', 'monthly')
  ) OR EXISTS (
    SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND course_id = p_course_id
  );
$$;

-- 2. Is this the first module (by order_index) of its course? Free-preview
--    access is always allowed for the first module regardless of payment.
CREATE OR REPLACE FUNCTION private.is_first_module(p_module_id uuid)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_module_id = (
    SELECT m2.id FROM modules m2
    WHERE m2.course_id = (SELECT course_id FROM modules WHERE id = p_module_id)
    ORDER BY m2.order_index ASC
    LIMIT 1
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- 3. The gated view. content_markdown/starter_code/solution_code/quiz_data
--    are the actual paid content; everything else (title, description,
--    duration, order_index) stays visible so a locked lesson still renders
--    correctly in the syllabus tree with its title and a lock icon.
DROP VIEW IF EXISTS public.lessons_secure;

CREATE VIEW public.lessons_secure AS
SELECT
  l.id,
  l.module_id,
  l.title,
  l.description,
  l.video_url,
  CASE WHEN private.is_admin() OR private.has_course_access(m.course_id) OR private.is_first_module(l.module_id)
    THEN l.content_markdown ELSE NULL END AS content_markdown,
  CASE WHEN private.is_admin() OR private.has_course_access(m.course_id) OR private.is_first_module(l.module_id)
    THEN l.starter_code ELSE NULL END AS starter_code,
  CASE WHEN private.is_admin() OR private.has_course_access(m.course_id) OR private.is_first_module(l.module_id)
    THEN l.solution_code ELSE NULL END AS solution_code,
  CASE WHEN private.is_admin() OR private.has_course_access(m.course_id) OR private.is_first_module(l.module_id)
    THEN l.quiz_data ELSE NULL END AS quiz_data,
  l.duration,
  l.order_index
FROM lessons l
JOIN modules m ON m.id = l.module_id;

GRANT SELECT ON public.lessons_secure TO authenticated;

-- Verify: run as yourself afterward to confirm the view exists and returns rows.
-- SELECT id, title, (content_markdown IS NOT NULL) AS has_content FROM lessons_secure LIMIT 5;
