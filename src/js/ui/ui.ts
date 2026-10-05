// UI composition — merges UICore (ui-core.js) with the section objects into
// the single UI object the rest of the game calls.
//
// The section files import { UI } from this module for cross-section calls
// (e.g. UI.showToast) — a cycle in the import graph. It is safe because the
// cycle is only touched at call time (inside event handlers and render
// methods), long after every module has evaluated and the composition below
// has run. The composition itself references only the section objects, which
// are fully defined before this module body executes (imports evaluate first).

import { UICore } from './ui-core.js';
import { UICharacter } from './ui-character.js';
import { UILevelUp } from './ui-levelup.js';
import { UIEndOfRun } from './ui-endofrun.js';
import { UIEventCard } from './ui-event.js';
import { UITooltip } from './ui-tooltip.js';
import { UIDice } from './ui-dice.js';
import { UIBgm } from './ui-bgm.js';
import { UIHaptics } from './ui-haptics.js';
import { UILeaderboard } from './ui-leaderboard.js';
import { UIAchievements } from './ui-achievements.js';
import { UIStatistics } from './ui-statistics.js';
import { UISettings } from './ui-settings.js';

export const UI = Object.assign({}, UICore, UICharacter, UILevelUp, UIEndOfRun, UIEventCard, UITooltip, UIDice, UIBgm, UIHaptics, UILeaderboard, UIAchievements, UIStatistics, UISettings);
