"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const pub = path.join(__dirname, "..", "public");
const sw = fs.readFileSync(path.join(pub, "sw.js"), "utf8");
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

// The host serves index.html at ./ and privacy.html at privacy, and redirects the
// .html forms there. A cached redirect cannot open a page offline, so SHELL lists
// the served URL.
const served = (f) => (f === "index.html" ? "./" : f.replace(/\.html$/, ""));

test("every file in the offline shell exists", () => {
  for (const f of shell) {
    assert.ok(!f.endsWith(".html"), `${f}: list the page in SHELL as "${served(f)}"`);
    if (f === "./") continue;
    assert.ok(fs.existsSync(path.join(pub, f)) || fs.existsSync(path.join(pub, `${f}.html`)), `${f} is in SHELL but missing from public/`);
  }
});

test("every deployed file is in the offline shell", () => {
  // _headers is Cloudflare config and is never served. The social card is for link
  // previews: crawlers fetch it, no page loads it.
  const skip = new Set(["sw.js", "_headers", "icons/social-card.png"]);
  const files = walk(pub).map((f) => path.relative(pub, f).split(path.sep).join("/"))
    .filter((f) => !skip.has(f) && !f.endsWith(".txt"));
  const missing = files.filter((f) => !shell.includes(served(f)));
  assert.deepStrictEqual(missing, [], `add to SHELL in public/sw.js: ${missing.join(", ")}`);
});

test("manifest icons exist", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pub, "manifest.webmanifest"), "utf8"));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(pub, icon.src)), icon.src);
});

test("the service worker cache carries the app version", () => {
  const appVersion = fs.readFileSync(path.join(pub, "js/ui/app.js"), "utf8").match(/const APP_VERSION = '([^']+)'/)?.[1];
  const cacheName = sw.match(/const CACHE = "([^"]+)"/)?.[1];
  assert.ok(appVersion, "APP_VERSION not found in public/js/ui/app.js");
  assert.strictEqual(cacheName, `weightframe-v${appVersion}`);
});

test("the pages have no inline scripts", () => {
  for (const page of ["index.html", "privacy.html"]) {
    const html = fs.readFileSync(path.join(pub, page), "utf8");
    assert.deepStrictEqual(html.match(/<script(?![^>]*\ssrc=)[^>]*>/g), null, `${page}: move inline scripts to files, the CSP allows script-src 'self' only`);
  }
});
