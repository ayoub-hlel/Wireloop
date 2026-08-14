import { z } from 'zod';

// ponytail: better-auth generateId() returns 32-char alnum IDs, not UUIDs.
const uuid = z.string().min(1).max(128);
const boardType = z.enum(['uno', 'nano', 'mega']);
const theme = z.enum(['light', 'dark']);
const httpUrl = z.string().url().refine(
  v => /^https?:\/\//i.test(v),
  { message: 'Only HTTP(S) URLs allowed' }
);

// ponytail: shared sanitization for names — no {}/;:<>|\\`"'$ or control chars.
// Prevents injection in project names, org names, usernames. One regex, applied everywhere.
const safeName = z.string().trim().min(1).max(80)
  // The \u0000-\u001f range is the point: rejecting control characters (null bytes,
  // etc.) in names is a security control, not an accidental literal. Removing it
  // would weaken input validation, so the rule is suppressed rather than obeyed.
  // eslint-disable-next-line no-control-regex
  .regex(/^[^\u0000-\u001f{}<>/;:"'`|$#\\]+$/, 'Contains disallowed characters');
const usernameSchema = z.string().min(2).max(30)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, dash, underscore only');
const slugSchema = z.string().min(2).max(50)
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, dash only');
const orgRoleSchema = z.enum(['admin', 'user', 'viewer']);
const shareRoleSchema = z.enum(['view', 'edit']);

export const project = {
  create: z.object({
    name: safeName,
    description: z.string().max(2000).optional().default(''),
    workspace: z.string().optional().default(''),
    boardType: boardType.optional().default('uno'),
    isPublic: z.boolean().optional().default(false),
    tags: z.array(z.string().max(50)).max(20).optional().default([]),
    // ponytail: org-scoped creation — nullish accepts undefined OR null (personal sends null).
    orgId: uuid.nullish(),
  }).strict(),

  update: z.object({
    projectId: uuid,
    name: safeName.optional(),
    description: z.string().max(2000).optional(),
    workspace: z.string().optional(),
    boardType: boardType.optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }).strict(),

  delete: z.object({ projectId: uuid }).strict(),

  incrementViews: z.object({ projectId: uuid }).strict(),

  get: z.object({ projectId: uuid }).strict(),

  getFile: z.object({
    projectId: uuid,
    userId: uuid.optional(),
  }).strict(),

  saveFile: z.object({
    projectId: uuid,
    userId: uuid.optional(),
    content: z.string().optional().default(''),
    filename: z.string().optional(),
  }).strict(),

  deleteFile: z.object({ projectId: uuid }).strict(),

  star: z.object({ projectId: uuid }).strict(),
  unstar: z.object({ projectId: uuid }).strict(),
  fork: z.object({ projectId: uuid }).strict(),
  trash: z.object({ projectId: uuid }).strict(),
  restore: z.object({ projectId: uuid }).strict(),

  getDrafts: z.object({}).strict(),

  getPublic: z.object({}).strict(),

  getSharedMembers: z.object({ projectId: uuid }).strict(),
};

export const user = {
  updateSettings: z.object({
    boardType: boardType.optional(),
    theme: theme.optional(),
    language: z.string().max(10).optional(),
    autoSave: z.boolean().optional(),
    tutorialCompleted: z.record(z.string(), z.boolean()).optional(),
  }).strict(),

  updateTutorial: z.object({
    step: z.string().min(1),
    completed: z.boolean(),
  }).strict(),

  updateProfile: z.object({
    username: usernameSchema.optional(),
    profileImage: httpUrl.optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    website: httpUrl.optional(),
    isPublic: z.boolean().optional(),
  }).strict(),

  syncProfile: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    profileImage: httpUrl.optional(),
    username: z.string().optional(),
  }).strict(),

  getProfile: z.object({ userId: uuid.optional() }).strict(),

  // Accepted for wire compatibility with the existing client call; the handler
  // always scopes to the session user, so it can't be used to read another row.
  getSettings: z.object({ userId: uuid.optional() }).strict(),

  // ponytail: email-prefix search for the org creator invite tokenizer.
  // Returns matching users so the client can show name + email in the dropdown.
  search: z.object({
    q: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(20).optional().default(8),
  }).strict(),
};

export const organization = {
  create: z.object({
    name: safeName,
    slug: slugSchema.optional(),
    description: z.string().max(2000).optional().default(''),
    invitees: z.array(z.string().email()).max(50).optional().default([]),
  }).strict(),

  update: z.object({
    orgId: uuid,
    name: safeName.optional(),
    slug: slugSchema.optional(),
    description: z.string().max(2000).optional(),
  }).strict(),

  delete: z.object({ orgId: uuid }).strict(),

  // ponytail: invite by email (not username) — covers unregistered users.
  invite: z.object({
    orgId: uuid,
    email: z.string().email(),
    role: orgRoleSchema.optional().default('user'),
  }).strict(),

  changeRole: z.object({
    orgId: uuid,
    userId: uuid,
    role: orgRoleSchema,
  }).strict(),

  transferOwnership: z.object({
    orgId: uuid,
    newOwnerId: uuid,
  }).strict(),

  removeMember: z.object({
    orgId: uuid,
    userId: uuid,
  }).strict(),

  leave: z.object({ orgId: uuid }).strict(),

  getUserOrgs: z.object({}).strict(),

  getMembers: z.object({ orgId: uuid }).strict(),

  getOrgProjects: z.object({ orgId: uuid }).strict(),
};

export const projectShare = {
  share: z.object({
    projectId: uuid,
    email: z.string().email(),
    role: shareRoleSchema.optional().default('view'),
  }).strict(),

  unshare: z.object({
    projectId: uuid,
    userId: uuid,
  }).strict(),

  changeRole: z.object({
    projectId: uuid,
    userId: uuid,
    role: shareRoleSchema,
  }).strict(),

  transferOwnership: z.object({
    projectId: uuid,
    newOwnerId: uuid,
  }).strict(),
};

export const invite = {
  accept: z.object({ inviteId: uuid }).strict(),
  decline: z.object({ inviteId: uuid }).strict(),
  list: z.object({}).strict(),
};

export const notification = {
  list: z.object({}).strict(),
  markRead: z.object({ notificationId: uuid }).strict(),
  markAllRead: z.object({}).strict(),
};

export const actionEnvelope = z.object({
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();
