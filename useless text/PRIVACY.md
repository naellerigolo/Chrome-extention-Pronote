PRONOTE Planner (Lite) - Privacy Policy
======================================

Last updated: 2026-03-06

Summary
-------
- The extension runs locally in your browser.
- AI chat/tutor features are currently disabled for security hardening.
- PRONOTE page parsing and study planning happen on-device.
- Google Calendar sync (if enabled) writes only to a dedicated extension-managed calendar named "PRONOTE Planner".
- Click capture does not collect form fields, passwords, or typed content.

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

3) Google Calendar integration (optional)
- Scope: `https://www.googleapis.com/auth/calendar.app.created`.
- Behavior: the extension creates or reuses one dedicated calendar (`gcalCalendarId`) and syncs only extension-managed events using a private `pronoteKey`.
- It does not scan, modify, or delete unrelated events in your primary/personal calendars.

4) Click/activity capture (optional)
- Captured metadata: interaction kind, timestamp, current URL.
- Not captured: form input values, credentials, passwords, message bodies.
- Purpose: trigger safer capture timing on PRONOTE pages.

5) Optional ICS import
- If enabled, the extension fetches your configured ICS URL and merges new homework locally.
- ICS URL is stored in sync settings; downloaded/generated files stay on your device.

AI Status
---------
- AI backend login, token storage, and chat execution are disabled.
- Legacy local AI keys are purged during migration/startup.
- No AI backend requests are made while disabled.

What We Do Not Do
-----------------
- No sale of personal data.
- No advertising trackers or analytics SDKs.
- No collection of form secrets for telemetry.

Retention and Deletion
----------------------
- Homework history and deleted history are bounded to reduce storage growth.
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
