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

const BPM = 100;
const BEAT = 60 / BPM; // 0.6s per beat

// Melody: 4 bars, C major. Mellow, repetitive, slightly off.
// Feels like the music playing in a corporate lobby.
const MELODY: BgmNote[] = [
  // Bar 1: "You've reached DevLife Inc..."
  { freq: 523, time: 0,                duration: 0.4,  gain: 0.03, oscType: 'sine' },   // C4
  { freq: 659, time: BEAT * 0.75,      duration: 0.35, gain: 0.03, oscType: 'sine' },   // E4 (syncopated)
  { freq: 784, time: BEAT * 1.5,       duration: 0.4,  gain: 0.03, oscType: 'sine' },   // G4
  { freq: 659, time: BEAT * 2.5,       duration: 0.35, gain: 0.025,oscType: 'sine' },   // E4

  // Bar 2: "...your career is important to us."
  { freq: 698, time: BEAT * 4,         duration: 0.4,  gain: 0.03, oscType: 'sine' },   // F4
  { freq: 880, time: BEAT * 4.75,      duration: 0.35, gain: 0.03, oscType: 'sine' },   // A4 (syncopated)
  { freq: 1047,time: BEAT * 5.5,       duration: 0.4,  gain: 0.03, oscType: 'sine' },   // C5
  { freq: 880, time: BEAT * 6.5,       duration: 0.35, gain: 0.025,oscType: 'sine' },   // A4

  // Bar 3: "Please hold while we assign your ticket."
  { freq: 784, time: BEAT * 8,         duration: 0.4,  gain: 0.03, oscType: 'sine' },   // G4
  { freq: 659, time: BEAT * 8.75,      duration: 0.35, gain: 0.03, oscType: 'sine' },   // E4 (syncopated)
  { freq: 587, time: BEAT * 9.5,       duration: 0.4,  gain: 0.03, oscType: 'sine' },   // D4
  { freq: 523, time: BEAT * 10.5,      duration: 0.35, gain: 0.025,oscType: 'sine' },   // C4

  // Bar 4: "Estimated wait time: forever." (hangs on F — unresolved)
  { freq: 587, time: BEAT * 12,        duration: 0.4,  gain: 0.03, oscType: 'sine' },   // D4
  { freq: 659, time: BEAT * 12.75,     duration: 0.35, gain: 0.03, oscType: 'sine' },   // E4 (syncopated)
  { freq: 698, time: BEAT * 13.5,      duration: 0.8,  gain: 0.03, oscType: 'sine' },   // F4 (hangs, unresolved)
];

// "Ding" accents — like a Jira notification. Short, bright, high.
const DINGS: BgmNote[] = [
  { freq: 1568, time: BEAT * 3.5,      duration: 0.12, gain: 0.015,oscType: 'sine' },   // G5 ding
  { freq: 1568, time: BEAT * 7.5,      duration: 0.12, gain: 0.015,oscType: 'sine' },   // G5 ding
  { freq: 1319, time: BEAT * 11.5,     duration: 0.12, gain: 0.015,oscType: 'sine' },   // E5 ding
];

// Walking bass — gives it a "corporate elevator" feel.
const BASS: BgmNote[] = [
  { freq: 131, time: 0,                duration: 2.0,  gain: 0.02, oscType: 'triangle' }, // C3
  { freq: 175, time: BEAT * 2,         duration: 2.0,  gain: 0.018,oscType: 'triangle' }, // F2
  { freq: 131, time: BEAT * 4,         duration: 2.0,  gain: 0.02, oscType: 'triangle' }, // C3
  { freq: 196, time: BEAT * 6,         duration: 2.0,  gain: 0.018,oscType: 'triangle' }, // G2
  { freq: 131, time: BEAT * 8,         duration: 2.0,  gain: 0.02, oscType: 'triangle' }, // C3
  { freq: 175, time: BEAT * 10,        duration: 2.0,  gain: 0.018,oscType: 'triangle' }, // F2
  { freq: 131, time: BEAT * 12,        duration: 2.0,  gain: 0.02, oscType: 'triangle' }, // C3
  { freq: 175, time: BEAT * 14,        duration: 2.0,  gain: 0.018,oscType: 'triangle' }, // F2 (unresolved)
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
  const notes = [...MELODY, ...DINGS, ...BASS];
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

// Victory: ascending C major arpeggio + bright "ta-da" hold.
// Feels like a slightly over-the-top "career complete" fanfare.
const VICTORY_NOTES: JingleNote[] = [
  { freq: 523,  time: 0,    duration: 0.15, gain: 0.05,  oscType: 'sine' },     // C5
  { freq: 659,  time: 0.12, duration: 0.15, gain: 0.05,  oscType: 'sine' },     // E5
  { freq: 784,  time: 0.24, duration: 0.15, gain: 0.05,  oscType: 'sine' },     // G5
  { freq: 1047, time: 0.36, duration: 0.5,  gain: 0.06,  oscType: 'sine' },     // C6 (hold)
  { freq: 1319, time: 0.36, duration: 0.4,  gain: 0.02,  oscType: 'sine' },     // E6 (sparkle)
  { freq: 1568, time: 0.36, duration: 0.3,  gain: 0.015, oscType: 'sine' },     // G6 (sparkle)
];

// Defeat: slow descending "womp womp". Minor key, sad trombone energy.
const DEFEAT_NOTES: JingleNote[] = [
  { freq: 330, time: 0,   duration: 0.3, gain: 0.05, oscType: 'triangle' },   // E4
  { freq: 294, time: 0.3, duration: 0.3, gain: 0.05, oscType: 'triangle' },   // D4
  { freq: 262, time: 0.6, duration: 0.3, gain: 0.05, oscType: 'triangle' },   // C4
  { freq: 233, time: 0.9, duration: 0.6, gain: 0.06, oscType: 'triangle' },   // Bb3 (sad hold)
  { freq: 117, time: 0.9, duration: 0.5, gain: 0.03, oscType: 'sine' },       // Bb2 (bass womp)
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
