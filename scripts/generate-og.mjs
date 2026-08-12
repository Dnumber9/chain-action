// Generates a 1200x630 social-share PNG for one page by screenshotting
// assets/og-template.html with the page's data in the query string.
// Runs locally only — Netlify never executes this during deploy.
//
// Usage:
//   node scripts/generate-og.mjs --out pages/<slug>/card.png \
//     --title "..." --tagline "..." --chain "..." --ticker "..." --date "..." \
//     --stat "Label:Value" --stat "Label:Value" --stat "Label:Value"

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { stat: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    i++;
    if (key === "stat") out.stat.push(val);
    else out[key] = val;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.out || !args.title) {
  console.error("Required: --out <path> --title <text>  (also: --tagline --chain --ticker --date --stat 'Label:Value' x N)");
  process.exit(1);
}

const params = new URLSearchParams();
for (const k of ["title", "tagline", "chain", "ticker", "date"]) {
  if (args[k]) params.set(k, args[k]);
}
for (const s of args.stat) params.append("stat", s);

const templateUrl = `file://${path.join(root, "assets", "og-template.html")}?${params.toString()}`;
const outPath = path.join(root, args.out);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(templateUrl);
await page.waitForTimeout(150); // let webfonts settle
const card = page.locator("#card");
await card.screenshot({ path: outPath });
await browser.close();

console.log(`Wrote ${args.out}`);
