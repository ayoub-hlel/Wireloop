import { z } from 'zod';

const uuid = z.string().uuid();
const boardType = z.enum(['uno', 'nano', 'mega']);
const theme = z.enum(['light', 'dark']);
const httpUrl = z.string().url().refine(
  v => /^https?:\/\//i.test(v),
  { message: 'Only HTTP(S) URLs allowed' }
);

export const project = {
  create: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().default(''),
    workspace: z.string().optional().default(''),
    boardType: boardType.optional().default('uno'),
    isPublic: z.boolean().optional().default(false),
    tags: z.array(z.string().max(50)).max(20).optional().default([]),
  }).strict(),

  update: z.object({
    projectId: uuid,
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    workspace: z.string().optional(),
    boardType: boardType.optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }).strict(),

  delete: z.object({ projectId: uuid }).strict(),

  incrementViews: z.object({ projectId: uuid }).strict(),

  get: z.object({ projectId: uuid }).strict(),

  getPublic: z.object({ projectId: uuid }).strict(),

  getPublicList: z.object({
    limit: z.number().int().min(1).max(100).optional().default(20),
  }).strict(),

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
  trackRecent: z.object({ projectId: uuid }).strict(),

  getDrafts: z.object({}).strict(),
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
    username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
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
};

export const organization = {
  create: z.object({
    name: z.string().min(1).max(200),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(2000).optional().default(''),
  }).strict(),

  update: z.object({
    orgId: uuid,
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(2000).optional(),
  }).strict(),

  delete: z.object({ orgId: uuid }).strict(),

  addMember: z.object({
    orgId: uuid,
    userId: uuid,
    role: z.enum(['admin', 'member']).optional().default('member'),
  }).strict(),

  removeMember: z.object({
    orgId: uuid,
    userId: uuid,
  }).strict(),

  getUserOrgs: z.object({}).strict(),

  getMembers: z.object({ orgId: uuid }).strict(),

  getOrgProjects: z.object({ orgId: uuid }).strict(),
};

export const actionEnvelope = z.object({
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();
