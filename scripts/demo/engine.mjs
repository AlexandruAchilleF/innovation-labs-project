/**
 * Live side of the demo renderer: servers, the app pages (desktop + phone) under a fake clock,
 * a network barrier before every frame and per-frame captures of only the region the camera sees.
 */
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const log = (...a) => console.log("[demo]", ...a);

// ---------------------------------------------------------------- servers
const children = [];
function start(cmd, args, opts) {
  const c = spawn(cmd, args, { stdio: "ignore", detached: true, ...opts });
  children.push(c);
}
export function stopServers() {
  for (const c of children) {
    try {
      process.kill(-c.pid, "SIGTERM");
    } catch {}
  }
}
process.on("exit", stopServers);
process.on("SIGINT", () => process.exit(130));

async function waitFor(url, label, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(400);
  }
  throw new Error(`${label} did not answer at ${url}`);
}

/**
 * Starts a fresh API (fresh ticket store) and a production build of the UI, unless SUNPROOF_URL is given.
 * Not the Vite dev server: its dependency optimizer reloads the page the first time a panel pulls in a new
 * dependency, which wipes the app state in the middle of a take.
 */
export async function ensureServers(root, apiPort, uiPort) {
  if (process.env.SUNPROOF_URL) return process.env.SUNPROOF_URL.replace(/\/$/, "");
  const ui = join(root, "frontend");
  log(`starting FastAPI on :${apiPort}; building the UI`);
  start(join(root, ".venv/bin/uvicorn"), ["sunproof.app:app", "--host", "127.0.0.1", "--port", String(apiPort)], { cwd: root });
  const env = { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}`, NITRO_PRESET: "node-server" };
  const b = spawnSync("npx", ["vite", "build"], { cwd: ui, env, stdio: "ignore" });
  if (b.status !== 0) throw new Error("vite build failed (run `npx vite build` in frontend/ to see why)");
  await waitFor(`http://127.0.0.1:${apiPort}/api/health`, "API");
  start("node", [".output/server/index.mjs"], { cwd: ui, env: { ...env, HOST: "127.0.0.1", PORT: String(uiPort) } });
  const base = `http://127.0.0.1:${uiPort}`;
  await waitFor(base, "UI");
  log(`UI (production build) on :${uiPort}`);
  return base;
}

// ---------------------------------------------------------------- in-page helpers (init script)
function pageHelpers() {
  // CSS animations and transitions run on the compositor clock; pin them to the fake clock instead.
  window.__seekAnims = () => {
    const vt = performance.now();
    for (const a of document.getAnimations()) {
      if (a.timeline && a.timeline !== document.timeline) continue;
      if (a.__st === undefined) {
        a.__st = vt;
        try {
          a.pause();
        } catch {}
      }
      if (a.__done) continue;
      // a paused animation never fires animationend; finish finite ones so exit transitions can unmount
      const end = a.effect?.getComputedTiming?.().endTime;
      if (Number.isFinite(end) && vt - a.__st >= end) {
        a.__done = true;
        try {
          a.finish();
        } catch {}
        continue;
      }
      try {
        a.currentTime = vt - a.__st;
      } catch {}
    }
  };
  const scrollBox = (el) => {
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(box).overflowY)))
      box = box.parentElement;
    return !box || box === document.body || box === document.documentElement ? null : box;
  };
  /** Plans a scroll that puts `el` at fraction `at` of its scroll container; returns [from, to]. */
  window.__planScroll = (el, at) => {
    const box = scrollBox(el);
    window.__scrollBox = box;
    const from = box ? box.scrollTop : window.scrollY;
    const top = box ? box.getBoundingClientRect().top : 0;
    const view = box ? box.clientHeight : window.innerHeight;
    const max = (box ? box.scrollHeight : document.documentElement.scrollHeight) - view;
    const to = Math.max(0, Math.min(max, from + el.getBoundingClientRect().top - top - view * at));
    return [from, to];
  };
  window.__scrollTo = (y) => (window.__scrollBox ? (window.__scrollBox.scrollTop = y) : window.scrollTo(0, y));
  window.__inflate = (el, s) => {
    el.style.transition = "none";
    el.style.transform = s === 1 ? "" : `scale(${s})`;
  };
}

// ---------------------------------------------------------------- live app
const IGNORE = /__vite_ping|\.hot-update\.|^data:|^blob:/;

export class Live {
  /** Desktop and phone are separate devices (own DPR, touch on the phone), each under a fake clock. */
  static async launch({ base }) {
    const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
    const live = new Live(browser, base);
    live.desk = await live.device("desk", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    live.phone = await live.device("phone", {
      viewport: { width: 400, height: 860 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    return live;
  }

  constructor(browser, base) {
    Object.assign(this, { browser, base, inflight: 0, touched: false, vt: 0, ctxs: [], pages: [] });
  }

  async device(id, opts) {
    const ctx = await this.browser.newContext({ locale: "ro-RO", timezoneId: "Europe/Bucharest", ...opts });
    // install() alone keeps time flowing in real time; pauseAt() hands it to runFor() only
    await ctx.clock.install({ time: new Date("2026-08-18T13:45:00+03:00") });
    await ctx.clock.pauseAt(new Date("2026-08-18T13:45:01+03:00"));
    await ctx.addInitScript(pageHelpers);
    ctx.on("request", (r) => {
      if (IGNORE.test(r.url())) return;
      r.__counted = true;
      this.inflight++;
      this.touched = true;
    });
    const done = (r) => r.__counted && (this.inflight = Math.max(0, this.inflight - 1));
    ctx.on("requestfinished", done);
    ctx.on("requestfailed", done);
    const p = await ctx.newPage();
    // the OD dossier opens the PDF in a new tab: keep the recording on the portal
    ctx.on("page", (q) => q !== p && q.close().catch(() => {}));
    p.setDefaultTimeout(20_000);
    this.ctxs.push(ctx);
    this.pages.push(p);
    return Object.assign(p, { devId: id, dpr: opts.deviceScaleFactor, vw: opts.viewport.width, vh: opts.viewport.height });
  }

  /** Waits (in real time) until no request is in flight, so data never arrives between frames by chance. */
  async barrier() {
    const t0 = Date.now();
    while (this.inflight > 0 && Date.now() - t0 < 15_000) await sleep(10);
    if (this.touched) {
      this.touched = false;
      await sleep(60); // decoding / workers after the last response
    }
  }

  /** Advances the app by `ms` of fake time and lets React commit what the timers scheduled. */
  async tick(ms) {
    await this.barrier();
    for (const c of this.ctxs) await c.clock.runFor(ms);
    this.vt += ms;
    for (const p of this.pages) await flush(p);
    await this.barrier();
    for (const p of this.pages) await flush(p);
    for (const p of this.pages) await p.evaluate(() => window.__seekAnims?.()).catch(() => {});
  }

  /** Off-camera time: lets maps paint and data settle behind a cut. */
  async settle(ms, step = 100) {
    for (let t = 0; t < ms; t += step) await this.tick(step);
  }

  /**
   * The supplier portal and the phone are two browsers; the ticket already reached the API. Hand the
   * portal the phone's ticket list through the same storage event the app uses to sync open tabs.
   */
  async syncTickets(from, to, key = "sunproof.tickets.v1") {
    const value = await from.evaluate((k) => localStorage.getItem(k), key);
    await to.evaluate(
      ([k, incoming]) => {
        // only the tickets the portal does not know yet: its own resolutions must survive
        const old = localStorage.getItem(k);
        const mine = JSON.parse(old || "[]");
        const fresh = JSON.parse(incoming || "[]").filter((t) => !mine.some((m) => m.ticket_id === t.ticket_id));
        const v = JSON.stringify([...fresh, ...mine]);
        localStorage.setItem(k, v);
        window.dispatchEvent(new StorageEvent("storage", { key: k, oldValue: old, newValue: v, storageArea: localStorage }));
      },
      [key, value],
    );
  }

  async close() {
    await this.browser.close();
  }
}

/** React schedules work through MessageChannel (real time): give it a few macrotasks. */
function flush(p) {
  return p
    .evaluate(
      () =>
        new Promise((r) => {
          const ch = new MessageChannel();
          let n = 0;
          ch.port1.onmessage = () => (++n < 4 ? ch.port2.postMessage(0) : r());
          ch.port2.postMessage(0);
        }),
    )
    .catch(() => {});
}

/** Captures the css-pixel `clip` of a page: 1x when shown at <= 1:1, native DPR when the camera zooms in. */
export async function capture(page, clip, pxPerCss) {
  const scale = pxPerCss > 1.02 ? "device" : "css";
  const buf = await page.screenshot({ type: "jpeg", quality: 90, clip, scale, caret: "initial", timeout: 30_000 });
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}
