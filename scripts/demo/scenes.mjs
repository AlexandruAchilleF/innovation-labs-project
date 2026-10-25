/**
 * The storyboard (docs/pitch/2026-10-25-scenariu-video-demo.md) as code. Callouts carry only the feature's
 * title: the figures stay on screen in the app, where the camera already points.
 */
import { E } from "./director.mjs";

const txt = async (loc) => ((await loc.first().textContent()) ?? "").replace(/\s+/g, " ").trim();
const DESK_FULL = [0, 0, 1, 1, 0];
const PHONE_SOLO = [760, 110, 1, 1, 44];
const PHONE_SPLIT = [190, 110, 1, 1, 44];
const DESK_SPLIT = [780, 232, 0.56, 1, 10];

export async function scenes(d, { desk, phone, base, live }, mark) {
  // ------------------------------------------------------------------ 0:00 opening · landing
  mark("landing");
  d.place("desk", DESK_FULL);
  d.place("phone", [760, 1300, 1, 0, 44]);
  const h1 = desk.getByRole("heading", { level: 1 });
  await d.focus(desk, h1, { fill: 0.92, dur: 0, zMax: 1.6 });
  d.t.black.go(0, 1, 0);
  d.t.black.go(0, 0, 8, E.out);
  d.t.cursor.go(0, [2050, 980], 0);
  d.cam([960, 540, 1.08], 50, E.out);
  await d.wait(10);
  d.say("SunProof", "", { hold: 40, at: [430, 760] });
  const cta = desk.getByRole("link", { name: "Deschide portofoliul demo" }).nth(1); // the hero one
  await d.wait(14);
  await d.move(desk, cta, 22, { ease: E.out });
  await d.click(desk, cta, { dur: 0, punch: 2.5, after: 5 });
  d.veil(0.4, 7, 7);
  d.cue("whoosh", 0.9);
  await d.wait(7);

  // ------------------------------------------------------------------ 0:03 portfolio + map
  await desk.waitForURL(/\/harta/);
  await d.settle(2500);
  mark("harta");
  d.place("desk", [0, 0, 1, 1, 14]);
  d.place("desk", DESK_FULL, 18, E.out);
  d.cam([960, 540, 0.86], 0);
  d.cam([960, 540, 1], 18, E.out);
  d.veil(0, 0, 8);
  const side = desk.getByRole("complementary").first();
  const clients = side.getByText(/\d+ clienți/);
  await d.wait(6);
  await d.move(desk, clients, 14, { ax: 0.3 });
  d.say("Portofoliul furnizorului", "", { hold: 34 });
  await d.wait(14);
  const kpis = side.getByRole("group", { name: "Abateri în portofoliu" });
  const tiles = kpis.getByRole("button");
  await d.move(desk, tiles.nth(0), 10);
  d.say("Trei verificări pe fiecare client", "", { hold: 40 });
  await d.move(desk, tiles.nth(1), 9);
  await d.move(desk, tiles.nth(2), 9);
  const house = desk.getByRole("button", { name: /^RO-TM-001 / });
  await d.focus(desk, house, { fill: 0.22, dur: 22, zMax: 1.7, dy: -40 });
  d.cue("whoosh", 0.4);
  await d.move(desk, house, 22);
  d.say("Invertoare oprite pe același transformator", "", { hold: 40 });
  await d.wait(18);
  const scrub = desk.getByRole("slider", { name: "Ora din zi" });
  const sr = await d.rect(desk, scrub);
  d.cam([960, 760, 1.25], 20);
  await d.click(desk, { x: sr.x + sr.w * (40.5 / 96) - 1, y: sr.y, w: 2, h: sr.h }, { dur: 14, inflate: false, after: 2 });
  await d.click(desk, desk.getByRole("button", { name: "Redă ziua" }), { dur: 10, after: 2 });
  d.say("Ziua întreagă, la fiecare 15 minute", "", { hold: 50 });
  d.cam([1000, 600, 1.12], 50, E.inOut);
  await d.wait(46);
  await d.click(desk, desk.getByRole("button", { name: "Pauză" }), { dur: 8, after: 2 });

  // ------------------------------------------------------------------ 0:11 detail panel + what-if
  mark("detail");
  const sel = desk.getByRole("region", { name: "Clientul selectat" });
  d.cam([960, 540, 1], 14);
  await d.click(desk, sel.getByRole("button", { name: "Analiză detaliată" }), { dur: 14, after: 6 });
  const panel = desk.getByRole("complementary").filter({ hasText: "Analiză detaliată ·" });
  const sim6 = panel.getByText(/Declanșări simultane/).first();
  await d.focus(desk, sim6, { fill: 0.25, dur: 16, zMax: 1.8, dy: -60 });
  await d.move(desk, sim6, 16, { ax: 0.9 });
  d.say("Cauza: rețeaua de distribuție", "", { hold: 46 });
  await d.wait(34);
  const simulate = panel.getByRole("button", { name: "Simulează soluția" });
  await d.scroll(desk, simulate, { at: 0.45, dur: 16 });
  await d.focus(desk, simulate, { fill: 0.3, dur: 12, zMax: 1.8, dy: 40 });
  await d.click(desk, simulate, { dur: 12, after: 8 });
  d.say("Simulare: soluția distribuitorului", "", { hold: 46 });
  await d.wait(20);
  await d.click(desk, panel.getByRole("button", { name: "Pe hartă: după" }), { dur: 12, after: 2 });
  d.cam([820, 520, 1.15], 22, E.out);
  await d.wait(24);

  // ------------------------------------------------------------------ 0:18 analysis page
  mark("triaj");
  d.hush();
  d.cam([960, 540, 1], 10);
  await d.click(desk, desk.getByRole("navigation", { name: "Portal furnizor" }).getByRole("link", { name: "Analiză detaliată" }), { dur: 14, after: 4 });
  await desk.waitForURL(/\/triaj/);
  const main = desk.locator("main");
  const volt = main.getByRole("region", { name: "Tensiune & declanșări" });
  await d.focus(desk, volt.getByRole("img").first(), { fill: 0.8, dur: 14, zMax: 1.6 });
  await d.move(desk, volt.getByText("253 V").first(), 16);
  d.say("Peste limita legală de 253 V", "", { hold: 40 });
  await d.wait(26);
  const dossier = main.getByRole("button", { name: "Dosar tehnic OD" });
  d.cam([960, 300, 1.35], 14);
  await d.click(desk, dossier, { dur: 14, after: 4 });
  d.say("Dosar tehnic PDF pentru distribuitor", "", { hold: 40 });
  const inbox = desk.getByRole("button", { name: /Tichete Clienți/ });
  d.cam([1250, 200, 1.5], 18);
  d.t.cursorSize.go(d.f, 58, 10, E.back);
  await d.move(desk, inbox, 18);
  await d.wait(14);
  d.t.cursorSize.go(d.f, 46, 8);
  const batt = main.getByRole("region", { name: "Stocare & arbitraj PZU" });
  const thumb = batt.getByRole("slider");
  d.cam([960, 540, 1], 10);
  await d.scroll(desk, batt, { at: 0.05, dur: 16 });
  await d.focus(desk, thumb, { fill: 0.4, dur: 12, zMax: 1.7, dx: 120 });
  const tr = await thumb.evaluate((el) => {
    const r = el.closest(".touch-none").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const tb = await d.rect(desk, thumb);
  const at = (v) => [tr.x + ((v - 5) / 95) * tr.w, tb.y + tb.h / 2];
  await d.drag(desk, [tb.x + tb.w / 2, tb.y + tb.h / 2], at(20), 24);
  await d.click(desk, batt.getByRole("button", { name: /^Aplică/ }), { dur: 10, after: 4 });
  d.say("Rezerva bateriei: 80% → 20%", "", { hold: 40 });
  await d.wait(28);
  const list = main.getByRole("complementary");
  d.cam([960, 540, 1], 12);
  await d.click(desk, list.getByRole("button", { name: /^Dan Munteanu/ }), { dur: 14, after: 4 });
  const bill = main.getByRole("region", { name: "Decontare prosumator" });
  await d.scroll(desk, bill, { at: 0.05, dur: 14 });
  await d.focus(desk, bill, { fill: 0.9, dur: 12, zMax: 1.5 });
  await d.move(desk, bill.getByRole("definition").nth(3), 12);
  d.say("Factura ignoră energia injectată", "", { hold: 40 });
  await d.wait(28);

  // ------------------------------------------------------------------ 0:27 prosumer app · phone
  mark("prosumer");
  d.hush();
  d.cam([960, 540, 1], 10);
  await d.click(desk, desk.getByRole("link", { name: /Vezi ca Prosumator/ }), { dur: 14, after: 2 });
  d.place("desk", [-300, 260, 0.6, 0, 14], 18, E.in);
  d.place("phone", [760, 1150, 1, 1, 44], 0);
  d.place("phone", PHONE_SOLO, 22, E.out);
  d.cue("whoosh", 0.8);
  await d.wait(10);
  await desk.goto(`${base}/harta?household=RO-TM-001`); // off camera: ready for the ticket scene
  const scene = phone.getByRole("region", { name: "Instalația ta, în timp real" });
  await d.wait(10);
  await d.focus(phone, scene, { fill: 0.85, dur: 16, zMax: 2.1 });
  await d.move(phone, scene.getByRole("paragraph").nth(1), 16);
  d.say("Seara, bateria plină stă degeaba", "", { hold: 44 });
  await d.wait(28);
  const reserve = phone.getByRole("slider").last();
  d.cam([960, 540, 1], 10);
  await d.scroll(phone, reserve, { at: 0.5, dur: 16 });
  await d.focus(phone, reserve, { fill: 0.5, dur: 10, zMax: 1.9, dy: 30 });
  const rr = await reserve.evaluate((el) => {
    const r = el.closest(".touch-none").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const rb = await d.rect(phone, reserve);
  const pv = (v) => [rr.x + ((v - 5) / 95) * rr.w, rb.y + rb.h / 2];
  await d.drag(phone, [rb.x + rb.w / 2, rb.y + rb.h / 2], pv(85), 14);
  await d.drag(phone, pv(85), pv(15), 20);
  d.say("Ghid pas cu pas în aplicația invertorului", "", { hold: 40 });
  await d.wait(26);
  d.hush();
  d.cam([960, 540, 1], 12);
  // the account switcher sits in the sticky header
  const account = phone.getByRole("combobox", { name: "Alege contul de prosumator" });
  await d.click(phone, account, { dur: 12, after: 6 });
  await d.click(phone, phone.getByRole("option", { name: /Elena Ionescu/ }), { dur: 12, after: 4 });
  await d.until(scene);
  await d.scroll(phone, scene, { at: 0.13, dur: 14 });
  await d.focus(phone, scene, { fill: 0.85, dur: 14, zMax: 2.1 });
  const stop = scene.getByText(/^Oprit/).first();
  await d.move(phone, stop, 14);
  d.say("Se deschide pe minutul opririi", "", { hold: 40 });
  await d.wait(14);
  await d.click(phone, phone.getByRole("button", { name: "Derulează ziua" }), { dur: 12, after: 30 });
  await d.click(phone, phone.getByRole("button", { name: "Oprește derularea zilei" }), { dur: 6, after: 2 });
  const diag = phone.getByRole("region", { name: /Instalație Locală/ });
  d.cam([960, 540, 1], 10);
  await d.scroll(phone, diag, { at: 0.14, dur: 16 });
  await d.focus(phone, diag, { fill: 0.85, dur: 10, zMax: 1.9 });
  await d.move(phone, diag.getByText(/Cine rezolvă/), 12);
  d.say("Nu e rețeaua: e cablul casei", "", { hold: 44 });
  await d.wait(34);

  // ------------------------------------------------------------------ 0:41 the ticket loop
  mark("ticket");
  d.hush();
  d.place("phone", PHONE_SPLIT, 20, E.inOut);
  d.place("desk", [1100, 232, 0.56, 0, 10], 0);
  d.place("desk", DESK_SPLIT, 20, E.out);
  d.cam([960, 540, 1], 20);
  d.cue("whoosh", 0.7);
  const form = phone.getByRole("region", { name: "Trimite tichet către furnizor" });
  const box = form.getByRole("textbox", { name: "Mesajul tău" });
  await d.scroll(phone, form, { at: 0.12, dur: 20 });
  await d.focus(phone, box, { fill: 0.42, dur: 12, zMax: 1.7, dy: 60 });
  await d.click(phone, box, { dur: 10, inflate: false, after: 2 });
  await phone.keyboard.press("ControlOrMeta+A");
  await phone.keyboard.press("Backspace");
  d.say("Clientul trimite tichetul", "", { hold: 64 });
  await d.type(phone, "Invertorul se oprește zilnic la prânz. Trimiteți distribuitorul să repare rețeaua!", 56);
  const send = form.getByRole("button", { name: "Trimite tichetul către Furnizor" });
  d.hush();
  const sp = await d.rect(phone, send);
  await d.click(phone, send, { dur: 12, punch: 2.4, after: 6 });
  d.cam([960, 540, 1], 12, E.out);
  const [fx, fy] = d.toFrame(d.toStage("phone", [sp.x + sp.w / 2, sp.y + sp.h / 2]), d.f + 12);
  const tid = (await txt(form.getByRole("status").getByText(/Tichet/))).match(/#SP-\d+/)?.[0] ?? "";
  d.cardText = { kicker: `TICHET ${tid}`, title: "Elena Ionescu · Corbeanca", sub: "Invertorul se oprește la prânz · diagnostic atașat" };
  await d.wait(12);
  const ib = await d.rect(desk, inbox);
  const [tx, ty] = d.toFrame(d.toStage("desk", [ib.x + ib.w / 2, ib.y + ib.h / 2]));
  d.t.card.go(d.f, [fx, fy - 40, 0.9, 1, -4], 0);
  d.t.card.go(d.f + 1, [(fx + tx) / 2, Math.min(fy, ty) - 160, 1, 1, 3], 12, E.out);
  d.cue("whoosh", 0.7);
  await d.wait(13);
  d.t.card.go(d.f, [tx, ty, 0.2, 0, 0], 10, E.in);
  await d.wait(10);
  await live.syncTickets(phone, desk);
  d.cue("pop", 1);
  d.flashes.push({ f0: d.f, at: [d.toStage("desk", [ib.x, ib.y]), d.toStage("desk", [ib.x + ib.w, ib.y + ib.h])] });
  d.say("Tichet nou la furnizor", "", { hold: 30, at: d.toStage("desk", [ib.x, ib.y + ib.h]) });
  await d.wait(16);
  await d.focus(desk, { x: 0, y: 0, w: 1920, h: 1080 }, { fill: 1, dur: 18, zMax: 2 });
  await d.wait(4);
  await d.click(desk, inbox, { dur: 12, after: 6 });
  await d.click(desk, desk.getByRole("dialog").getByRole("button", { name: /Elena Ionescu/ }), { dur: 12, after: 30 });
  await d.click(desk, desk.getByRole("region", { name: "Clientul selectat" }).getByRole("button", { name: "Analiză detaliată" }), { dur: 14, after: 6 });
  const p2 = desk.getByRole("complementary").filter({ hasText: "Analiză detaliată ·" });
  await d.focus(desk, p2.getByRole("region", { name: "Tichet deschis de client" }), { fill: 0.35, dur: 14, zMax: 3.2, dy: 60 });
  await d.move(desk, p2.getByRole("region", { name: "Tichet deschis de client" }), 12);
  d.say("Cauza: instalația casei, nu rețeaua", "", { hold: 46 });
  await d.wait(32);
  await d.click(desk, p2.getByRole("button", { name: /Alocă intervenție O&M/ }), { dur: 12, after: 8 });
  const dlg = desk.getByRole("dialog", { name: "Alertă tehnician O&M" });
  await d.focus(desk, dlg, { fill: 0.75, dur: 12, zMax: 3 });
  d.say("Alertă O&M pe Telegram", "", { hold: 30 });
  await d.wait(10);
  await d.click(desk, dlg.getByRole("button", { name: "Trimite tehnicianului" }), { dur: 14, after: 14 });
  await d.focus(desk, inbox, { fill: 0.2, dur: 14, zMax: 3.4 });
  await d.move(desk, inbox, 14);
  d.say("Tichet închis automat", "", { hold: 24 });
  await d.wait(10);

  // ------------------------------------------------------------------ 0:56 end card
  mark("end");
  d.hush();
  d.cam([960, 540, 1], 16, E.inOut);
  d.place("phone", [640, 330, 0.5, 0.35, 44], 22, E.inOut);
  d.place("desk", [880, 420, 0.22, 0.35, 10], 22, E.inOut);
  d.t.cursorAlpha.go(d.f, 0, 8);
  d.cue("boom", 0.7, d.f + 8);
  await d.wait(10);
  d.title("SunProof", "Rețea · Baterie · Factură — fiecare verdict cu dovada lui", 999);
  return async (total) => {
    const left = total - d.f - 1;
    d.t.black.go(d.f + Math.max(0, left - 14), 1, 14, E.inOut);
    await d.wait(Math.max(0, left));
    d.t.black.go(d.f, 1, 0);
    await d.wait(1);
  };
}
