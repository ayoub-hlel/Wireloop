/**
 * App data tables — mirrors the Convex schema but in Postgres.
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index, pgEnum, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';

// ─── Custom Enums ───
// ponytail: 'member' renamed → 'user'; 'viewer' added. Migration maps existing 'member' rows to 'user'.
export const orgMemberRole = pgEnum('org_member_role', ['owner', 'admin', 'user', 'viewer']);
export const sharePermission = pgEnum('share_permission', ['view', 'edit']);
export const inviteStatus = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'revoked']);
export const inviteKind = pgEnum('invite_kind', ['org', 'project']);
export const notificationType = pgEnum('notification_type', ['org_project_created', 'org_project_deleted', 'invite_received', 'ownership_transferred']);

// ─── User Profiles ───
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name').notNull(),
  profileImage: text('profile_image'),
  username: text('username').unique(),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  isPublic: boolean('is_public').notNull().default(false),
  lastLogin: timestamp('last_login').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  usernameIdx: index().on(t.username),
}));

// ─── Projects ───
export const projects = pgTable('projects', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  workspace: text('workspace').notNull(), // Blockly XML
  boardType: text('board_type', { enum: ['uno', 'nano', 'mega'] }).notNull().default('uno'),
  isPublic: boolean('is_public').notNull().default(false),
  tags: text('tags').array(),
  likes: integer('likes').default(0),
  views: integer('views').default(0),
  orgId: text('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  thumbnailUrl: text('thumbnail_url'),
  lastOpenedAt: timestamp('last_opened_at'),
  deletedAt: timestamp('deleted_at'),
  deletedBy: text('deleted_by').references(() => user.id, { onDelete: 'set null' }),
  isForked: boolean('is_forked').notNull().default(false),
  // ponytail: AnyPgColumn annotation is drizzle's idiom for self-referencing FKs (breaks the circular type inference)
  forkedFrom: text('forked_from').references((): AnyPgColumn => projects.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdDeletedAtIdx: index('user_id_deleted_at_idx').on(t.userId, t.deletedAt),
  publicIdx: index().on(t.isPublic),
  createdIdx: index().on(t.createdAt),
  forkedFromIdx: index('forked_from_idx').on(t.forkedFrom),
  deletedAtPartialIdx: index('deleted_at_partial_idx').on(t.deletedAt).where(sql`${t.deletedAt} IS NOT NULL`),
}));

// ─── Settings ───
export const settings = pgTable('settings', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  boardType: text('board_type', { enum: ['uno', 'nano', 'mega'] }).notNull().default('uno'),
  theme: text('theme', { enum: ['light', 'dark'] }).notNull().default('light'),
  language: text('language').notNull().default('en'),
  autoSave: boolean('auto_save').notNull().default(true),
  tutorialCompleted: jsonb('tutorial_completed').notNull().default('{}'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Project Files ───
export const projectFiles = pgTable('project_files', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  checksum: text('checksum').notNull(),
  storageId: text('storage_id').notNull(), // R2 storage ID
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
}, (t) => ({
  projectIdx: index().on(t.projectId),
  userIdx: index().on(t.userId),
}));

// ─── Starred Projects ───
export const starredProjects = pgTable('starred_projects', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.projectId] }),
  userIdIdx: index().on(t.userId),
}));

// ─── Shared Projects ───
export const sharedProjects = pgTable('shared_projects', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sharedWithUserId: text('shared_with_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  permission: sharePermission('permission').notNull().default('view'),
  sharedByUserId: text('shared_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.sharedWithUserId] }),
  sharedWithIdx: index().on(t.sharedWithUserId),
}));

// ─── Invites (org membership + personal-project collab) ───
// ponytail: polymorphic single table — kind distinguishes org vs project, invitee_email
// lets you invite unregistered users (backfilled on signup via email match, no tokens).
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  kind: inviteKind('kind').notNull(),
  orgId: text('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  inviteeEmail: text('invitee_email').notNull(),
  inviteeId: text('invitee_id').references(() => user.id, { onDelete: 'set null' }),
  inviterId: text('inviter_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // org: admin|user|viewer · project: view|edit
  status: inviteStatus('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.id] }),
  inviteeIdx: index().on(t.inviteeEmail),
  pendingIdx: index('invites_pending_idx').on(t.status).where(sql`${t.status} = 'pending'`),
}));

// ─── Notifications ───
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: notificationType('type').notNull(),
  payload: jsonb('payload').notNull().default('{}'), // { projectName, orgName, actorName, inviteId? }
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.id] }),
  userUnreadIdx: index('notif_user_unread_idx').on(t.userId, t.readAt).where(sql`${t.readAt} IS NULL`),
  createdIdx: index().on(t.createdAt),
}));

// ─── Organizations ───
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  slugIdx: index().on(t.slug),
}));

// ─── Org Members ───
export const orgMembers = pgTable('org_members', {
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: orgMemberRole('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.userId] }),
  userIdIdx: index().on(t.userId),
}));

// ─── Relations ───
export const userRelations = relations(user, ({ many }) => ({
  projects: many(projects),
  settings: many(settings),
  files: many(projectFiles),
  starredProjects: many(starredProjects),
  sharedWithMe: many(sharedProjects, { relationName: 'sharedWithUser' }),
  sharedByMe: many(sharedProjects, { relationName: 'sharedByUser' }),
  ownedOrgs: many(organizations),
  orgMemberships: many(orgMembers),
  notifications: many(notifications),
  receivedInvites: many(invites, { relationName: 'invitee' }),
  sentInvites: many(invites, { relationName: 'inviter' }),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  owner: one(user, { fields: [projects.userId], references: [user.id] }),
  files: many(projectFiles),
  starredBy: many(starredProjects),
  sharedWith: many(sharedProjects),
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  forkedFromProject: one(projects, { fields: [projects.forkedFrom], references: [projects.id], relationName: 'forkedFrom' }),
  forks: many(projects, { relationName: 'forkedFrom' }),
  invites: many(invites),
}));

export const starredProjectsRelations = relations(starredProjects, ({ one }) => ({
  user: one(user, { fields: [starredProjects.userId], references: [user.id] }),
  project: one(projects, { fields: [starredProjects.projectId], references: [projects.id] }),
}));

export const sharedProjectsRelations = relations(sharedProjects, ({ one }) => ({
  project: one(projects, { fields: [sharedProjects.projectId], references: [projects.id] }),
  sharedWithUser: one(user, { fields: [sharedProjects.sharedWithUserId], references: [user.id], relationName: 'sharedWithUser' }),
  sharedByUser: one(user, { fields: [sharedProjects.sharedByUserId], references: [user.id], relationName: 'sharedByUser' }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(user, { fields: [organizations.ownerId], references: [user.id] }),
  members: many(orgMembers),
  projects: many(projects),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, { fields: [orgMembers.orgId], references: [organizations.id] }),
  user: one(user, { fields: [orgMembers.userId], references: [user.id] }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  org: one(organizations, { fields: [invites.orgId], references: [organizations.id], relationName: 'org' }),
  project: one(projects, { fields: [invites.projectId], references: [projects.id], relationName: 'project' }),
  inviteeUser: one(user, { fields: [invites.inviteeId], references: [user.id], relationName: 'invitee' }),
  inviter: one(user, { fields: [invites.inviterId], references: [user.id], relationName: 'inviter' }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] }),
}));

// Append-only audit trail for sensitive mutations. The DB trigger added in
// migration 0006 makes UPDATE/DELETE impossible even for the table owner —
// the application can only ever INSERT here.
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
