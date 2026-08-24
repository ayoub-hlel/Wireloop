import { describe, it, expect } from 'vitest';
import { project, user, organization, projectShare, invite, notification } from '../../src/lib/server/validation';

describe('Validation Schemas — Security', () => {
  // safeName isn't exported, so exercise it through project.create — the real
  // production path. These previously re-declared a COPY of the regex locally,
  // which meant they stayed green even if the source regex were weakened.
  // Going through the real schema removes that blind spot (and the duplicated
  // control-char literal that tripped no-control-regex).
  const parseName = (name: string) => project.create.safeParse({ name }).success;

  describe('safeName (project/org/username)', () => {
    it('accepts normal names', () => {
      expect(parseName('My Project')).toBe(true);
      expect(parseName('Arduino Uno R3')).toBe(true);
      expect(parseName('test-project_v2')).toBe(true);
    });

    it('rejects injection characters', () => {
      for (const bad of [
        '{inject}',
        'test<script>',
        'name;drop',
        'test"quote',
        "test'quote",
        'test`backtick',
        'test|pipe',
        'test$dollar',
        'test#hash',
        'test\\backslash',
        'test<angle',
      ]) {
        expect(parseName(bad), `should reject ${JSON.stringify(bad)}`).toBe(false);
      }
    });

    it('rejects control characters', () => {
      // Built via String.fromCharCode so the test file carries no control-char
      // literals; covers the whole \u0000-\u001f range the schema blocks.
      for (const code of [0x00, 0x01, 0x09, 0x0a, 0x1f]) {
        const name = `test${String.fromCharCode(code)}name`;
        expect(parseName(name), `should reject charCode 0x${code.toString(16)}`).toBe(false);
      }
    });

    it('enforces the length bounds', () => {
      expect(parseName('')).toBe(false);
      expect(parseName('a'.repeat(80))).toBe(true);
      expect(parseName('a'.repeat(81))).toBe(false);
    });
  });

  describe('usernameSchema (via user.updateProfile — the real production path)', () => {
    // Same principle as safeName above: exercise the exported schema, never a
    // local copy of the regex. A weakened source regex must fail here.
    const parseUsername = (username: string) =>
      user.updateProfile.safeParse({ username }).success;

    it('accepts valid usernames', () => {
      expect(parseUsername('john')).toBe(true);
      expect(parseUsername('john_doe')).toBe(true);
      expect(parseUsername('john-doe')).toBe(true);
      expect(parseUsername('JohnDoe123')).toBe(true);
    });

    it('rejects invalid usernames', () => {
      expect(parseUsername('a')).toBe(false); // too short
      expect(parseUsername('user name')).toBe(false); // space
      expect(parseUsername('user@name')).toBe(false); // special char
      expect(parseUsername('user.name')).toBe(false); // dot
      expect(parseUsername('a'.repeat(31))).toBe(false); // too long
    });
  });

  describe('slugSchema (via organization.create — the real production path)', () => {
    const parseSlug = (slug: string) =>
      organization.create.safeParse({ name: 'Org', slug }).success;

    it('accepts valid slugs', () => {
      expect(parseSlug('my-org')).toBe(true);
      expect(parseSlug('org123')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(parseSlug('My-Org')).toBe(false); // uppercase
      expect(parseSlug('my_org')).toBe(false); // underscore
      expect(parseSlug('my org')).toBe(false); // space
    });
  });

  describe('project.create', () => {
    it('accepts valid project creation', () => {
      const result = project.create.safeParse({
        name: 'My Project',
        description: 'A test project',
        workspace: '<xml></xml>',
        boardType: 'uno',
        isPublic: false,
        tags: ['arduino', 'test'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects project name with injection chars', () => {
      const result = project.create.safeParse({
        name: '{inject}',
      });
      expect(result.success).toBe(false);
    });

    it('requires name', () => {
      const result = project.create.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects unknown fields', () => {
      const result = project.create.safeParse({
        name: 'Test',
        injected: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('project.update', () => {
    it('accepts partial update', () => {
      const result = project.update.safeParse({
        projectId: 'abc123',
        name: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('rejects update with injection in name', () => {
      const result = project.update.safeParse({
        projectId: 'abc123',
        name: 'test<script>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('organization.create', () => {
    it('accepts valid org creation', () => {
      const result = organization.create.safeParse({
        name: 'My Org',
        slug: 'my-org',
        description: 'A test org',
      });
      expect(result.success).toBe(true);
    });

    it('rejects org name with injection chars', () => {
      const result = organization.create.safeParse({
        name: '{inject}',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('projectShare', () => {
    it('accepts valid share', () => {
      const result = projectShare.share.safeParse({
        projectId: 'abc123',
        email: 'user@example.com',
        role: 'edit',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = projectShare.share.safeParse({
        projectId: 'abc123',
        email: 'not-an-email',
        role: 'edit',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = projectShare.share.safeParse({
        projectId: 'abc123',
        email: 'user@example.com',
        role: 'admin',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('user.updateProfile', () => {
    it('accepts valid profile update', () => {
      const result = user.updateProfile.safeParse({
        username: 'john_doe',
        bio: 'Arduino enthusiast',
        location: 'Berlin',
        website: 'https://example.com',
        isPublic: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid username', () => {
      const result = user.updateProfile.safeParse({
        username: 'user name',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid URL', () => {
      const result = user.updateProfile.safeParse({
        website: 'javascript:alert(1)',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('notification schemas', () => {
    it('accepts markAllRead', () => {
      const result = notification.markAllRead.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts list', () => {
      const result = notification.list.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('invite schemas', () => {
    it('accepts accept', () => {
      const result = invite.accept.safeParse({ inviteId: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('accepts decline', () => {
      const result = invite.decline.safeParse({ inviteId: 'abc123' });
      expect(result.success).toBe(true);
    });
  });
});
