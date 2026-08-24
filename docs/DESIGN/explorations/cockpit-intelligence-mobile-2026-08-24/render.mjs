import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1480, height: 1250 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, "mockups.html")}`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(here, "cockpit-intelligence-mobile-comparison.png"), fullPage: true });

for (const variant of ["A", "B", "C"]) {
  const locator = page.locator(`[data-variant="${variant}"]`);
  await locator.screenshot({ path: path.join(here, `cockpit-intelligence-mobile-variant-${variant.toLowerCase()}.png`) });
}

await browser.close();
