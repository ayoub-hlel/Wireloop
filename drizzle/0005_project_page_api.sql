-- Project Page API mode — schema migration
-- 4-role enum, project flags, notifications, invites, org-not-public guard.

-- ── 1. Extend org_member_role enum (member → user rename + viewer) ──
ALTER TYPE org_member_role ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE org_member_role ADD VALUE IF NOT EXISTS 'viewer';
UPDATE org_members SET role = 'user' WHERE role = 'member';

-- ── 2. New enums ──
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE invite_kind AS ENUM ('org', 'project');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('org_project_created', 'org_project_deleted', 'invite_received', 'ownership_transferred');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 3. Projects: new columns ──
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_forked boolean NOT NULL DEFAULT false;

-- ── 4. Invites table ──
CREATE TABLE IF NOT EXISTS invites (
  id text PRIMARY KEY,
  kind invite_kind NOT NULL,
  org_id text REFERENCES organizations(id) ON DELETE CASCADE,
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_id text REFERENCES "user"(id) ON DELETE SET NULL,
  inviter_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invites_invitee_idx ON invites (invitee_email);
CREATE INDEX IF NOT EXISTS invites_pending_idx ON invites (status) WHERE status = 'pending';

-- ── 5. Notifications table ──
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_unread_idx ON notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notif_created_idx ON notifications (created_at);

-- ── 6. Org projects can't be community-public (DB guard) ──
-- ponytail: CHECK constraint blocks any org project from being flagged public — race-proof at the DB layer.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS org_not_public_check;
ALTER TABLE projects ADD CONSTRAINT org_not_public_check CHECK (org_id IS NULL OR is_public = false);
