// Achievements are kept inline (not src/data/*.json) because:
// 1. Small dataset — 26 achievements = ~150 lines.
// 2. TypeScript safety — typed conditions, archetype keys, difficulty enums.
// 3. Static config — never changes at runtime, so no need for async fetch.
// Contrast with events (src/data/events/) which are large (45-57KB each) and
// content-driven.
//
// Achievement archetype keys mirror the ARCHETYPES keys (architect, startup,
// systems, advocate, balanced, sre, pentester, archeologist, em). A player who
// custom-builds and doesn't match a preset has state.archetype === 'custom',
// which satisfies no archetype achievement.
//
// The checks read SpecialSystem.stats (engine tier) — an accepted data→
// engine reference: achievements evaluate against the live game at run end,
// and special.ts imports nothing from achievements, so there is no cycle.

import { MAX_STAT, STAT_KEYS } from './archetypes.js';
import { consumableCapFor } from './items.js';
import { SpecialSystem } from '../engine/special.js';
import type { AchievementDefinition, AchievementMode, Difficulty, GameState } from '../core/types.js';

// --- Types ---

interface ArchetypeAchievement extends AchievementDefinition {
  archetype: string;
}

// --- Universal Achievements ---

export const UNIVERSAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'campaign_normal_universal',
    mode: 'Normal',
    title: "It Works On My Machine.",
    description: "Completed the game on Normal difficulty. It's a bit 'site'-specific, but hey, a win is a win!",
    emoji: '🎮',
    check: (s) => s.won,
  },
  {
    id: 'campaign_hard_universal',
    mode: 'Hard',
    title: 'Fixed In Production.',
    description: "Completed the game on Hard difficulty without reading the documentation. Talk about deploying a high-'risk' architecture!",
    emoji: '🏆',
    check: (s) => s.won,
  },
  {
    id: 'consumable_0',
    mode: 'Any',
    title: "Consumer's Choice",
    description: "No consumables used in a Run. You don't believe in food & substance abuse.",
    emoji: '🥗',
    check: (s) => s.consumablesUsed === 0,
  },
  {
    id: 'stat_max_4',
    mode: 'Any',
    title: 'Maxellent',
    description: "Max out 4 stats at the end of a run. You've optimized your profile to a 'C-level' standard—mostly style, a fair bit of substance, and totally 'scalable'.",
    emoji: '⭐',
    check: () => maxedStatCount() >= 4,
  },
  {
    id: 'stat_max_5',
    mode: 'Any',
    title: 'Maxcerrific',
    description: "Max out 5 stats at the end of a run. A masterful display of data serialization. You're pushing the absolute 'parameter' of what this build can handle.",
    emoji: '💎',
    check: () => maxedStatCount() >= 5,
  },
  {
    id: 'stat_max_6',
    mode: 'Any',
    title: 'Maxterful',
    description: "Max out 6 stats at the end of a run. Your stats are so heavily stacked, you're causing an arithmetic 'overflow' in the HR department.",
    emoji: '🥇',
    check: () => maxedStatCount() >= 6,
  },
  {
    id: 'stat_max_7',
    mode: 'Any',
    title: 'Living Life to the Max',
    description: "Max out 7 stats at the end of a run. The absolute peak of multi-threading. You are the fabled '10x' developer, completely untethered from 'string'ent realities.",
    emoji: '👑',
    check: () => maxedStatCount() >= 7,
  },
  {
    id: 'stat_consumable_5',
    mode: 'Any',
    title: 'Load Bearing',
    description: "Unlock 5 consumable slots. Your inventory is held together by a single string of legacy code. If you try to 'unload' just one item, the whole stack will 'overflow' and bring down the system.",
    emoji: '📦',
    implemented: false,
    check: (s) => consumableCapFor(s.equipment) >= 5,
  },
];

// --- Archetype Achievements ---
// Keys and the `archetype` field use the ARCHETYPES keys.

export const ARCHETYPE_ACHIEVEMENTS: Record<string, ArchetypeAchievement[]> = {
  architect: [
    {
      archetype: 'architect',
      mode: 'Normal',
      id: 'architect_normal',
      title: 'The Ivory Tower',
      description: "Successfully launched an abstract, theoretical framework that works perfectly as long as real users never touch it. A truly 'model' citizen.",
      emoji: '🏰',
      check: (s) => s.won,
    },
    {
      archetype: 'architect',
      mode: 'Hard',
      id: 'architect_hard',
      title: 'Drawings on a Napkin',
      description: "Completed the game using nothing but 47 interconnected UML diagrams and a prayer. You really drew the short 'string' on this layout.",
      emoji: '📝',
      check: (s) => s.won,
    },
  ],
  startup: [
    {
      archetype: 'startup',
      mode: 'Normal',
      id: 'startup_normal',
      title: 'Move Fast and Break Things',
      description: "Shipped a product that is 90% technical debt and 10% premium venture capital. You sure know how to 'capital'-ise on chaos!",
      emoji: '💥',
      check: (s) => s.won,
    },
    {
      archetype: 'startup',
      mode: 'Hard',
      id: 'startup_hard',
      title: 'Pivot to AI',
      description: "Completely rewrote the core gameplay loop at 3 AM the night before launch because the CEO saw a tweet. Talk about an artificial 'intelligence' crisis!",
      emoji: '🔄',
      check: (s) => s.won,
    },
  ],
  systems: [
    {
      archetype: 'systems',
      mode: 'Normal',
      id: 'systems_normal',
      title: 'Manual Memory Management',
      description: "Finished the game without a single memory leak, though it took ten years off your life. Thanks for the 'memories', but please 'free' yourself.",
      emoji: '💾',
      check: (s) => s.won,
    },
    {
      archetype: 'systems',
      mode: 'Hard',
      id: 'systems_hard',
      title: 'Bare Metal and Blood',
      description: "Refused to use any libraries and beat the game using only C, custom assembly, and sheer stubbornness. You've truly got some 'register'-ed anger issues.",
      emoji: '🩸',
      check: (s) => s.won,
    },
  ],
  advocate: [
    {
      archetype: 'advocate',
      mode: 'Normal',
      id: 'advocate_normal',
      title: 'Inflated Metrics',
      description: "Successfully convinced everyone the game was a masterpiece via a 45-minute keynote presentation and free t-shirts. What an absolute 'bazaar' way to push your 'git'-hub swag.",
      emoji: '📣',
      check: (s) => s.won,
    },
    {
      archetype: 'advocate',
      mode: 'Hard',
      id: 'advocate_hard',
      title: 'Climbing the Hype Cycle',
      description: "Managed to maintain a smile and complete the game while being bombarded by toxic comments on Hacker News. Way to 'buffer' the incoming insults!",
      emoji: '🎢',
      check: (s) => s.won,
    },
  ],
  balanced: [
    {
      archetype: 'balanced',
      mode: 'Normal',
      id: 'balanced_normal',
      title: 'Jack of All Trades, Master of None',
      description: "Centred a div and optimized a SQL query in the same afternoon. You are exhausted, but you really know how to find a middle 'ground'.",
      emoji: '🛠️',
      check: (s) => s.won,
    },
    {
      archetype: 'balanced',
      mode: 'Hard',
      id: 'balanced_hard',
      title: 'Context-Switching Whiplash',
      description: "Completed the game while simultaneously wrestling with CSS specificity and database deadlocks. Talk about a 'class'ic case of mixed 'signals'.",
      emoji: '🌀',
      check: (s) => s.won,
    },
  ],
  sre: [
    {
      archetype: 'sre',
      mode: 'Normal',
      id: 'sre_normal',
      title: 'The Five Nines',
      description: "Maintained 99.999% uptime during the finale, mostly by turning everything off and on again. Your methods are a bit 'terminal', but effective.",
      emoji: '⏱️',
      check: (s) => s.won,
    },
    {
      archetype: 'sre',
      mode: 'Hard',
      id: 'sre_hard',
      title: 'PagerDuty PTSD',
      description: "Beat the game while the alarm siren was constantly blaring in the background. You really know how to keep your composure under intense 'pipeline' pressure.",
      emoji: '🚨',
      check: (s) => s.won,
    },
  ],
  pentester: [
    {
      archetype: 'pentester',
      mode: 'Normal',
      id: 'pentester_normal',
      title: "I'm In.",
      description: "Bypassed all standard gameplay mechanics by exploiting a known vulnerability in the dialogue system. You've truly 'breached' a new level of laziness.",
      emoji: '🔓',
      check: (s) => s.won,
    },
    {
      archetype: 'pentester',
      mode: 'Hard',
      id: 'pentester_hard',
      title: 'Socially Engineered',
      description: "Beat the final boss by guessing their password was 'Password123!'. They really handed over the 'keys' to the kingdom on a silver platter.",
      emoji: '🎣',
      check: (s) => s.won,
    },
  ],
  archeologist: [
    {
      archetype: 'archeologist',
      mode: 'Normal',
      id: 'archeologist_normal',
      title: "Don't Touch That Block",
      description: "Navigated a 20-year-old codebase without accidentally bringing down a major banking system. One wrong move and it's a total 'collapse' of the asset 'branch'.",
      emoji: '🧱',
      check: (s) => s.won,
    },
    {
      archetype: 'archeologist',
      mode: 'Hard',
      id: 'archeologist_hard',
      title: 'The COBOL Necromancer',
      description: "Successfully summoned and debugged code written by a developer who retired before you were born. That's some ancient 'history' you've just 'compiled'.",
      emoji: '💀',
      check: (s) => s.won,
    },
  ],
  em: [
    {
      archetype: 'em',
      mode: 'Normal',
      id: 'em_normal',
      title: 'Herding Cats',
      description: "Got everyone to complete their tasks on time, despite 14 conflicting opinions on code formatting. It's tough trying to keep everyone aligned on the same 'line' of thought.",
      emoji: '🐱',
      check: (s) => s.won,
    },
    {
      archetype: 'em',
      mode: 'Hard',
      id: 'em_hard',
      title: 'This Could Have Been an Email',
      description: "Beat the final boss solely by scheduling back-to-back status update meetings until they surrendered. You really 'blocked' their schedule into submission.",
      emoji: '📧',
      check: (s) => s.won,
    },
  ],
};

// --- Storage ---

// Achievement storage key in localStorage.
const ACHIEVEMENTS_STORAGE_KEY = 'devlife_achievements';

// Get the set of unlocked achievement IDs from localStorage.
export function getUnlocked(): Set<string> {
  try {
    const data = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (data) {
      return new Set(JSON.parse(data) as string[]);
    }
  } catch (e) {
    console.warn('[d20().devLife] Achievement data corrupted, starting fresh:', e);
  }
  return new Set<string>();
}

// Save the set of unlocked achievement IDs to localStorage.
function saveUnlocked(unlocked: Set<string>): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch (e) {
    console.warn('[d20().devLife] Failed to save achievements:', e);
  }
}

// Wipe all unlocked achievements (issue #53 — reset from the options menu).
export function clearUnlocked(): void {
  try {
    localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
  } catch (e) {
    console.warn('[d20().devLife] Failed to clear achievements:', e);
  }
}

// --- Logic ---

// Check if an achievement is not yet implemented (type guard).
export function isNotImplemented(ach: AchievementDefinition): ach is AchievementDefinition & { implemented: false } {
  return ach.implemented === false;
}

// Flatten all achievements (universal + archetype) into one list.
function allAchievements(): AchievementDefinition[] {
  const list: AchievementDefinition[] = [...UNIVERSAL_ACHIEVEMENTS];
  for (const achs of Object.values(ARCHETYPE_ACHIEVEMENTS)) list.push(...achs);
  return list;
}

// Does the run's difficulty satisfy an achievement's mode requirement?
function difficultyMatches(mode: AchievementMode, difficulty: Difficulty): boolean {
  if (mode === 'Any') return true;
  if (mode === 'Normal') return difficulty === 'normal';
  return difficulty === 'hard'; // mode === 'Hard'
}

// Base stats at the cap (10) — the stat_max_* achievement family.
function maxedStatCount(): number {
  return STAT_KEYS.filter(k => SpecialSystem.stats[k] >= MAX_STAT).length;
}

// The implemented achievements the current (end-of-run) state satisfies.
// Pure — no localStorage. Called once when a run ends.
// The engine applies the shared gates — implemented, mode (difficulty),
// archetype — then each definition's own check.
function satisfiedAchievementIds(state: GameState): string[] {
  return allAchievements()
    .filter(a => a.implemented !== false)
    .filter(a => difficultyMatches(a.mode, state.difficulty))
    .filter(a => !a.archetype || state.archetype === a.archetype)
    .filter(a => a.check(state))
    .map(a => a.id);
}

// Evaluate achievements at the end of a run: diff the satisfied set against the
// persisted unlocked set, persist any new unlocks, and return the newly-unlocked
// definitions (for toasts).
function evaluate(state: GameState): AchievementDefinition[] {
  const unlocked = getUnlocked();
  const newlyUnlocked: AchievementDefinition[] = [];
  for (const id of satisfiedAchievementIds(state)) {
    if (unlocked.has(id)) continue;
    unlocked.add(id);
    const def = allAchievements().find(a => a.id === id);
    if (def) newlyUnlocked.push(def);
  }
  if (newlyUnlocked.length > 0) saveUnlocked(unlocked);
  return newlyUnlocked;
}

// Export for use in other modules
export const Achievements = {
  UNIVERSAL_ACHIEVEMENTS,
  ARCHETYPE_ACHIEVEMENTS,
  isNotImplemented,
  getUnlocked,
  saveUnlocked,
  clearUnlocked,
  satisfiedAchievementIds,
  evaluate,
};
