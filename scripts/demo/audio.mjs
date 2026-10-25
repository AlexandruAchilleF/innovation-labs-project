/**
 * Soundtrack: Voxscape (Eugenio Mininni, Mixkit free licence) cut to the film, plus synthesized effects on the
 * director's cues (keys, clicks, whooshes, the ticket "pop"). Master -14 LUFS, true peak -1 dBTP.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SR = 48_000;
const MUSIC_URL = "https://assets.mixkit.co/music/571/571.mp3"; // "Voxscape"
const MUSIC_START = 37.6; // first bass step lands ~1.2 s into the film

function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

/** Mono effect generators: each returns a Float32Array. */
const fx = {
  key(r) {
    const n = Math.round(SR * 0.035), out = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += 0.55 * (r() - lp);
      const env = Math.exp(-i / (SR * 0.006));
      out[i] = (r() - lp) * env * 0.5 + Math.sin((2 * Math.PI * 2100 * i) / SR) * env * 0.12;
    }
    return out;
  },
  click(r) {
    const n = Math.round(SR * 0.09), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * (1400 - 900 * Math.min(1, t / 0.02)) * t) * Math.exp(-t / 0.012) * 0.7 + r() * Math.exp(-t / 0.003) * 0.3;
    }
    return out;
  },
  whoosh(r, len = 0.45) {
    const n = Math.round(SR * len), out = new Float32Array(n);
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, env = Math.sin(Math.PI * k) ** 2;
      const cut = 0.02 + 0.25 * Math.sin(Math.PI * k);
      a += cut * (r() - a);
      b += cut * (a - b);
      out[i] = b * env * 1.6;
    }
    return out;
  },
  swish(r) {
    return fx.whoosh(r, 0.28).map((v) => v * 0.6);
  },
  pop() {
    const n = Math.round(SR * 0.25), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = 520 + 380 * Math.exp(-t / 0.03);
      out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.07) * 0.6 + Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t / 0.03) * 0.15;
    }
    return out;
  },
  boom() {
    const n = Math.round(SR * 0.9), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * (48 + 40 * Math.exp(-t / 0.08)) * t) * Math.exp(-t / 0.35) * 0.9;
    }
    return out;
  },
};

function wav(path, left, right) {
  const n = left.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

export async function music(cacheDir) {
  const path = join(cacheDir, "voxscape.mp3");
  if (existsSync(path)) return path;
  mkdirSync(cacheDir, { recursive: true });
  const res = await fetch(MUSIC_URL);
  if (!res.ok) return null;
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

/** Writes the effects track for `cues` and muxes music + effects + video into `out`. */
export async function soundtrack({ ffmpeg, cues, seconds, video, out, workDir, cacheDir }) {
  const n = Math.round(seconds * SR), L = new Float32Array(n), R = new Float32Array(n);
  const r = rng(99);
  for (const c of cues) {
    const s = fx[c.type]?.(r);
    if (!s) continue;
    const at = Math.round(c.t * SR), pan = c.type === "key" ? 0.15 * r() : 0;
    for (let i = 0; i < s.length && at + i < n; i++) {
      L[at + i] += s[i] * c.gain * (1 - pan);
      R[at + i] += s[i] * c.gain * (1 + pan);
    }
  }
  const sfx = join(workDir, "sfx.wav");
  wav(sfx, L, R);
  const track = await music(cacheDir).catch(() => null);
  const fade = (seconds - 3).toFixed(2);
  const inputs = ["-i", video, "-i", sfx];
  let graph = "[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.9[fx];";
  if (track) {
    inputs.push("-ss", String(MUSIC_START), "-t", String(seconds), "-i", track);
    graph += `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.4,afade=t=out:st=${fade}:d=3,volume=0.55[m];[m][fx]amix=inputs=2:normalize=0[mix];`;
  } else graph += "[fx]anull[mix];";
  graph += "[mix]loudnorm=I=-14:TP=-1:LRA=11,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a]";
  const res = spawnSync(
    ffmpeg,
    ["-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-map", "0:v", "-map", "[a]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
    { stdio: "inherit" },
  );
  return { ok: res.status === 0, music: Boolean(track) };
}
