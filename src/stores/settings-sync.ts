import type { Settings } from '../types/models';

/**
 * Build the payload sent to the `users:updateUserSettings` mutation.
 *
 * That mutation's zod schema is `.strict()` and accepts exactly five keys
 * (`boardType, theme, language, autoSave, tutorialCompleted`). `codeFont` and
 * the simulator-visual fields (`ledColor`, `backgroundColor`, …) are local-only
 * — sending them makes the server return 400 (`ValidationError`).
 *
 * Every client caller must route through this (settings.store + the
 * circuit-settings route). e491108 refactored the store path but missed the
 * route's direct mutation call, letting `codeFont` leak through → 400 on save;
 * this function is the single choke point so that can't regress per-caller.
 *
 * ponytail: boardType is passed through unchanged. models.Settings types it as
 * uppercase (`'ARDUINO_UNO'`) but the live enum runtime is lowercase
 * (`MicroControllerType.ARDUINO_UNO = "uno"`, matching the schema); the type
 * lie is pre-existing scope-angle, not addressed here. Upgrade path is a proper
 * split of the two Settings types (user-pref vs arduino-sim visual).
 */
export function settingsSyncPayload(s: Partial<Settings>): Partial<Settings> {
  const { boardType, theme, language, autoSave, tutorialCompleted } = s;
  return { boardType, theme, language, autoSave, tutorialCompleted };
}