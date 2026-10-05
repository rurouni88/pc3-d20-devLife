# d20().devLife: A Software Engineering Roguelike

## 1. Game Overview

**d20().devLife** is a web-based roguelike simulation where you play as a software engineer navigating the treacherous landscape of modern tech careers. Each run is a new "career" — a procedurally generated journey through sprints, incidents, code reviews, and career milestones.

**Core Loop:** Make decisions → Manage stats → Survive → Reach retirement or die trying (career suicide).

**Tone:** Satirical, humorous, deeply relatable to any developer who's survived a production outage at 3 AM.

---

## 2. Core Mechanics

### 2.1 The SPECIAL System

| Stat | What It Does | How It's Used |
|------|-------------|---------------|
| **S**trength | Technical depth, raw coding power | Push through impossible deadlines, refactor legacy code, brute-force complex algorithms |
| **P**erception | Code comprehension, bug detection | Spot bugs in code reviews, predict failures, understand unfamiliar codebases |
| **E**ndurance | Stamina, focus, burnout resistance | Survive long on-call rotations, 10-hour debugging marathons, shifting requirements |
| **C**harisma | Stakeholder management, mentorship | Influence decisions, mentor juniors, convince leadership, cross-team alignment |
| **I**ntelligence | System architecture, fast learning | Design scalable systems, learn new frameworks, write clean decoupled code |
| **A**gility | Adaptability, delivery velocity | Ship fast, pivot on requirements, continuous deployment mastery |
| **L**uck | Heuristics, clean production runs | Code "just works" on deploy, lucky guesses, perfect Stack Overflow finds |

**Stat Range:** 1-10 per stat (70 points total is the theoretical max)  
**Starting Points:** 40 points to distribute (like Fallout's ~40 base points)  
**Gain on Level Up:** +1 to any stat (2 with the **Rapid Learner** perk)  
**Level-Up Cadence:** every `level × 6` events (every `level × 5` with **Fast Ship**)

### 2.2 Career Progression (The "Dungeon")

The game is structured as a series of **Career Phases**, each containing multiple **Events**. Think of it like climbing the tech career ladder — but every step is a gauntlet.

Each phase is a fixed-length gauntlet: **6 events** (5 with **Fast Ship**), the last one being the phase **boss**. Events are drawn **randomly without repeats** within a run (from the phase's pool, excluding anything seen so far; if the pool runs dry, the boss is used as fallback). A full run is **24 events** (20 with Fast Ship).

```
Each phase has a **pool** of events (20 for Junior, 20 for Mid, 20 for Senior, 15 for Staff). A run draws **5 events randomly** from the pool (no repeats), then the phase boss is fixed. Example events from each pool:

```text
Career Phase 1: Junior Developer (Years 1-2) — Pool of 20 events
├── First Code Review, 3 AM Production Incident, Sprint Planning
├── The New Framework Mandate, The Requirements Change, The 3 AM Email
├── The "Quick" Fix, Daily Standup from Hell, The Merge Conflict
├── Demo Day Disaster, Innovation Day, The Sprint Retrospective
├── The Performance Review, The Bug That Wasn't, The Missing Dependency
├── The Code Freeze, The Hotfix, The Deployment Window
├── The Standup That Ran Over, The Ticket That Got Lost, The Scope Creep
├── The Bad Merge, The Broken Build, The Staging Drift
├── The Legacy Ticket, The Duplicate PR, The Accidental Feature
└── BOSS: The Legacy Monolith (fixed)
│
Career Phase 2: Mid-Level Developer (Years 3-5) — Pool of 20 events
├── Weekend On-Call, Mentor a Junior Developer, Performance Crisis
├── Demo Day, The Code Review from Hell, The Boss Wants Your Weekend
├── The Midnight Hotfix, Technical Debt Avalanche, The Mentor Crisis
├── The 404 That Wasn't, The Refactor Temptation, The Tech Stack War
├── The Agile Transformation, The Sprint Ceremony, The Deprecation Notice
├── The Cross-Team Dependency, The SLA Breach, The Capacity Planning
├── The Production Rollback, The Canary Failure, The Load Test
├── The Architecture Review, The RFC That Nobody Read, The Design Doc
├── The Incident Post-Mortem, The Blame Game, The On-Call Handoff
└── BOSS: The Migration Project (fixed)
│
Career Phase 3: Senior Developer (Years 6-7) — Pool of 20 events
├── Tech Debt Crisis, The Interview Panel, Burnout Warning Signs
├── Performance Review, Conference Talk Opportunity, The Promotion Review
├── The Security Audit, The Keynote Invitation, The KPI Trap
├── The On-Call Nightmare, The Blameless Retrospective, The Architecture Presentation
├── The SVPG Product Model, The Product Triangle, The Code of Conduct Incident
├── The Platform Strategy, The Tech Radar, The Innovation Sprint
├── The Budget Review, The Headcount Freeze, The Org Restructure
├── The Vendor Evaluation, The Open Source Decision, The License Audit
├── The Compliance Check, The Data Privacy Review, The Accessibility Audit
└── BOSS: The Platform Rewrite (fixed)
│
Career Phase 4: Staff/Principal (Years 8-10) — Pool of 15 events
├── Executive Presentation, Open Source Controversy, The Great Hiring Freeze
├── Boardroom Strategy Session, The Data Breach, The Board Presentation
├── The Open Source Crisis, The Company Merger, The Breaking API Change
├── The Performance Crisis II, The Hiring Freeze II
├── The Technical Debt Summit, The Engineering Vision, The Roadmap Review
├── The Team Restructure, The Manager Conflict, The Career Crossroads
├── The Public Speaking Gig, The Conference Keynote, The Industry Award
├── The Mentorship Program, The Succession Plan, The Legacy Project
├── The Budget Negotiation, The Resource Allocation, The Prioritization Matrix
└── BOSS: The Company-Wide Restructure (fixed)
```

### 2.3 Events

Events are the core gameplay unit. Each event presents a scenario with:
- **Narrative description** (satirical tech humor)
- **3–4 choices** (most events are 3; bosses are 3)
- **d20 stat checks** behind most choices (see [§9](#9-stat-check-resolution))
- **Consequences** based on checks + choices
- Optional **equipment drop** on success (chance scales with Luck)

**Example Event** (actual, from `phase_junior.json`):

> **3 AM. The pager goes off.**
> 
> Production database is spiking. Your monitoring dashboard shows a 500% increase in response times. The CEO just pinged you on Slack: "URGENT - CEO here, we're losing $10k/min!"
> 
> What do you do?
> 
> A) **Roll back the last deployment** (Agility 5) — Fast, but might lose customer data
> B) **Dive into logs immediately** (Perception 6) — Thorough, but takes time
> C) **Call a war room meeting** (Charisma 4) — Get everyone aligned, but slow
> D) **Restart everything** (Luck 7) — The nuclear option. It works... sometimes.

### 2.4 Items & Equipment

Passive items that give permanent stat bonuses. **Max 1 equipped at a time.**

**Drop rules** (per successful stat check):
- Drop chance: `15% + 3% × Luck` (base Luck), capped at 100%
- Rarity weights: Common **50%**, Uncommon **30%**, Rare **15%**, Epic **5%**
- If you already have equipment equipped, you choose whether to keep the new item or your current one

#### Common
| Item | Emoji | Effect | Description |
|------|-------|--------|-------------|
| Mechanical Keyboard | ⌨️ | +1 Strength | Clickety-clack. Your fingers never miss. |
| Noise-Canceling Headphones | 🎧 | +1 Endurance | The world fades away. Focus achieved. |
| Rubber Duck | 🦆 | +1 Perception | Debugging companion. It always knows. |
| Ultrawide Monitor | 🖥️ | +1 Perception, +1 Agility | Three screens. Zero distractions. |

#### Uncommon
| Item | Emoji | Effect | Description |
|------|-------|--------|-------------|
| Claude Code | 🤖 | +1 Luck | The AI writes it. You pretend you understand it. |
| System Design Interview Prep | 📊 | +1 Intelligence | You can now draw boxes and arrows confidently. |
| Domain-Driven Design | 📐 | +2 Intelligence | You can now split your monolith into 47 services. |

#### Rare
| Item | Emoji | Effect | Description |
|------|-------|--------|-------------|
| TOGAF Certification | 📜 | +2 Charisma | Enterprise architecture framework. Now you can draw slides about slides. |
| MacBook Pro M5 | 💻 | +1 Intelligence, +1 Agility | It just works. Mostly. |
| AWS Certification | ☁️ | +1 Intelligence, +1 Strength | Cloud-native. Lift heavy things into the sky. |
| Standing Desk | 🪑 | +2 Endurance | Your legs thank you. Your back agrees. |
| Backpack | 🎒 | +1 consumable slot | Room for more coffee. And snacks. And the second keyboard. |

#### Epic
| Item | Emoji | Effect | Description |
|------|-------|--------|-------------|
| Custom Ergonomic Chair | 💺 | +3 Endurance | Your spine's sanctuary. Worth every penny. |
| Home Office Setup | 🏠 | +1 Perception, +1 Endurance, +1 Agility | The complete package. WFH dreams. |

### 2.5 Consumables

One-time stat boosts for a single event check. **Max 2 in inventory.** Earned on level up — choose from 3 options (or replace one you already have, or skip).

**How they work:**
- You activate a consumable **before making the choice** on an event card.
- It boosts the stat(s) it targets for that one check only — temporary bonuses are cleared after the check resolves.
- **"any" consumables** (Flow State, Perfect Meal, Fried Chicken) boost **all** stats.
- **Alcohol** (Beer, Wine, Whiskey, Cocktail) is a **recovery with a tradeoff**: it boosts Endurance or Charisma but *lowers* Perception and Agility, all for that one check. The gain and the hangover both land on the same roll.
- **AI/multiplier consumables** multiply the effective stat total for the check (1.5× or 2×). There's a **30% chance they backfire**, applying **−50%** instead.
- Up to 2 consumables can be carried into the next run via meta progression (see §4).

#### Common
| Consumable | Emoji | Effect | Description |
|------------|-------|--------|-------------|
| Vitamin Pill | 💊 | +1 Endurance | Tastes like regret |
| Coffee | ☕ | +2 Endurance | The developer's blood |
| Energy Drink | 🥤 | +2 Agility | Squeeze, swallow, ship |
| Red Bull | 🐂 | +3 Endurance | Gives you wings (and jitters) |
| Instant Noodles | 🍜 | +2 Endurance | 3 minutes to survival. 3 hours to regret. |
| Energy Gel | 🧴 | +2 Agility | Sprint fuel of champions |
| Protein Bar | 🍫 | +1 Endurance | Tastes like cardboard. Works like magic. |
| Cold Pizza | 🍕 | +2 Charisma | The universal developer currency. |
| Beer | 🍺 | +2 Endurance, −1 Perception, −1 Agility | Team offsite energy. You will remember the standup. |

#### Uncommon
| Consumable | Emoji | Effect | Description |
|------------|-------|--------|-------------|
| Focus Session | 🧘 | +3 Perception | See the bugs before they see you |
| Whiteboard Session | 📋 | +3 Intelligence | Architecture clarity |
| Pair Programming | 👥 | +3 Charisma | Two brains, one PR |
| Espresso Shot | ☕ | +3 Perception | One shot. Pure clarity. |
| Matcha Latte | 🍵 | +3 Intelligence | Zen focus for when you need to architect the impossible. |
| Dark Chocolate | 🍫 | +2 Charisma | Share with the team. They'll forgive you for the merge conflict. |
| Pre-Workout | 💪 | +3 Agility | Jitters guaranteed. Shipping accelerated. |
| AI Copilot | 🤖 | 1.5× stat (risky!) | 70% chance it works |
| Red Bull + Espresso | ⚡ | 1.5× stat (risky!) | The double shot of doom. Heart rate: 180. Code quality: TBD. |
| Wine | 🍷 | +2 Charisma, −1 Perception, −1 Agility | Stakeholder call charm. The Jira board will slip. |

#### Rare
| Consumable | Emoji | Effect | Description |
|------------|-------|--------|-------------|
| Deep Work Block | 🎯 | +4 Strength | Brute force the codebase |
| Lucky Socks | 🧦 | +4 Luck | First-deploy success |
| Caffeine IV Drip | 💉 | +4 Strength | For when coffee just isn't cutting it anymore. |
| Ghost Pepper Hot Sauce | 🌶️ | +4 Agility | Fire in your veins. Fire in your gut. Code so fast it burns. |
| Truffle Pasta | 🍝 | +3 Charisma | The PM actually enjoyed it. Miracles happen. |
| AI Code Generator | 🧠 | 2× stat (very risky!) | Green screen of death |
| Monster Energy | 👹 | 2× stat (very risky!) | Green liquid. Green screen of death. Either you ship or you don't wake up. |
| Whiskey | 🥃 | +3 Endurance, −2 Perception, −1 Agility | On-call survival fuel. The pager will not be so lucky. |

#### Epic
| Consumable | Emoji | Effect | Description |
|------------|-------|--------|-------------|
| Flow State | ⚡ | +5 ALL stats | Everything clicks |
| The Perfect Meal | 🍱 | +5 ALL stats | Home-cooked. Made by someone who cares. Everything clicks. |
| Fried Chicken | 🍗 | +3 ALL stats | Putting the kids working in KFC through higher education. |
| Cocktail | 🍹 | +3 Charisma, −2 Perception, −1 Agility | Demo day confidence. The bug report will find you. |

### 2.6 Perks (Stat Mastery)

Maxing a stat (**base value of 10**) unlocks a **Perk** — a boon for the duration of the run. Four perks are **once-per-run interventions** (the game offers a ⚡ prompt at the moment they can be used); three are **passive**. Perks are the reward for investing heavily in a single stat and give each build a distinct "class-like" identity.

#### Rules
- **Trigger:** A perk activates when the **base** stat value reaches 10. Equipment and temporary (consumable) bonuses do **not** count — a +2 equipment bonus on a base-8 stat does not unlock the perk.
- **Duration:** Perks are **per-run**. If a stat drops below 10 (e.g. a −3 Endurance hit), the perk is lost until the stat reaches 10 again. This keeps high stats genuinely valuable late in a run.
- **Grace rule:** An intervention is **earned at the moment the check resolves**. If the failure's own effects drop the stat below 10 (revoking the perk), the intervention is still offered for that event — perk loss applies going forward, not retroactively. (This prevents the dead-prompt bug where a perk was revoked by the very failure it was offered to rescue.)
- **Multiple perks:** A stat at 10 unlocks exactly one perk. It is possible (rare) to have multiple perks active if multiple stats are at 10.
- **Communication:** A toast notification (`🏅 Perk Unlocked: ...`) fires when a perk activates or deactivates, active perks are shown as chips in the SPECIAL panel, and intervention prompts appear as a purple **⚡ Intervene with Perk** box on the result screen (with a distinctive two-note "perk" sound). Outcomes are confirmed via toast.

#### Perk Table

| Stat | Perk | Type | Effect |
|------|------|------|--------|
| **S**trength | 💪 **Brute Force** | Intervention | Once per run: when you **fail a Strength check**, opt in to **+2 to that check's target** (retroactive) |
| **P**erception | 🐛 **Code Review** | Intervention | Once per run: when an outcome has **negative stat effects**, opt in to **halve them** (round up) — a −3 hit becomes −2 |
| **E**ndurance | 🧘 **Iron Nerves** | Intervention (auto) | Once per run: a hit that would drop **Endurance to the floor (1)** stops it at **3** instead — you push through the collapse. Judged before effects apply, so the blow that would revoke the perk still triggers it; not spent if the hit lands above the floor |
| **C**harisma | 🤝 **Negotiate** | Intervention | Once per run: **convert a failed stat check into a success** (you talk your way out) |
| **I**ntelligence | 🧠 **Rapid Learner** | Passive | +1 bonus point on **every level up** (spend them one at a time) |
| **A**gility | 🚀 **Fast Ship** | Passive | Bosses appear every **5 events instead of 6** — and level-ups come on the same faster cadence |
| **L**uck | 🍀 **Clean Deploy** | Intervention (auto) | Once per run: a **failed stat check is automatically rerolled** (fresh d20, replaces the original result) |

#### Design Notes
- Perks only matter at 10, and with 40 starting points spread over 7 stats, maxing a stat at character creation is rare — perks are a mid/late-run goal or a legacy-carry build objective.
- **Fast Ship** (Agility) is the strongest perk because it compounds with everything (more levels, more drops, more events per career). If playtesting shows it is too strong, nerf to: "Bosses every 6 events, but +1 consumable at the end of each phase."
- Future: perks could persist as **legacy unlocks** across runs (meta-progression). The data model should stay open to this (perk state stored per-run, meta storage reserved).

### 2.7 Career Milestones & Achievements

26 achievements tracked in localStorage, evaluated at the end of every run (win or death):
- Campaign completions on Normal and Hard difficulty
- Consumable-free runs
- Stat-max milestones (4–7 stats at 10 by run end)
- Archetype completions (9 archetypes × Normal difficulty)
- Load Bearing (5 consumable slots) — Hard difficulty only
- https://github.com/rurouni88/pc3-DevLife/issues/13

---

## 3. Game Flow

```
START
  ↓
Character Creation (Distribute 40 SPECIAL points, optional archetype preset,
carry-over equipment/consumables from previous runs)
  ↓
[GAME LOOP — 24 events per run]
  ↓
Event Card → (optional: activate a consumable) → Choose Action → d20 Stat Check
  ↓
Consequence → (⚡ perk intervention offered?) → equipment drop? → career log
  ↓
[Level Up? every level × 6 events] → +1 stat point (2 with Rapid Learner)
                              → pick 1 of 3 random consumables (or replace/skip)
  ↓
[Boss every 6 events (5 with Fast Ship)] → defeat it → advance to next Career Phase
  ↓
[Game Over?] → saving roll → Career Suicide → pick carry-over consumable → Game Over
  ↓
[All 4 bosses defeated?] → Retirement → Victory screen → Career Summary → pick carry-over consumable
  ↓
END
```

### Game Over Conditions

**Saving Roll** — stats are clamped to a floor of **1** (range 1–10). When a stat hits its floor you don't die instantly: you roll a **d20 against Luck + ½ Charisma**. Success bumps **every** floored stat back up by 1 — barely clinging on. Failure ends the run:

| Stat | Condition | Ending |
|------|-----------|--------|
| **S**trength | S ≤ 1 | 💀 Technical Obsolescence |
| **P**erception | P ≤ 1 | 🐛 Debugging Burnout |
| **E**ndurance | E ≤ 1 | 🔥 Burnout *(**Iron Nerves**, once per run, can stop E at 3 instead)* |
| **C**harisma | C ≤ 1 | 📉 Career Stagnation |
| **I**ntelligence | I ≤ 1 *and day > 365* | 📚 Knowledge Decay |
| **A**gility | A ≤ 1 | 🐌 Productivity Cliff |
| **L**uck | L ≤ 1 | 🍀 Unlucky Streak |

**Made Redundant** — from Phase 3, if Charisma ≤ 2 past day 400, a scaled risk roll each event can get you axed: `(3 − C) × 15%` — 15% at C = 2, 30% at C = 1.

**Terminated** *(planned — not yet implemented)* — fail a threshold number of events in a row and face a 50/50 roll; lose it and you're fired. The allowed failure streak shrinks with seniority: Phase 1 = 5, Phase 2 = 4, Phase 3+ = 3.

### Victory Condition
Defeat all **4 phase bosses** (24 events, 20 with Fast Ship) to reach **Retirement** and see your career summary. *(Personal goals — planned.)*

---

## 4. Replayability Features

1. **Random Events:** 75-event pool, drawn randomly **without repeats** within a run
2. **Random Items:** Equipment drops from successful stat checks (chance scales with Luck)
3. **Multiple Archetypes:** 9 selectable predefined stat distributions (+1 locked easter egg), or build your own
4. **Perks:** Different stat-mastery builds play like different classes
5. **Permadeath:** Each run is a new career
6. **Meta Progression (implemented):** Your **end-of-run equipment** carries into the next run (most recent wins — a mid-run swap carries the new item), and at the end of each run you **pick 1 of 3 random consumables** to carry (pool of 2, most recent pick wins — 3 if you end the run carrying a **Backpack**, which adds +1 consumable slot). A run counter tracks your attempts. *(Unlocking new event types, items, and archetypes — planned.)*
7. **Career Summary:** Detailed stats at end of each run; **Career Leaderboard** in the Leaderboard screen shows top 10 runs per difficulty (Easy, Normal, Hard), sorted by days survived with seed for replay.

---

## 5. UI/UX Design

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│  DEV LIFE                                                 │
│  Career: Mid-Level Developer  |  Run #3  |  Day: 47      │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ SPECIAL  │           EVENT NARRATIVE                     │
│ Panel    │                                               │
│          │  "3 AM. The pager goes off..."                │
│ S: 7 ─── │                                               │
│ P: 5 ─── │  [Multiple choice buttons]                   │
│ E: 6 ─── │                                               │
│ C: 4 ─── │                                               │
│ I: 8 ─── │                                               │
│ A: 6 ─── │                                               │
│ L: 5 ─── │                                               │
│          │                                               │
│ Level 12 │                                               │
│          │                                               │
│ Items:   │                                               │
│ - Mech   │                                               │
│   Keyboard│                                              │
│ - Head-  │                                               │
│   phones │                                               │
│          │                                               │
│ Log:     │                                               │
│ Day 47:  │                                               │
│ Completed│                                               │
│ Sprint 4 │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Style
- Dark theme (developer aesthetic)
- Monospace fonts for narrative text
- Terminal/IDE-inspired UI elements
- Satirical, dry humor throughout

---

## 6. Technical Architecture (Web Prototype)

### Tech Stack
- **HTML/CSS/TypeScript** (no framework) — `tsc` compiles TS to ES modules in `dist/` for production; **Vite** provides the dev server with HMR
- **TypeScript** under full `strict` checking; `tsconfig.json` type-checks (`noEmit`), `tsconfig.build.json` emits to `dist/`
- **Node VM test suite** for core game logic (no framework, no browser) — runs against the built `dist/js/`
- **Web Audio API** for synthesized sound effects, BGM, and jingles (no audio files)
- **Navigator Vibration API** for haptic feedback on key moments (no-op on unsupported platforms)
- **LocalStorage** for save games, meta-progression, and settings
- **Single-page application** with screen-based navigation (no hash routing)

### File Structure

The project layout has changed since the initial commit, so this document no longer carries its own copy of the tree (the two have drifted out of sync). The **[README's File Structure section](README.md#file-structure)** is the single source of truth. In short: source lives under `src/` — TypeScript in `src/js/`, game content (events, and future achievements) in `src/data/`, and the page in `src/index.html` — and the build assembles a self-contained site into `dist/`.

---

## 7. Development Phases

### Phase 1: Core Engine (MVP) — ✅ done
- Character creation with SPECIAL distribution
- Basic event system (text + choices)
- Stat check resolution (now d20-based with competence gate)
- One career phase with 5-10 events
- Basic UI layout

### Phase 2: Content Expansion — ✅ done
- All 4 career phases
- 75 events (15–20 per phase)
- Item system (equipment + consumables, rarity-weighted)
- 9 selectable archetypes (+1 locked)
- Game over / victory conditions (incl. saving rolls)

### Phase 3: Polish & Meta — ✅ done
- Save/load system with version-drift guard
- Meta-progression carry-over (equipment + consumables)
- Difficulty levels (Easy / Normal / Hard)
- Seeded runs (reproducible careers + re-roll)
- Options menu: lifetime statistics + reset
- Career summaries (win/lose, with seed + difficulty)
- Synthesized sound effects (8 SFX)
- Background music ("Corporate Elevator Music" loop) + victory/defeat jingles
- Haptic feedback (vibration on key moments)
- Perk system with interventions
- Achievements (26 tracked in localStorage, evaluated at run end)

### Phase 4: Advanced Features — 🚧 in progress
- Mobile responsive design ✓
- Random event selection without repeats ✓
- Animated dice roll (SVG d20 with cycling animation) ✓
- Multi-run leaderboard (top 10 per difficulty, dedicated screen) ✓
- BGM + haptics + victory/defeat jingles ✓
- Export/share career runs *(planned)*

---

## 8. Event System Design

Events are defined as JSON objects (stored in `src/data/events/phase_*.json`, fetched at runtime). Boss events are marked with the `BOSS: ` title prefix (`CONFIG.game.bossPrefix`); every event may also carry an `emoji` and a short `desc` (used in tooltips and the help screen).

```json
{
  "id": "incident_001",
  "title": "3 AM Production Incident",
  "phase": 1,
  "narrative": "The pager goes off...",
  "choices": [
    {
      "text": "Roll back the deployment",
      "checks": { "A": 5 },
      "success": { "text": "Quick rollback. Team is impressed.", "effects": { "A": 1, "E": -1 } },
      "failure": { "text": "Rollback failed. Situation worsens.", "effects": { "E": -2, "L": -1 } }
    },
    {
      "text": "Dive into logs",
      "checks": { "P": 6 },
      "success": { "text": "Found the bug. Clean fix deployed.", "effects": { "P": 1, "I": 1 } },
      "failure": { "text": "Spent 4 hours looking. It was a DNS issue.", "effects": { "E": -2 } }
    }
  ]
}
```

---

## 9. Stat Check Resolution

Every choice with a `checks` object is resolved with a **d20**:

```
1. effective = base_stat + equipment_bonus + temporary_bonus
              (× multiplier if an AI consumable is active)
2. roll = d20() − Luck (base)
3. success = roll ≤ target  AND  effective ≥ (target − Luck) × 0.5
                                                    └── competence gate
4. Apply the success or failure outcome
```

- **Luck** lowers the dice target: with L = 5, a target-6 check needs a d20 of **11 or lower** (55%).
- **Competence gate:** even with a lucky roll, a check far above your stat fails — your effective stat must be at least **half of (target − Luck)**. With L = 1, a target-8 check needs effective ≥ 3.5, so a stat-3 build can never pass it no matter how well it rolls.
- **Clean Deploy** (Luck perk): a failed check is automatically rerolled once per run (fresh d20, replaces the original).
- **Brute Force / Negotiate** (Strength / Charisma perks) can rescue a failed check after the fact, once per run.

Example: Perception 7 (effective), Luck 5, target 6:
  dice:  d20 − 5 ≤ 6 → d20 ≤ 11 (55%)
  gate:  7 ≥ (6 − 5) × 0.5 = 0.5 → always satisfied
  → **55% chance of success**

Example: Strength 3 (effective), Luck 1, target 8:
  dice:  d20 − 1 ≤ 8 → d20 ≤ 9 (45%)
  gate:  3 ≥ (8 − 1) × 0.5 = 3.5 → **never satisfied**
  → **0% chance of success**

---

## 10. Satirical Event Examples

### Event: "The Requirements Change" *(actual — Junior phase)*
> Product Manager walks in. "Hey, small change — can we make the app work offline, support 12 languages, and add a social feed? We need it by Friday."
> 
> You blink. You've been working on a login form.
> 
> A) **Accept and suffer** (Endurance 7) — Mental toll but career survival
> B) **Push back with data** (Intelligence 6 + Charisma 6) — Risk offending the PM
> C) **Scream internally** (Luck 5) — Pure survival mode

### Event: "First Code Review" *(actual — Junior phase)*
> You've written your first meaningful feature. It works on your machine. You submit the pull request and wait.
> 
> Two hours later, your senior dev comments: "Can you explain why you chose this approach? Also, have you considered edge cases? And can we add a unit test for the happy path?"
> 
> Your heart sinks.
> 
> A) **Defend your architecture confidently** (Charisma 6)
> B) **Make all the changes silently** (Endurance 4)
> C) **Ask for a 1:1 walkthrough instead** (Charisma 5)

### Event: "Demo Day Disaster" *(actual — Junior phase)*
> It's demo day. You've been building a feature for 3 weeks. The product team, engineering leads, and CEO are watching.
> 
> Your code works on your machine. The staging environment is... questionable.
> 
> You hit play. The page loads. Then it crashes.
> 
> The CEO raises an eyebrow.
> 
> A) **Pivot and demo the testing framework instead** (Agility 7 + Charisma 6)
> B) **Own the failure and show the bug tracker** (Charisma 6 + Perception 5)

---

*Document Version: 1.6*
*Last Updated: 2026*
