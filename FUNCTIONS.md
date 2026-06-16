PRONOTE Planner (Lite) - Function/Architecture Notes
====================================================

Updated: 2026-06-16

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
- Uses local hash utility (no `String.prototype` mutation).

background.js
-------------
Core responsibilities:
1) Message broker for capture, imports, schedule retrieval, and sync.
2) Startup migration:
   - Sets extension state version.
   - Prunes oversized `pronoteItems`.
   - Removes legacy tutor credential keys (`aiBackendToken`, `aiBackendUser`, `aiBackendUrl`).
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
6) Due notifications:
   - Daily alarm summarizes homework/tests and reminders due tomorrow.
   - Notification clicks open the planner page.
7) Auto-sync reliability:
   - In-flight guard + dirty rerun queue to prevent lost updates.

options.js / options.html
-------------------------
Tabs:
- Homework, Recurring, Calendar, Software, Techniques.

Key behavior:
- Onboarding flow is unified (single implementation), with safe DOM assignment for user values.
- Onboarding can persist recurring event draft into recurring storage.
- Deleting homework and reset actions clean/prune related plan overrides.
- Calendar tab can download an `.ics` export for non-Google calendar apps.
- Software icons use local assets (no external favicon lookup).
- Storage get/set/remove is centralized with `chrome.runtime.lastError` handling.

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
