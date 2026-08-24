import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 1230 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, "mockups.html")}`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(here, "cockpit-intelligence-menu-derived-comparison.png"), fullPage: true });

for (const variant of ["A", "B"]) {
  await page.locator(`[data-variant="${variant}"]`).screenshot({
    path: path.join(here, `cockpit-intelligence-menu-derived-variant-${variant.toLowerCase()}.png`),
  });
}

await browser.close();
