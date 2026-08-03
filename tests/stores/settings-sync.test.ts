import { describe, it, expect } from 'vitest';
import { settingsSyncPayload } from '@/stores/settings-sync';

// Regression: users:updateUserSettings is a .strict() zod schema accepting only
// {boardType, theme, language, autoSave, tutorialCompleted}. Sending codeFont or
// simulator-visual fields 400s. e491108 stripped the store path but the
// circuit-settings route's direct mutation call leaked codeFont → 400 on save.
// settingsSyncPayload is the single choke point — lock that contract here.
describe('settingsSyncPayload (strict-schema contract)', () => {
  it('emits exactly the 5 schema-allowed keys from a full settings object', () => {
    const out = settingsSyncPayload({
      autoSave: true,
      codeFont: 'mono',
      tutorialCompleted: true,
      boardType: 'uno',
      theme: 'dark',
      language: 'en',
      // simulator-visual extras that must never reach the schema
      ledColor: '#f00',
      backgroundColor: '#000',
      customLedColor: false,
      maxTimePerMove: 20,
    } as any);

    expect(out).toEqual({
      autoSave: true,
      tutorialCompleted: true,
      boardType: 'uno',
      theme: 'dark',
      language: 'en',
    });
  });

  it('never emits codeFont or visual fields', () => {
    const out = settingsSyncPayload({ codeFont: 'mono', ledColor: '#f00' } as any);
    expect('codeFont' in out).toBe(false);
    expect('ledColor' in out).toBe(false);
  });

  it('passes through a partial input (missing keys are undefined, dropped in JSON)', () => {
    const out = settingsSyncPayload({ theme: 'light', autoSave: true });
    expect(out.theme).toBe('light');
    expect(out.autoSave).toBe(true);
    expect(out.boardType).toBeUndefined();
    expect(out.tutorialCompleted).toBeUndefined();
  });
});
