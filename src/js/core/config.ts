// Game configuration — all tunable constants in one place
import type { Difficulty, StatKey } from './types.js';

export const CONFIG = {
  version: '0.50',
  versionLabel: 'Pretty Playable Prototype',

  stats: {
    min: 1,
    max: 10,
    keys: ['S', 'P', 'E', 'C', 'I', 'A', 'L'] as StatKey[],
    startingPoints: 40,
  },

  game: {
    eventsPerBoss: 6,
    daysPerCareerYear: 12,
    // Career phase display names, indexed by phase (1-4); index 0 unused
    phaseNames: ['', 'Junior Developer', 'Mid-Level Developer', 'Senior Developer', 'Staff/Principal'],
    bossPrefix: 'BOSS:',
    dropRate: 0.15,
    competenceGateFactor: 0.5,
    savingRollCharismaFactor: 0.5,
    redundancyRiskPerCharisma: 0.15,
    redundancyPhase: 3,
    deathThresholds: {
      obsolescenceDay: 365,
      redundancyDay: 400,
    },
    // A stat at or below this is one negative hit from the saving-roll floor
    dangerThreshold: 2,
    // Inventory and carry-over caps
    consumableCap: 2,          // consumables held in a run (and in the carry-over pool)
    equipmentCarryOverCap: 1,  // equipment carried into the next run
    // Days advanced per event (inclusive range)
    dayAdvance: { min: 3, max: 7 },
    // Extra equipment drop chance per LUCK point, added to dropRate
    luckDropBonusPerPoint: 0.03,
    // Consumables offered when choosing (level up, end of run)
    randomConsumableChoices: 3,
    // Career log: cap on stored entries, and how many each view shows
    careerLog: { cap: 50, sidePanel: 20, recent: 3, popup: 50 },
    // Difficulty (issue #6). Fixed at run start. A failed outcome's negative
    // effects are multiplied by a d(negMultSides) roll — easy is d1 (×1, no
    // change). Equipment slots (2) and HARD's extra consumable slot (3) are
    // deferred (issue #6): all difficulties use the default 1 equipment / 2
    // consumable slots for now. HARD is not selectable until those land.
    difficulty: {
      easy:   { label: 'Easy',   emoji: '🙂', negMultSides: 1, desc: 'The “Standard” career. Failures land exactly as written — no cosmic punishment. For your first run, or for when you\u2019re feeling generous with yourself.' },
      normal: { label: 'Normal', emoji: '😬', negMultSides: 2, desc: 'The “Realistic” career. Failures hit 1–2× harder, rolled on a d2. This is what the industry actually feels like.' },
      hard:   { label: 'Hard',   emoji: '💀', negMultSides: 4, desc: 'The “Unrealistic” career. Failures hit 1–4× harder, rolled on a d4. For masochists — or anyone who\u2019s been on-call since 2019.' },
    } as Record<Difficulty, { label: string; emoji: string; negMultSides: number; desc: string; locked?: boolean }>,
  },

  // Presentation timing (defaults). A future settings screen can override any
  // of these per-player; CONFIG stays the source of factory defaults.
  dice: {
    rollDurationMs: 800,  // how long the dice cycle before settling
    cycleCount: 15,       // random faces shown before settling
    // How long the settled result stays on screen before the overlay clears.
    // 1337ms is a deliberate easter egg (leet) — not a tuned value.
    resultHoldMs: 1337,
  },
  ui: {
    toastMs: 3000,        // toast notification lifetime
    flashMs: 300,         // screen-flash duration
    statFloatMs: 1500,    // floating stat-change text lifetime
  },
};

// Stat metadata
export const STAT_META: Record<StatKey, { name: string; short: string; desc: string; color: string }> = {
  S: {
    name: "Strength",
    short: "Technical Depth & Raw Coding Power",
    desc: "Measures your ability to handle heavy computational workloads and write complex, performant code. High Strength means you can brute-force a massive legacy codebase migration, master complex memory management, and write highly optimized algorithms.",
    color: '#ff6b6b'
  },
  P: {
    name: "Perception",
    short: "Code Comprehension & Debugging",
    desc: "Represents your environmental awareness within a system. High Perception allows you to instantly spot subtle bugs during code reviews, predict system failures before they happen, and easily navigate massive, unfamiliar microservice architectures.",
    color: '#4fc3f7'
  },
  E: {
    name: "Endurance",
    short: "Resilience & Focus",
    desc: "Tracks your stamina for long production outages, on-call rotations, and intense sprint cycles. High Endurance engineers don't burn out easily, can maintain focus during a 10-hour debugging session, and possess the mental fortitude to deal with frustrating, shifting project requirements.",
    color: '#81c784'
  },
  C: {
    name: "Charisma",
    short: "Stakeholder Management & Mentorship",
    desc: "Reflects your ability to influence, persuade, and collaborate. A high score means you excel at cross-team alignment, translating complex tech concepts for non-technical stakeholders, mentoring junior developers, and convincing leadership to fund your proposed architectural changes.",
    color: '#ffab40'
  },
  I: {
    name: "Intelligence",
    short: "System Architecture & Fast Learning",
    desc: "Gauges your capacity to abstract complex problems and learn new frameworks rapidly. High Intelligence engineers design elegant, scalable software architectures, pick up a brand-new programming language over a weekend, and write clean, perfectly decoupled code.",
    color: '#b388ff'
  },
  A: {
    name: "Agility",
    short: "Adaptability & Delivery Velocity",
    desc: "Tracks your speed and execution. High Agility engineers are masters of continuous deployment, rapid prototyping, and pivoting seamlessly when product requirements change. They excel in fast-paced startup environments where shipping code quickly is paramount.",
    color: '#ffd740'
  },
  L: {
    name: "Luck",
    short: "Heuristics & Clean Production Runs",
    desc: "Measures your relationship with the unknown. High Luck engineers write code that 'just works' on the first deploy, guess the exact root cause of a server issue on their first try, and naturally stumble into the easiest, most elegant Stack Overflow solution on page one.",
    color: '#e040fb'
  }
};
