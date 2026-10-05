// UI — BGM engine: looping "Corporate Elevator Music" + one-shot jingles.
// Themed for d20().devLife: a mellow, slightly soul-crushing loop that
// sounds like the music playing in your open-plan office. Never resolves —
// you're still in the office.
//
// Uses the shared AudioContext (UI.audioCtx) and respects UI.audioOn +
// UI.volume. BGM toggle is persisted in settings (ui-settings.ts).
// Lazy-initialised on first user interaction (browser autoplay policy).

import { UI } from './ui.js';

interface BgmNote {
  freq: number;
  time: number;     // offset in seconds from loop start
  duration: number;
  gain: number;
  oscType: OscillatorType;
}

const BPM = 110;
const BEAT = 60 / BPM; // ~0.545s per beat

// "Standup Meeting" — A minor, staccato, straight rhythm.
// Tense, mechanical, slightly annoying. Like someone talking over you
// in a meeting you didn't sign up for. Never resolves — the meeting
// continues.
//
// Deliberately different from pc3-PTSD's "Tech Support On Hold":
//   - A minor (not C major) — tense, not corporate-happy
//   - Staccato 8th notes (not sustained syncopation) — mechanical, not mellow
//   - Root-fifth bass (not walking) — driving, not meandering
//   - Low "thud" accents (not high dings) — like a gavel, not a notification
//   - Hangs on E (V chord, not unresolved 4th) — tension, not limbo

const MELODY: BgmNote[] = [
  // Bar 1: A minor arpeggio — staccato, driving. "Good morning, team."
  { freq: 440, time: 0,                duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 523, time: BEAT * 0.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 659, time: BEAT * 1,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // E5
  { freq: 523, time: BEAT * 1.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 440, time: BEAT * 2,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 523, time: BEAT * 2.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 659, time: BEAT * 3,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // E5
  { freq: 523, time: BEAT * 3.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5

  // Bar 2: descending — "Let's go around the room."
  { freq: 587, time: BEAT * 4,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // D5
  { freq: 523, time: BEAT * 4.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 494, time: BEAT * 5,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // B4
  { freq: 440, time: BEAT * 5.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 494, time: BEAT * 6,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // B4
  { freq: 523, time: BEAT * 6.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 587, time: BEAT * 7,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // D5
  { freq: 523, time: BEAT * 7.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5

  // Bar 3: iv chord (F) — tension. "Any blockers?"
  { freq: 349, time: BEAT * 8,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // F4
  { freq: 440, time: BEAT * 8.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 523, time: BEAT * 9,         duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 440, time: BEAT * 9.5,       duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 349, time: BEAT * 10,        duration: 0.15, gain: 0.03, oscType: 'sine' },   // F4
  { freq: 440, time: BEAT * 10.5,      duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 523, time: BEAT * 11,        duration: 0.15, gain: 0.03, oscType: 'sine' },   // C5
  { freq: 440, time: BEAT * 11.5,      duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4

  // Bar 4: V chord (E) — unresolved. "Great, let's get back to it." (hangs on E)
  { freq: 330, time: BEAT * 12,        duration: 0.15, gain: 0.03, oscType: 'sine' },   // E4
  { freq: 440, time: BEAT * 12.5,      duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 587, time: BEAT * 13,        duration: 0.15, gain: 0.03, oscType: 'sine' },   // D5
  { freq: 440, time: BEAT * 13.5,      duration: 0.15, gain: 0.03, oscType: 'sine' },   // A4
  { freq: 330, time: BEAT * 14,        duration: 0.3,  gain: 0.03, oscType: 'sine' },   // E4 (holds)
  { freq: 440, time: BEAT * 14,        duration: 0.3,  gain: 0.025,oscType: 'sine' },   // A4 (holds)
  { freq: 587, time: BEAT * 14,        duration: 0.3,  gain: 0.025,oscType: 'sine' },   // D5 (holds)
  { freq: 659, time: BEAT * 15,        duration: 0.5,  gain: 0.03, oscType: 'sine' },   // E5 (hangs, unresolved)
];

// "Thud" accents — like a gavel hitting the table. Low, short, percussive.
const THUDS: BgmNote[] = [
  { freq: 220, time: BEAT * 3.8,       duration: 0.08, gain: 0.02, oscType: 'square' }, // A3 (end of bar 1)
  { freq: 220, time: BEAT * 7.8,       duration: 0.08, gain: 0.02, oscType: 'square' }, // A3 (end of bar 2)
  { freq: 175, time: BEAT * 11.8,      duration: 0.08, gain: 0.02, oscType: 'square' }, // F3 (end of bar 3, different pitch)
  { freq: 165, time: BEAT * 15.8,      duration: 0.08, gain: 0.02, oscType: 'square' }, // E3 (end of bar 4, unresolved)
];

// Root-fifth bass — driving, mechanical. Not walking.
const BASS: BgmNote[] = [
  // Bar 1: A2 + E3 (i)
  { freq: 110, time: 0,                duration: 1.0,  gain: 0.02, oscType: 'triangle' }, // A2
  { freq: 165, time: BEAT * 2,         duration: 1.0,  gain: 0.018,oscType: 'triangle' }, // E3
  // Bar 2: A2 + E3 (i)
  { freq: 110, time: BEAT * 4,         duration: 1.0,  gain: 0.02, oscType: 'triangle' }, // A2
  { freq: 165, time: BEAT * 6,         duration: 1.0,  gain: 0.018,oscType: 'triangle' }, // E3
  // Bar 3: F2 + C3 (iv) — tension
  { freq: 87,  time: BEAT * 8,         duration: 1.0,  gain: 0.02, oscType: 'triangle' }, // F2
  { freq: 131, time: BEAT * 10,        duration: 1.0,  gain: 0.018,oscType: 'triangle' }, // C3
  // Bar 4: E2 + B2 (V) — unresolved
  { freq: 82,  time: BEAT * 12,        duration: 1.0,  gain: 0.02, oscType: 'triangle' }, // E2
  { freq: 123, time: BEAT * 14,        duration: 1.0,  gain: 0.018,oscType: 'triangle' }, // B2 (unresolved)
];

const LOOP_DURATION = BEAT * 16; // 9.6 seconds

let intervalId: ReturnType<typeof setInterval> | null = null;
let nextLoopTime = 0;
let activeOscillators: OscillatorNode[] = [];

function ensureContext(): AudioContext | null {
  if (!UI.audioCtx) UI.initAudio();
  if (UI.audioCtx && UI.audioCtx.state === 'suspended') UI.audioCtx.resume();
  return UI.audioCtx;
}

function killOscillators(): void {
  for (const osc of activeOscillators) {
    try { osc.stop(); } catch { /* already stopped */ }
  }
  activeOscillators = [];
}

function scheduleLoop(ctx: AudioContext, startTime: number): void {
  const notes = [...MELODY, ...THUDS, ...BASS];
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.oscType;
    osc.frequency.setValueAtTime(note.freq, startTime + note.time);
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = startTime + note.time;
    const attack = 0.015;
    const release = Math.min(0.08, note.duration * 0.3);
    const vol = note.gain * UI.volume;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.setValueAtTime(vol, t + note.duration - release);
    gain.gain.linearRampToValueAtTime(0, t + note.duration);

    osc.start(t);
    osc.stop(t + note.duration + 0.01);
    activeOscillators.push(osc);
  }
}

function startBgm(): void {
  if (!UI.bgmOn || intervalId !== null) return;
  if (!UI.audioOn) return;
  const ctx = ensureContext();
  if (!ctx) return;

  killOscillators();
  nextLoopTime = ctx.currentTime + 0.1;
  scheduleLoop(ctx, nextLoopTime);

  intervalId = setInterval(() => {
    if (!ctx) return;
    if (nextLoopTime - ctx.currentTime < LOOP_DURATION * 0.6) {
      nextLoopTime += LOOP_DURATION;
      scheduleLoop(ctx, nextLoopTime);
    }
  }, 200);
}

function stopBgm(): void {
  killOscillators();
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Call on first user interaction to start the BGM (browser autoplay policy). */
function initBgm(): void {
  if (UI.bgmOn && UI.audioOn && intervalId === null) {
    startBgm();
  }
}

// --- One-shot jingles (victory / defeat) ---

interface JingleNote {
  freq: number;
  time: number;
  duration: number;
  gain: number;
  oscType: OscillatorType;
}

// Victory: "Natural 20" — a fast ascending chromatic run (like a die
// tumbling up the table), then a sustained C major chord "release" with
// a bright sparkle. You rolled the 20. You're free. The office is behind you.
const VICTORY_NOTES: JingleNote[] = [
  // Phase 1: die roll — 8-note chromatic ascending run, fast and tight.
  { freq: 523,  time: 0.00, duration: 0.07, gain: 0.035, oscType: 'sine' },   // C5
  { freq: 587,  time: 0.07, duration: 0.07, gain: 0.035, oscType: 'sine' },   // D5
  { freq: 659,  time: 0.14, duration: 0.07, gain: 0.035, oscType: 'sine' },   // E5
  { freq: 698,  time: 0.21, duration: 0.07, gain: 0.035, oscType: 'sine' },   // F5
  { freq: 784,  time: 0.28, duration: 0.07, gain: 0.035, oscType: 'sine' },   // G5
  { freq: 880,  time: 0.35, duration: 0.07, gain: 0.035, oscType: 'sine' },   // A5
  { freq: 988,  time: 0.42, duration: 0.07, gain: 0.035, oscType: 'sine' },   // B5
  { freq: 1047, time: 0.49, duration: 0.12, gain: 0.04,  oscType: 'sine' },   // C6 (lands)

  // Phase 2: release — sustained C major chord (the freedom).
  { freq: 523,  time: 0.62, duration: 0.60, gain: 0.035, oscType: 'sine' },   // C5
  { freq: 659,  time: 0.62, duration: 0.60, gain: 0.035, oscType: 'sine' },   // E5
  { freq: 784,  time: 0.62, duration: 0.60, gain: 0.035, oscType: 'sine' },   // G5

  // Phase 3: sparkle — Jira ticket closing ding.
  { freq: 1047, time: 0.62, duration: 0.30, gain: 0.02,  oscType: 'sine' },   // C6
  { freq: 1319, time: 0.66, duration: 0.20, gain: 0.015, oscType: 'sine' },   // E6
];

// Defeat: "System Shutdown" — an error blip, then a descending power-down
// sequence that slows down, ending in a low thud (the power button clicking
// off). Your career has been terminated. No appeal.
const DEFEAT_NOTES: JingleNote[] = [
  // Phase 1: error blip — two quick square-wave beeps (system error).
  { freq: 440, time: 0.00, duration: 0.08, gain: 0.03, oscType: 'square' },   // A4
  { freq: 440, time: 0.12, duration: 0.08, gain: 0.03, oscType: 'square' },   // A4

  // Phase 2: power down — descending, each note slower and lower.
  { freq: 392, time: 0.32, duration: 0.14, gain: 0.04, oscType: 'triangle' }, // G4
  { freq: 330, time: 0.52, duration: 0.18, gain: 0.04, oscType: 'triangle' }, // E4
  { freq: 262, time: 0.76, duration: 0.28, gain: 0.04, oscType: 'triangle' }, // C4

  // Phase 3: final thud — the power button clicking off.
  { freq: 131, time: 1.10, duration: 0.50, gain: 0.05, oscType: 'sine' },     // C3
  { freq: 98,  time: 1.10, duration: 0.40, gain: 0.03, oscType: 'sine' },     // G2
];

function playJingle(notes: JingleNote[]): void {
  if (!UI.audioOn) return;
  const ctx = ensureContext();
  if (!ctx) return;

  const startTime = ctx.currentTime + 0.05;
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.oscType;
    osc.frequency.setValueAtTime(note.freq, startTime + note.time);
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = startTime + note.time;
    const attack = 0.01;
    const release = Math.min(0.1, note.duration * 0.4);
    const vol = note.gain * UI.volume;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.setValueAtTime(vol, t + note.duration - release);
    gain.gain.linearRampToValueAtTime(0, t + note.duration);

    osc.start(t);
    osc.stop(t + note.duration + 0.01);
  }
}

function playVictoryJingle(): void { playJingle(VICTORY_NOTES); }
function playDefeatJingle(): void  { playJingle(DEFEAT_NOTES); }

// Toggle BGM on/off. Persists via settings (ui-settings.ts calls this).
function toggleBgm(): boolean {
  UI.bgmOn = !UI.bgmOn;
  if (UI.bgmOn) startBgm();
  else stopBgm();
  return UI.bgmOn;
}

export const UIBgm = {
  initBgm,
  startBgm,
  stopBgm,
  toggleBgm,
  playVictoryJingle,
  playDefeatJingle,
};
