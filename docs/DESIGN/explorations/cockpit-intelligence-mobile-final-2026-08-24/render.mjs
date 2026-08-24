import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1150 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, "final.html")}`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(here, "cockpit-intelligence-mobile-final.png"), fullPage: true });
await page.locator('[data-export="panel"]').screenshot({ path: path.join(here, "cockpit-intelligence-mobile-final-panel.png") });
await page.locator('[data-export="details"]').screenshot({ path: path.join(here, "cockpit-intelligence-mobile-final-details.png") });
await browser.close();
