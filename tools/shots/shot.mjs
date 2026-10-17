// Quick screenshots while building: node shot.mjs <out-dir> <width> <url> [url...]
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
const [out, width, ...urls] = process.argv.slice(2);
const chrome = process.env.CHROME_PATH || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--force-color-profile=srgb"] });
let i = 0;
for (const url of urls) {
  const page = await browser.newPage();
  // Skip the Impeccable live-mode helper (it holds an open connection, so networkidle never fires).
  await page.setRequestInterception(true);
  page.on("request", (r) => (r.url().includes(":8400/") ? r.abort() : r.continue()));
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !m.location()?.url?.includes(":8400/") && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: Number(width), height: Number(width) < 600 ? 844 : 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const file = `${out}/shot-${i++}.png`;
  await page.screenshot({ path: file, fullPage: process.env.FULL === "1" });
  console.log(file, url, errors.length ? "ERRORS: " + errors.join(" | ").slice(0, 600) : "");
  await page.close();
}
await browser.close();
