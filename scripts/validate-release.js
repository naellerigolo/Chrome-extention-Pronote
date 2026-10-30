#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const manifest = readJson("manifest.json");
const pkg = readJson("package.json");

const requiredFiles = [
  "manifest.json",
  "background.js",
  "click_capture.js",
  "scanner.js",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "settings.html",
  "settings.js",
  "PRIVACY.md",
  "FUNCTIONS.md",
  "RELEASE.md",
  "STORE_LISTING.md"
];

const forbiddenPaths = [
  "TXT",
  "useless text",
  "Icon/Chapitre 2 (Cours).pdf",
  "Icon/bar.htlm.html",
  "Icon/bar.htlm_files",
  "Icon/Image.PNG",
  "Icon/Pronote.jpg"
];

const requiredPermissions = new Set([
  "downloads",
  "storage",
  "unlimitedStorage",
  "tabs",
  "alarms",
  "identity",
  "notifications"
]);

const problems = [];
const fail = (message) => problems.push(message);

if (manifest.manifest_version !== 3) fail("manifest.json must stay on Manifest V3.");
if (manifest.version !== pkg.version) fail(`manifest version (${manifest.version}) does not match package version (${pkg.version}).`);
if (String(manifest.name || "").length > 75) fail("manifest name is over Chrome Web Store's 75 character limit.");
if (!String(manifest.description || "").trim()) fail("manifest description is empty.");
if (String(manifest.description || "").length > 132) fail("manifest description is over Chrome Web Store's 132 character limit.");

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required release file: ${file}`);
}

for (const file of forbiddenPaths) {
  if (fs.existsSync(path.join(root, file))) fail(`Forbidden packaged-junk path came back: ${file}`);
}

for (const iconSize of ["16", "32", "64", "128"]) {
  const iconPath = manifest.icons && manifest.icons[iconSize];
  if (!iconPath || !fs.existsSync(path.join(root, iconPath))) fail(`Missing ${iconSize}px icon file.`);
}

const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
for (const permission of permissions) {
  if (!requiredPermissions.has(permission)) fail(`Unexpected permission in manifest: ${permission}`);
}
for (const permission of requiredPermissions) {
  if (!permissions.includes(permission)) fail(`Missing expected permission: ${permission}`);
}

const hostPermissions = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
if (!hostPermissions.includes("https://*.index-education.net/pronote/*")) fail("Missing PRONOTE host permission.");
if (!hostPermissions.includes("https://www.googleapis.com/*")) fail("Missing Google APIs host permission.");

const scannedFiles = [
  "manifest.json",
  "background.js",
  "options.html",
  "options.js",
  "popup.html",
  "popup.js",
  "scanner.js",
  "click_capture.js",
  "settings.html",
  "settings.js"
];

for (const file of scannedFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (/AI_SYSTEM_PROMPT|buildAiPromptFromItem|modalAskAi|section-ai|tab-ai/i.test(text)) {
    fail(`Removed AI tutor surface appears to be back in ${file}.`);
  }
}

if (problems.length) {
  console.error("Release validation failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Release validation passed.");
