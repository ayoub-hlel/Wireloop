/**
 * App data tables — mirrors the Convex schema but in Postgres.
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';

// ─── Custom Enums ───
export const orgMemberRole = pgEnum('org_member_role', ['owner', 'admin', 'member']);
export const sharePermission = pgEnum('share_permission', ['view', 'edit']);

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
  forkedFrom: text('forked_from').references(() => projects.id, { onDelete: 'set null' }),
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

// ─── Recent Projects ───
export const recentProjects = pgTable('recent_projects', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.projectId] }),
  userIdIdx: index().on(t.userId),
  accessedIdx: index().on(t.lastAccessedAt),
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
  role: orgMemberRole('role').notNull().default('member'),
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
  recentProjects: many(recentProjects),
  sharedWithMe: many(sharedProjects, { relationName: 'sharedWithUser' }),
  sharedByMe: many(sharedProjects, { relationName: 'sharedByUser' }),
  ownedOrgs: many(organizations),
  orgMemberships: many(orgMembers),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  owner: one(user, { fields: [projects.userId], references: [user.id] }),
  files: many(projectFiles),
  starredBy: many(starredProjects),
  recentFor: many(recentProjects),
  sharedWith: many(sharedProjects),
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  forkedFromProject: one(projects, { fields: [projects.forkedFrom], references: [projects.id], relationName: 'forkedFrom' }),
  forks: many(projects, { relationName: 'forkedFrom' }),
}));

export const starredProjectsRelations = relations(starredProjects, ({ one }) => ({
  user: one(user, { fields: [starredProjects.userId], references: [user.id] }),
  project: one(projects, { fields: [starredProjects.projectId], references: [projects.id] }),
}));

export const recentProjectsRelations = relations(recentProjects, ({ one }) => ({
  user: one(user, { fields: [recentProjects.userId], references: [user.id] }),
  project: one(projects, { fields: [recentProjects.projectId], references: [projects.id] }),
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
