import { describe, it, expect } from 'vitest';
import { user, project, actionEnvelope } from '@/lib/server/validation';

// Server side of the strict mutation contract. `users:updateUserSettings` is a
// .strict() zod schema accepting exactly {boardType, theme, language, autoSave,
// tutorialCompleted} — sending codeFont or simulator-visual fields 400s
// (ValidationError). This is the server-side lock for the client
// settings-sync contract (e491108 / circuit-settings 400 saga).
describe('server validation schemas (strict mutation contract)', () => {
  describe('user.updateSettings', () => {
    it('accepts the 5 schema keys', () => {
      const res = user.updateSettings.safeParse({
        boardType: 'uno',
        theme: 'dark',
        language: 'en',
        autoSave: true,
        tutorialCompleted: { intro: true },
      });
      expect(res.success).toBe(true);
    });

    it('rejects codeFont (strict — the 400 class)', () => {
      const res = user.updateSettings.safeParse({ autoSave: true, codeFont: 'mono' });
      expect(res.success).toBe(false);
    });

    it('rejects simulator-visual extras (ledColor, backgroundColor)', () => {
      const res = user.updateSettings.safeParse({
        boardType: 'uno',
        ledColor: '#f00',
        backgroundColor: '#000',
      });
      expect(res.success).toBe(false);
    });

    it('accepts partial updates (all keys optional)', () => {
      expect(user.updateSettings.safeParse({ theme: 'light' }).success).toBe(true);
      expect(user.updateSettings.safeParse({}).success).toBe(true);
    });
  });

  it('project.create applies defaults and is strict', () => {
    const res = project.create.safeParse({ name: 'Blink' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.boardType).toBe('uno');
      expect(res.data.isPublic).toBe(false);
      expect(res.data.workspace).toBe('');
    }
    expect(project.create.safeParse({ name: 'x', bogus: 1 }).success).toBe(false);
  });

  it('actionEnvelope requires a name', () => {
    expect(actionEnvelope.safeParse({}).success).toBe(false);
    expect(actionEnvelope.safeParse({ name: 'projects:createProject' }).success).toBe(true);
  });
});
