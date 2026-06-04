/**
 * Generates Mentrixa brand UI sounds as MP4 (AAC) in public/images/.
 * Captivating game-UI music — Clash Royale warmth × Valorant polish.
 * Run: node scripts/generate-mentrixa-sounds.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "images");
const SAMPLE_RATE = 44100;
const DURATION_SEC = 5.0;

function clamp(x, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function sine(freq, t, phase = 0) {
  return Math.sin(2 * Math.PI * freq * t + phase);
}

function envADSR(t, attack, decay, sustain, release, total) {
  if (t < 0 || t > total) return 0;
  if (t < attack) return smoothstep(t / attack);
  if (t < attack + decay) {
    const d = (t - attack) / decay;
    return 1 - (1 - sustain) * d;
  }
  const relStart = total - release;
  if (t < relStart) return sustain;
  const r = (t - relStart) / Math.max(0.001, release);
  return sustain * (1 - smoothstep(r));
}

function envBell(t, peakAt, width) {
  const d = Math.abs(t - peakAt);
  return Math.exp(-(d * d) / (2 * width * width));
}

/** Gentle chime envelope — soft attack, long warm decay. */
function envChime(t, start, duration, attack = 0.08) {
  const local = t - start;
  if (local < 0 || local > duration) return 0;
  const a = smoothstep(local / attack);
  const decay = Math.exp(-local * (2.8 / duration));
  return a * decay;
}

function softClip(x, drive = 1.08) {
  return Math.tanh(x * drive) / Math.tanh(drive);
}

/** Warm one-pole low-pass — keeps highs soft and non-fatiguing. */
function warmLowPass(samples, coef = 0.14) {
  const out = new Float32Array(samples.length);
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += coef * (samples[i] - y);
    out[i] = y;
  }
  return out;
}

function applyReverb(samples, preDelayMs = 24, mix = 0.22) {
  const taps = [
    { ms: preDelayMs, gain: 0.32 },
    { ms: preDelayMs * 2.1, gain: 0.2 },
    { ms: preDelayMs * 3.6, gain: 0.12 },
    { ms: preDelayMs * 5.4, gain: 0.07 },
  ];
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let wet = 0;
    for (const tap of taps) {
      const d = Math.floor((SAMPLE_RATE * tap.ms) / 1000);
      if (i >= d) wet += samples[i - d] * tap.gain;
    }
    out[i] = clamp(samples[i] + wet * mix);
  }
  return out;
}

function masterFade(samples, fadeInSec = 0.04, fadeOutSec = 0.55) {
  const n = samples.length;
  const fadeIn = Math.floor(SAMPLE_RATE * fadeInSec);
  const fadeOut = Math.floor(SAMPLE_RATE * fadeOutSec);
  for (let i = 0; i < n; i++) {
    let g = 1;
    if (i < fadeIn) g *= smoothstep(i / fadeIn);
    if (i > n - fadeOut) g *= smoothstep((n - i) / fadeOut);
    samples[i] *= g;
  }
  return samples;
}

function normalize(samples, targetPeak = 0.72) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak < 1e-6) return samples;
  const g = targetPeak / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

/** Clash-style crystal pluck — bright, bouncy, musical. */
function pluck(freq, t, start, decay = 0.38, gain = 1) {
  const local = t - start;
  if (local < 0 || local > decay * 1.8) return 0;
  const atk = smoothstep(Math.min(1, local / 0.004));
  const env = atk * Math.exp(-local * (5.5 / decay));
  let s = sine(freq, t) * 0.72;
  s += sine(freq * 2.01, t) * 0.22;
  s += sine(freq * 3.98, t) * 0.06;
  return s * env * gain;
}

/** Valorant-style clean ping bell. */
function ping(freq, t, start, decay = 0.55, gain = 1) {
  const local = t - start;
  if (local < 0 || local > decay * 1.5) return 0;
  const env = Math.exp(-local * 3.8) * smoothstep(Math.min(1, local / 0.003));
  return (sine(freq, t) * 0.65 + sine(freq * 2.756, t) * 0.35) * env * gain;
}

/** Warm cinematic pad — detuned stack. */
function pad(freqs, t, env, gain = 1) {
  let s = 0;
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    const w = i === 0 ? 1 : 0.55;
    s += sine(f, t, i * 0.7) * w;
    s += sine(f * 1.004, t, i) * w * 0.35;
    s += sine(f * 0.996, t, i * 1.3) * w * 0.35;
  }
  return (s / freqs.length) * env * gain;
}

function sidechainPump(t, bpm, depth = 0.32) {
  const beat = (t * bpm) / 60;
  const frac = beat - Math.floor(beat);
  const duck = frac < 0.14 ? smoothstep(frac / 0.14) : 1 - smoothstep((frac - 0.14) / 0.35) * depth;
  return 1 - depth + duck * depth;
}

/** Valorant glass tone — sleek, long tail, minimal harmonics. */
function glass(freq, t, start, decay = 0.85, gain = 1) {
  const local = t - start;
  if (local < 0 || local > decay * 1.4) return 0;
  const env = Math.exp(-local * 2.4) * smoothstep(Math.min(1, local / 0.006));
  return (sine(freq, t) * 0.82 + sine(freq * 2, t) * 0.12) * env * gain;
}

/** Clash marimba — punchy, bouncy, gold chest energy. */
function marimba(freq, t, start, decay = 0.28, gain = 1) {
  const local = t - start;
  if (local < 0 || local > decay * 2) return 0;
  const env = Math.exp(-local * 11) * smoothstep(Math.min(1, local / 0.002));
  let s = sine(freq, t) * 0.6;
  s += sine(freq * 2.76, t) * 0.28;
  s += sine(freq * 5.4, t) * 0.08;
  return s * env * gain;
}

/** Clash brass fanfare stab — FM trumpet burst. */
function brass(freqs, t, start, dur = 0.35, gain = 1) {
  const local = t - start;
  if (local < 0 || local > dur) return 0;
  const env = Math.exp(-local * 5.5) * smoothstep(Math.min(1, local / 0.008));
  let s = 0;
  for (const f of freqs) {
    const mod = sine(f * 0.5, t) * 1.8;
    s += sine(f, t + mod * 0.012) * 0.5;
    s += sine(f * 0.5, t) * 0.2;
  }
  return (s / freqs.length) * env * gain;
}

function finalizeValorant(samples) {
  return masterFade(
    normalize(warmLowPass(applyReverb(samples, 44, 0.38), 0.11), 0.74),
    0.08,
    0.38,
  );
}

function finalizeClash(samples) {
  return masterFade(
    normalize(warmLowPass(applyReverb(samples, 20, 0.16), 0.21), 0.82),
    0.015,
    0.45,
  );
}

/**
 * LOADING — "Protocol" (Valorant)
 * Sleek queue atmosphere: cool Am, glass melody, pulsing synth — NOT celebratory.
 * 96 BPM × 8 beats = 5.0s seamless loop. Completely separate identity from rank-up.
 */
function synthesizeLoading(durationSec) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  const BPM = 96;
  const beat = 60 / BPM;

  // Valorant glass hook — sparse, ascending, hypnotic (Am pentatonic)
  const glassHook = [
    { at: 0, m: 69, d: 0.9 },
    { at: 1, m: 72, d: 0.85 },
    { at: 2, m: 74, d: 0.8 },
    { at: 3, m: 76, d: 0.85 },
    { at: 4, m: 79, d: 0.95 },
    { at: 5, m: 81, d: 1.0 },
    { at: 6, m: 77, d: 0.75 },
    { at: 7, m: 72, d: 0.7 },
  ];

  const ghostPings = [
    { at: 0.5, m: 84 },
    { at: 1.5, m: 86 },
    { at: 2.5, m: 88 },
    { at: 3.5, m: 86 },
    { at: 4.5, m: 84 },
    { at: 5.5, m: 83 },
    { at: 6.5, m: 81 },
  ];

  // Cool progression: Am → F → C → G (cinematic, not happy-clash)
  const chords = [
    { start: 0, f: [midi(45), midi(52), midi(57), midi(60)] },
    { start: 2, f: [midi(41), midi(48), midi(53), midi(57)] },
    { start: 4, f: [midi(48), midi(55), midi(60), midi(64)] },
    { start: 6, f: [midi(43), midi(50), midi(55), midi(59)] },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    const loopT = t / durationSec;
    const pulse = 0.55 + 0.45 * Math.sin(2 * Math.PI * loopT * 2);
    const master = envADSR(t, 0.4, 0.5, 0.72, 0.45, durationSec);

    // Deep Valorant pulse — four-on-the-floor sub (minimal groove)
    const beatIdx = (t / beat) % 1;
    const kick = beatIdx < 0.08 ? smoothstep(1 - beatIdx / 0.08) : 0;
    s += sine(midi(33), t) * kick * 0.07 * master;
    s += sine(midi(40), t) * kick * 0.035 * master;

    // Evolving synth bed
    for (const ch of chords) {
      const start = ch.start * beat;
      const end = (ch.start + 2) * beat;
      if (t >= start && t < end) {
        const local = (t - start) / (2 * beat);
        const swell = smoothstep(local) * (1 - smoothstep((local - 0.75) / 0.25));
        const bed = ch.f.map((f) => f * 0.5);
        s += pad(bed, t, swell * master * pulse, 0.032);
      }
    }

    // Glass lead — the Valorant melody people remember
    for (const note of glassHook) {
      s += glass(midi(note.m), t, note.at * beat, note.d, 0.095);
    }

    for (const g of ghostPings) {
      s += glass(midi(g.m), t, g.at * beat, 0.35, 0.028);
    }

    // Digital riser within loop — "systems online"
    const scan = Math.sin(2 * Math.PI * (midi(60) + 80 * loopT) * t) * 0.012 * master * loopT;

    s += scan;

    // Air — filtered high shimmer bed
    s += sine(midi(88) + 6 * Math.sin(2 * Math.PI * 0.15 * t), t) * 0.008 * master * pulse;

    out[i] = softClip(s * 0.9, 1.06);
  }

  return finalizeValorant(out);
}

/**
 * RANK UP — "Legendary!" (Clash Royale)
 * Gold chest explosion: brass hit, bouncy marimba fanfare, victory bounce — zero Valorant glass.
 * One-shot celebration; bright C major; completely different melody & timbre from loading.
 */
function synthesizeRankUp(durationSec) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  const BPM = 128;
  const beat = 60 / BPM;

  // Clash fanfare — bouncy, hummable, educational-game victory (C major)
  const fanfare = [
    { at: 0.12, m: 67, d: 0.18 },
    { at: 0.28, m: 67, d: 0.16 },
    { at: 0.44, m: 72, d: 0.18 },
    { at: 0.6, m: 76, d: 0.2 },
    { at: 0.78, m: 79, d: 0.22 },
    { at: 0.98, m: 84, d: 0.28 },
    { at: 1.22, m: 79, d: 0.18 },
    { at: 1.4, m: 76, d: 0.18 },
    { at: 1.58, m: 72, d: 0.2 },
    { at: 1.78, m: 76, d: 0.22 },
    { at: 2.0, m: 79, d: 0.24 },
    { at: 2.24, m: 84, d: 0.3 },
    { at: 2.52, m: 88, d: 0.35 },
    { at: 2.85, m: 91, d: 0.45 },
    { at: 3.25, m: 88, d: 0.5 },
  ];

  const brassHits = [
    { at: 0.1, f: [midi(48), midi(55), midi(60), midi(64), midi(67)] },
    { at: 1.75, f: [midi(50), midi(57), midi(62), midi(66), midi(69)] },
    { at: 3.5, f: [midi(48), midi(55), midi(60), midi(64), midi(67), midi(72)] },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;

    // Sub thump open
    if (t < 0.15) {
      const hit = Math.exp(-t * 28);
      s += sine(midi(36), t) * hit * 0.12;
    }

    // Brass legendary stabs
    for (const b of brassHits) {
      s += brass(b.f, t, b.at, 0.42, 0.14);
    }

    // Bouncy marimba melody — Clash DNA
    for (const note of fanfare) {
      s += marimba(midi(note.m), t, note.at, note.d, 0.14);
    }

    // Groove bass — walks with fanfare (C major roots)
    const bassLine = [
      { at: 0, m: 48, d: 0.45 },
      { at: 0.5, m: 48, d: 0.4 },
      { at: 1.0, m: 43, d: 0.45 },
      { at: 1.5, m: 45, d: 0.4 },
      { at: 2.0, m: 50, d: 0.5 },
      { at: 2.5, m: 48, d: 0.45 },
      { at: 3.0, m: 52, d: 0.55 },
      { at: 3.6, m: 48, d: 0.7 },
    ];
    for (const b of bassLine) {
      const local = t - b.at;
      if (local >= 0 && local < b.d) {
        const env = Math.exp(-local * 4) * smoothstep(Math.min(1, local / 0.004));
        s += sine(midi(b.m), t) * env * 0.065;
      }
    }

    // Cheer pads on bar peaks
    if (t >= 0.5 && t < 2.2) {
      s += pad([midi(48), midi(55), midi(60), midi(64)], t, 0.35, 0.028);
    }
    if (t >= 2.8) {
      const hold = envADSR(t - 2.8, 0.2, 0.25, 0.5, 1.5, durationSec - 2.8);
      s += pad([midi(48), midi(55), midi(60), midi(67), midi(72)], t, hold, 0.04);
    }

    // Victory sparkle run (3.8–4.8s) — gold coins shower
    if (t >= 3.75 && t < 4.85) {
      const idx = Math.floor((t - 3.75) * 14);
      const notes = [84, 86, 88, 91, 93, 91, 88, 86, 84, 88, 91, 93, 96, 93];
      s += marimba(midi(notes[idx % notes.length]), t, 3.75 + idx / 14, 0.12, 0.09);
    }

    out[i] = softClip(s * 0.88, 1.18);
  }

  return finalizeClash(out);
}

function writeWav(filePath, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const v = Math.round(clamp(samples[i]) * 32767);
    buffer.writeInt16LE(v, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function wavToMp4(wavPath, mp4Path, ffmpegPath) {
  execFileSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      wavPath,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-vn",
      mp4Path,
    ],
    { stdio: "inherit" },
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ffmpegPath;
  try {
    const mod = await import("ffmpeg-static");
    ffmpegPath = mod.default;
  } catch {
    console.error("Install ffmpeg-static: npm install --save-dev ffmpeg-static");
    process.exit(1);
  }

  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    console.error("ffmpeg-static binary not found.");
    process.exit(1);
  }

  const tracks = [
    { name: "mentrixa-loading", duration: DURATION_SEC, synth: synthesizeLoading },
    { name: "mentrixa-rank-up", duration: DURATION_SEC, synth: synthesizeRankUp },
  ];

  for (const track of tracks) {
    const wavPath = path.join(OUT_DIR, `${track.name}.wav`);
    const mp4Path = path.join(OUT_DIR, `${track.name}.mp4`);
    const samples = track.synth(track.duration);
    writeWav(wavPath, samples);
    wavToMp4(wavPath, mp4Path, ffmpegPath);
    fs.unlinkSync(wavPath);
    console.log(`✓ ${path.relative(process.cwd(), mp4Path)} (${track.duration}s)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
