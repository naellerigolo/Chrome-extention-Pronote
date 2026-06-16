#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const distDir = path.join(root, "dist");
const version = String(manifest.version || "dev").replace(/[^a-zA-Z0-9._-]/g, "_");
const outFile = path.join(distDir, `pronote-planner-v${version}.zip`);

const entries = [
  "manifest.json",
  "background.js",
  "click_capture.js",
  "scanner.js",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "study_durations.html",
  "study_durations.js",
  "Icon",
  "PRIVACY.md",
  "FUNCTIONS.md"
];

const missing = entries.filter((entry) => !fs.existsSync(path.join(root, entry)));
if (missing.length) {
  console.error(`Missing package entries: ${missing.join(", ")}`);
  process.exit(1);
}

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(outFile, { force: true });

const zip = spawnSync("zip", ["-r", outFile, ...entries], {
  cwd: root,
  stdio: "inherit"
});

if (zip.error) {
  console.error(`Could not run zip: ${zip.error.message}`);
  process.exit(1);
}

if (zip.status !== 0) {
  console.error(`zip exited with status ${zip.status}`);
  process.exit(zip.status || 1);
}

console.log(`Created ${path.relative(root, outFile)}`);
