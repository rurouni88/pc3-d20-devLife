// UI — the event card: rendering the current event, its choices and
// consumables, the perk-intervention gate, the outcome/result, and the
// "continue" flow to the next event. Loaded before ui.js; its methods are
// composed into UI there.

// Perk intervention prompts — one per available perk, rendered by the
// pending decision screen (renderPerkDecision).
import { STAT_META } from '../core/config.js';
import { formatSignedEffects } from '../core/utils.js';
import { STAT_KEYS } from '../data/archetypes.js';
import { CONSUMABLES } from '../data/items.js';
import { PERK_BY_ID } from '../data/perks.js';
import { ConsumableManager, Game } from '../engine/game.js';
import { SpecialSystem } from '../engine/special.js';
import { UIDice } from './ui-dice.js';
import { UI } from './ui.js';
import type {CheckResult, Consumable, GameEvent, PerkDecisions, PerkInterventions, ProcessResult, ResolvedChoice, StatKey} from '../core/types.js';


const perkPromptBox = (perkId: string, yesId: string, noId: string, useLabel: string): string => {
  const perk = PERK_BY_ID[perkId];
  return `
    <div class="perk-prompt-box">
      <div class="perk-prompt-title">⚡ Intervene with Perk</div>
      <div class="perk-prompt-desc">${perk.emoji} <strong>${perk.name}</strong> — ${perk.desc}</div>
      <div class="perk-prompt-actions">
        <button class="btn btn-primary" id="${yesId}">${useLabel}</button>
        <button class="btn btn-ghost" id="${noId}">No, thanks</button>
      </div>
    </div>
  `;
};

// A perk prompt after the player has already decided — dimmed, no buttons.
const perkDecidedBox = (perkId: string, used: boolean): string => {
  const perk = PERK_BY_ID[perkId];
  return `<div class="perk-prompt-box decided">${perk.emoji} <strong>${perk.name}</strong> — ${used ? 'used' : 'declined'}</div>`;
};

// Intervention key → perk id (PERK_BY_ID) and prompt label
const INTERVENTION_META = {
  negotiate: { perkId: 'negotiate', label: '🤝 Use Negotiate' },
  bruteForce: { perkId: 'brute_force', label: '💪 Use Brute Force' },
  codeReview: { perkId: 'code_review', label: '🐛 Use Code Review' }
};
// The dice animation plays once per event — when the roll first happens. A
// failed check with interventions shows it on the intervention screen; the
// re-renders of that screen and the final outcome must not re-roll the die.
let diceShownForEvent = false;

// Format a single stat-check result as a formula the player can follow:
//   "E: 🎲 12 − 4 = 8 vs 4 ✗"
// rawRoll is the d20 face (1-20); Luck is derived as rawRoll − roll; roll is
// the Luck-adjusted result (can be negative); target is the check's static
// target. A check can also fail the competence gate (effective stat too low)
// even when the roll clears the target — that reads as "✓, but…incompetent ✗".
function formatCheckResult(cr: CheckResult): string {
  const luck = cr.rawRoll - cr.roll;
  let mark;
  if (cr.success) {
    mark = cr.negotiated ? '🤝' : '✓';
  } else if (!cr.negotiated && cr.roll <= cr.target) {
    mark = '✓, but…incompetent ✗';
  } else {
    mark = '✗';
  }
  return `<span class="stat-change ${cr.success ? 'positive' : 'negative'}">${cr.stat}: 🎲 ${cr.rawRoll} − ${luck} = ${cr.roll} vs ${cr.target} ${mark}</span>`;
}

export const UIEventCard = {
  // Render an event
  renderEvent(event: GameEvent): void {
    const container = document.getElementById('event-container');
    const state = Game.state;
    if (!container || !state) return;
    diceShownForEvent = false; // new event: allow the dice animation to play
    const letters = ['A', 'B', 'C', 'D'];

    const card = document.createElement('div');
    card.className = 'event-card';
    card.id = 'event-card';

    // Build consumable buttons if player has any
    let consumableHTML = '';
    if (state.consumables.length > 0) {
      const grouped = {} as Record<string, Consumable & { count: number }>;
      state.consumables.forEach(c => {
        if (!grouped[c.id]) grouped[c.id] = { ...c, count: 0 };
        grouped[c.id].count++;
      });

      consumableHTML = `
        <div class="consumable-bar">
          <span class="consumable-label">🧪 Consumables:</span>
          <div class="consumable-buttons">
            ${Object.values(grouped).map(c => `
              <button class="cons-btn" data-id="${c.id}">
                <span class="cons-info" data-id="${c.id}">?</span>
                ${c.emoji} ${c.name} ×${c.count}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Low-stat warning for mobile, where the SPECIAL bar is a hidden drawer:
    // any stat at or below the danger threshold is one hit from a saving roll.
    // Hidden on desktop (≥900px) where the bar is always visible (CSS).
    const danger = Game.dangerStats();
    const dangerHTML = danger.length > 0
      ? `<div class="stat-danger-strip">⚠️ Danger: ${danger.map(k => STAT_META[k].name).join(', ')}</div>`
      : '';

    card.innerHTML = `
      <div class="event-header">
        <div class="event-phase">${event.phaseLabel}</div>
        <div class="event-title">${event.title}</div>
      </div>
      ${dangerHTML}
      <div class="event-body">
        <div class="event-narrative">${event.narrative}</div>
        ${consumableHTML}
        <div class="event-choices">
          ${event.choices.map((choice, i) => {
            const checks = Object.entries(choice.checks || {});
            const checkHTML = checks.length > 0
              ? `<div class="choice-checks">${checks.map(([stat, target]) => {
                  // Simple preview: effective stat (includes equipment and
                  // consumable bonuses) vs the full target. Below target =
                  // red (a good roll is your only hope), at/above = green.
                  // Luck stays a hidden factor — it is not shown in the
                  // preview.
                  const currentStat = SpecialSystem.effective(stat as StatKey);
                  const success = currentStat >= target;
                  return `<span class="check ${success ? 'success' : 'fail'}">${STAT_META[stat as StatKey].name}: ${target} ${success ? '✓' : '✗'}</span>`;
                }).join('')}</div>`
              : '';
            return `
              <button class="choice-btn" data-choice="${i}">
                <span class="choice-letter">${letters[i]}.</span> ${choice.text}
                ${checkHTML}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(card);

    // Bind consumable buttons
    card.querySelectorAll<HTMLElement>('.cons-btn').forEach(btn => {
      const infoBtn = btn.querySelector<HTMLElement>('.cons-info');
      if (infoBtn) {
        // Tap/click the "?" to show the tooltip — the same interaction on
        // mobile and desktop. Hover is not used (unreliable on mobile). The
        // global "click outside" handler (UITooltip.initTooltipClose) closes it.
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const consumable = CONSUMABLES.find(c => c.id === infoBtn.dataset.id);
          if (consumable) UI.showTooltip(consumable);
        });
      }
      btn.addEventListener('click', (e) => {
        if (!(e.target as Element).classList.contains('cons-info')) {
          const id = btn.dataset.id;
          if (id) UI.useConsumable(id, event);
        }
      });
    });

    // Bind choice buttons
    card.querySelectorAll<HTMLElement>('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.playSound('click');
        const choiceIndex = parseInt(btn.dataset.choice || '0', 10);
        UI.handleChoice(event, choiceIndex);
      });
    });
  },

  // Use a consumable before a choice
  useConsumable(id: string, event: GameEvent): void {
    const result = ConsumableManager.use(id);
    if (!result) return;

    // Handle multiplier (AI) consumables
    if (result.multiplier !== undefined) {
      SpecialSystem.applyMultiplier(result.multiplier);
      UI.renderSpecialStats();

      // Build the feedback banner now, insert it AFTER the re-render —
      // renderEvent replaces the card DOM and would wipe an earlier insert
      const feedback = document.createElement('div');
      feedback.className = 'consumable-feedback';

      if (result.backfired) {
        feedback.style.borderColor = 'var(--accent-red)';
        feedback.style.color = 'var(--accent-red)';
        feedback.style.background = 'rgba(255, 82, 82, 0.1)';
        feedback.innerHTML = `${result.emoji} ${result.name} backfired! AI made it worse...`;
      } else {
        feedback.innerHTML = `${result.emoji} ${result.name} activated! ${result.effective} — let's hope it works...`;
      }

      UI.renderEvent(event);
      UI.insertConsumableFeedback(feedback, 3000);
      return;
    }

    // Handle multi-stat consumables (alcohol, issue #57): apply each delta as
    // a temp bonus — negatives allowed, so the hangover lands on the check too.
    if (result.effects) {
      Object.entries(result.effects).forEach(([stat, value]) => {
        SpecialSystem.applyTempBonus(stat as StatKey, value);
      });
      UI.renderSpecialStats();

      const feedback = document.createElement('div');
      feedback.className = 'consumable-feedback';
      feedback.innerHTML = `${result.emoji} ${result.name} used! ${formatSignedEffects(result.effects)}`;

      UI.renderEvent(event);
      UI.insertConsumableFeedback(feedback, 2000);
      return;
    }

    // Handle normal bonus consumables. The effect shapes are mutually
    // exclusive, so past the multiplier/effects checks above, stat + bonus
    // are present — the guard is just to satisfy the (now optional) types.
    if (result.stat === undefined || result.bonus === undefined) return;
    const stat = result.stat;
    const bonus = result.bonus;
    if (stat === 'any') {
      STAT_KEYS.forEach(s => SpecialSystem.applyTempBonus(s, bonus));
    } else {
      SpecialSystem.applyTempBonus(stat, bonus);
    }

    UI.renderSpecialStats();

    // Show feedback (inserted after the re-render — see insertConsumableFeedback)
    const feedback = document.createElement('div');
    feedback.className = 'consumable-feedback';
    const statName = result.stat === 'any' ? 'All Stats' : (STAT_META[result.stat as StatKey]?.name || result.stat);
    feedback.innerHTML = `${result.emoji} ${result.name} used! +${result.bonus} ${statName}`;

    UI.renderEvent(event);
    UI.insertConsumableFeedback(feedback, 2000);
  },

  // Insert a transient consumable feedback banner into the freshly
  // re-rendered event card. Must run AFTER renderEvent, which replaces the
  // card DOM. Auto-removes after `duration` ms.
  insertConsumableFeedback(feedback: HTMLElement, duration: number): void {
    const body = document.querySelector<HTMLElement>('#event-card .event-body');
    if (!body) {
      feedback.remove();
      return;
    }
    const consumableBar = body.querySelector('.consumable-bar');
    if (consumableBar) {
      consumableBar.insertAdjacentElement('afterend', feedback);
    } else {
      body.prepend(feedback);
    }
    setTimeout(() => feedback.remove(), duration);
  },

  // Handle a choice selection: resolve the checks, let the player decide
  // on any available perk interventions, then apply and show the outcome.
  handleChoice(event: GameEvent, choiceIndex: number): void {
    const resolved = Game.resolveChoice(event, choiceIndex);
    if ('error' in resolved) {
      console.error(resolved.error);
      return;
    }

    const available = Object.keys(resolved.interventions)
      .filter(k => resolved.interventions[k as keyof PerkInterventions]);

    // No interventions available — apply immediately (the common case)
    if (available.length === 0) {
      UI.showOutcome(Game.applyChoice(resolved));
      return;
    }

    // Interventions available — pending screen; nothing is applied until
    // the player has decided on every prompt
    const decisions: Record<string, boolean | null> = {};
    available.forEach(k => { decisions[k] = null; });
    UI.renderPerkDecision(resolved, decisions, available);
  },

  // Pending result screen: the checks are resolved but NOTHING is applied
  // yet. The player decides on each available perk intervention; once all
  // are decided, the outcome is applied (showOutcome). Re-renders after
  // each decision, so decided prompts drop away.
  renderPerkDecision(resolved: ResolvedChoice, decisions: Record<string, boolean | null>, available: string[]): void {
    const card = document.getElementById('event-card');
    const body = card ? card.querySelector('.event-body') : null;
    if (!body) return;

    const choices = body.querySelector<HTMLElement>('.event-choices');
    if (choices) choices.style.display = 'none';
    const existingResult = body.querySelector('.event-result');
    if (existingResult) existingResult.remove();

    const resultDiv = document.createElement('div');
    resultDiv.className = 'event-result';

    const pending = available.filter(k => decisions[k] === null);
    const decided = available.filter(k => decisions[k] !== null);

    let html = `<div class="result-text failure">⚡ The check failed — you can intervene:</div>`;

    // The rolled checks, so the player can weigh the intervention
    if (resolved.checkResults.length > 0) {
      // Play the dice animation once for this event (raw d20 faces, not the
      // Luck-adjusted rolls which can be negative). Multi-check choices stack
      // one die per check; each die's border reflects pass/fail. Re-renders as
      // the player decides each intervention must not re-roll the same die.
      if (!diceShownForEvent) {
        UIDice.showDiceRoll(resolved.checkResults.map(cr => ({ roll: cr.rawRoll, success: cr.success })));
        diceShownForEvent = true;
      }
      const checkHTML = resolved.checkResults.map(formatCheckResult).join('');
      html += `<div class="stat-changes">${checkHTML}</div>`;
    }

    // Decided prompts (dimmed, in decision order)
    for (const k of decided) {
      const meta = INTERVENTION_META[k as keyof typeof INTERVENTION_META];
      html += perkDecidedBox(meta.perkId, !!decisions[k]);
    }

    // Pending prompts
    for (const k of pending) {
      const meta = INTERVENTION_META[k as keyof typeof INTERVENTION_META];
      html += perkPromptBox(meta.perkId, `btn-intervene-yes-${k}`, `btn-intervene-no-${k}`, meta.label);
    }

    resultDiv.innerHTML = html;
    body.appendChild(resultDiv);

    const decide = (k: string, used: boolean): void => {
      decisions[k] = used;
      if (available.every(key => decisions[key] !== null)) {
        const use: PerkDecisions = { negotiate: false, bruteForce: false, codeReview: false };
        for (const key of available) use[key as keyof PerkDecisions] = !!decisions[key];
        UI.showOutcome(Game.applyChoice(resolved, use));
      } else {
        UI.renderPerkDecision(resolved, decisions, available);
      }
    };

    for (const k of pending) {
      const yes = document.getElementById(`btn-intervene-yes-${k}`);
      const no = document.getElementById(`btn-intervene-no-${k}`);
      if (yes) yes.addEventListener('click', () => decide(k, true));
      if (no) no.addEventListener('click', () => decide(k, false));
    }
  },
  // Show an applied outcome: refresh panels, float the stat changes, toast
  // the milestones, render the result screen.
  showOutcome(result: ProcessResult): void {
    const state = Game.state;
    if (!state) return;

    // Announce perk changes from this choice's effects (the engine returns
    // them; the UI owns the announcement).
    if (result.perkChanges) UI.announcePerkChanges(result.perkChanges.gained, result.perkChanges.lost);

    // Update UI elements
    UI.renderSpecialStats();
    UI.renderEquipment();
    UI.renderCareerLog();
    UI.renderTopBar();

    // Show floating stat changes
    for (const [stat, value] of Object.entries(result.effects || {}) as [StatKey, number][]) {
      if (value !== 0) {
        UI.showStatFloat(stat, value);
      }
    }

    // Show toast notifications and play sounds for milestones.
    // Terminal states first: a run can END on a boss event (bossDefeated
    // is title-derived, gameOver is computed independently), and the level
    // cadence can fire on the same event — celebration toasts must not
    // clobber the death/retirement ones. Mirrors the continue-button chain.
    if (result.gameOver) {
      UI.showToast('💀 Career Over', 'error');
      UI.playSound('gameover');
      UI.playHaptic('gameover');
      UI.playDefeatJingle();
      UI.flashScreen('rgba(255, 0, 0, 0.4)');
    } else if (result.victory) {
      UI.showToast('🏆 Retirement!', 'success');
      UI.playSound('victory');
      UI.playHaptic('victory');
      UI.playVictoryJingle();
      UI.flashScreen('rgba(255, 215, 0, 0.3)');
    } else if (result.leveledUp) {
      UI.showToast(`📈 Level Up! Now level ${state.level}`, 'success');
      UI.playSound('levelup');
      UI.playHaptic('levelup');
    } else if (result.bossDefeated) {
      UI.showToast('🏆 Boss Defeated!', 'success');
      UI.playSound('boss');
      UI.playHaptic('boss');
      UI.flashScreen('rgba(0, 255, 136, 0.3)');
    } else if (result.itemDropped) {
      UI.showToast(`🎁 Found: ${result.itemDropped.emoji} ${result.itemDropped.name}`, 'success');
      UI.playSound('success');
    } else {
      // Regular choice sound + haptic on pass/fail
      UI.playSound(result.success ? 'success' : 'failure');
      UI.playHaptic(result.success ? 'success' : 'failure');
    }

    // Newly-unlocked achievements (only present on a run-ending choice).
    // Toasted after the terminal celebration so they don't clobber it.
    for (const ach of result.newAchievements || []) {
      UI.showToast(`${ach.emoji} Achievement: ${ach.title}`, 'success');
    }

    UI.renderResult(result);
  },

  // Render the event result screen. Called from showOutcome once the
  // outcome has been fully applied (interventions decided).
  renderResult(result: ProcessResult): void {
    const card = document.getElementById('event-card');
    const body = card ? card.querySelector('.event-body') : null;
    const state = Game.state;
    if (!body || !state) return;

    const choices = body.querySelector<HTMLElement>('.event-choices');
    if (choices) choices.style.display = 'none';

    // Re-renders (after perk prompts) replace the previous result
    const existingResult = body.querySelector('.event-result');
    if (existingResult) existingResult.remove();

    // 🍀 Clean Deploy intervened (auto-reroll) — announce it; the result
    // below already shows the rerolled outcome
    if (result.cleanDeployUsed) {
      result.cleanDeployUsed = false;
      UI.showToast(`⚡ Clean Deploy: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'success' : 'error');
      UI.playSound('perk');
    }

    // 🧘 Iron Nerves saved the run from a burnout floor — announce it;
    // the stat changes below already show E landing at 3
    if (result.ironNervesUsed) {
      result.ironNervesUsed = false;
      UI.showToast('🧘 Iron Nerves: you pushed through the collapse', 'success');
      UI.playSound('perk');
    }

    const resultDiv = document.createElement('div');
    resultDiv.className = 'event-result';

    let resultHTML = `<div class="result-text ${result.success ? 'success' : 'failure'}">${result.log}</div>`;

    // Show stat changes
    const statChanges: string[] = [];
    for (const [stat, value] of Object.entries(result.effects || {}) as [StatKey, number][]) {
      if (value !== 0) {
        statChanges.push(`<span class="stat-change ${value > 0 ? 'positive' : 'negative'}">${STAT_META[stat].name}: ${value > 0 ? '+' : ''}${value}</span>`);
      }
    }
    if (statChanges.length > 0) {
      resultHTML += `<div class="stat-changes">${statChanges.join('')}</div>`;
    }

    // Show item drop
    let showEquipmentChoice = false;
    if (result.equipmentDropped) {
      // Inventory full — the item is held in pendingEquipmentDrop; show choice screen
      const pending = state.pendingEquipmentDrop;
      if (!pending) return;
      resultHTML += `<div class="item-drop">🎁 Found: ${pending.emoji} ${pending.name} — inventory full!</div>`;
      showEquipmentChoice = true;
    } else if (result.itemDropped) {
      // Item already added to inventory by Game.checkForEquipmentDrop()
      resultHTML += `<div class="item-drop">🎁 Found: ${result.itemDropped.emoji} ${result.itemDropped.name}</div>`;
      UI.renderEquipment();
    }

    // Show check results
    if (result.checkResults && result.checkResults.length > 0) {
      // Play the dice animation only if it hasn't already shown on the
      // intervention screen for this event (raw d20 faces, not the
      // Luck-adjusted rolls which can be negative). Multi-check choices stack
      // one die per check; each die's border reflects pass/fail.
      if (!diceShownForEvent) {
        UIDice.showDiceRoll(result.checkResults.map(cr => ({ roll: cr.rawRoll, success: cr.success })));
        diceShownForEvent = true;
      }
      const checkHTML = result.checkResults.map(formatCheckResult).join('');
      resultHTML += `<div class="stat-changes">${checkHTML}</div>`;
    }

    // Continue button
    let continueText = 'Continue →';
    if (result.gameOver) continueText = 'View Results →';
    else if (result.victory) continueText = 'View Retirement →';
    else if (result.leveledUp) continueText = 'Level Up →';
    else if (result.phaseComplete) continueText = 'Continue →';
    else if (result.bossDefeated) continueText = 'Boss Defeated — Continue →';

    resultHTML += `<div class="result-actions"><button class="btn btn-primary btn-continue" id="btn-continue-event">${continueText}</button></div>`;

    resultDiv.innerHTML = resultHTML;
    body.appendChild(resultDiv);

    // Bind continue button
    const continueBtn = document.getElementById('btn-continue-event');
    if (continueBtn) continueBtn.addEventListener('click', () => {
      if (showEquipmentChoice) {
        const pending = state.pendingEquipmentDrop;
        if (pending) {
          UI.showEquipmentChoice(pending, [...state.equipment]);
          return;
        }
        // The equipment choice was already resolved (skip/swap cleared the
        // pending drop) — fall through to the normal chain below (issue #79).
      }
      if (result.gameOver) {
        UI.showGameOver(result.gameOver.reason);
      } else if (result.victory) {
        UI.showVictory();
      } else if (result.leveledUp) {
        UI.showLevelUpStats();
      } else {
        // Plain continue, or phase complete: nextEvent() owns phase
        // advancement (bossCompleted → advancePhase → recurse)
        UI.nextEvent();
      }
    });
  },

  // Get next event
  nextEvent(): void {
    if (!Game.state) {
      console.error('[d20().devLife] Game.state is null');
      const container = document.getElementById('event-container');
      if (container) container.innerHTML = '<div class="event-card"><div class="event-body"><p style="color: var(--accent-red)">Error: Game state not initialized</p></div></div>';
      return;
    }

    // Event picking and phase advancement live in Game.nextEvent; the UI
    // only renders. If the pick advanced a phase, refresh the top bar and
    // career log so the promotion entry shows before the next event.
    const phaseBefore = Game.state.phase;
    const event = Game.nextEvent();
    if (Game.state!.phase !== phaseBefore) {
      UI.renderTopBar();
      UI.renderCareerLog();
    }
    UI.renderEvent(event);

    // Scroll the new card into view so the narrative is at the top.
    // On desktop (card fits viewport) this is a no-op; on mobile it
    // smoothly brings the card's top to the top of the screen.
    const card = document.getElementById('event-card');
    if (card) {
      card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  },
};

