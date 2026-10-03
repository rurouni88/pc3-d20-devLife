// UI core — the shared primitives: sound effects (SOUND_DEFS), toasts,
// screens, popups, the title-screen ASCII loop, and the SVG icon defs.
// UICore is merged into UI by ui.ts; the section files use the helpers
// here directly.
//
// A few UICore methods call back through the composed UI (e.g.
// UI.selectDifficulty) — hence the import of ui.js, which imports this
// file. The cycle is safe: it is only touched inside event handlers, long
// after the composition has run (see the note in ui.ts).

import { CONFIG, STAT_META } from '../core/config.js';
import { RngEngine } from '../core/seeded-rng.js';
import { dayToCareerYear } from '../core/utils.js';
import { STAT_KEYS } from '../data/archetypes.js';
import { PERK_BY_ID, PerkSystem } from '../data/perks.js';
import { Achievements, clearUnlocked } from '../data/achievements.js';
import { Game } from '../engine/game.js';
import { MetaStore } from '../engine/meta.js';
import { SpecialSystem } from '../engine/special.js';
import { UI } from './ui.js';
import type {Consumable, Difficulty, StatKey} from '../core/types.js';

// Shared DOM helpers — the UI is static HTML, but the type system
// doesn't know that, so these narrow once and reuse.

// Sound effect definitions — each entry is a sequence of frequency
// notes (freq at time-offset), a gain level, and an exponential ramp.
// Adding a new sound is just appending to this record.
const SOUND_DEFS: Record<string, {
  oscType?: OscillatorType;
  // ramp: true glides from the previous note's frequency (linearRamp);
  // otherwise the frequency jumps at the note's time (setValue).
  notes: { freq: number; time: number; ramp?: boolean }[];
  gain: number;
  gainRampEnd: number;
  gainRampDuration: number;
}> = {
  click:    { notes: [{ freq: 800, time: 0 }], gain: 0.1, gainRampEnd: 0.01, gainRampDuration: 0.05 },
  success:  { oscType: 'sine', notes: [{ freq: 523, time: 0 }, { freq: 659, time: 0.1 }, { freq: 784, time: 0.2 }], gain: 0.15, gainRampEnd: 0.01, gainRampDuration: 0.3 },
  failure:  { oscType: 'sawtooth', notes: [{ freq: 200, time: 0 }, { freq: 150, time: 0.2, ramp: true }], gain: 0.1, gainRampEnd: 0.01, gainRampDuration: 0.2 },
  levelup:  { oscType: 'sine', notes: [{ freq: 523, time: 0 }, { freq: 659, time: 0.1 }, { freq: 784, time: 0.2 }, { freq: 1047, time: 0.3 }], gain: 0.15, gainRampEnd: 0.01, gainRampDuration: 0.5 },
  boss:     { oscType: 'square', notes: [{ freq: 100, time: 0 }, { freq: 50, time: 0.5, ramp: true }], gain: 0.1, gainRampEnd: 0.01, gainRampDuration: 0.5 },
  gameover: { oscType: 'sawtooth', notes: [{ freq: 400, time: 0 }, { freq: 100, time: 1, ramp: true }], gain: 0.15, gainRampEnd: 0.01, gainRampDuration: 1 },
  perk:     { oscType: 'sine', notes: [{ freq: 988, time: 0 }, { freq: 1319, time: 0.09 }], gain: 0.12, gainRampEnd: 0.01, gainRampDuration: 0.25 },
  victory:  { oscType: 'sine', notes: [{ freq: 523, time: 0 }, { freq: 659, time: 0.15 }, { freq: 784, time: 0.3 }, { freq: 1047, time: 0.45 }, { freq: 784, time: 0.6 }, { freq: 1047, time: 0.75 }], gain: 0.15, gainRampEnd: 0.01, gainRampDuration: 1 },
};
export const setDisplay = (id: string, display: string): void => {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
};

// Map a difficulty key to its shared SVG icon ID (used by the selector,
// run summaries, and leaderboard).
export function difficultyIconId(d: Difficulty): string {
  return `icon-${d}`;
}
export const setText = (id: string, text: string): void => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};
// UICore: screens, toasts/audio, event & result rendering, popups.
// Merged with the section objects into UI by ui.ts.
export const UICore = {
  currentScreen: 'title' as string,

  // Difficulty selector (issue #6): lozenge row on the title screen.
  // The choice is stored in meta so it persists and is read by startCareer.
  renderDifficultySelector(): void {
    const container = document.getElementById('difficulty-selector');
    if (!container) return;
    const selected = MetaStore.selectedDifficulty();
    container.innerHTML = '';

    (Object.keys(CONFIG.game.difficulty) as Difficulty[]).forEach(key => {
      const cfg = CONFIG.game.difficulty[key];
      const lozenge = document.createElement('button');
      lozenge.className = 'difficulty-lozenge' + (key === selected ? ' selected' : '') + (cfg.locked ? ' locked' : '');
      lozenge.dataset.difficulty = key;
      lozenge.setAttribute('role', 'radio');
      lozenge.setAttribute('aria-checked', key === selected ? 'true' : 'false');
      lozenge.disabled = !!cfg.locked;
      lozenge.innerHTML = `<svg class="difficulty-icon"><use href="#${difficultyIconId(key)}"/></svg><span class="difficulty-label">${cfg.label}</span>` +
        (cfg.locked ? '<span class="difficulty-lock"><svg class="lock-icon"><use href="#icon-padlock"/></svg></span>' : '<span class="cons-info difficulty-help" data-help="' + key + '" aria-label="About ' + cfg.label + '">?</span>');

      if (!cfg.locked) {
        lozenge.addEventListener('click', (e) => {
          // A tap on the "?" opens the tooltip; a tap elsewhere selects.
          if ((e.target as Element).closest('.difficulty-help')) return;
          UI.selectDifficulty(key);
        });
      }
      container.appendChild(lozenge);
    });

    // "?" info buttons: tap/click to show the tooltip — the same interaction
    // on mobile and desktop. Hover (mouseenter/mouseleave) fires unreliable
    // synthetic events on mobile, so it is intentionally not used here. The
    // global "click outside" handler (initTooltipClose) closes the tooltip.
    container.querySelectorAll<HTMLElement>('.difficulty-help').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.help as Difficulty;
        const cfg = CONFIG.game.difficulty[key];
        if (cfg) {
          UI.showTooltip({ icon: difficultyIconId(key), name: cfg.label, desc: cfg.desc });
        }
      });
    });
  },

  // Persist the chosen difficulty and re-render the selector.
  selectDifficulty(key: Difficulty): void {
    const cfg = CONFIG.game.difficulty[key];
    if (!cfg || cfg.locked) return;
    MetaStore.setSelectedDifficulty(key);
    UI.playSound('click');
    UI.renderDifficultySelector();
  },

  // Seed display on title screen — shows the current seed, a re-roll button,
  // and an edit button for custom seeds.
  initSeedDisplay(): void {
    const display = document.getElementById('seed-display');
    const value = document.getElementById('seed-value');
    const reRollBtn = document.getElementById('btn-re-roll-seed');
    const editBtn = document.getElementById('btn-edit-seed');
    if (!display || !value || !reRollBtn) return;

    // Seed is generated when the title screen first loads.
    const seed = RngEngine.seed || RngEngine.generateSeed();
    RngEngine.seedWith(seed);
    value.textContent = seed;
    display.style.display = 'flex';

    reRollBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSeed = RngEngine.generateSeed();
      RngEngine.seedWith(newSeed);
      value.textContent = newSeed;
      UI.playSound('click');
    });

    // Edit — open the seed-edit popup with the current seed pre-filled.
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.playSound('click');
        const input = document.getElementById('seed-edit-input') as HTMLInputElement | null;
        const error = document.getElementById('seed-edit-error');
        if (input) {
          input.value = value.textContent || '';
          input.readOnly = false;
        }
        if (error) error.style.display = 'none';
        UI.openPopup('seed-edit');
      });
    }
  },

  // Audio context for sound effects
  audioCtx: null as AudioContext | null,

  // Global audio toggle — persisted in settings (ui-settings.ts).
  audioOn: true,

  // Global volume (0 = mute, 1 = full). Persisted in settings.
  volume: 0.5,

  // Dice animation toggle — persisted in settings (ui-settings.ts).
  diceAnimationOn: true,

  // Save Scum toggle: when ON, the save button is enabled during a run.
  // When OFF (default), saving is disabled mid-run — no save scumming.
  saveScumOn: false,

  // Initialize audio (must be called after user interaction)
  initAudio(): void {
    if (UI.audioCtx) return;
    UI.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  },

  // Play a sound effect — looks up the definition and plays it.
  playSound(type: string): void {
    if (!UI.audioOn) return;
    const def = SOUND_DEFS[type];
    if (!def) return;
    if (!UI.audioCtx) UI.initAudio();
    if (!UI.audioCtx) return;

    const ctx = UI.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (def.oscType) osc.type = def.oscType;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    for (const { freq, time, ramp } of def.notes) {
      if (ramp) osc.frequency.linearRampToValueAtTime(freq, now + time);
      else osc.frequency.setValueAtTime(freq, now + time);
    }
    gain.gain.setValueAtTime(def.gain * UI.volume, now);
    gain.gain.exponentialRampToValueAtTime(def.gainRampEnd, now + def.gainRampDuration);

    // Sound runs until both the last note and the gain decay are done.
    const lastNote = def.notes[def.notes.length - 1];
    osc.start(now);
    osc.stop(now + Math.max(lastNote.time, def.gainRampDuration));
  },

  // Flash screen with color
  flashScreen(color: string, duration: number = CONFIG.ui.flashMs): void {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.backgroundColor = color;
    document.body.appendChild(flash);

    setTimeout(() => flash.remove(), duration);
  },

  // Show toast notification
  showToast(message: string, type: string = 'success'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), CONFIG.ui.toastMs);
  },

  // Wire up the click-to-close behaviour for the character modal. (The "?"
  // tooltip's close handling lives in UITooltip.initTooltipClose.)
  initPopupClose(): void {
    document.addEventListener('click', (e) => {
      if ((e.target as Element).classList.contains('popup-close')) {
        UI.closePopup();
      }
      const activePopup = document.querySelector('.popup-panel.active');
      if (activePopup && e.target === activePopup) {
        UI.closePopup();
      }
    });
  },

  // Satirical ASCII loop on the title screen (pauses while hidden)
  startAsciiLoop(): void {
    const el = document.getElementById('ascii-terminal-body');
    if (!el) return;
    const scenes = [
      ['$ deploy --friday', 'building... done', 'tests... skipped', 'prod: ON FIRE', 'you: "it\'s a feature"'],
      ['lead: blockers?', 'you: none!', '(47 tabs, 1 coffee)', 'lead: great energy', 'you: ██████░░░░ 60%'],
      ['Junior ──────> Staff', 'promotion: pending', 'budget: -30%', 'you: still here??', '...legend.']
    ];
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (;;) {
        for (const scene of scenes) {
          while (!el.offsetParent) await sleep(500);
          el.textContent = '';
          for (const line of scene) {
            for (const ch of line) {
              el.textContent += ch;
              await sleep(18);
            }
            el.textContent += '\n';
            await sleep(140);
          }
          await sleep(2600);
        }
      }
    })();
  },

  // Help modal
  openHelp(): void {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    UI.setHelpTab('gameplay');
    const helpVersion = document.getElementById('help-version');
    if (helpVersion) helpVersion.textContent = `v${CONFIG.version} ${CONFIG.versionLabel}`;
  },

  closeHelp(): void {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    modal.style.display = 'none';
  },

  // Options menu (issue #53) — title-screen modal with Settings (locked),
  // Statistics, and a reset action.
  showOptions(): void {
    const modal = document.getElementById('options-modal');
    if (!modal) return;
    modal.style.display = 'flex';
  },

  closeOptions(): void {
    const modal = document.getElementById('options-modal');
    if (!modal) return;
    modal.style.display = 'none';
  },

  // Reset lifetime statistics and achievements (issue #53). Opens the
  // confirm popup (same pattern as the save popup); the actual wipe happens
  // in confirmResetStats() when the player confirms.
  resetStatsAndAchievements(): void {
    UI.closeOptions();
    UI.openPopup('reset');
  },

  // Perform the reset (called from the reset popup's confirm button).
  confirmResetStats(): void {
    MetaStore.resetStats();
    Achievements.clearUnlocked();
    UI.closePopup();
    UI.showToast('Statistics and achievements reset');
  },

  setHelpTab(tab: string): void {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
    const tabBtn = document.querySelector(`.modal-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    const tabContent = document.getElementById(`help-${tab}`);
    if (tabContent) tabContent.classList.add('active');
  },

  // Show floating stat change
  showStatFloat(stat: string, value: number): void {
    const statEl = document.querySelector(`[data-stat="${stat}"]`);
    if (!statEl) return;

    const float = document.createElement('div');
    float.className = `stat-float ${value > 0 ? 'positive' : 'negative'}`;
    float.textContent = `${value > 0 ? '+' : ''}${value} ${stat}`;

    const rect = statEl.getBoundingClientRect();
    float.style.left = `${rect.left}px`;
    float.style.top = `${rect.top}px`;

    document.body.appendChild(float);
    setTimeout(() => float.remove(), CONFIG.ui.statFloatMs);
  },

  // Render a single consumable/selectable item
  renderConsumableItem(item: Consumable, datasetAttrs?: Record<string, string | number>): HTMLElement {
    const element = document.createElement('div');
    element.className = 'consumable-select-item';

    // Add custom dataset attributes
    if (datasetAttrs) {
      Object.entries(datasetAttrs).forEach(([key, value]) => {
        element.dataset[key] = String(value);
      });
    }

    const statInfo = UI.formatConsumableStat(item);

    element.innerHTML = `
      <span class="cs-emoji">${item.emoji}</span>
      <div class="cs-details">
        <div class="cs-name">${item.name}</div>
        <div class="cs-effect">${statInfo}</div>
        <div class="cs-desc">${item.desc}</div>
        <div class="cs-rarity ${item.rarity}">${item.rarity}</div>
      </div>
    `;

    return element;
  },

  // Format stat info for consumable display
  formatConsumableStat(item: Consumable): string {
    if (item.multiplier) {
      return `<span class="cs-multiplier" style="color: var(--accent-yellow)">${item.multiplier > 1 ? item.multiplier + '× stat' : Math.abs(item.multiplier) * 100 + '% stat'}</span>`;
    }
    if (item.effects) {
      // Multi-stat consumables (alcohol, issue #57): green gains, red hits.
      return Object.entries(item.effects)
        .map(([stat, value]) => {
          const color = value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
          const label = `${value >= 0 ? '+' : '-'}${Math.abs(value)} ${STAT_META[stat as StatKey]?.name || stat}`;
          return `<span class="cs-stat" style="color: ${color}">${label}</span>`;
        })
        .join(' ');
    }
    if (item.stat === 'any') {
      return `<span class="cs-stat-any" style="color: var(--accent-green)">+${item.bonus} to ANY stat</span>`;
    }
    const statName = STAT_META[item.stat as StatKey]?.name || item.stat;
    return `<span class="cs-stat" style="color: ${STAT_META[item.stat as StatKey]?.color || '#fff'}">+${item.bonus} ${statName}</span>`;
  },

  // Show a screen
  showScreen(screenId: string): void {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) {
      screen.classList.add('active');
      UI.currentScreen = screenId;
      // Seed display is only relevant on the title screen.
      if (screenId === 'title') UI.initSeedDisplay();
      // Every screen starts at the top (issue #45). On desktop the page
      // usually fits the viewport so this is a no-op; on mobile it stops a
      // new screen inheriting the previous screen's scroll position — e.g.
      // landing on a level-up or game-over screen mid-card. The event-card
      // scroll in nextEvent() is separate: card-to-card stays in this screen.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },


  // Announce perk changes: toast + career log + re-render the perk list.
  // Single owner of the announcement format — the game engine and the
  // level-up flow call this instead of formatting messages themselves.
  announcePerkChanges(gained: string[], lost: string[]): void {
    for (const id of gained) {
      const perk = PERK_BY_ID[id];
      UI.showToast(`🏅 Perk Unlocked: ${perk.emoji} ${perk.name}`, 'success');
      Game.addLog(`🏅 Perk unlocked: ${perk.name} — ${perk.desc}`);
    }
    for (const id of lost) {
      const perk = PERK_BY_ID[id];
      UI.showToast(`💔 Perk Lost: ${perk.emoji} ${perk.name}`, 'error');
      Game.addLog(`💔 Perk lost: ${perk.name}`);
    }
    if (gained.length > 0 || lost.length > 0) {
      UI.renderPerks();
    }
  },

  // Render active perks as chips
  renderPerks(): void {
    const container = document.getElementById('perk-list');
    if (!container) return;

    container.innerHTML = '';
    if (PerkSystem.active.length === 0) {
      container.innerHTML = '<span class="empty-text">Max a stat to 10 to unlock perks</span>';
      return;
    }

    PerkSystem.active.forEach(id => {
      const perk = PERK_BY_ID[id];
      const chip = document.createElement('span');
      chip.className = 'perk-chip';
      chip.dataset.perkId = id;
      chip.innerHTML = `${perk.emoji} ${perk.name}<span class="cons-info" aria-label="About ${perk.name}">?</span>`;

      // Tap/click the "?" to show the tooltip (same as consumables/difficulty).
      chip.querySelector<HTMLElement>('.cons-info')!.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.showTooltip(perk);
      });

      container.appendChild(chip);
    });
  },

  // Render the seven SPECIAL stat bars into a container.
  // Shared by the side panel (renderSpecialStats) and the character popup
  // (renderPopupSpecial) so the bar markup has a single home.
  renderStatBars(container: HTMLElement): void {
    container.innerHTML = '';

    STAT_KEYS.forEach(key => {
      const meta = STAT_META[key];
      const effective = SpecialSystem.effective(key);
      const base = SpecialSystem.stats[key];
      const bonus = effective - base;

      const bar = document.createElement('div');
      bar.className = 'stat-bar';
      bar.innerHTML = `
        <span class="stat-letter" style="color: ${meta.color}">${key}</span>
        <div class="stat-track">
          <div class="stat-fill" style="width: ${effective * 10}%; background: ${meta.color}"></div>
        </div>
        <span class="stat-num" style="color: ${meta.color}">${base}${bonus > 0 ? `(+${bonus})` : ''}</span>
      `;
      container.appendChild(bar);
    });
  },

  // Render SPECIAL stats in game
  renderSpecialStats(): void {
    const container = document.getElementById('special-stats');
    if (container) UI.renderStatBars(container);
    UI.renderPerks();
  },

  // Render equipment
  renderEquipment(): void {
    const container = document.getElementById('equipment-list');
    const state = Game.state;
    if (!container || !state) return;
    const equipment = state.equipment;

    if (equipment.length === 0) {
      container.innerHTML = '<span class="empty-text">No equipment yet</span>';
      return;
    }

    container.innerHTML = '';
    equipment.forEach(item => {
      const el = document.createElement('span');
      el.className = 'equip-item';
      el.innerHTML = `${item.emoji}<span class="cons-info" aria-label="About ${item.name}">?</span>`;

      // Tap/click the "?" to show the tooltip (same as consumables/difficulty).
      el.querySelector<HTMLElement>('.cons-info')!.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.showTooltip(item);
      });

      container.appendChild(el);
    });
  },

  // Render career log
  renderCareerLog(): void {
    const container = document.getElementById('career-log');
    const state = Game.state;
    if (!container || !state) return;
    const log = state.careerLog.slice(0, CONFIG.game.careerLog.sidePanel);

    container.innerHTML = '';
    log.forEach((entry, i) => {
      const el = document.createElement('div');
      el.className = `log-entry ${i === 0 ? 'recent' : ''}`;
      const careerYear = dayToCareerYear(entry.day);
      el.textContent = `Year ${careerYear}: ${entry.message}`;
      container.appendChild(el);
    });

    // Also update recent activity in main game area
    UI.renderRecentActivity();
  },

  // Render recent activity (mobile-friendly)
  renderRecentActivity(): void {
    const container = document.getElementById('recent-log-entries');
    const state = Game.state;
    if (!container || !state) return;

    const recentEntries = state.careerLog.slice(0, CONFIG.game.careerLog.recent);

    container.innerHTML = '';
    recentEntries.forEach((entry, i) => {
      const el = document.createElement('div');
      el.className = `recent-log-entry ${i === 0 ? 'recent' : ''}`;
      const careerYear = dayToCareerYear(entry.day);
      el.textContent = `Year ${careerYear}: ${entry.message}`;
      container.appendChild(el);
    });
  },

  // Render top bar
  renderTopBar(): void {
    const state = Game.state;
    if (!state) return;
    const phaseEl = document.getElementById('career-phase');
    if (phaseEl) phaseEl.textContent = CONFIG.game.phaseNames[state.phase];
    // Career spans ~8-10 years across ~24 events, each event ~0.4 years
    const careerYear = dayToCareerYear(state.day);
    const dayEl = document.getElementById('career-day');
    if (dayEl) dayEl.textContent = `Year ${careerYear}`;
    const levelEl = document.getElementById('player-level');
    if (levelEl) levelEl.textContent = String(state.level);

    // Progress toward next boss (🚀 Fast Ship: 5 instead of 6)
    const progressText = UI.progressText();
    const progressEl = document.getElementById('level-progress');
    if (progressEl) progressEl.textContent = progressText;
    const progressTopEl = document.getElementById('level-progress-top');
    if (progressTopEl) progressTopEl.textContent = `Level ${state.level} · ${progressText}`;
  },

  // Progress text toward next boss (or level-up indicator)
  progressText(): string {
    const state = Game.state;
    if (!state) return '';
    const bossEvery = PerkSystem.bossInterval();
    const eventsInCycle = state.eventsCompleted % bossEvery;
    return state.levelUpPoints > 0 ? 'LEVEL UP!' : `${eventsInCycle}/${bossEvery}`;
  },

  // --- Popup Panel Methods ---

  openPopup(panelName: string): void {
    // Close any currently open popup
    UI.closePopup();

    const panel = document.getElementById(`panel-${panelName}`);
    if (!panel) return;

    // Render content based on panel type
    switch (panelName) {
      case 'special':
        UI.renderPopupSpecial();
        break;
      case 'equipment':
        UI.renderPopupEquipment();
        break;
      case 'log':
        UI.renderPopupCareerLog();
        break;
      case 'save':
      case 'reset':
        // Static popups — no extra rendering needed
        break;
    }

    panel.classList.add('active');
  },

  closePopup(): void {
    document.querySelectorAll('.popup-panel').forEach(p => p.classList.remove('active'));
  },

  renderPopupSpecial(): void {
    const state = Game.state;
    if (!state) return;
    const bars = document.getElementById('popup-special-stats');
    if (bars) UI.renderStatBars(bars);

    setText('popup-player-level', String(state.level));
    setText('popup-level-progress', UI.progressText());
  },

  renderPopupEquipment(): void {
    const container = document.getElementById('popup-equipment-list');
    const state = Game.state;
    if (!container || !state) return;
    const equipment = state.equipment;

    if (equipment.length === 0) {
      container.innerHTML = '<span class="empty-text">No equipment yet</span>';
      return;
    }

    container.innerHTML = '';

    // Show equipment count
    const countEl = document.createElement('div');
    countEl.style.cssText = 'font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-bottom: var(--spacing-md); text-transform: uppercase; letter-spacing: 1px;';
    countEl.textContent = `${equipment.length} item${equipment.length > 1 ? 's' : ''} equipped`;
    container.appendChild(countEl);

    equipment.forEach(item => {
      const el = document.createElement('div');
      el.className = 'equip-popup-item';

      const rarityColor = {
        common: 'var(--accent-yellow)',
        uncommon: 'var(--accent-purple)',
        rare: 'var(--accent-red)',
        epic: 'var(--accent-cyan)'
      }[item.rarity] || 'var(--text-muted)';

      const effectsHTML = Object.entries(item.effects)
        .map(([k, v]) => `+${v} ${STAT_META[k as StatKey]?.name || k}`)
        .join(', ');

      el.innerHTML = `
        <div class="equip-popup-emoji">${item.emoji}</div>
        <div class="equip-popup-info">
          <div class="equip-popup-name">${item.name}</div>
          <span class="equip-popup-rarity" style="color: ${rarityColor}">${item.rarity}</span>
          <div class="equip-popup-effects">${effectsHTML}</div>
          <div class="equip-popup-desc">${item.desc}</div>
        </div>
      `;
      container.appendChild(el);
    });
  },

  renderPopupCareerLog(): void {
    const container = document.getElementById('popup-career-log');
    const state = Game.state;
    if (!container || !state) return;
    const log = state.careerLog.slice(0, CONFIG.game.careerLog.popup);

    container.innerHTML = '';
    log.forEach((entry, i) => {
      const el = document.createElement('div');
      el.className = `log-entry ${i === 0 ? 'recent' : ''}`;
      const careerYear = dayToCareerYear(entry.day);
      el.textContent = `Year ${careerYear}: ${entry.message}`;
      container.appendChild(el);
    });
  }
};

// Shared SVG symbol definitions for use via <use href="#icon-*">.
// Injected into the DOM once on init by initSvgAssets().
const SVG_SYMBOLS = `
  <symbol id="icon-bar-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="12" width="4" height="9" rx="1"/>
    <rect x="10" y="6" width="4" height="15" rx="1"/>
    <rect x="17" y="3" width="4" height="18" rx="1"/>
  </symbol>
  <symbol id="icon-padlock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </symbol>
  <symbol id="icon-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/>
    <path d="M8 6H5a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4"/>
    <path d="M16 6h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4"/>
    <path d="M12 13v4"/>
    <path d="M8 20h8"/>
    <path d="M9 17h6"/>
  </symbol>
  <symbol id="icon-dice" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8" cy="8" r="1.5"/>
    <circle cx="16" cy="8" r="1.5"/>
    <circle cx="8" cy="16" r="1.5"/>
    <circle cx="16" cy="16" r="1.5"/>
    <circle cx="12" cy="12" r="1.5"/>
  </symbol>
  <symbol id="icon-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </symbol>
  <symbol id="icon-reset" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </symbol>
  <symbol id="icon-save" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </symbol>
  <symbol id="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </symbol>
  <symbol id="icon-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M16.47 2.53a2.5 2.5 0 0 1 3.54 3.54L7 19 2 21l2-5z"/>
  </symbol>
  <symbol id="icon-speaker" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </symbol>
  <symbol id="icon-volume" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <line x1="14" y1="10" x2="22" y2="10"/>
  </symbol>
  <!-- Difficulty icons: same face, different mouths -->
  <symbol id="icon-easy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
    <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
  </symbol>
  <symbol id="icon-normal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 15h6"/>
  </symbol>
  <symbol id="icon-hard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
    <path d="M8 15s1.5-2 4-2 4 2 4 2"/>
  </symbol>
  <!-- Help modal icons -->
  <symbol id="icon-skull" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="10" r="8"/>
    <line x1="9" y1="9" x2="9.01" y2="9" stroke-width="2"/>
    <line x1="15" y1="9" x2="15.01" y2="9" stroke-width="2"/>
    <path d="M9 14h6"/>
    <line x1="10" y1="16" x2="10" y2="17"/>
    <line x1="14" y1="16" x2="14" y2="17"/>
  </symbol>
  <symbol id="icon-lightning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </symbol>
  <symbol id="icon-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>
  </symbol>
  <symbol id="icon-controller" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="6" width="20" height="12" rx="6"/>
    <line x1="6" y1="10" x2="6" y2="14"/>
    <line x1="4" y1="12" x2="8" y2="12"/>
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/>
  </symbol>
`;

// Inject shared SVG symbols into the DOM so <use href="#icon-*"> works.
export function initSvgAssets(): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.display = 'none';
  svg.innerHTML = SVG_SYMBOLS;
  document.body.appendChild(svg);
}
