// UI — Haptics engine: vibration feedback for key game moments.
// navigator.vibrate() is Android + some WebViews only. iOS Safari does not
// support it. Non-fatal: no-op on unsupported platforms.
//
// Haptics are reserved for meaningful moments (stat check result, level up,
// boss, game over, victory, achievement) — not every UI click.
// Toggle is persisted in settings (ui-settings.ts).

import { UI } from './ui.js';

type HapticType =
  | 'click'
  | 'success'
  | 'failure'
  | 'levelup'
  | 'boss'
  | 'gameover'
  | 'victory'
  | 'achievement';

interface HapticDef {
  pattern: number | number[];
}

const HAPTIC_DEFS: Record<HapticType, HapticDef> = {
  click:       { pattern: 30 },
  success:     { pattern: [40, 30, 40] },
  failure:     { pattern: [100, 50, 100] },
  levelup:     { pattern: [40, 20, 40, 20, 60] },
  boss:        { pattern: [150, 100, 150, 100, 200] },
  gameover:    { pattern: [300, 100, 200, 100, 100] },
  victory:     { pattern: [40, 20, 40, 20, 40, 20, 40, 20, 80] },
  achievement: { pattern: [40, 20, 40, 20, 40, 20, 40, 20, 40, 20, 60] },
};

function playHaptic(type: HapticType): void {
  if (!UI.hapticsOn) return;
  const def = HAPTIC_DEFS[type];
  if (!def) return;
  if (navigator.vibrate) navigator.vibrate(def.pattern);
}

export const UIHaptics = {
  playHaptic,
};
