// UI — settings screen: global game preferences (audio, etc.).
// Presentation tier: owns the screen rendering and show/hide handlers.
// Loaded before ui.js; its methods are composed into UI there.

import { UI } from './ui.js';


// localStorage key for persisting settings across sessions.
const SETTINGS_KEY = 'devlife_settings';

// Default settings.
const DEFAULT_SETTINGS: Settings = {
  audioOn: true,
  volume: 0.5,
  bgmOn: true,
  hapticsOn: true,
  diceAnimationOn: true,
  saveScumOn: false,
  theme: 'dark',
};

export interface Settings {
  audioOn: boolean;
  volume: number;
  bgmOn: boolean;
  hapticsOn: boolean;
  diceAnimationOn: boolean;
  saveScumOn: boolean;
  theme: 'dark' | 'light';
}

// Load settings from localStorage, falling back to defaults.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('[d20().devLife] Settings corrupted, using defaults:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

// Save settings to localStorage.
function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[d20().devLife] Failed to save settings:', e);
  }
}

// Apply current settings to the audio, animation, save, and theme systems.
function applySettings(settings: Settings): void {
  UI.audioOn = settings.audioOn;
  if (settings.audioOn) {
    if (!UI.audioCtx) UI.initAudio();
    UI.volume = settings.volume;
  }
  UI.bgmOn = settings.bgmOn;
  UI.hapticsOn = settings.hapticsOn;
  UI.diceAnimationOn = settings.diceAnimationOn;
  UI.saveScumOn = settings.saveScumOn;
  applyTheme(settings.theme);
}

// Apply a theme to the document.
export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export const UISettings = {
  // Current settings (loaded once on first show, saved on change).
  settings: loadSettings(),

  // Show the settings screen.
  showSettings(): void {
    // Sync the UI object with persisted settings.
    UI.audioOn = this.settings.audioOn;
    UI.volume = this.settings.volume;
    UI.bgmOn = this.settings.bgmOn;
    UI.hapticsOn = this.settings.hapticsOn;
    UI.diceAnimationOn = this.settings.diceAnimationOn;
    UI.saveScumOn = this.settings.saveScumOn;
    applyTheme(this.settings.theme);
    UI.renderSettings();
    UI.showScreen('settings');
  },

  // Back to the title screen.
  closeSettings(): void {
    UI.showScreen('title');
  },

  // Render the settings list.
  renderSettings(): void {
    const container = document.getElementById('settings-list');
    if (!container) return;

    const s = this.settings;

    let html = '';

    // Theme toggle (top of settings)
    html += `
      <div class="setting-row">
        <span class="setting-label">Dark Mode <span class="cons-info" data-help="theme" aria-label="About Dark Mode">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-theme" ${s.theme === 'dark' ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    // Audio toggle
    html += `
      <div class="setting-row">
        <span class="setting-label">Audio <span class="cons-info" data-help="audio" aria-label="About Audio">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-audio-on" ${s.audioOn ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    // Volume slider
    html += `
      <div class="setting-row">
        <span class="setting-label">Volume <span class="cons-info" data-help="volume" aria-label="About Volume">?</span></span>
        <input type="range" id="setting-volume" min="0" max="100" value="${Math.round(s.volume * 100)}" style="width:120px;" />
        <span id="setting-volume-value" class="setting-value" style="font-family:var(--font-mono);">${Math.round(s.volume * 100)}%</span>
      </div>`;

    // BGM toggle
    html += `
      <div class="setting-row">
        <span class="setting-label">Music <span class="cons-info" data-help="bgm" aria-label="About Music">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-bgm-on" ${s.bgmOn ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    // Haptics toggle
    html += `
      <div class="setting-row">
        <span class="setting-label">Haptics <span class="cons-info" data-help="haptics" aria-label="About Haptics">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-haptics-on" ${s.hapticsOn ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    // Dice animation toggle
    html += `
      <div class="setting-row">
        <span class="setting-label">Dice Animation <span class="cons-info" data-help="diceAnimation" aria-label="About Dice Animation">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-dice-animation-on" ${s.diceAnimationOn ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    // Save Scum toggle
    html += `
      <div class="setting-row">
        <span class="setting-label">Save Scum <span class="cons-info" data-help="saveScum" aria-label="About Save Scum">?</span></span>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-save-scum-on" ${s.saveScumOn ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>`;

    container.innerHTML = html;

    // Wire up controls
    const audioOn = document.getElementById('setting-audio-on') as HTMLInputElement | null;
    const volume = document.getElementById('setting-volume') as HTMLInputElement | null;
    const volumeValue = document.getElementById('setting-volume-value');
    const bgmOn = document.getElementById('setting-bgm-on') as HTMLInputElement | null;
    const hapticsOn = document.getElementById('setting-haptics-on') as HTMLInputElement | null;
    const diceAnimOn = document.getElementById('setting-dice-animation-on') as HTMLInputElement | null;
    const saveScumOn = document.getElementById('setting-save-scum-on') as HTMLInputElement | null;
    const themeOn = document.getElementById('setting-theme') as HTMLInputElement | null;

    // Helper: disable volume slider when audio is off.
    const updateVolumeDisabled = (): void => {
      if (volume) volume.disabled = !this.settings.audioOn;
    };
    updateVolumeDisabled();

    if (audioOn) {
      audioOn.addEventListener('change', () => {
        this.settings.audioOn = audioOn.checked;
        applySettings(this.settings);
        saveSettings(this.settings);
        updateVolumeDisabled();
        UI.playSound('click');
      });
    }

    if (volume) {
      volume.addEventListener('input', () => {
        const vol = Math.round(parseInt(volume.value, 10));
        this.settings.volume = vol / 100;
        if (volumeValue) volumeValue.textContent = `${vol}%`;
        applySettings(this.settings);
        // Preview sound at new volume if audio is on.
        if (this.settings.audioOn) UI.playSound('click');
      });
    }

    if (bgmOn) {
      bgmOn.addEventListener('change', () => {
        this.settings.bgmOn = bgmOn.checked;
        UI.bgmOn = bgmOn.checked;
        if (bgmOn.checked) { UI.initBgm(); } else { UI.stopBgm(); }
        saveSettings(this.settings);
        UI.playSound('click');
      });
    }

    if (hapticsOn) {
      hapticsOn.addEventListener('change', () => {
        this.settings.hapticsOn = hapticsOn.checked;
        UI.hapticsOn = hapticsOn.checked;
        saveSettings(this.settings);
        UI.playSound('click');
      });
    }

    if (diceAnimOn) {
      diceAnimOn.addEventListener('change', () => {
        this.settings.diceAnimationOn = diceAnimOn.checked;
        applySettings(this.settings);
        saveSettings(this.settings);
        UI.playSound('click');
      });
    }

    if (saveScumOn) {
      saveScumOn.addEventListener('change', () => {
        this.settings.saveScumOn = saveScumOn.checked;
        applySettings(this.settings);
        saveSettings(this.settings);
        UI.playSound('click');
      });
    }

    if (themeOn) {
      themeOn.addEventListener('change', () => {
        // Checked = dark mode, unchecked = light mode.
        this.settings.theme = themeOn.checked ? 'dark' : 'light';
        applySettings(this.settings);
        saveSettings(this.settings);
        UI.playSound('click');
      });
    }

    // Wire up tooltip triggers
    document.querySelectorAll<HTMLElement>('.cons-info[data-help]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.help;
        switch (key) {
          case 'audio':
            UI.showTooltip({ name: 'Audio', desc: 'Turns the beep-boop sounds on or off. Your ears will thank you.', icon: 'icon-speaker' });
            break;
          case 'volume':
            UI.showTooltip({ name: 'Volume', desc: 'Controls how loud the beep-boop sounds are. Don\'t blast your neighbours.', icon: 'icon-volume' });
            break;
          case 'bgm':
            UI.showTooltip({ name: 'Music', desc: 'Corporate elevator music. Because every open-plan office needs a soundtrack to your soul-crushing.', icon: 'icon-speaker' });
            break;
          case 'haptics':
            UI.showTooltip({ name: 'Haptics', desc: 'Vibrates your phone on big moments. Not supported on iOS — Apple thinks your palms are fine.', icon: 'icon-gear' });
            break;
          case 'diceAnimation':
            UI.showTooltip({ name: 'Dice Animation', desc: 'Skips the d20 dice roll animation. Because waiting is for people who care about luck.', icon: 'icon-dice' });
            break;
          case 'saveScum':
            UI.showTooltip({ name: 'Save Scum', desc: 'Enable saving during a run. Because apparently one life isn\'t enough to get things right.', icon: 'icon-save' });
            break;
          case 'theme':
            UI.showTooltip({ name: 'Dark Mode', desc: 'Toggle dark mode. On by default — because productivity is overrated.', icon: 'icon-gear' });
            break;
        }
      });
    });
  },
};
