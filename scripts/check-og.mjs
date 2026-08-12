// Validates that every page has a working social card: all required Open
// Graph / Twitter Card meta tags present, the referenced image exists on
// disk, and it meets Twitter's actual requirements for summary_large_image
// (https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image):
//   - twitter:card must be "summary_large_image"
//   - image must exist, be a PNG/JPG, under 5MB, and at least 300x157px
//     with roughly a 2:1 aspect ratio (1200x630 is the target for this site)
//
// Run before every deploy. Exits non-zero (and lists every problem) if any
// page fails, so a broken card never ships. This never runs on Netlify's
// build — it's a local pre-push gate only.
//
// Usage: node scripts/check-og.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const REQUIRED_TAGS = [
  ["og:title", /property="og:title"\s+content="([^"]+)"/],
  ["og:description", /property="og:description"\s+content="([^"]+)"/],
  ["og:url", /property="og:url"\s+content="([^"]+)"/],
  ["og:image", /property="og:image"\s+content="([^"]+)"/],
  ["twitter:card", /name="twitter:card"\s+content="([^"]+)"/],
  ["twitter:title", /name="twitter:title"\s+content="([^"]+)"/],
  ["twitter:description", /name="twitter:description"\s+content="([^"]+)"/],
  ["twitter:image", /name="twitter:image"\s+content="([^"]+)"/],
];

function findPages(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findPages(full));
    else if (entry.name === "index.html") found.push(full);
  }
  return found;
}

function pngSize(buf) {
  // 8-byte signature, then IHDR chunk: 4-byte length, 4-byte "IHDR", 4-byte width, 4-byte height
  if (buf.length < 33 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  let i = 2;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function imageSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return pngSize(buf);
  if (buf[0] === 0xff && buf[1] === 0xd8) return jpegSize(buf);
  return null;
}

const MAX_BYTES = 5 * 1024 * 1024; // Twitter's hard limit
const MIN_W = 300, MIN_H = 157;

let failed = false;
const pages = findPages(root).sort();

for (const pagePath of pages) {
  const rel = path.relative(root, pagePath);
  const html = fs.readFileSync(pagePath, "utf8");
  const problems = [];
  const tags = {};

  for (const [name, re] of REQUIRED_TAGS) {
    const m = html.match(re);
    if (!m) problems.push(`missing <meta ${name}>`);
    else tags[name] = m[1];
  }

  if (tags["twitter:card"] && tags["twitter:card"] !== "summary_large_image") {
    problems.push(`twitter:card is "${tags["twitter:card"]}", expected "summary_large_image"`);
  }

  if (tags["og:image"] && tags["twitter:image"] && tags["og:image"] !== tags["twitter:image"]) {
    problems.push("og:image and twitter:image point to different URLs");
  }

  for (const key of ["og:image", "twitter:image"]) {
    const url = tags[key];
    if (!url) continue;
    if (!/^https:\/\//.test(url)) {
      problems.push(`${key} must be an absolute https:// URL, got "${url}"`);
      continue;
    }
    const localPath = path.join(root, new URL(url).pathname);
    if (!fs.existsSync(localPath)) {
      problems.push(`${key} points to ${url} but no file exists at ${path.relative(root, localPath)}`);
      continue;
    }
    const stat = fs.statSync(localPath);
    if (stat.size > MAX_BYTES) {
      problems.push(`${key} file is ${(stat.size / 1024 / 1024).toFixed(1)}MB, over Twitter's 5MB limit`);
    }
    const dims = imageSize(localPath);
    if (!dims) {
      problems.push(`${key} file at ${path.relative(root, localPath)} isn't a readable PNG/JPEG`);
    } else if (dims.width < MIN_W || dims.height < MIN_H) {
      problems.push(`${key} is ${dims.width}x${dims.height}, below Twitter's ${MIN_W}x${MIN_H} minimum`);
    } else {
      const ratio = dims.width / dims.height;
      if (ratio < 1.7 || ratio > 2.1) {
        problems.push(`${key} aspect ratio is ${ratio.toFixed(2)}:1, Twitter wants ~1.91:1 (e.g. 1200x630)`);
      }
    }
  }

  if (problems.length) {
    failed = true;
    console.log(`\x1b[31m✗ ${rel}\x1b[0m`);
    problems.forEach((p) => console.log(`    - ${p}`));
  } else {
    console.log(`\x1b[32m✓ ${rel}\x1b[0m`);
  }
}

if (failed) {
  console.log("\nOne or more pages have broken or missing social cards. Fix before deploying.");
  process.exit(1);
} else {
  console.log(`\nAll ${pages.length} page(s) have valid Open Graph + Twitter Card images.`);
}
