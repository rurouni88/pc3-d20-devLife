# 🎮 Gameplay Guide

## Quick Start

1. **Create your engineer** — Distribute 40 points across 7 SPECIAL stats
2. **Choose an archetype** — Or build your own unique developer
3. **Navigate your career** — Make decisions at each event, pass stat checks, survive
4. **Climb the ladder** — Progress through 4 career phases:
   - **Junior Developer** → **Mid-Level Developer** → **Senior Developer** → **Staff/Principal**
5. **Retire or die trying** — Complete all phases to win, or fall victim to burnout, imposter syndrome, skill obsolescence, or redundancy

## Controls

| Action | How |
|--------|-----|
| Distribute stats | Click `+` / `−` on character creation |
| Apply archetype preset | Click a preset from the dropdown |
| Make a choice | Click one of the choice buttons (A, B, C, D) |
| Use a consumable | Click a consumable button before making a choice |
| Intervene with a perk | Click ⚡ on the result screen (when a perk offers it) |
| View stats/inventory | Click the ☰ menu (mobile) or side panel (desktop) |
| Save game | Click the 💾 button |
| Help | Click the ❓ button for rules, stats, and about |

## Features

### SPECIAL Stat System

Seven stats inspired by Fallout, tailored for dev life:

| Stat | What It Does |
|------|-------------|
| **Strength** | Technical depth & raw coding power |
| **Perception** | Code comprehension & debugging |
| **Endurance** | Resilience & focus |
| **Charisma** | Stakeholder management & mentorship |
| **Intelligence** | System architecture & fast learning |
| **Agility** | Adaptability & delivery velocity |
| **Luck** | Heuristics & clean production runs |

### Core Mechanics

- **d20 Stat Checks** — Every choice rolls a d20 (modified by Luck) against a target, gated by a competence check so low stats can't muscle past checks far above them
- **Saving Rolls** — Hit a stat floor and you get a d20 saving throw (Luck + half Charisma) before your career ends
- **Perks** — Max a stat to 10 to unlock once-per-run interventions and passive boons
- **Equipment** — Passive stat bonuses (rarity-weighted drops, boosted by Luck). Max 1 equipped at a time.
- **Consumables** — One-time stat boosts for a single event check. Max 2 in inventory.
- **Permadeath** — Each run is a new career. Game over means starting fresh.
- **Meta Progression** — Carry end-of-run equipment and consumables into your next career
- **Procedural Events** — 75 satirical tech scenarios across 4 career phases. No event repeats within a run; each phase ends with a boss

### Sound & Design

- **Synthesized Sound** — 8 Web Audio API bleeps (no audio files): success, failure, level up, boss, perk, victory, and more
- **Background Music** — A looping "Corporate Elevator Music" track (16-beat C major, walking bass + melody + Jira-notification dings). Toggle in Settings
- **Haptics** — Vibration feedback on key moments (stat check, level up, boss, game over, victory). Not supported on iOS Safari
- **Victory/Defeat Jingles** — One-shot melodies: ascending arpeggio for retirement, sad trombone for burnout
- **Mobile-First** — Works great on phones, tablets, and desktops
- **Dark Terminal Theme** — Because that's what real developers use

## 🧪 Consumables

Consumables are one-time stat boosts for a single event check. Hold **max 2** in inventory, earned on level up (pick from 3 options).

See the [full consumables list in GAME_DESIGN.md](GAME_DESIGN.md#25-consumables).

## 🎯 Game Over Conditions

Stats have a floor of **1**. When a stat hits its floor you make a **saving roll**: d20 vs **Luck + ½ Charisma**. Fail it and your career is over:

| Condition | Cause |
|-----------|-------|
| 💀 **Technical Obsolescence** | Strength hits 1 |
| 🐛 **Debugging Burnout** | Perception hits 1 |
| 🔥 **Burnout** | Endurance hits 1 (**Iron Nerves**, once per run, can stop it at 3 instead) |
| 📉 **Career Stagnation** | Charisma hits 1 |
| 📚 **Knowledge Decay** | Intelligence hits 1 after day 365 |
| 🐌 **Productivity Cliff** | Agility hits 1 |
| 🍀 **Unlucky Streak** | Luck hits 1 |
| 📉 **Made Redundant** | Phase 3+, after day 400, with Charisma ≤ 2 — a growing chance each event the lower your Charisma |

A successful saving roll bumps every floored stat back up by 1 — barely clinging on.

## 🏆 Victory

Defeat the **4 phase bosses** (24 events total — 20 with Fast Ship) to retire in style. Choose a consumable to carry into your next career!

## 📖 Design Philosophy

There is no traditional hit points (HP) bar. This is a deliberate decision inspired by the things me and some colleagues say:

> My Intelligence just went down after that conversation/decision.

> I no longer have the willpower (Endurance) for this crap.

> We are going to see a decline in Agility because of XXX.

> Ivory Tower Architects. Too high from the front lines. They don't see what it's like down here. (Implies Perception loss)

> We have been saying that for years, but bring in/pay for an external consultant (eg. McKinsey), and the executives listen. (External consultants tend to have higher charisma)

If anyone is genuinely offended or butt-hurt by this, I will go on record and say:

> Too bad, too sad. I apologise to absolutely nobody. This is my personal lived-in experience in this field.

## 🙏 Credits

**SPECIAL stat system** inspired by [Fallout](https://fallout.fandom.com/wiki/SPECIAL) by Interplay Productions / Black Isle Studios. The seven stats (Strength, Perception, Endurance, Charisma, Intelligence, Agility, Luck) are a loving homage to the classic RPG system, reimagined for the modern software engineering career.

**Game Inspiration** Did some training and had conversations where the general feel was how charismatic the trainer is.

> If people had stats, he'd be a 10 for Charisma.
> If I had his charisma, I'd could be a CEO.
> But we are all SPECIAL in our own ways.

And this is how we got here today. (Also, I've logged too many hours in Fallout in my younger years.)

---

*Built with ☕, 💻, and questionable life choices.*
