-- Run this in your Supabase SQL Editor to configure Role-Based Access Control!

-- 1. Add a 'role' column to profiles (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

DO $$ 
DECLARE
  first_user_id UUID;
  first_course_id UUID;
BEGIN
  -- Grab the first user from the system
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  -- Grab the first published course
  SELECT id INTO first_course_id FROM courses LIMIT 1;
  
  -- Make the first user an admin
  IF first_user_id IS NOT NULL THEN
    UPDATE profiles SET role = 'admin' WHERE id = first_user_id;
  END IF;

  -- Insert a lifetime enrollment to have dummy data
  IF first_user_id IS NOT NULL AND first_course_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, plan)
    VALUES (first_user_id, first_course_id, 'lifetime')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  
  -- Ensure they have a profile entry just in case
  IF first_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, plan, role)
    VALUES (first_user_id, 'lifetime', 'admin')
    ON CONFLICT (id) DO UPDATE SET plan = 'lifetime', role = 'admin';
  END IF;
END $$;

-- 2. Create a SECURITY DEFINER function to check admin status without triggering infinite recursion on the profiles table
-- We create this in a 'private' schema so it doesn't trigger the Supabase Linter API warnings!
CREATE SCHEMA IF NOT EXISTS private;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant usage to the schema so policies can access the function
GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- 3. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all modules" ON modules;
DROP POLICY IF EXISTS "Admins can view all lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can modify courses" ON courses;
DROP POLICY IF EXISTS "Admins can modify modules" ON modules;
DROP POLICY IF EXISTS "Admins can modify lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can modify profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can modify enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;

-- DROP OLD PERMISSIVE POLICIES FLAGGED BY LINTER
DROP POLICY IF EXISTS "Enable all operations for lessons" ON lessons;
DROP POLICY IF EXISTS "Enable all operations for modules" ON modules;

-- 5. Standard User Policies (CRITICAL for useAuth to work)
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);

-- 6. Admin SELECT Policies (Analytics & Directory)
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (private.is_admin());
CREATE POLICY "Admins can view all enrollments" ON enrollments FOR SELECT USING (private.is_admin());
CREATE POLICY "Admins can view all lesson progress" ON lesson_progress FOR SELECT USING (private.is_admin());
CREATE POLICY "Admins can view all courses" ON courses FOR SELECT USING (private.is_admin());
CREATE POLICY "Admins can view all modules" ON modules FOR SELECT USING (private.is_admin());
CREATE POLICY "Admins can view all lessons" ON lessons FOR SELECT USING (private.is_admin());

-- 7. Admin ALL Policies (CMS & User Management)
CREATE POLICY "Admins can modify courses" ON courses FOR ALL USING (private.is_admin());
CREATE POLICY "Admins can modify modules" ON modules FOR ALL USING (private.is_admin());
CREATE POLICY "Admins can modify lessons" ON lessons FOR ALL USING (private.is_admin());
CREATE POLICY "Admins can modify profiles" ON profiles FOR ALL USING (private.is_admin());
CREATE POLICY "Admins can modify enrollments" ON enrollments FOR ALL USING (private.is_admin());

-- 8. Linter Security Hardening
-- Revoke execution of trigger functions from all web users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Patch handle_new_user search_path to prevent role mutability warnings
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 9. Platform Settings (Dynamic Resources)
CREATE TABLE IF NOT EXISTS platform_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view platform settings" ON platform_settings;
CREATE POLICY "Anyone can view platform settings" ON platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify platform settings" ON platform_settings;
CREATE POLICY "Admins can modify platform settings" ON platform_settings FOR ALL USING (private.is_admin());

INSERT INTO platform_settings (id, value)
VALUES 
  ('global_resources', '{"github_url": "https://github.com/your-username/zong-automation-framework", "discord_url": "https://discord.gg/your-community", "docs": [{"title": "Selenium Cheat Sheet", "url": "#"}, {"title": "Pytest Best Practices", "url": "#"}]}'::jsonb)
ON CONFLICT (id) DO NOTHING;
