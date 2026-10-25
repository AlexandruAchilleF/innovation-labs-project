import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const base = "http://127.0.0.1:3765";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const routes = process.argv.slice(2);
for (const r of routes) {
  await p.goto(base + r, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const name = r.replace(/[^a-z0-9]+/gi, "_");
  await p.screenshot({ path: `/tmp/inv/${name}.jpg`, quality: 70, fullPage: true });
  writeFileSync(`/tmp/inv/${name}.aria.txt`, await p.locator("body").ariaSnapshot());
}
await b.close();
