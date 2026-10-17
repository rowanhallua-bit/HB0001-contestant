// Screenshot matrix for the storefront lab: every page × campus × state × width, plus a contact sheet.
// Pages read their lab state from the URL (?lab=1&school=<slug>&state=<state>&v=<variant>), so every shot is a shareable link.
//
//   cd tools/shots && npm install
//   node matrix.mjs --url http://localhost:3000 --paths /,/c/demo-chapter,/drop/demo --schools ua,olemiss --states full,empty --widths 390,1440
//   node matrix.mjs --schools all          (all campuses in mock/campuses.json)
//
// Writes PNGs and index.html to --out (default .impeccable/review/matrix). Flags console errors and sideways scroll per shot.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

const base = arg("url", "http://localhost:3000");
const paths = list(arg("paths", "/"));
const states = list(arg("states", "full,empty"));
const widths = list(arg("widths", "390,1440")).map(Number);
const variants = list(arg("variants", ""));
const out = join(repo, arg("out", ".impeccable/review/matrix"));
let schools = list(arg("schools", "ua,olemiss"));
if (schools[0] === "all") {
  const file = join(repo, "mock/campuses.json");
  schools = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).map((c) => c.slug) : ["ua", "olemiss"];
}

const chrome =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].find(existsSync);
if (!chrome) throw new Error("Chrome not found. Set CHROME_PATH.");

mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--disable-lcd-text", "--force-color-profile=srgb"] });
const shots = [];
for (const path of paths)
  for (const school of schools)
    for (const state of states)
      for (const v of variants.length ? variants : [""])
        for (const width of widths) {
          const q = new URLSearchParams({ lab: "1", school, state, ...(v && { v }) });
          const url = `${base}${path}${path.includes("?") ? "&" : "?"}${q}`;
          const name = [path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home", school, state, v, width].filter(Boolean).join("_");
          const page = await browser.newPage();
          // Skip the Impeccable live-mode helper (it holds an open connection, so networkidle never fires).
          await page.setRequestInterception(true);
          page.on("request", (r) => (r.url().includes(":8400/") ? r.abort() : r.continue()));
          // Collapse the lab panel so it never covers the page under test.
          await page.evaluateOnNewDocument(() => { try { localStorage.setItem("bidd-lab-open", "0"); } catch {} });
          const errors = [];
          page.on("console", (m) => m.type() === "error" && !m.location()?.url?.endsWith("/favicon.ico") && !m.location()?.url?.includes(":8400/") && errors.push(m.text()));
          page.on("pageerror", (e) => errors.push(e.message));
          await page.setViewport({ width, height: width < 600 ? 844 : 900, deviceScaleFactor: width < 600 ? 2 : 1 });
          await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
          await page.evaluate(() => document.fonts.ready);
          // Load lazy images before the full-page shot.
          await page.evaluate(async () => { for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager"; await new Promise((r) => setTimeout(r, 600)); });
          const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
          shots.push({ name, url, path, school, state, v, width, errors, sideways });
          console.log(`${name}${errors.length ? `  ${errors.length} console error(s)` : ""}${sideways ? "  SIDEWAYS SCROLL" : ""}`);
          await page.close();
        }
await browser.close();

const cell = (s) => `<figure><a href="${s.name}.png"><img src="${s.name}.png" loading="lazy" alt=""></a>
  <figcaption><b>${s.school} · ${s.state}${s.v ? " · " + s.v : ""} · ${s.width}</b><a href="${s.url}">${s.path}</a>${s.errors.length ? `<em>${s.errors.length} console error(s)</em>` : ""}${s.sideways ? "<em>sideways scroll</em>" : ""}</figcaption></figure>`;
writeFileSync(
  join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Storefront matrix</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:24px;background:#f5f5f5;color:#0b0b0b}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
figure{margin:0;background:#fff;border-radius:4px;overflow:hidden}img{width:100%;height:360px;object-fit:cover;object-position:top;display:block}
figcaption{display:grid;gap:2px;padding:8px 10px}figcaption a{color:#525252;font-size:12px;word-break:break-all}em{color:#0b0b0b;font-weight:700;font-style:normal}</style>
<h1>Storefront matrix · ${shots.length} shots</h1><div class="grid">${shots.map(cell).join("")}</div>`,
);
const bad = shots.filter((s) => s.errors.length || s.sideways);
console.log(`\n${shots.length} shots → ${join(out, "index.html")}${bad.length ? `\n${bad.length} with problems` : "\nno console errors, no sideways scroll"}`);
