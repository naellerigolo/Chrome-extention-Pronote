PRONOTE Planner (Lite) - Privacy Policy
======================================

Last updated: 2026-09-04

Summary
-------
- The extension runs locally in your browser.
- The previous tutor feature has been removed; legacy local credentials are purged during startup.
- PRONOTE page parsing and study planning happen on-device.
- Google Calendar sync (if enabled) writes only to a dedicated extension-managed calendar named "PRONOTE Planner".
- Calendar export can download a local `.ics` file for non-Google calendar apps.
- Due-tomorrow notifications can summarize stored homework/tests and reminders.
- Click capture does not collect form fields, passwords, or typed content.
- Files are written to your Downloads folder only when you click an export or backup button.

Data Processed
--------------
1) PRONOTE homework content
- Source: pages you open under `https://*.index-education.net/pronote/*`.
- Purpose: extract homework/tests and generate a study plan.
- Storage: `chrome.storage.local` (`pronoteItems`, bounded).

2) Recurring events and calendar overrides
- Purpose: keep recurring blocks and manual drag/drop schedule moves.
- Storage: `chrome.storage.local` (`recurringEvents`, `planOverrides`).
- Cleanup: stale overrides are pruned automatically when matching homework no longer exists.

3) Manual reminders and notifications
- Purpose: show dated or weekday reminders in the popup/planner and notify for due-tomorrow items.
- Storage: `chrome.storage.local` (`reminders`, `lastDueNotifyDate`).
- Notification content: item count plus short subject/reminder labels.

4) Google Calendar integration (optional)
- Scope: `https://www.googleapis.com/auth/calendar.app.created`.
- Behavior: the extension creates or reuses one dedicated calendar (`gcalCalendarId`) and syncs only extension-managed events using a private `pronoteKey`.
- It does not scan, modify, or delete unrelated events in your primary/personal calendars.

5) Calendar export and backups
- Purpose: download a local `.ics` file from stored homework, recurring events, and manual
  schedule overrides, or a JSON backup of extension settings and data.
- Trigger: an explicit click in the planner or settings page. No background task writes files.
- Storage/transport: generated locally through the browser downloads API; nothing is uploaded.

6) Click/activity capture (optional)
- Captured metadata: interaction kind, timestamp, current URL.
- Not captured: form input values, credentials, passwords, message bodies.
- Purpose: trigger safer capture timing on PRONOTE pages.

7) Optional ICS import
- Disabled by default. There is no UI switch in this version: `icsEnabled` / `icsUrl` are only
  set through a restored backup, so the feature is inactive for a normal install.
- When enabled, the extension requests your configured ICS URL. This is the only outbound
  request to a server that is neither PRONOTE nor Google, and the URL is one you supplied.
- The request sends no homework, reminders, or account data - it is a plain read of the feed.
- Parsed items are merged into `chrome.storage.local` only. The import writes no files to disk.
- The ICS URL is stored in `chrome.storage.sync`.
- Because the extension holds no host permission for arbitrary domains, the fetch succeeds only
  for feeds that serve permissive CORS headers.

Removed Tutor Cleanup
---------------------
- Legacy tutor credential keys are deleted during migration/startup.
- No tutor backend requests are made.

What We Do Not Do
-----------------
- No sale of personal data.
- No advertising trackers or analytics SDKs.
- No collection of form secrets for telemetry.

Retention and Deletion
----------------------
- Homework history and deleted history are bounded to reduce storage growth.
- Expired dated reminders are pruned when reminder views load.
- You can clear data by removing items in-app, resetting, or deleting extension storage in Chrome.
- Uninstalling the extension removes extension-managed local storage.

Security Notes
--------------
- Storage writes are bounded and error-checked.
- Calendar sync is isolated to an extension-managed calendar.
- User/content-derived HTML output is escaped in generated pages.

Compliance
----------
- The extension is intended for student planning workflows.
- Schools/users remain responsible for deployment-specific FERPA/GDPR assessments and policy controls.

Changes
-------
This policy may be updated when features, permissions, or data flows change.
