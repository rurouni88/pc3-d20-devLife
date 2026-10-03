// UI — end-of-run screens: game over, victory, Stock Up, equipment choice.
// Loaded before ui.js; its methods are composed into UI there.

// Display name for a starting archetype on the summary screens. 'custom' (or
// an unknown key, e.g. an old save) shows as "Custom"; otherwise the archetype
// name with the leading "The " stripped for a cleaner "Run Started As" row.
import { CONFIG } from '../core/config.js';
import { equipmentEffectText } from '../core/utils.js';
import { ARCHETYPES, STAT_KEYS } from '../data/archetypes.js';
import { CONSUMABLES } from '../data/items.js';
import { ConsumableManager, Game } from '../engine/game.js';
import { MetaStore } from '../engine/meta.js';
import { SaveSystem } from '../engine/save.js';
import { SpecialSystem } from '../engine/special.js';
import { difficultyIconId, setDisplay, setText } from './ui-core.js';
import { UI } from './ui.js';
import type {Consumable, Equipment} from '../core/types.js';


function archetypeDisplayName(key: string): string {
  const arch = key ? ARCHETYPES[key] : undefined;
  if (!arch) return 'Custom';
  return arch.name.replace(/^The /, '');
}

export const UIEndOfRun = {
  // Show game over screen
  showGameOver(reason: string): void {
    Game.saveRunComplete();

    // Show consumable selection first
    UI.showConsumableSelection('gameover');
    setText('gameover-reason', reason);
  },

  // Show consumable selection at end of run — the shared pick-and-swap UI
  // ("Stock Up") with per-screen title/context placeholders
  showConsumableSelection(type: string): void {
    const options = ConsumableManager.getEndOfRunOptions();
    // The carried stash: what the player already carries across runs. When
    // it's full, the swap section lets them replace one of the carried items
    const carried = MetaStore.carriedIds('startingConsumables')
      .map(id => CONSUMABLES.find(c => c.id === id))
      .filter((item): item is Consumable => Boolean(item));
    const full = carried.length >= Game.consumableCap();

    const render = (title: string, context: string, container: HTMLElement, titleEl: HTMLElement | null, contextEl: HTMLElement | null, continueBtn: HTMLButtonElement, onPick: (id: string, replaceIndex: number) => void) => {
      const getSelection = UI.renderConsumableSwap({
        container, titleEl, contextEl, title, context,
        options, current: carried, full,
        continueBtn, requireReplace: true
      });
      continueBtn.onclick = () => {
        const { newId, replaceIndex } = getSelection();
        if (newId) onPick(newId, replaceIndex);
      };
    };

    if (type === 'gameover') {
      // Game over screen
      const container = document.getElementById('gameover-cons-selection');
      const continueBtn = document.getElementById('btn-continue-gameover-cons') as HTMLButtonElement;
      if (!container || !continueBtn) return;
      render(
        '☕ Stock Up!',
        'Pick 1 consumable to carry into your next career.',
        container,
        document.getElementById('gameover-cons-title'),
        document.getElementById('gameover-cons-desc'),
        continueBtn,
        (id, replaceIndex) => UI.applyEndOfRunConsumable(id, replaceIndex)
      );
      // Skip: keep the carried stash as-is
      const skipBtn = document.getElementById('btn-skip-gameover-cons');
      if (skipBtn) skipBtn.onclick = () => {
        UI.applyEndOfRunConsumable(null);
      };
      UI.showScreen('gameover-cons');
    } else {
      // Victory screen
      const consContainer = document.getElementById('victory-consumables');
      const summaryContainer = document.getElementById('victory-summary');
      const continueBtn = document.getElementById('btn-continue-victory-cons') as HTMLButtonElement;
      const buttonsContainer = document.getElementById('victory-buttons');
      if (!consContainer || !summaryContainer || !continueBtn || !buttonsContainer) return;

      consContainer.style.display = 'block';
      summaryContainer.style.display = 'none';
      setDisplay('victory-cons-buttons', 'flex');
      continueBtn.disabled = true;
      buttonsContainer.style.display = 'none';

      render(
        '🏆 Retirement!',
        'You\'ve completed your career. Pick 1 consumable to carry into your next career.',
        consContainer,
        document.getElementById('victory-title'),
        document.getElementById('victory-desc'),
        continueBtn,
        (id, replaceIndex) => UI.applyVictoryConsumable(id, replaceIndex)
      );
      // Skip: keep the carried stash as-is
      const skipBtn = document.getElementById('btn-skip-victory-cons');
      if (skipBtn) skipBtn.onclick = () => {
        UI.applyVictoryConsumable(null);
      };
      UI.showScreen('victory');
    }
  },

  // Apply selected consumable and show game over. selectedId = null means
  // the player skipped — the carried stash stays as-is
  applyEndOfRunConsumable(selectedId: string | null, replaceIndex: number = -1): void {
    // Carry this consumable into future runs (store ID only)
    if (selectedId) MetaStore.addCarriedConsumable(selectedId, replaceIndex);

    // Show game over summary
    SaveSystem.deleteSave();
    UI.showScreen('gameover');

    const summary = Game.getSummary();
    const container = document.getElementById('gameover-summary');
    if (!summary || !container) return;
    const diffIcon = difficultyIconId(summary.difficulty);
    container.innerHTML = `
      <div class="summary-row"><span class="label">Run #</span><span class="value">${summary.runNumber}</span></div>
      <div class="summary-row"><span class="label">Difficulty</span><span class="value"><svg class="difficulty-icon summary-diff-icon"><use href="#${diffIcon}"/></svg> ${CONFIG.game.difficulty[summary.difficulty].label}</span></div>
      <div class="summary-row"><span class="label">Run Started As</span><span class="value">${archetypeDisplayName(summary.archetype)}</span></div>
      <div class="summary-row"><span class="label">Level Reached</span><span class="value">${summary.level}</span></div>
      <div class="summary-row"><span class="label">Final Position</span><span class="value">${CONFIG.game.phaseNames[summary.phase] || summary.phase}</span></div>
      <div class="summary-row"><span class="label">Career Length</span><span class="value">${(summary.day / CONFIG.game.daysPerCareerYear).toFixed(1)} years</span></div>
      <div class="summary-row"><span class="label">Events Completed</span><span class="value">${summary.eventsCompleted}</span></div>
      <div class="summary-row"><span class="label">Equipment</span><span class="value">${summary.equipment.length}</span></div>
      <div class="summary-row"><span class="label">Stats</span><span class="value">${STAT_KEYS.map(k => `${k}:${SpecialSystem.stats[k]}`).join(' ')}</span></div>
      ${summary.seed ? `<div class="summary-row"><span class="label">Seed</span><span class="value" style="font-family:var(--font-mono);letter-spacing:0.1em;">${summary.seed}</span></div>` : ''}
    `;
  },

  // Apply selected consumable and show victory summary. selectedId = null
  // means the player skipped — the carried stash stays as-is
  applyVictoryConsumable(selectedId: string | null, replaceIndex: number = -1): void {
    // Carry this consumable into future runs (store ID only)
    if (selectedId) MetaStore.addCarriedConsumable(selectedId, replaceIndex);

    // Hide consumable selection, show summary
    setDisplay('victory-consumables', 'none');
    setDisplay('victory-cons-buttons', 'none');
    // Restore the retirement context line (the pick screen overwrote it)
    setText('victory-desc', "You've completed your career. Time to enjoy the beach (with WiFi).");
    const summaryContainer = document.getElementById('victory-summary');
    if (!summaryContainer) return;
    summaryContainer.style.display = 'block';
    setDisplay('victory-buttons', 'flex');

    SaveSystem.deleteSave();

    const summary = Game.getSummary();
    if (!summary) return;
    const vDiffIcon = difficultyIconId(summary.difficulty);
    summaryContainer.innerHTML = `
      <div class="summary-row"><span class="label">Run #</span><span class="value">${summary.runNumber}</span></div>
      <div class="summary-row"><span class="label">Difficulty</span><span class="value"><svg class="difficulty-icon summary-diff-icon"><use href="#${vDiffIcon}"/></svg> ${CONFIG.game.difficulty[summary.difficulty].label}</span></div>
      <div class="summary-row"><span class="label">Run Started As</span><span class="value">${archetypeDisplayName(summary.archetype)}</span></div>
      <div class="summary-row"><span class="label">Final Level</span><span class="value">${summary.level}</span></div>
      <div class="summary-row"><span class="label">Final Position</span><span class="value">${CONFIG.game.phaseNames[summary.phase] || summary.phase} 🏆</span></div>
      <div class="summary-row"><span class="label">Career Length</span><span class="value">${(summary.day / CONFIG.game.daysPerCareerYear).toFixed(1)} years</span></div>
      <div class="summary-row"><span class="label">Events Completed</span><span class="value">${summary.eventsCompleted}</span></div>
      <div class="summary-row"><span class="label">Equipment Collected</span><span class="value">${summary.equipment.length}</span></div>
      <div class="summary-row"><span class="label">Final Stats</span><span class="value">${STAT_KEYS.map(k => `${k}:${SpecialSystem.stats[k]}`).join(' ')}</span></div>
      ${summary.seed ? `<div class="summary-row"><span class="label">Seed</span><span class="value" style="font-family:var(--font-mono);letter-spacing:0.1em;">${summary.seed}</span></div>` : ''}
    `;
  },

  // Show victory screen with consumable selection
  showVictory(): void {
    Game.saveRunComplete();
    UI.showConsumableSelection('victory');
  },

  // Toggle side panel (mobile)
  togglePanel(open: boolean): void {
    const panel = document.getElementById('side-panel');
    const overlay = document.getElementById('panel-overlay');
    if (!panel || !overlay) return;

    if (open) {
      panel.classList.add('open');
      overlay.classList.add('visible');
    } else {
      panel.classList.remove('open');
      overlay.classList.remove('visible');
    }
  },

  // Close side panel
  closePanel(): void {
    UI.togglePanel(false);
  },

  // Show equipment choice screen (when inventory is full)
  showEquipmentChoice(newEquipment: Equipment, currentEquipment: Equipment[]): void {
    const newContainer = document.getElementById('equipment-choice-new');
    const currentContainer = document.getElementById('equipment-choice-current');
    const keepBtn = document.getElementById('btn-keep-equipment') as HTMLButtonElement;
    const skipBtn = document.getElementById('btn-skip-equipment');
    if (!newContainer || !currentContainer || !keepBtn) return;

    // Show new equipment
    newContainer.innerHTML = '';
    const newEl = document.createElement('div');
    newEl.className = 'consumable-select-item';
    newEl.style.borderColor = 'var(--accent-green)';
    const statStr = equipmentEffectText(newEquipment);
    newEl.innerHTML = `
      <span class="cs-emoji" style="font-size: 2em;">${newEquipment.emoji}</span>
      <div class="cs-details">
        <div class="cs-name">${newEquipment.name}</div>
        <div class="cs-desc">${newEquipment.desc}</div>
        <div class="cs-effect">${statStr}</div>
      </div>
      <div class="cs-badge">NEW</div>
    `;
    newContainer.appendChild(newEl);

    // Show current equipment as clickable options
    currentContainer.innerHTML = '';
    let selectedIndex = -1;

    currentEquipment.forEach((equip, i) => {
      const el = document.createElement('div');
      el.className = 'consumable-select-item';
      el.dataset.index = String(i);
      const statStr = equipmentEffectText(equip);
      el.innerHTML = `
        <span class="cs-emoji">${equip.emoji}</span>
        <div class="cs-details">
          <div class="cs-name">${equip.name}</div>
          <div class="cs-desc">${equip.desc}</div>
          <div class="cs-effect">${statStr}</div>
        </div>
      `;
      el.addEventListener('click', () => {
        currentContainer.querySelectorAll('.consumable-select-item').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        selectedIndex = i;
        keepBtn.disabled = false;
      });
      currentContainer.appendChild(el);
    });

    // Reset state
    keepBtn.disabled = true;
    selectedIndex = -1;

    // Skip (keep current)
    if (skipBtn) skipBtn.onclick = () => {
      const state = Game.state;
      if (!state) return;
      state.pendingEquipmentDrop = null;
      UI.showScreen('game');
      // The run ended on this event (e.g. the winning boss also dropped
      // equipment): the outcome card is still there and its button leads
      // to the end screens — don't ask the engine for a next event (issue #79).
      if (state.won || !state.alive) {
        document.getElementById('event-card')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
        return;
      }
      UI.nextEvent();
    };

    // Swap: replace selected equipment with new one
    keepBtn.onclick = () => {
      const state = Game.state;
      if (!state) return;
      if (selectedIndex >= 0) {
        // Remove old equipment bonuses
        const oldEquip = state.equipment[selectedIndex];
        SpecialSystem.removeEquipment(oldEquip.emoji, oldEquip.effects);

        // Replace with new equipment
        state.equipment[selectedIndex] = { ...newEquipment };
        SpecialSystem.addEquipment(newEquipment.emoji, newEquipment.effects);
        state.pendingEquipmentDrop = null;

        UI.showScreen('game');
        UI.renderEquipment();
        // Run ended on this event — back to the outcome card, whose button
        // leads to the end screens (issue #79).
        if (state.won || !state.alive) {
          document.getElementById('event-card')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
          return;
        }
        UI.nextEvent();
      }
    };

    UI.showScreen('equipment-choice');
  },
};
