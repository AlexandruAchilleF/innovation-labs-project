#!/usr/bin/env node
/**
 * Records a ~65 s SunProof product demo at 1920x1080: landing -> /harta (what-if) -> /triaj -> /prosumator.
 * Injects an animated cursor, glass captions and a subtle highlight/zoom on the key elements.
 *
 *   npm --prefix scripts install && npx --prefix scripts playwright install chromium
 *   node scripts/record-demo.mjs                      # starts its own API + UI on free ports
 *   SUNPROOF_URL=http://127.0.0.1:3000 node scripts/record-demo.mjs   # reuse running servers
 *
 * Output: demo-sunproof.webm (+ demo-sunproof.mp4 when ffmpeg is on PATH or FFMPEG=/path/to/ffmpeg) in the repo root.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_PORT = Number(process.env.API_PORT ?? 8765);
const UI_PORT = Number(process.env.UI_PORT ?? 3765);
const OUT_WEBM = join(ROOT, "demo-sunproof.webm");
const OUT_MP4 = join(ROOT, "demo-sunproof.mp4");
const W = 1920;
const H = 1080;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[demo]", ...a);

// ---------------------------------------------------------------- servers
const children = [];
function start(cmd, args, opts) {
  const c = spawn(cmd, args, { stdio: "ignore", detached: true, ...opts });
  children.push(c);
  return c;
}
function stopServers() {
  for (const c of children) {
    try {
      process.kill(-c.pid, "SIGTERM");
    } catch {}
  }
}
process.on("exit", stopServers);
process.on("SIGINT", () => process.exit(130));

async function waitFor(url, label, timeoutMs = 90_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(400);
  }
  throw new Error(`${label} did not answer at ${url}`);
}

async function ensureServers() {
  if (process.env.SUNPROOF_URL) return process.env.SUNPROOF_URL.replace(/\/$/, "");
  log(`starting FastAPI on :${API_PORT} and Vite on :${UI_PORT}`);
  start(join(ROOT, ".venv/bin/uvicorn"), ["sunproof.app:app", "--host", "127.0.0.1", "--port", String(API_PORT)], {
    cwd: ROOT,
  });
  await waitFor(`http://127.0.0.1:${API_PORT}/api/health`, "API");
  await fetch(`http://127.0.0.1:${API_PORT}/api/portfolio`).catch(() => {});
  await fetch(`http://127.0.0.1:${API_PORT}/api/neighborhoods`).catch(() => {});
  start("npx", ["vite", "--host", "127.0.0.1", "--port", String(UI_PORT), "--strictPort"], {
    cwd: join(ROOT, "frontend"),
    env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
  });
  const base = `http://127.0.0.1:${UI_PORT}`;
  await waitFor(base, "UI");
  return base;
}

// ---------------------------------------------------------------- overlay (runs in the page)
function overlay() {
  if (window.__demo) return;
  const install = () => {
    if (document.getElementById("__demo-root")) return;
    const css = document.createElement("style");
    css.textContent = `
      #__demo-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif}
      #__demo-cursor{position:absolute;left:0;top:0;width:28px;height:28px;will-change:transform;
        transition:transform var(--d,700ms) cubic-bezier(.45,.05,.25,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}
      #__demo-cursor svg{transition:transform 120ms ease}
      #__demo-cursor.down svg{transform:scale(.82)}
      .__demo-ripple{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
        border:2px solid rgba(255,255,255,.85);animation:__demo-rip 560ms ease-out forwards}
      @keyframes __demo-rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
      #__demo-cap{position:absolute;left:50%;bottom:44px;transform:translate(-50%,12px);max-width:1180px;
        padding:16px 30px;border-radius:14px;background:rgba(18,20,24,.58);backdrop-filter:blur(18px) saturate(140%);
        -webkit-backdrop-filter:blur(18px) saturate(140%);border:1px solid rgba(255,255,255,.14);
        box-shadow:0 18px 50px rgba(0,0,0,.45);color:#f4f1ea;font-size:26px;line-height:1.35;font-weight:500;
        letter-spacing:-.005em;text-align:center;opacity:0;transition:opacity 380ms ease,transform 380ms ease}
      #__demo-cap.on{opacity:1;transform:translate(-50%,0)}
      #__demo-cap small{display:block;margin-top:4px;font-size:17px;font-weight:400;color:rgba(244,241,234,.7)}
      #__demo-hl{position:absolute;border-radius:10px;border:2px solid #f2b84b;opacity:0;
        box-shadow:0 0 0 6px rgba(242,184,75,.16),0 0 0 9999px rgba(0,0,0,.28);
        transition:opacity 350ms ease,left 450ms ease,top 450ms ease,width 450ms ease,height 450ms ease}
      #__demo-hl.on{opacity:1}
      body.__demo-zoom{transition:transform 900ms cubic-bezier(.45,.05,.25,1)}`;
    const root = document.createElement("div");
    root.id = "__demo-root";
    root.innerHTML = `<div id="__demo-hl"></div><div id="__demo-cap"></div>
      <div id="__demo-cursor"><svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 3l17 9.5-7.4 1.6 4.3 8.2-3.3 1.7-4.3-8.2L5.6 21z"
      fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`;
    document.documentElement.append(css, root);
    const saved = JSON.parse(sessionStorage.getItem("__demo-xy") || "null") ?? [960, 600];
    place(saved[0], saved[1], 0);
  };
  const $ = (id) => document.getElementById(id);
  function place(x, y, ms) {
    const c = $("__demo-cursor");
    c.style.setProperty("--d", `${ms}ms`);
    c.style.transform = `translate(${x - 5}px, ${y - 3}px)`;
    sessionStorage.setItem("__demo-xy", JSON.stringify([x, y]));
  }
  window.__demo = {
    pos: () => JSON.parse(sessionStorage.getItem("__demo-xy") || "[960,600]"),
    move: (x, y, ms) => (install(), place(x, y, ms)),
    click(x, y) {
      install();
      const c = $("__demo-cursor");
      c.classList.add("down");
      setTimeout(() => c.classList.remove("down"), 160);
      const r = document.createElement("div");
      r.className = "__demo-ripple";
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      $("__demo-root").append(r);
      setTimeout(() => r.remove(), 600);
    },
    caption(text, sub) {
      install();
      const el = $("__demo-cap");
      if (!text) return el.classList.remove("on");
      el.classList.remove("on");
      setTimeout(() => {
        el.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
        el.classList.add("on");
      }, el.textContent ? 260 : 0);
    },
    highlight(el, pad = 10) {
      install();
      const hl = $("__demo-hl");
      if (!el) return hl.classList.remove("on");
      const b = el.getBoundingClientRect();
      Object.assign(hl.style, {
        left: `${b.left - pad}px`,
        top: `${b.top - pad}px`,
        width: `${b.width + pad * 2}px`,
        height: `${b.height + pad * 2}px`,
      });
      hl.classList.add("on");
    },
    zoom(el, scale = 1.06) {
      const body = document.body;
      body.classList.add("__demo-zoom");
      if (!el) return (body.style.transform = "");
      const b = el.getBoundingClientRect();
      body.style.transformOrigin = `${b.left + b.width / 2 + window.scrollX}px ${b.top + b.height / 2 + window.scrollY}px`;
      body.style.transform = `scale(${scale})`;
    },
    /** Eased scroll of the element's nearest scroll container so the element sits at `at` of the viewport. */
    reveal(el, ms = 1100, at = 0.18) {
      let box = el.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(box).overflowY)))
        box = box.parentElement;
      const win = !box || box === document.body || box === document.documentElement;
      const from = win ? window.scrollY : box.scrollTop;
      const top = win ? 0 : box.getBoundingClientRect().top;
      const view = win ? window.innerHeight : box.clientHeight;
      const max = win ? document.documentElement.scrollHeight - view : box.scrollHeight - view;
      const to = Math.max(0, Math.min(max, from + el.getBoundingClientRect().top - top - view * at));
      const t0 = performance.now();
      return new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
          const y = from + (to - from) * e;
          win ? window.scrollTo(0, y) : (box.scrollTop = y);
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      });
    },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}

// ---------------------------------------------------------------- choreography helpers
function director(page) {
  const d = {
    async caption(text, sub) {
      await page.evaluate(([t, s]) => window.__demo.caption(t, s), [text, sub ?? ""]);
    },
    async moveTo(loc, { ms } = {}) {
      await loc.waitFor({ state: "visible" });
      const b = await loc.boundingBox();
      const x = b.x + b.width / 2;
      const y = b.y + Math.min(b.height / 2, 40);
      const [px, py] = await page.evaluate(() => window.__demo.pos());
      const dur = ms ?? Math.round(Math.min(1100, Math.max(450, Math.hypot(x - px, y - py) * 0.9)));
      await page.evaluate(([x, y, m]) => window.__demo.move(x, y, m), [x, y, dur]);
      await page.mouse.move(x, y, { steps: 8 });
      await sleep(dur + 60);
      return { x, y };
    },
    async click(loc, opts) {
      const { x, y } = await d.moveTo(loc, opts);
      await page.evaluate(([x, y]) => window.__demo.click(x, y), [x, y]);
      await sleep(140);
      await loc.click();
    },
    async highlight(loc, ms = 1600, { zoom = 0, pad } = {}) {
      await loc.evaluate((el, [z, p]) => {
        window.__demo.highlight(el, p);
        if (z) window.__demo.zoom(el, z);
      }, [zoom, pad ?? 10]);
      await sleep(ms);
      await page.evaluate(() => {
        window.__demo.highlight(null);
        window.__demo.zoom(null);
      });
      if (zoom) await sleep(500);
    },
    async reveal(loc, ms = 1100, at) {
      await loc.evaluate((el, [m, a]) => window.__demo.reveal(el, m, a), [ms, at]);
      await sleep(150);
    },
  };
  return d;
}

// ---------------------------------------------------------------- the demo
async function scenes(page, base) {
  const d = director(page);
  const main = page.locator("main");

  // 1. Landing ------------------------------------------------------------- ~14 s
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await sleep(500);
  await d.caption("SunProof: fiecare reclamație de prosumator, cu dovada ei", "Rețea · Baterie · Factură, decise de motoare deterministe");
  await d.highlight(page.getByRole("heading", { level: 1 }), 1900, { zoom: 1.05, pad: 14 });
  const chapter = (name) => page.getByRole("heading", { name, level: 3 });
  await d.reveal(chapter("Rețea sau instalație locală"), 1200);
  await d.caption("Invertorul s-a oprit la prânz? Rețeaua, nu instalația.", "6 din 11 vecini opriți în același minut, peste 253 V");
  await d.highlight(chapter("Rețea sau instalație locală").locator("xpath=ancestor::li[1]"), 1600, { pad: 6 });
  await d.reveal(chapter("Baterie blocată seara"), 1200);
  await d.caption("Bateria e blocată exact când energia e scumpă", "rezervă 85% · 10,5 kWh nefolosiți seara");
  await d.highlight(chapter("Baterie blocată seara").locator("xpath=ancestor::li[1]"), 1600, { pad: 6 });
  await d.reveal(chapter("Factură vs. contor"), 1200);
  await d.caption("Factura nu se potrivește cu contorul", "640 kWh exportați lipsesc de pe factură");
  await d.highlight(chapter("Factură vs. contor").locator("xpath=ancestor::li[1]"), 1600, { pad: 6 });
  const cta = page.getByRole("region", { name: "Primul caz e deja deschis" }).getByRole("link", { name: "Deschide demo-ul" });
  await d.reveal(cta, 1000, 0.45);
  await d.caption("Intrăm în portalul furnizorului");
  await d.click(cta);

  // 2. Harta & what-if ----------------------------------------------------- ~18 s
  await page.waitForURL(/\/harta/);
  await page.getByRole("button", { name: "Deschide Analiză detaliată" }).waitFor();
  await sleep(700); // tiles come from the context cache (see prefetch below)
  await d.caption("Dumbrăvița, ora 13:45: tot cartierul e în supratensiune", "casele roșii sunt invertoare oprite pe același transformator");
  await d.highlight(page.getByText(/Clientul analizat · RO-TM-001/), 2000, { zoom: 1.05, pad: 140 });
  await d.click(page.getByRole("button", { name: "Deschide Analiză detaliată" }));
  const panel = page.getByRole("complementary").filter({ hasText: "Analiză detaliată" });
  await sleep(500);
  await d.caption("Verdictul: cauza e rețeaua", "dovezi: tensiunea minut cu minut, vecinii opriți, cablul intern de doar 6,6 V");
  await d.highlight(panel.getByText("Cauza: rețeaua"), 1600, { pad: 8 });
  const simulate = panel.getByRole("button", { name: "Simulează soluția" });
  await d.reveal(simulate, 1100, 0.3);
  await d.caption("What-If: ce se schimbă dacă distribuitorul intervine?");
  await d.click(simulate);
  await sleep(900);
  const after = panel.getByRole("button", { name: "Pe hartă: după" });
  await d.reveal(after, 700, 0.35);
  await d.highlight(after.locator("xpath=ancestor::*[.//dt or .//*[contains(text(),'Case deconectate')]][1]"), 1700, { pad: 8 });
  await d.caption("Înainte: 10 case deconectate", "Pe hartă: înainte");
  await d.click(panel.getByRole("button", { name: "Pe hartă: înainte" }));
  await sleep(1200);
  await d.caption("După soluție: 7 case, transformatorul de la 39% la 27%", "Pe hartă: după");
  await d.click(after);
  await sleep(1400);

  // 3. Triaj --------------------------------------------------------------- ~16 s
  await d.click(page.getByRole("link", { name: "Analiză Detaliată" }));
  await page.waitForURL(/\/triaj/);
  await sleep(1200);
  await d.caption("Analiză detaliată: rețea", "91 de minute oprit, 17,4 kWh pierduți într-o singură zi");
  // a verdict card is a button; two levels up holds the card row and the evidence chart below it
  const verdict = (title) =>
    main.locator(`xpath=.//button[.//*[normalize-space(.)='${title}']]`).first().locator("xpath=../..");
  await d.highlight(verdict("Rețea sau instalație"), 1800, { pad: 6 });
  const pick = (name) => main.getByRole("complementary").getByRole("button", { name: new RegExp(`^${name}`) });
  await d.click(pick("Mihai Radu"));
  await sleep(900);
  await d.caption("Baterie: 15 kWh în mod Backup", "stă plină seara, când energia din rețea e cea mai scumpă");
  await d.highlight(verdict("Baterie seara"), 1800, { pad: 6 });
  await d.click(pick("Dan Munteanu"));
  await sleep(900);
  await d.caption("Factură: lipsește indexul de export", "contorul are 640 kWh injectați, factura are 0");
  await d.highlight(verdict("Factură"), 1800, { pad: 6 });
  await d.click(pick("Andrei Popescu"));
  await sleep(700);

  // 4. Prosumator ---------------------------------------------------------- ~16 s
  await d.caption("Același caz, văzut de client");
  await d.click(page.getByRole("link", { name: /Vezi ca Prosumator/ }));
  await page.waitForURL(/\/prosumator/);
  await page.getByRole("region", { name: "Instalația ta, în timp real" }).waitFor();
  await sleep(900);
  const scene = page.getByRole("region", { name: "Instalația ta, în timp real" });
  await d.caption("Pagina se deschide direct pe minutul avariei", "10:40: invertorul se oprește, tensiunea rețelei e prea mare");
  await d.highlight(scene, 2400, { zoom: 1.03, pad: 4 });
  await d.click(scene.getByRole("button", { name: "Derulează ziua" }));
  await sleep(2000);
  await d.click(scene.getByRole("button", { name: /^Avarie/ }));
  await sleep(600);
  const diag = main.getByRole("region").filter({ has: page.getByRole("heading", { level: 2, name: /Rețea/ }) }).first();
  await d.reveal(diag, 1200, 0.2);
  await d.caption("Explicația, pe înțelesul clientului", "fiecare cifră din text vine din motoarele deterministe");
  await d.highlight(diag, 2300, { pad: 8 });
  const ticket = page.getByRole("region", { name: "Trimite tichet către furnizor" });
  await d.reveal(ticket, 1000, 0.3);
  await d.caption("Tichetul ajunge la furnizor cu dosarul deja pregătit");
  await d.highlight(ticket, 2200, { pad: 8 });
  await d.caption("SunProof", "rețea, baterie, factură: o dovadă pentru fiecare reclamație");
  await sleep(2200);
}

// ---------------------------------------------------------------- main
const base = await ensureServers();
const browser = await chromium.launch();
try {
  // warm-up pass: compiles Vite routes and fills the API caches so the recording has no spinners
  log("warming up routes");
  const warm = await browser.newPage({ viewport: { width: W, height: H } });
  for (const path of ["/", "/harta?household=RO-TM-001", "/triaj?household=RO-CJ-003", "/triaj?household=RO-BV-004", "/prosumator?household=RO-TM-001"])
    await warm.goto(base + path, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => {});
  await warm.close();

  const videoDir = mkdtempSync(join(tmpdir(), "sunproof-demo-"));
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: W, height: H } },
    locale: "ro-RO",
    timezoneId: "Europe/Bucharest",
  });
  // fill the context's HTTP cache (map tiles, fonts) so the map does not paint empty on camera
  const pre = await ctx.newPage();
  for (const path of ["/", "/harta?household=RO-TM-001"])
    await pre.goto(base + path, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => {});
  await pre.waitForTimeout(2500);
  await pre.close();
  await ctx.addInitScript(overlay);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20_000);
  const t0 = Date.now();
  log("recording");
  await scenes(page, base);
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const video = page.video();
  await ctx.close();
  rmSync(OUT_WEBM, { force: true });
  renameSync(await video.path(), OUT_WEBM);
  rmSync(videoDir, { recursive: true, force: true });
  log(`saved ${OUT_WEBM} (${seconds} s)`);

  const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
  if (spawnSync(ffmpeg, ["-version"]).status === 0) {
    const r = spawnSync(
      ffmpeg,
      ["-y", "-loglevel", "error", "-i", OUT_WEBM, "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT_MP4],
      { stdio: "inherit" },
    );
    log(r.status === 0 ? `saved ${OUT_MP4}` : "ffmpeg failed; webm only");
  } else if (!existsSync(OUT_MP4)) {
    log("ffmpeg not found; skipped mp4 (brew install ffmpeg, then rerun)");
  }
} finally {
  await browser.close();
  stopServers();
}
