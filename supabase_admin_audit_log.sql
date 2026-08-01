-- Audit trail for privileged admin actions (role changes, manual enrollments).
-- Previously these fired with zero record of who did what, when — a real gap
-- for any panel that can grant admin access or free lifetime enrollments.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
CREATE POLICY "Admins can view audit log" ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

-- Only admins can write entries, and only as themselves (actor_id must match
-- the caller) — prevents an admin from forging an entry attributed to someone else.
DROP POLICY IF EXISTS "Admins can insert their own audit entries" ON admin_audit_log;
CREATE POLICY "Admins can insert their own audit entries" ON admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin() AND actor_id = auth.uid());

-- No UPDATE or DELETE policy for anyone — audit entries are append-only by design.
