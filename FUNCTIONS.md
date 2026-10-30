PRONOTE Planner (Lite) - Function/Architecture Notes
====================================================

Updated: 2026-09-04

Overview
--------
The extension captures PRONOTE homework, stores a bounded local dataset,
builds study sessions, renders planner UI, optionally syncs sessions
to a dedicated Google Calendar, and can export the generated plan as `.ics`.

manifest.json
-------------
- MV3 service worker: `background.js`
- Content scripts on `https://*.index-education.net/pronote/*`:
  - `click_capture.js`
  - `scanner.js`
- Permissions include `storage`, `downloads`, `tabs`, `alarms`, `identity`, `notifications`, `unlimitedStorage`.
- `tabs` is needed to read `tab.url` in `chrome.tabs.onUpdated` (creating tabs needs no permission).
- Extension pages: `options.html` (options page), `popup.html` (action), `settings.html` (gear-button settings).
- Google OAuth scope is least-privilege: `calendar.app.created`.

click_capture.js
----------------
- Listens to click/submit events only.
- Sends minimal trigger metadata (`kind`, `time`, `url`).
- Does not patch global fetch/XHR.
- Does not collect form values.

scanner.js
----------
- Observes PRONOTE DOM and same-origin frames to extract homework.
- Extracts and stores homework/test items locally; download artifacts are no longer written during normal page scans.
- Bounded `pronoteItems` storage writes to control quota growth.
- `PRONOTE_SNAPSHOT_READY` carries only the captured homework JSON. The TXT/CSV/ICS and
  study-plan builders that fed the old download path are gone; the worker owns plan
  generation, so the scanner no longer duplicates it.

background.js
-------------
Core responsibilities:
1) Message broker for capture, imports, schedule retrieval, and sync.
2) Startup migration:
   - Sets extension state version.
   - Prunes oversized `pronoteItems`.
   - Removes legacy tutor credential keys (`aiBackendToken`, `aiBackendUser`, `aiBackendUrl`).
   - Drops the stale `skippedDownloads` field from stored capture diagnostics.
3) Schedule generation:
   - Builds study plan.
   - Adds recurring occurrences.
   - Applies manual overrides and prunes stale override entries.
4) Google Calendar sync isolation:
   - Creates/reuses dedicated managed calendar (`gcalCalendarId`).
   - Upserts/deletes only extension-managed events using immutable `pronoteKey`.
   - No title/day fallback matching against user calendars.
5) Calendar export:
   - Downloads a local `.ics` file from the same scheduled plan used by the calendar view.
   - Preserves manual drag/drop overrides and recurring occurrences.
   - User-triggered only (`saveAs: true`); no background path writes files to disk.
6) Due notifications:
   - Daily alarm summarizes homework/tests and reminders due tomorrow.
   - Notification clicks open the planner page.
7) Auto-sync reliability:
   - In-flight guard + dirty rerun queue to prevent lost updates.
8) Optional ICS import (`refreshIcsIfEnabled`):
   - Off unless `icsEnabled` / `icsUrl` are present in sync storage; no UI exposes them today.
   - Fetches the configured feed, merges parsed items into `pronoteItems`, and stops there -
     it does not write .txt/.json/.csv/.ics files to Downloads.
   - `PRONOTE_FETCH_ICS` from a content script is honoured only when the requested URL equals
     the stored `icsUrl`, so the worker cannot be used as a cross-origin fetch proxy.
   - No host permission covers arbitrary feed domains, so fetches need permissive CORS.

options/ and options.html
-------------------------
Layout:
- `options.html` loads `options/*.js` in filename order as plain scripts sharing one
  scope, so a file may only use names declared in a file above it.
- `01-globals.js` holds the constants, element handles and shared mutable state;
  `17-init.js` holds the listeners and start-up and has to stay last.
- The rest is one file per concern: storage wrappers, translations, static catalogues,
  language, software/techniques, onboarding, item helpers, homework list, schedule
  panels, overview, recurring, calendar helpers, study sessions, calendar rendering,
  and tabs/loading.
- `validate-release.js` fails the build if the script tags in `options.html` and the
  contents of `options/` drift apart.

Tabs:
- Homework, Recurring, Calendar, Software, Techniques.

Key behavior:
- Homework Overview opens with a summary header: one hero figure (upcoming item count),
  estimated study time, the next deadline, KPI tiles (due today / tomorrow / next 7 days /
  tests ahead / past hidden) and a busiest-subjects breakdown. It is computed from the
  same filtered set the grid renders, so it always describes what is on screen.
- Homework Overview shows the next study sessions with their clock times, taken from the
  worker's scheduled plan (`GET_LOCAL_SCHEDULE`) so they match the Calendar tab exactly.
- Sessions whose slot has passed without being marked done raise a check-in: "Done" marks
  the session completed, "Not yet" writes a `planOverrides` entry moving it to the day
  after the missed slot, clamped to today at the earliest and the due date at the latest.
  The check-in only appears on the worker-backed path, since locally built fallback events
  carry no plan id to key those writes on.
- Homework Overview renders one column per upcoming due date, in chronological order.
  Past work is hidden unless the "Show past items" filter is ticked.
- Onboarding flow is unified (single implementation), with safe DOM assignment for user values.
- Onboarding can persist recurring event draft into recurring storage.
- Deleting homework and reset actions clean/prune related plan overrides.
- Calendar tab can download an `.ics` export for non-Google calendar apps.
- Software icons use local assets (no external favicon lookup).
- Storage get/set/remove is centralized with `chrome.runtime.lastError` handling.
- The gear button navigates to `settings.html` (the consolidated settings page).

settings.js / settings.html
---------------------------
Consolidated settings page reached from the Options gear button.

Sections:
- Study durations per type/difficulty (save + reset to defaults).
- Allowed study time windows, in a weekly grid or classic list view.
- Language and time-format preferences.
- Due-tomorrow notification settings (enable, time, homework/reminder toggles).
- JSON backup export/import over the `BACKUP_LOCAL_KEYS` / `BACKUP_SYNC_KEYS` allow-lists.
- Capture diagnostics (last scan time, source, item count).

Storage access goes through the same wrapped `syncGet`/`syncSet`/`localSet` helpers with
`chrome.runtime.lastError` logging.

popup.js / popup.html
---------------------
- Google login + sync controls.
- Reminder form plus rendered reminder list with delete controls.
- Reset/rescan now clears `pronoteItems` and `planOverrides`.
- Status text informs users that sync targets the dedicated PRONOTE Planner calendar.

tests/
------
- `npm test` runs Node's built-in test runner against planner/parser/ICS behavior.
- The test harness loads `background.js` with stubbed Chrome APIs so tests exercise the real functions.

Docs + Compliance Notes
-----------------------
- `PRIVACY.md` reflects current runtime behavior (removed tutor, minimal capture, managed calendar isolation).
- This extension remains a client-side tool; deployment owners should still validate FERPA/GDPR obligations in their environment.
