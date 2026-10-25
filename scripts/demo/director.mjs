/**
 * The director: keyframe tracks (camera, devices, cursor, cards, veil), live actions on the app and the
 * frame loop. Every visual is a function of the frame number; the app only moves when a frame is rendered.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { capture } from "./engine.mjs";

export const FPS = 30;
export const E = {
  lin: (k) => k,
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k * k * k,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  expo: (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  back: (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
};
const lerp = (a, b, k) => (Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * k) : a + (b - a) * k);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

class Track {
  constructor(v) {
    this.segs = [{ f0: -1, f1: -1, from: v, to: v, ease: E.lin }];
  }
  at(f) {
    let s = this.segs[0];
    for (const x of this.segs) if (x.f0 <= f) s = x;
    if (f >= s.f1) return s.to;
    return lerp(s.from, s.to, s.ease((f - s.f0) / (s.f1 - s.f0)));
  }
  go(f0, to, dur, ease = E.inOut) {
    const from = this.at(f0);
    this.segs = this.segs.filter((x) => x.f0 < f0);
    this.segs.push({ f0, f1: f0 + Math.max(0, dur), from, to, ease });
  }
}

/** Seeded PRNG (mulberry32) for the typing rhythm. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Director {
  constructor({ live, comp, outDir, devices }) {
    Object.assign(this, { live, comp, outDir, f: 0, hooks: [], cues: [], ripples: [], flashes: [], callouts: [], titles: [] });
    this.devs = devices; // id -> { page, kind }
    this.t = {
      cam: new Track([960, 540, 1]),
      cursor: new Track([1500, 1250]),
      cursorSize: new Track(46),
      press: new Track(0),
      cursorAlpha: new Track(1),
      veil: new Track([0, 0]),
      black: new Track(0),
      card: new Track([0, 0, 1, 0, 0]),
    };
    for (const id of Object.keys(devices)) this.t[`dev:${id}`] = new Track([0, 0, 1, 0, 0]); // x, y, s, alpha, radius
    this.veilRgb = "236,226,210";
    this.cardText = { kicker: "", title: "", sub: "" };
    this.coPos = null;
    this.mouse = {};
  }

  // ------------------------------------------------------------ geometry
  dev(id, f = this.f) {
    const [x, y, s, alpha, radius] = this.t[`dev:${id}`].at(f);
    const { page, kind } = this.devs[id];
    return { id, x, y, s, alpha, radius, w: page.vw, h: page.vh, kind, page };
  }
  toStage(id, [x, y], f = this.f) {
    const d = this.dev(id, f);
    return [d.x + x * d.s, d.y + y * d.s];
  }
  toFrame([x, y], f = this.f) {
    const [cx, cy, z] = this.t.cam.at(f);
    return [(x - cx) * z + 960, (y - cy) * z + 540];
  }
  async rect(page, target) {
    if (!target.boundingBox) return target;
    // the app only moves when we tick it: give a late element off-camera time before waiting for it
    for (let t = 0; t < 3000 && !(await target.first().isVisible().catch(() => false)); t += 100) await this.live.tick(100);
    await target.waitFor({ state: "visible" });
    const b = await target.boundingBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }

  // ------------------------------------------------------------ declarative (non-blocking)
  place(id, [x, y, s, alpha = 1, radius = 0], dur = 0, ease = E.inOut) {
    this.t[`dev:${id}`].go(this.f, [x, y, s, alpha, radius], dur, ease);
  }
  cam(to, dur = 0, ease = E.inOut) {
    this.t.cam.go(this.f, to, dur, ease);
  }
  /** Camera onto a css rect of a device: `fill` is the fraction of the frame the rect should take. */
  async focus(page, target, { fill = 0.6, dur = 20, ease = E.inOut, zMax = 2.4, zMin = 1, dx = 0, dy = 0, at } = {}) {
    const r = await this.rect(page, target);
    const f = at ?? this.f + dur;
    const d = this.dev(page.devId, f);
    const z = clamp(Math.min((1920 * fill) / (r.w * d.s), (1080 * fill) / (r.h * d.s)), zMin, zMax);
    let [cx, cy] = [d.x + (r.x + r.w / 2) * d.s + dx, d.y + (r.y + r.h / 2) * d.s + dy];
    // never show past the edges of a device that fills the frame
    const [hw, hh] = [960 / z, 540 / z];
    if (d.w * d.s >= 2 * hw) cx = clamp(cx, d.x + hw, d.x + d.w * d.s - hw);
    if (d.h * d.s >= 2 * hh) cy = clamp(cy, d.y + hh, d.y + d.h * d.s - hh);
    this.cam([cx, cy, z], dur, ease);
    return z;
  }
  say(main, sub = "", { hold = 60, side, at } = {}) {
    const cur = this.callouts.at(-1);
    if (cur && cur.f1 > this.f) cur.f1 = this.f;
    this.callouts.push({ f0: this.f + (cur && cur.f1 + 6 > this.f ? 4 : 0), f1: this.f + hold, main, sub, side, at });
  }
  hush() {
    const cur = this.callouts.at(-1);
    if (cur && cur.f1 > this.f) cur.f1 = this.f;
  }
  title(main, sub, hold = 90) {
    this.titles.push({ f0: this.f, f1: this.f + hold, main, sub });
  }
  cue(type, gain = 1, at = this.f) {
    this.cues.push({ t: at / FPS, type, gain });
  }
  veil(a, blur, dur = 8, rgb) {
    if (rgb) this.veilRgb = rgb;
    this.t.veil.go(this.f, [a, blur], dur, E.inOut);
  }

  // ------------------------------------------------------------ blocking (render frames)
  async wait(n) {
    for (let i = 0; i < n; i++) await this.frame();
  }
  /** Runs `fn(i, n)` before each of the next n frames, rendering them. */
  async during(n, fn) {
    this.hooks.push({ f0: this.f, f1: this.f + n, fn });
    await this.wait(n);
  }
  async move(page, target, dur = 18, { ax = 0.5, ay = 0.5, ease = E.inOut } = {}) {
    const r = await this.rect(page, target);
    const css = [r.x + r.w * ax, r.y + r.h * ay];
    this.t.cursor.go(this.f, this.toStage(page.devId, css, this.f + dur), dur, ease);
    if (dur) await this.wait(dur);
    return css;
  }
  /** Move, press (cursor squashes, the real element inflates, amber ring), real click on the press frame. */
  async click(page, target, { dur = 16, punch = 0, inflate = true, after = 6, ax, ay } = {}) {
    const r = await this.rect(page, target);
    const css = await this.move(page, r, dur, { ax, ay });
    if (punch) {
      const d = this.dev(page.devId);
      this.cam([...this.toStage(page.devId, css), punch / 1], 0); // hard cut, not a zoom animation
      this.cam([d.x + (css[0] + 0) * d.s, d.y + css[1] * d.s, punch * 1.04], 10, E.out);
      this.cue("whoosh", 0.5);
    }
    const el = inflate && target.evaluate ? target : null;
    this.t.press.go(this.f, 1, 3, E.out);
    if (el) await el.evaluate((n) => window.__inflate(n, 1.06)).catch(() => {});
    await this.wait(3);
    await page.mouse.click(css[0], css[1]);
    this.ripples.push({ f0: this.f, at: this.toStage(page.devId, css) });
    this.flashes.push({ f0: this.f, at: [this.toStage(page.devId, [r.x, r.y]), this.toStage(page.devId, [r.x + r.w, r.y + r.h])] });
    this.cue("click");
    this.t.press.go(this.f, 0, 6, E.out);
    if (el) await el.evaluate((n) => window.__inflate(n, 1)).catch(() => {});
    await this.wait(after);
    return css;
  }
  async scroll(page, target, { at = 0.15, dur = 22 } = {}) {
    const [from, to] = await target.evaluate((el, a) => window.__planScroll(el, a), at);
    if (Math.abs(to - from) < 2) return;
    this.cue("swish", 0.35);
    await this.during(dur, (i, n) => page.evaluate((y) => window.__scrollTo(y), from + (to - from) * E.inOut((i + 1) / n)));
  }
  async drag(page, from, to, dur = 30, ease = E.inOut) {
    await this.move(page, { x: from[0], y: from[1], w: 0, h: 0 }, 12);
    this.t.press.go(this.f, 1, 3, E.out);
    await page.mouse.move(from[0], from[1]);
    await page.mouse.down();
    this.cue("click", 0.6);
    const pts = (k) => [from[0] + (to[0] - from[0]) * ease(k), from[1] + (to[1] - from[1]) * ease(k)];
    this.t.cursor.go(this.f, this.toStage(page.devId, to, this.f + dur), dur, ease);
    await this.during(dur, (i, n) => page.mouse.move(...pts((i + 1) / n)));
    await page.mouse.up();
    this.t.press.go(this.f, 0, 5, E.out);
  }
  /** Types with a seeded keystroke rhythm spread over `dur` frames. */
  async type(page, text, dur, seed = 7) {
    const r = rng(seed);
    const gaps = [...text].map((ch) => (ch === " " ? 1.6 : 0.6 + r()) * (r() < 0.06 ? 3 : 1));
    const total = gaps.reduce((a, b) => a + b, 0);
    let acc = 0;
    const at = gaps.map((g) => ((acc += g) / total) * (dur - 1));
    let i = 0;
    await this.during(dur, async (k) => {
      let chunk = "";
      while (i < text.length && at[i] <= k) chunk += text[i++];
      if (chunk) {
        await page.keyboard.insertText(chunk);
        this.cue("key", 0.5 + 0.5 * r());
      }
    });
  }
  /** Off-camera app time until `loc` is on the page (new data loading behind the current frame). */
  async until(loc, maxMs = 6000) {
    for (let t = 0; t < maxMs && !(await loc.count()); t += 100) await this.live.tick(100);
  }

  /** Off-camera app time: the next rendered frame is a cut. */
  async settle(ms) {
    await this.live.settle(ms);
  }

  // ------------------------------------------------------------ frame loop
  async syncMouse(f) {
    const [sx, sy] = this.t.cursor.at(f);
    for (const id of Object.keys(this.devs)) {
      const d = this.dev(id, f);
      const x = (sx - d.x) / d.s, y = (sy - d.y) / d.s;
      if (d.alpha <= 0 || x < 0 || y < 0 || x > d.w || y > d.h) continue;
      const m = this.mouse[id];
      if (m && Math.abs(m[0] - x) < 0.5 && Math.abs(m[1] - y) < 0.5) continue;
      this.mouse[id] = [x, y];
      if (!this.dragging) await d.page.mouse.move(x, y).catch(() => {});
    }
  }

  state(f) {
    const [cx, cy, z] = this.t.cam.at(f);
    const [pcx, pcy] = this.t.cam.at(f - 1);
    // directional motion blur from how far the frame centre travelled since the previous frame
    const mx = Math.abs((pcx - cx) * z), my = Math.abs((pcy - cy) * z);
    const blur = [clamp((mx - 18) * 0.22, 0, 9), clamp((my - 18) * 0.22, 0, 9)];
    const devices = {};
    for (const id of Object.keys(this.devs)) {
      const d = this.dev(id, f);
      devices[id] = { kind: d.kind, x: d.x, y: d.y, s: d.s, w: d.w, h: d.h, alpha: d.alpha, radius: d.radius };
    }
    const [x, y] = this.toFrame(this.t.cursor.at(f), f);
    const cursor = { x, y, size: this.t.cursorSize.at(f), press: this.t.press.at(f), alpha: this.t.cursorAlpha.at(f) };
    const ripples = this.ripples
      .filter((r) => f >= r.f0 && f < r.f0 + 14)
      .map((r) => ({ ...xy(this.toFrame(r.at, f)), p: (f - r.f0) / 14 }));
    const flashes = this.flashes
      .filter((r) => f >= r.f0 && f < r.f0 + 12)
      .map((r) => {
        const [a, b] = [this.toFrame(r.at[0], f), this.toFrame(r.at[1], f)];
        return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1], p: (f - r.f0) / 12 };
      });
    let callout = null;
    const c = this.callouts.find((k) => f >= k.f0 && f < k.f1 + 6);
    if (c) {
      const target = c.at ? this.toFrame(c.at, f) : [x, y];
      if (!this.coPos || this.coFor !== c) this.coPos = target;
      else this.coPos = lerp(this.coPos, target, 0.3);
      this.coFor = c;
      const alpha = clamp((f - c.f0) / 6) * clamp((c.f1 + 6 - f) / 6);
      callout = { main: c.main, sub: c.sub, age: f - c.f0, x: this.coPos[0], y: this.coPos[1], alpha, side: c.side };
    }
    const [kx, ky, ks, ka, kr] = this.t.card.at(f);
    const t = this.titles.find((k) => f >= k.f0 && f < k.f1);
    const [va, vb] = this.t.veil.at(f);
    return {
      f, cam: [cx, cy, z], blur, devices, cursor, ripples, flashes, callout,
      card: { x: kx, y: ky, s: ks, alpha: ka, rot: kr, ...this.cardText },
      title: t ? { main: t.main, sub: t.sub, age: f - t.f0, alpha: clamp((t.f1 - f) / 8) } : null,
      veil: { a: va, blur: vb, rgb: this.veilRgb },
      black: this.t.black.at(f),
    };
  }

  async plates(st) {
    const out = {};
    const [cx, cy, z] = st.cam;
    const [vx0, vy0, vx1, vy1] = [cx - 960 / z, cy - 540 / z, cx + 960 / z, cy + 540 / z];
    for (const [id, d] of Object.entries(st.devices)) {
      if (d.alpha <= 0) continue;
      const ix0 = Math.max(vx0, d.x), iy0 = Math.max(vy0, d.y);
      const ix1 = Math.min(vx1, d.x + d.w * d.s), iy1 = Math.min(vy1, d.y + d.h * d.s);
      if (ix1 <= ix0 || iy1 <= iy0) continue;
      const x0 = clamp(Math.floor((ix0 - d.x) / d.s) - 2, 0, d.w), y0 = clamp(Math.floor((iy0 - d.y) / d.s) - 2, 0, d.h);
      const x1 = clamp(Math.ceil((ix1 - d.x) / d.s) + 2, 0, d.w), y1 = clamp(Math.ceil((iy1 - d.y) / d.s) + 2, 0, d.h);
      const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      out[id] = { clip, src: await capture(this.devs[id].page, clip, d.s * z) };
    }
    return out;
  }

  async frame() {
    const f = this.f;
    for (const h of this.hooks) if (f >= h.f0 && f < h.f1) await h.fn(f - h.f0, h.f1 - h.f0);
    this.hooks = this.hooks.filter((h) => h.f1 > f + 1);
    await this.syncMouse(f);
    await this.live.tick(Math.round(((f + 1) * 1000) / FPS) - Math.round((f * 1000) / FPS));
    const st = this.state(f);
    const plates = await this.plates(st);
    await this.comp.evaluate(([s, p]) => window.draw(s, p), [st, plates]);
    writeFileSync(join(this.outDir, `f_${String(f).padStart(5, "0")}.jpg`), await this.comp.screenshot({ type: "jpeg", quality: 93 }));
    if (f % 30 === 0) process.stdout.write(`\r[demo] frame ${f} (${(f / FPS).toFixed(1)} s)   `);
    this.f++;
  }
}

const xy = ([x, y]) => ({ x, y });
