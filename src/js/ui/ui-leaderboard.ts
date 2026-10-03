// UI — leaderboard screen: top 10 runs per difficulty.
// Presentation tier: owns the screen rendering and show/hide handlers.
// Data lives in meta.ts; this file depends on that tier, never the reverse.
// Loaded before ui.js; its methods are composed into UI there.

// Truncate a seed to 6 characters for display.
import { CONFIG } from '../core/config.js';
import { dayToCareerYear } from '../core/utils.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { MetaStore } from '../engine/meta.js';
import { difficultyIconId } from './ui-core.js';
import { UI } from './ui.js';
import type {Difficulty, RunRecord} from '../core/types.js';


function shortSeed(seed: string): string {
  return seed.length > 6 ? seed.slice(0, 6) : seed;
}

// Render a single leaderboard row.
function renderLeaderboardRow(run: RunRecord, rank: number): string {
  const result = run.won ? '✓' : '✗';
  const careerYear = dayToCareerYear(run.day);
  return `
    <div class="leaderboard-row">
      <span class="lb-rank">${rank}</span>
      <span class="lb-result">${result}</span>
      <span class="lb-archetype">${ARCHETYPES[run.archetype]?.name ?? run.archetype}</span>
      <span class="lb-year">${careerYear}</span>
      <span class="lb-seed">${shortSeed(run.seed)}</span>
    </div>`;
}

// Render a single difficulty section.
function renderDifficultySection(difficulty: Difficulty): string {
  const iconId = difficultyIconId(difficulty);
  const label = CONFIG.game.difficulty[difficulty].label;
  const topRuns = MetaStore.getTopRuns(difficulty, 10);
  let html = `<h3 class="leaderboard-diff-title"><svg class="difficulty-icon leaderboard-diff-icon"><use href="#${iconId}"/></svg> ${label}</h3>`;

  if (topRuns.length === 0) {
    html += '<div class="leaderboard-empty">No runs yet</div>';
  } else {
    html += '<div class="leaderboard-header">';
    html += '<span class="lb-rank">#</span>';
    html += '<span class="lb-result">W/L</span>';
    html += '<span class="lb-archetype">Archetype</span>';
    html += '<span class="lb-year">Year</span>';
    html += '<span class="lb-seed">Seed</span>';
    html += '</div>';
    topRuns.forEach((run, i) => {
      html += renderLeaderboardRow(run, i + 1);
    });
  }
  return html;
}

export const UILeaderboard = {
  // Show the leaderboard screen.
  showLeaderboard(): void {
    UI.renderLeaderboard();
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeLeaderboard(): void {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'none';
  },

  // Render the leaderboard list.
  renderLeaderboard(): void {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    let html = '';
    for (const diff of ['hard', 'normal', 'easy'] as Difficulty[]) {
      html += renderDifficultySection(diff);
    }
    container.innerHTML = html;
  },
};
