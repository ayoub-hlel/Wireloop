/**
 * App data tables — mirrors the Convex schema but in Postgres.
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index().on(t.userId),
  publicIdx: index().on(t.isPublic),
  createdIdx: index().on(t.createdAt),
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

// ─── Relations ───
export const userRelations = relations(user, ({ many }) => ({
  projects: many(projects),
  settings: many(settings),
  files: many(projectFiles),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  owner: one(user, { fields: [projects.userId], references: [user.id] }),
  files: many(projectFiles),
}));
