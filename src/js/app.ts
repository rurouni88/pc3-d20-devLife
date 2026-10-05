// Main application entry point — the module graph's root. index.html loads
// only this file (as <script type="module">); everything else arrives via
// the static imports below.

import { CONFIG } from './core/config.js';
import { RngEngine } from './core/seeded-rng.js';
import { zeroStats } from './core/utils.js';
import { STAT_KEYS } from './data/archetypes.js';
import { CONSUMABLES, EQUIPMENT } from './data/items.js';
import { EVENTS, waitForEvents } from './data/events.js';
import { PerkSystem } from './data/perks.js';
import { Game } from './engine/game.js';
import { MetaStore } from './engine/meta.js';
import { SaveSystem } from './engine/save.js';
import { SpecialSystem } from './engine/special.js';
import { UI } from './ui/ui.js';
import { initSvgAssets } from './ui/ui-core.js';
import { loadSettings, applyTheme } from './ui/ui-settings.js';
import type { Consumable, Equipment, StatKey } from './core/types.js';

export const App = {
  init(): void {
    this.bindEvents();
    this.checkForSave();
    initSvgAssets();
    UI.initTooltipClose();
    UI.initPopupClose();
    UI.startAsciiLoop();
    this.initHelpTabs();
    this.initGuardHandlers();

    // BGM: browser autoplay policy requires a user interaction first.
    // Listen for the first click/touch anywhere, then start the loop.
    const startBgmOnce = (): void => {
      UI.initBgm();
      document.removeEventListener('click', startBgmOnce);
      document.removeEventListener('touchstart', startBgmOnce);
    };
    document.addEventListener('click', startBgmOnce, { once: true });
    document.addEventListener('touchstart', startBgmOnce, { once: true });
    UI.showScreen('title');
    UI.renderDifficultySelector();
    const versionText = `v${CONFIG.version} ${CONFIG.versionLabel}`;
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge) versionBadge.textContent = versionText;

    // Apply persisted theme (or system preference on first load).
    const settings = loadSettings();
    const hasSavedTheme = typeof localStorage !== 'undefined' && localStorage.getItem('devlife_settings');
    if (!hasSavedTheme && typeof window !== 'undefined') {
      // First load — respect system preference.
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      settings.theme = prefersLight ? 'light' : 'dark';
      applyTheme(settings.theme);
      try { localStorage.setItem('devlife_settings', JSON.stringify(settings)); } catch (e) { console.warn('[d20().devLife] Failed to persist theme preference:', e); }
    } else {
      // Has saved preference — use it.
      applyTheme(settings.theme);
    }
  },

  bindEvents(): void {
    // Safely bind a click handler; skip (with a warning) if the element
    // is missing so one absent element can't break all later bindings.
    const bind = (id: string, handler: () => void): void => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', handler);
      } else {
        console.warn(`[d20().devLife] bindEvents: #${id} not found, skipping binding`);
      }
    };

    // Title screen
    bind('btn-new-game', () => this.startNewGame());
    bind('btn-continue', () => this.continueGame());

    // Character creation
    bind('btn-back-char', () => UI.showScreen('title'));
    bind('btn-start-career', () => this.startCareer());

    // Game screen - toolbar buttons
    document.querySelectorAll<HTMLElement>('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panelName = btn.dataset.panel;
        if (panelName) UI.openPopup(panelName);
      });
    });

    // Popup close buttons
    document.querySelectorAll('.popup-close').forEach(btn => {
      btn.addEventListener('click', () => UI.closePopup());
    });

    // Popup save confirm/cancel
    bind('btn-popup-save-confirm', () => {
      this.saveGame();
    });
    bind('btn-popup-save-cancel', () => {
      UI.closePopup();
    });

    // Popup reset confirm/cancel (issue #53)
    bind('btn-popup-reset-confirm', () => {
      UI.confirmResetStats();
    });
    bind('btn-popup-reset-cancel', () => {
      UI.closePopup();
    });

    // Options menu — Settings (issue #??)
    bind('btn-options-settings', () => {
      UI.closeOptions();
      UI.showSettings();
    });
    bind('btn-settings-back', () => {
      UI.closeSettings();
    });

    // Popup seed-edit confirm/cancel
    bind('btn-popup-seed-cancel', () => {
      UI.closePopup();
    });
    bind('btn-popup-seed-confirm', () => {
      const input = document.getElementById('seed-edit-input') as HTMLInputElement | null;
      const error = document.getElementById('seed-edit-error');
      if (!input || !error) { UI.closePopup(); return; }
      const raw = input.value.trim();
      if (raw.length !== 8) {
        error.textContent = 'Seed must be exactly 8 characters.';
        error.style.display = 'block';
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(raw)) {
        error.textContent = 'Only A–Z and 0–9 are allowed.';
        error.style.display = 'block';
        return;
      }
      const seed = raw.toUpperCase();
      RngEngine.seedWith(seed);
      const value = document.getElementById('seed-value');
      if (value) value.textContent = seed;
      UI.closePopup();
      UI.playSound('click');
    });
    // Clear error as the user types
    const seedInput = document.getElementById('seed-edit-input');
    if (seedInput) {
      seedInput.addEventListener('input', () => {
        const error = document.getElementById('seed-edit-error');
        if (error) error.style.display = 'none';
      });
    }

    // Hamburger menu toggle (mobile)
    bind('btn-menu-toggle-main', () => {
      const panel = document.getElementById('side-panel');
      const toggleBtn = document.getElementById('btn-menu-toggle-main');
      if (!panel || !toggleBtn) return;
      const isOpen = panel.classList.contains('open');
      UI.togglePanel(!isOpen);
      toggleBtn.classList.toggle('open');
    });
    bind('btn-menu-toggle', () => UI.togglePanel(true));
    bind('btn-close-panel', () => {
      UI.closePanel();
      const toggleBtn = document.getElementById('btn-menu-toggle-main');
      if (toggleBtn) toggleBtn.classList.remove('open');
    });
    bind('panel-overlay', () => {
      UI.closePanel();
      const toggleBtn = document.getElementById('btn-menu-toggle-main');
      if (toggleBtn) toggleBtn.classList.remove('open');
    });

    bind('btn-save', () => {
      // Save Scum setting: only allow saving when the toggle is ON.
      if (!UI.saveScumOn) {
        UI.showToast('Save Scum is disabled — you cannot save during a run.', 'warning');
        return;
      }
      UI.openPopup('save');
    });

    // Game over / Victory
    bind('btn-new-career', () => this.startNewGame());
    bind('btn-new-victory', () => this.startNewGame());

    // Help modal
    bind('btn-help-title', () => UI.openHelp());
    bind('btn-close-help', () => UI.closeHelp());

    // Achievements modal
    bind('btn-achievements-title', () => UI.showAchievements());
    bind('btn-close-achievements', () => UI.closeAchievements());

    // Leaderboard screen
    bind('btn-leaderboard-title', () => UI.showLeaderboard());
    bind('btn-close-leaderboard', () => UI.closeLeaderboard());

    // Options menu (issue #53)
    bind('btn-options-title', () => UI.showOptions());
    bind('btn-close-options', () => UI.closeOptions());
    bind('btn-options-statistics', () => { UI.closeOptions(); UI.showStatistics(); });
    bind('btn-options-reset', () => UI.resetStatsAndAchievements());

    // Statistics screen
    bind('btn-statistics-back', () => UI.closeStatistics());

    // End-of-run consumable selection (Stock Up) is bound inline by
    // UI.showConsumableSelection, which owns the shared pick-and-swap UI
  },

  checkForSave(): void {
    if (SaveSystem.hasSave()) {
      const btnContinue = document.getElementById('btn-continue');
      if (btnContinue) btnContinue.style.display = 'block';
    }
  },

  // Warn the player before they accidentally navigate away mid-run, and
  // surface uncaught errors as a toast so a broken UI is diagnosable.
  initGuardHandlers(): void {
    // beforeunload: warn when a run is in progress (alive, not won).
    window.addEventListener('beforeunload', (e) => {
      const state = Game.state;
      if (state && state.alive && !state.won) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Global error handler: surface uncaught exceptions as a toast.
    window.addEventListener('error', (e) => {
      console.error('[d20().devLife] Uncaught error:', e.error || e.message);
      UI.showToast(`⚠️ Something broke: ${e.message}`, 'error');
    });

    // Also catch unhandled promise rejections (async event loading, etc.).
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[d20().devLife] Unhandled rejection:', e.reason);
      UI.showToast('⚠️ An async operation failed.', 'error');
    });
  },

  initHelpTabs(): void {
    document.querySelectorAll<HTMLElement>('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.tab) UI.setHelpTab(tab.dataset.tab);
      });
    });
    // Close modal on overlay click
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) UI.closeHelp();
      });
    }
  },

  startNewGame(): void {
    // Reset SPECIAL system
    STAT_KEYS.forEach(key => {
      SpecialSystem.stats[key] = 1;
    });
    SpecialSystem.equipmentBonuses = zeroStats();

    UI.showScreen('character');
    UI.renderCharacterCreation();
  },

  startCareer(): void {
    // Starting a new career abandons any in-progress run — clear the save so
    // the old run can't be resurrected via a stale "Continue" (e.g. the player
    // hit New Career while a save existed, then allocated stats).
    SaveSystem.deleteSave();
    const btnContinue = document.getElementById('btn-continue');
    if (btnContinue) btnContinue.style.display = 'none';

    // The allocation screen's +/− buttons mutate SpecialSystem.stats
    // directly — the DOM rows are just a view, so read the state
    const stats = { ...SpecialSystem.stats };

    // Get starting consumables and equipment from meta
    const startingConsumables = MetaStore.carriedIds('startingConsumables').map(id => {
      return CONSUMABLES.find(c => c.id === id);
    }).filter((item): item is Consumable => Boolean(item));
    const startingEquipment = MetaStore.carriedIds('startingEquipment').map(id => {
      return EQUIPMENT.find(e => e.id === id);
    }).filter((item): item is Equipment => Boolean(item));

    // Initialize SPECIAL system (before createCharacter — init() zeros
    // equipmentBonuses, which createCharacter then fills from carry-over)
    SpecialSystem.init(stats);

    // Difficulty is chosen on the title screen and stored in meta (issue #6).
    const difficulty = MetaStore.selectedDifficulty();

    // Create game
    Game.createCharacter(stats, startingConsumables, startingEquipment, difficulty);

    // Initialize perk system (a starting build may already have a stat at 10)
    PerkSystem.reset();
    PerkSystem.refresh();

    // Show game screen
    UI.showScreen('game');
    UI.renderSpecialStats();
    UI.renderEquipment();
    UI.renderCareerLog();
    UI.renderTopBar();

    // Load first event
    UI.nextEvent();
  },

  continueGame(): void {
    const saveData = SaveSystem.load();
    if (!saveData) return;

    const state = Game.state;
    if (!state) return;

    // Re-sync perks with loaded stats
    PerkSystem.refresh();

    UI.showScreen('game');
    UI.renderSpecialStats();
    UI.renderEquipment();
    UI.renderCareerLog();
    UI.renderTopBar();

    // Resume an interrupted level-up instead of jumping to the next event:
    // unspent points go back to stat selection, a pending consumable pick
    // goes back to the pick screen (otherwise the points would be stranded
    // and progressText() would show "LEVEL UP!" forever)
    if ((state.levelUpPoints || 0) > 0) {
      UI.showLevelUpStats();
      return;
    }
    if (state.pendingLevelUpConsumables && state.pendingLevelUpConsumables.length > 0) {
      UI.showLevelUpConsumableSelection();
      return;
    }

    // Load last event or next event
    const lastEventId = state.currentEventId;
    if (lastEventId) {
      const event = EVENTS.find(e => e.id === lastEventId);
      if (event) {
        UI.renderEvent(event);
      } else {
        UI.nextEvent();
      }
    } else {
      UI.nextEvent();
    }
  },

  saveGame(): void {
    const state = Game.state;
    if (!state) return;
    SaveSystem.save(state);
    UI.closePopup();

    // Show brief feedback: swap the save glyph to a checkmark, then restore.
    // The button holds an SVG (<use>), not text, so we swap the icon ref.
    const use = document.querySelector('#btn-save use');
    if (use) {
      use.setAttribute('href', '#icon-check');
      setTimeout(() => use.setAttribute('href', '#icon-save'), 1000);
    }
  },

  afterLevelUp(): void {
    // Apply level up
    const selected = document.querySelector<HTMLElement>('.levelup-stat.selected');
    if (selected) {
      const stat = selected.dataset.stat as StatKey;
      SpecialSystem.increase(stat);
    }

    const state = Game.state;
    if (!state) return;
    state.levelUpPoints = Math.max(0, (state.levelUpPoints || 1) - 1);

    // A stat increase may unlock a perk (e.g. pushing a stat to 10)
    const { gained, lost } = Game.refreshPerks();
    UI.announcePerkChanges(gained, lost);

    // 🧠 Rapid Learner: spend remaining points one at a time
    if (state.levelUpPoints > 0) {
      UI.showLevelUpStats();
      return;
    }

    UI.showScreen('game');
    UI.renderSpecialStats();
    UI.renderTopBar();
    UI.nextEvent();
  }
};

// Initialize when DOM is ready (and events are loaded)
document.addEventListener('DOMContentLoaded', async () => {
  await waitForEvents();
  App.init();
});
