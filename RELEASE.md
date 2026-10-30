# Release Checklist

Use this before uploading a new Chrome Web Store package.

## Preflight

- Run `npm run release:check`.
- Confirm the generated package is `dist/pronote-planner-v1.4.0.zip`.
- Confirm `git status --short` is clean except for intentional release version changes.
- Review `manifest.json` permissions against `STORE_LISTING.md`.
- Review `PRIVACY.md` for the current data flow.

## Local Chrome QA

- Open `chrome://extensions`.
- Enable Developer mode.
- Click **Load unpacked** and select this project folder.
- Open the popup and confirm the PRONOTE, Google Calendar, and schedule links render.
- Open Options and test:
  - Homework filters by search, type, difficulty, and due date.
  - Calendar week navigation.
  - Dragging a study session to another time.
  - Auto-fit week.
  - Start, pause, complete, and reset on a study session.
- Open the settings page from the gear button and test:
  - Study duration save/reset.
  - Allowed time window save/reset.
  - Notification settings save and reload.
  - Backup export and import with a test backup.
  - Capture diagnostics display.

## PRONOTE QA

- Open a real PRONOTE student page.
- Confirm the extension captures homework without downloading scanner junk files.
- Watch the Downloads folder through a full session: nothing should appear except files you
  explicitly exported (`.ics` export, JSON backup).
- Confirm homework appears in the popup and Options overview.
- Confirm Calendar study sessions are generated from the captured items.
- Confirm the settings page diagnostics panel shows the latest scan time, source, and item count.

## Calendar QA

- Sign in through the extension's Google Calendar flow.
- Run **Update calendar**.
- Confirm the managed calendar contains study sessions and recurring events.
- Move a study session in Options and confirm the next sync preserves the manual time.
- Download the `.ics` export and import it into a test calendar.

## Store Listing

- Use the single purpose, description, permission justifications, and privacy answers from `STORE_LISTING.md`.
- Upload the zip from `dist/`.
- Fill the Privacy tab with the same data handling story as `PRIVACY.md`.
- Add screenshots of the popup, homework overview, calendar, settings, and study session modal.

## Rollback

- Keep the previous accepted zip until the new version is approved.
- If review fails, read the rejection reason, patch the code or listing text, rerun `npm run release:check`, then upload a new zip.
- If users report a severe issue after approval, submit a new version that reverts the bad change and mention the rollback in release notes.

## References

- Chrome Web Store publish flow: https://developer.chrome.com/docs/webstore/publish
- Chrome Web Store privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Chrome Web Store developer policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome extension permission declarations: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
