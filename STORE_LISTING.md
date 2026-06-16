# Chrome Web Store Listing Draft

## Single Purpose

PRONOTE Planner turns PRONOTE homework into a local homework overview, reminders, study sessions, and optional Google Calendar events.

## Short Description

Capture PRONOTE homework, plan study sessions, manage reminders, and optionally sync the plan to Google Calendar.

## Detailed Description

PRONOTE Planner helps students turn homework from PRONOTE into an organized study plan. It captures homework from the PRONOTE student page, stores it locally, groups upcoming items, estimates study time, creates calendar study sessions, supports recurring personal events, and can optionally sync those sessions to a dedicated Google Calendar.

Key features:

- PRONOTE homework capture from supported PRONOTE pages.
- Homework overview with type, difficulty, due-date, and search filters.
- Automatic study-plan scheduling with priority-aware ordering.
- Calendar drag/drop for manual scheduling changes.
- Start, pause, complete, and reset controls for study sessions.
- Dated reminders and due-tomorrow notifications.
- Optional `.ics` export.
- Optional Google Calendar sync to an extension-managed calendar.
- JSON backup export/import.
- Local capture diagnostics to help troubleshoot scanner results.

## Permission Justifications

- `storage`: saves homework, reminders, preferences, study progress, and calendar overrides.
- `unlimitedStorage`: avoids data loss for students with many captured homework items and backup metadata.
- `downloads`: downloads `.ics` calendar exports and JSON backups.
- `tabs`: opens PRONOTE, Google Calendar, and extension pages from the popup and notifications.
- `alarms`: schedules background refresh and due-tomorrow notification checks.
- `notifications`: shows due-tomorrow reminder notifications.
- `identity`: signs in to Google only when the user enables Google Calendar sync.
- `https://*.index-education.net/pronote/*`: runs the scanner only on PRONOTE pages.
- `https://www.googleapis.com/*`: creates and updates the optional Google Calendar calendar.

## Privacy Practices Draft

Data collected or processed:

- Homework text, due dates, notes, difficulty/type edits, reminders, recurring events, calendar overrides, and study-session progress.
- Google Calendar authentication token only through Chrome Identity when the user chooses calendar sync.

Data use:

- Used only to provide the homework overview, reminders, study planning, export, backup, diagnostics, and optional Google Calendar sync.

Data sharing:

- No sale of data.
- No advertising use.
- No analytics service.
- Google Calendar event data is sent to Google only when the user enables sync or starts a manual calendar update.

Data storage:

- Extension data is stored in Chrome extension storage on the user's browser.
- Backups are downloaded only when the user clicks export.

Limited Use statement:

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Screenshot Checklist

- Popup with current homework and reminders.
- Homework overview with filters.
- Calendar with study sessions and recurring events.
- Study session modal.
- Settings page with notifications, backup, and diagnostics.
