-- Audit log (append-only, enforced by trigger so even the table owner cannot
-- rewrite history) + Row-Level Security tenant policies.
--
-- ── Audit log ──
-- Written by /api/mutation for every sensitive action. The triggers make the
-- table INSERT-only AT THE DATABASE LEVEL — a compromised app process or a
-- fat-fingered migration cannot silently erase the trail.
CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_actor_created_idx ON audit_log(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_target_idx ON audit_log(target_type, target_id);

CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

-- ── Row-Level Security (tenant isolation safety net) ──
--
-- Policies key off the `app.user_id` session variable:
--   SELECT set_config('app.user_id', '<userId>', true);  -- per transaction
--
-- Cross-table checks run through SECURITY DEFINER helper functions so policy
-- evaluation cannot recurse (RLS forbids a policy from querying another
-- RLS-protected table it itself protects — the classic infinite-recursion trap).
--
-- IMPORTANT ACTIVATION NOTE: RLS is ENABLED but NOT FORCED. The app currently
-- connects via the stateless neon-http driver as the table owner, which (a)
-- cannot carry per-request session variables and (b) bypasses non-FORCE RLS.
-- So these policies are DORMANT today — zero behavior change — and become the
-- structural guarantee the moment the data layer moves to a session-scoped
-- driver (e.g. @neondatabase/serverless WebSocket Pool) running requests as a
-- restricted role. tests/integration/rls-policies.test.ts proves they work.
--
-- ponytail: deny-by-default policies, upgrade path: session driver → set_config
-- per request → restricted runtime role → ALTER TABLE ... FORCE ROW LEVEL SECURITY.

CREATE OR REPLACE FUNCTION app_current_user() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app_is_project_shared(project_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM shared_projects sp
    WHERE sp.project_id = project_id
      AND sp.shared_with_user_id = app_current_user()
  );
$$;

CREATE OR REPLACE FUNCTION app_is_project_owner(project_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
      AND p.user_id = app_current_user()
  );
$$;

CREATE OR REPLACE FUNCTION app_is_org_member(org_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members m
    WHERE m.org_id = org_id
      AND m.user_id = app_current_user()
  );
$$;

CREATE OR REPLACE FUNCTION app_is_org_owner(org_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = org_id
      AND o.owner_id = app_current_user()
  );
$$;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_tenant_select ON projects FOR SELECT USING (
  user_id = app_current_user()
  OR app_is_project_shared(id)
  OR app_is_org_member(org_id)
);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_files_tenant ON project_files FOR ALL USING (
  user_id = app_current_user()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_tenant ON settings FOR ALL USING (
  user_id = app_current_user()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_tenant ON profiles FOR ALL USING (
  user_id = app_current_user()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant ON notifications FOR ALL USING (
  user_id = app_current_user()
);

ALTER TABLE starred_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY starred_projects_tenant ON starred_projects FOR ALL USING (
  user_id = app_current_user()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant_select ON organizations FOR SELECT USING (
  owner_id = app_current_user()
  OR app_is_org_member(id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_members_tenant ON org_members FOR ALL USING (
  user_id = app_current_user()
  OR app_is_org_owner(org_id)
);

ALTER TABLE shared_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY shared_projects_tenant ON shared_projects FOR ALL USING (
  shared_with_user_id = app_current_user()
  OR app_is_project_owner(project_id)
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY invites_tenant_select ON invites FOR SELECT USING (
  invitee_email = nullif(current_setting('app.user_email', true), '')
  OR inviter_id = app_current_user()
  OR app_is_org_owner(org_id)
);
