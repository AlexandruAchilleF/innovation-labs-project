import { chromium } from "playwright";
const base = "http://127.0.0.1:3765";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await ctx.clock.install({ time: new Date("2026-08-18T10:00:00+03:00") });
const p = await ctx.newPage();
const flush = () => p.evaluate(() => new Promise((r) => { const ch = new MessageChannel(); let n = 0; ch.port1.onmessage = () => (++n < 3 ? ch.port2.postMessage(0) : r()); ch.port2.postMessage(0); }));
const settle = async (ms) => { for (let i = 0; i < ms / 50; i++) { await ctx.clock.runFor(50); await flush(); await p.waitForTimeout(30); } };
let t0 = Date.now();
await p.goto(base + "/harta?household=RO-TM-001", { waitUntil: "domcontentloaded" });
await settle(4000);
console.log("harta settled", Date.now() - t0);
await p.screenshot({ path: "/tmp/proto/harta.jpg", quality: 70, scale: "css" });
t0 = Date.now();
for (let i = 0; i < 10; i++) { await ctx.clock.runFor(33.333); await flush(); await p.screenshot({ type: "jpeg", quality: 90, scale: "css" }); }
console.log("harta 10 frames css", Date.now() - t0);
t0 = Date.now();
for (let i = 0; i < 10; i++) { await ctx.clock.runFor(33.333); await flush(); await p.screenshot({ type: "jpeg", quality: 90, clip: { x: 600, y: 300, width: 960, height: 540 } }); }
console.log("harta 10 frames device clip", Date.now() - t0);
await p.goto(base + "/prosumator?household=RO-IF-002", { waitUntil: "domcontentloaded" });
await settle(2000);
const clockTxt = () => p.locator("section[aria-label='Instalația ta, în timp real'] p.num").first().textContent();
console.log("before", await clockTxt());
await p.getByRole("button", { name: "Derulează ziua" }).click();
t0 = Date.now();
for (let i = 0; i < 30; i++) { await ctx.clock.runFor(33.333); await flush(); await p.screenshot({ type: "jpeg", quality: 90, scale: "css" }); }
console.log("pros 30 frames", Date.now() - t0, "after", await clockTxt());
await p.screenshot({ path: "/tmp/proto/pros.jpg", quality: 70, scale: "css" });
await b.close();
