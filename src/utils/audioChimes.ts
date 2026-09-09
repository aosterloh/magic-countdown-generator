// Web Audio API Procedural Sound Synthesizer (Zero External Dependencies)

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * 1. Prompts Ready Chime: Sparkling 2-note ascending major third shimmer (C5 -> E5)
 */
export function playPromptChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: now, duration: 0.4 },       // C5
    { freq: 659.25, time: now + 0.12, duration: 0.6 }, // E5
  ];

  notes.forEach(({ freq, time, duration }) => {
    // Primary Tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Harmonic Sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    // Exponential Decay Envelope
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    gain2.gain.setValueAtTime(0.001, time);
    gain2.gain.exponentialRampToValueAtTime(0.06, time + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.7);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration);
    osc2.stop(time + duration);
  });
}

/**
 * 2. Step Complete Chime: Subtle, pleasant harmonic glass/marimba tap for individual Image or Video
 */
export function playStepSuccessChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freq = 659.25; // E5

  const osc = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const gainHarmonic = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  oscHarmonic.type = 'sine';
  oscHarmonic.frequency.setValueAtTime(freq * 2.76, now); // Bell chime overtone

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  gainHarmonic.gain.setValueAtTime(0.001, now);
  gainHarmonic.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  osc.connect(gain);
  oscHarmonic.connect(gainHarmonic);
  gain.connect(ctx.destination);
  gainHarmonic.connect(ctx.destination);

  osc.start(now);
  oscHarmonic.start(now);
  osc.stop(now + 0.6);
  oscHarmonic.stop(now + 0.3);
}

/**
 * 3. Grand Finale Chime: Celebratory 4-note ascending chord arpeggio with rich 2.5s golden shimmer tail
 */
export function playGrandFinaleChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chordNotes = [
    { freq: 523.25, time: now, duration: 1.8 },        // C5
    { freq: 659.25, time: now + 0.15, duration: 2.0 }, // E5
    { freq: 783.99, time: now + 0.30, duration: 2.2 }, // G5
    { freq: 1046.50, time: now + 0.45, duration: 2.6 },// C6
  ];

  chordNotes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration);
    osc2.stop(time + duration);
  });
}
