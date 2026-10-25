#!/usr/bin/env node
/**
 * Renders the 60 s SunProof product demo frame by frame (storyboard: docs/pitch/2026-10-25-scenariu-video-demo.md).
 * The real app runs under a fake clock; a compositor draws camera, cursor, callouts and transitions on top.
 *
 *   npm --prefix scripts install && npx --prefix scripts playwright install chromium
 *   node scripts/record-demo.mjs                 # starts its own API + UI on free ports
 *   DEMO_UNTIL=600 node scripts/record-demo.mjs  # stop after 600 frames (frames kept in .cache/frames)
 *
 * Output: demo-sunproof.mp4 (H.264 + AAC, 1920x1080, 30 fps) in the repo root.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ffmpegStatic from "ffmpeg-static";
import { soundtrack } from "./demo/audio.mjs";
import { Director, FPS } from "./demo/director.mjs";
import { Live, ensureServers, log, stopServers } from "./demo/engine.mjs";
import { scenes } from "./demo/scenes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CACHE = join(HERE, ".cache");
const FRAMES = join(CACHE, "frames");
const OUT = join(ROOT, "demo-sunproof.mp4");
const TOTAL = 60 * FPS;
const UNTIL = Number(process.env.DEMO_UNTIL ?? 0);
const ffmpeg = process.env.FFMPEG ?? ffmpegStatic;

const base = await ensureServers(ROOT, Number(process.env.API_PORT ?? 8765), Number(process.env.UI_PORT ?? 3765));
const live = await Live.launch({ base });
try {
  // compositor: its own context, real clock, no app code
  const compCtx = await live.browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  log("warming up routes");
  const warm = await compCtx.newPage();
  for (const path of ["/", "/harta?household=RO-TM-001", "/triaj?household=RO-BV-004", "/prosumator?household=RO-IF-002"])
    await warm.goto(base + path, { waitUntil: "networkidle", timeout: 180_000 }).catch(() => {});
  await warm.close();
  const comp = await compCtx.newPage();
  await comp.goto(pathToFileURL(join(HERE, "demo/compositor.html")).href);
  if (!(await comp.evaluate(() => window.ready()))) log("warning: compositor fonts not loaded");

  const { desk, phone } = live;
  await desk.goto(`${base}/`);
  await phone.goto(`${base}/prosumator?household=RO-CJ-003`);
  await live.settle(2500);

  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  const d = new Director({
    live, comp, outDir: FRAMES,
    devices: { desk: { page: desk, kind: "desktop" }, phone: { page: phone, kind: "phone" } },
  });
  if (UNTIL) {
    const frame = d.frame.bind(d);
    d.frame = async () => {
      if (d.f >= UNTIL) throw Object.assign(new Error("until"), { until: true });
      await frame();
    };
  }
  const t0 = Date.now();
  const marks = [];
  try {
    const finish = await scenes(d, { desk, phone, base, live }, (name) => marks.push(`${name}@${(d.f / FPS).toFixed(1)}s`));
    log(`\nstoryboard ends at frame ${d.f} (${(d.f / FPS).toFixed(1)} s); ${marks.join(" ")}`);
    if (d.f > TOTAL - 20) log(`warning: storyboard is ${d.f - TOTAL + 20} frames over budget`);
    // the end card holds ~4 s, never a static tail: a shorter storyboard makes a shorter film
    await finish(Math.min(TOTAL, d.f + 4 * FPS));
  } catch (e) {
    if (!e.until) throw e;
    log(`\nstopped at frame ${d.f}; ${marks.join(" ")}`);
  }
  log(`rendered ${d.f} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  if (!UNTIL) {
    const video = join(CACHE, "video.mp4");
    const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(FRAMES, "f_%05d.jpg"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), video], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg failed to encode the frames");
    const a = await soundtrack({ ffmpeg, cues: d.cues, seconds: d.f / FPS, video, out: OUT, workDir: CACHE, cacheDir: CACHE });
    log(a.ok ? `saved ${OUT}${a.music ? "" : " (music download failed: effects only)"}` : "audio mux failed");
    if (a.ok && !process.env.DEMO_KEEP_FRAMES) rmSync(FRAMES, { recursive: true, force: true });
  }
} finally {
  await live.close();
  stopServers();
}
