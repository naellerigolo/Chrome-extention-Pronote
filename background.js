"use strict";

// Values and pure helpers shared with the options and settings pages.
importScripts('shared/core.js');

const EXTENSION_ID = chrome.runtime.id;
const EXTENSION_URL = chrome.runtime.getURL('');
const PRONOTE_PAGE_RE = /^https:\/\/[^/]+\.index-education\.net\/pronote\//i;
const GCAL_CAL_ID_KEY = 'gcalCalendarId';
const EXT_STATE_VERSION_KEY = 'extensionStateVersion';
const EXT_STATE_VERSION = 2;
const MANAGED_CAL_SUMMARY = 'PRONOTE Planner';
const MANAGED_CAL_DESC_MARKER = '[managed-by-pronote-planner]';
const DEFAULT_DUE_NOTIFICATION_PREFS = {
  dueNotificationsEnabled: true,
  dueNotifyHour: 17,
  dueNotifyMinute: 0,
  dueNotifyHomework: true,
  dueNotifyReminders: true
};

let autoSyncTimer = null;
let autoSyncInFlight = false;
let autoSyncDirty = false;
let manualSyncInFlight = false;
let lastAuthError = '';

function toDataUrl(mime, text) {
  return `data:${mime};charset=utf-8,` + encodeURIComponent(text);
}

function warn(scope, err) {
  console.warn(`[${scope}]`, err && err.message ? err.message : err);
}

function localGet(defaults) {
  return new Promise((resolve) => {
    try { chrome.storage.local.get(defaults, resolve); }
    catch (e) { warn('localGet', e); resolve(defaults || {}); }
  });
}

function localSet(patch) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(patch, () => {
        if (chrome.runtime.lastError) warn('localSet', chrome.runtime.lastError.message);
        resolve();
      });
    } catch (e) { warn('localSet', e); resolve(); }
  });
}

function localRemove(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) warn('localRemove', chrome.runtime.lastError.message);
        resolve();
      });
    } catch (e) { warn('localRemove', e); resolve(); }
  });
}

function syncGet(defaults) {
  return new Promise((resolve) => {
    try { chrome.storage.sync.get(defaults, resolve); }
    catch (e) { warn('syncGet', e); resolve(defaults || {}); }
  });
}

async function runStartupMigration() {
  try {
    const cfg = await localGet({
      [EXT_STATE_VERSION_KEY]: 0,
      pronoteItems: [],
      planOverrides: {}
    });
    const ver = parseInt(cfg[EXT_STATE_VERSION_KEY], 10) || 0;
    const patch = {};
    if (ver < EXT_STATE_VERSION) patch[EXT_STATE_VERSION_KEY] = EXT_STATE_VERSION;
    const pruned = prunePronoteItems(cfg.pronoteItems);
    if (pruned.length !== (cfg.pronoteItems || []).length) patch.pronoteItems = pruned;
    if (Object.keys(patch).length) await localSet(patch);
    // Purge any leftover credentials from the removed tutor feature.
    await localRemove(['aiBackendToken', 'aiBackendUser', 'aiBackendUrl']);
    // Drop the diagnostics field left behind by the retired scan-time download path.
    const diag = await localGet({ captureDiagnostics: null });
    if (diag.captureDiagnostics && 'skippedDownloads' in diag.captureDiagnostics) {
      const cleaned = { ...diag.captureDiagnostics };
      delete cleaned.skippedDownloads;
      await localSet({ captureDiagnostics: cleaned });
    }
  } catch (e) {
    warn('startup-migration', e);
  }
}

async function updateCaptureDiagnostics(patch) {
  const previous = await localGet({ captureDiagnostics: {} });
  await localSet({
    captureDiagnostics: {
      ...(previous.captureDiagnostics || {}),
      ...patch,
      updatedAt: new Date().toISOString()
    }
  });
}

function isTrustedSender(sender) {
  return !!(sender && sender.id === EXTENSION_ID);
}

function isExtensionPageSender(sender) {
  return !!(sender && sender.url && sender.url.startsWith(EXTENSION_URL));
}

function isPronotePageSender(sender) {
  return !!(sender && sender.url && PRONOTE_PAGE_RE.test(sender.url));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (!isTrustedSender(sender)) {
    sendResponse({ ok: false, error: 'unauthorized' });
    return true;
  }
  const fromExtensionPage = isExtensionPageSender(sender);
  const fromPronotePage = isPronotePageSender(sender);
  if ((msg.type === 'GET_LOCAL_SCHEDULE' ||
      msg.type === 'GCAL_LOGIN' ||
      msg.type === 'GCAL_SYNC_NOW' ||
      msg.type === 'PRONOTE_EXPORT_ICS_NOW' ||
      msg.type === 'PRONOTE_IMPORT_ICS_NOW') && !fromExtensionPage) {
    sendResponse({ ok: false, error: 'forbidden' });
    return true;
  }
  if ((msg.type === 'PRONOTE_FETCH_ICS' ||
      msg.type === 'PRONOTE_CLICK_CAPTURED' ||
      msg.type === 'PRONOTE_NET_ACTIVITY' ||
      msg.type === 'PRONOTE_CAPTURE_STATUS' ||
      msg.type === 'PRONOTE_SNAPSHOT_READY') && !fromPronotePage) {
    sendResponse({ ok: false, error: 'forbidden' });
    return true;
  }
  if (msg.type === 'GET_LOCAL_SCHEDULE') {
    (async () => {
      try {
        const result = await buildScheduledPlanFromStorage();
        sendResponse({ ok: true, events: result.scheduled });
      } catch (e) { sendResponse({ ok: false, error: String(e) }); }
    })();
    return true;
  }
  if (msg.type === 'GCAL_LOGIN') {
    getTokenInteractive()
      .then(t => sendResponse(t
        ? { ok: true }
        : { ok: false, error: lastAuthError || 'Sign-in was cancelled', extensionId: EXTENSION_ID }))
      .catch(e => sendResponse({ ok: false, error: String((e && e.message) || e), extensionId: EXTENSION_ID }));
    return true;
  }
  if (msg.type === 'GCAL_SYNC_NOW') {
    if (manualSyncInFlight) {
      sendResponse({ ok: false, error: 'Sync already running. Please wait.' });
      return true;
    }
    manualSyncInFlight = true;
    (async () => {
      try {
        let token = await getTokenSilently();
        if (!token) token = await getTokenInteractive();
        if (!token) { sendResponse({ ok: false, error: lastAuthError ? `Google sign-in failed: ${lastAuthError}` : 'No token (login required)' }); return; }
        const storedObj = await new Promise(r => chrome.storage.local.get({ pronoteItems: [], recurringEvents: [], planOverrides: {} }, r));
        const items = storedObj.pronoteItems || [];
        const recurring = storedObj.recurringEvents || [];
        const overrides = storedObj.planOverrides || {};
        if (!items.length && !recurring.length) { sendResponse({ ok: true, upserted: 0, reason: 'no_items' }); return; }
        const cfg = await new Promise(r => chrome.storage.sync.get({ studyWindows: null, studyDurations: defaultStudyDurations, autoGcalEnabled: true, language: 'en' }, r));
        const durations = (cfg && cfg.studyDurations) || defaultStudyDurations;
        const plan = makeStudyPlan(items, durations, cfg.language || 'en');
        const recSlots = buildRecurringOccurrences(recurring, 365, cfg.language || 'en');
        if ((!plan || plan.length === 0) && !recSlots.length) { sendResponse({ ok: true, upserted: 0, reason: 'no_plan' }); return; }
        // Load study windows to schedule non-overlapping start/end times
        const ovResult = applyPlanOverrides(plan, overrides, cfg.studyWindows, cfg.language || 'en');
        const scheduledPlan = ovResult.events || [];
        const scheduled = scheduledPlan.concat(recSlots);
        if (ovResult.staleOverrideIds && ovResult.staleOverrideIds.length) {
          const next = { ...overrides };
          for (const id of ovResult.staleOverrideIds) delete next[id];
          await localSet({ planOverrides: next });
        }
        const calendarId = await ensureManagedCalendar(token);
        // Preload existing events in the date range to avoid duplicates and reduce API calls
        const idx = await preloadExistingEvents(token, calendarId, scheduled);
        console.info('[gcal sync] study slots:', plan.length, 'recurring slots:', recSlots.length);
        let result = await upsertGcalPlan(token, calendarId, scheduled, idx);
        const needsReconsent = (arr) => (arr || []).some(e => /\b(401|403)\b|insufficient|login required/i.test(String(e.error || '')));
        const calendarMissing = hasCalendarNotFound(result.errors);
        if (calendarMissing) {
          await localRemove([GCAL_CAL_ID_KEY]);
        }
        if (result.upserted === 0 && (needsReconsent(result.errors) || calendarMissing)) {
          // The token was rejected (401/403). chrome.identity caches it and would hand
          // back the SAME bad token on the next getAuthToken call, so evict it first to
          // force a genuinely fresh interactive grant.
          if (needsReconsent(result.errors) && token) {
            await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, () => { void chrome.runtime.lastError; r(); }));
          }
          const fresh = await getTokenInteractive();
          if (fresh) {
            const freshCalendarId = await ensureManagedCalendar(fresh);
            const idx2 = await preloadExistingEvents(fresh, freshCalendarId, scheduled);
            result = await upsertGcalPlan(fresh, freshCalendarId, scheduled, idx2);
          }
        }
        if (result.errors && result.errors.length) {
          console.warn('[gcal sync errors]', result.errors.slice(0, 3));
        }
        sendResponse({
          ok: true,
          upserted: result.upserted,
          deleted: result.deleted || 0,
          recCount: recSlots.length,
          studyCount: scheduled.length - recSlots.length,
          recRange: recSlots.length ? `${recSlots[0].date}..${recSlots[recSlots.length - 1].date}` : '',
          errors: result.errors || []
        });
      } catch (e) { sendResponse({ ok: false, error: String(e) }); }
      finally { manualSyncInFlight = false; }
    })();
    return true;
  }
  if (msg.type === 'PRONOTE_EXPORT_ICS_NOW') {
    (async () => {
      try {
        const result = await buildScheduledPlanFromStorage();
        if (!result.items.length && !result.recurring.length) {
          sendResponse({ ok: false, reason: 'no_items' });
          return;
        }
        if ((!result.plan || result.plan.length === 0) && !result.recSlots.length) {
          sendResponse({ ok: false, reason: 'no_plan' });
          return;
        }
        if (!result.scheduled.length) {
          sendResponse({ ok: false, reason: 'no_plan' });
          return;
        }
        const text = toScheduledICS(result.scheduled);
        const filename = `pronote_study_plan_${ymdLocal(new Date())}.ics`;
        const downloadId = await new Promise((resolve) => {
          try {
            chrome.downloads.download({
              url: toDataUrl('text/calendar', text),
              filename,
              saveAs: true,
              conflictAction: 'uniquify'
            }, (id) => {
              if (chrome.runtime.lastError) {
                warn('ics-export-download', chrome.runtime.lastError.message);
                resolve(null);
                return;
              }
              resolve(id);
            });
          } catch (e) {
            warn('ics-export-download', e);
            resolve(null);
          }
        });
        if (downloadId == null) {
          sendResponse({ ok: false, error: 'download_failed' });
          return;
        }
        sendResponse({ ok: true, count: result.scheduled.length, downloadId });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  if (msg.type === 'PRONOTE_IMPORT_ICS_NOW') {
    (async () => {
      try {
        const result = await refreshIcsIfEnabled();
        sendResponse({ ok: true, ...result });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  if (msg.type === 'PRONOTE_FETCH_ICS') {
    (async () => {
      try {
        // Content scripts may only ask for the feed the user configured, never an
        // arbitrary URL: the worker must not act as a cross-origin fetch proxy.
        const cfg = await new Promise(r => chrome.storage.sync.get({ icsEnabled: false, icsUrl: '' }, r));
        if (!cfg.icsEnabled || !cfg.icsUrl || String(msg.url || '') !== String(cfg.icsUrl)) {
          sendResponse({ ok: false, error: 'forbidden' });
          return;
        }
        const resp = await fetch(cfg.icsUrl, { cache: 'no-cache' });
        const text = await resp.text();
        sendResponse({ ok: true, text });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  if (msg.type === 'PRONOTE_CLICK_CAPTURED') {
    // Payload intentionally minimal and non-sensitive.
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'PRONOTE_NET_ACTIVITY') {
    try {
      const tabId = sender && sender.tab && sender.tab.id;
      if (tabId != null) {
        const targetUrl = sender.tab.url || '';
        const listener = (updatedTabId, info, tab) => {
          if (updatedTabId !== tabId) return;
          if (info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              try {
                chrome.tabs.sendMessage(tabId, { type: 'PRONOTE_FORCE_CAPTURE' }, () => { void chrome.runtime.lastError; });
              } catch (e) { warn('net-activity-send', e); }
            }, 1500);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        // Fallback: if no onUpdated fires (SPA), still try after 3s
        setTimeout(() => {
          try {
            chrome.tabs.sendMessage(tabId, { type: 'PRONOTE_FORCE_CAPTURE' }, () => { void chrome.runtime.lastError; });
          } catch (e) { warn('net-activity-fallback-send', e); }
        }, 3000);
      }
    } catch (e) { warn('net-activity', e); }
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'PRONOTE_CAPTURE_STATUS') {
    try {
      const tabId = sender && sender.tab && sender.tab.id;
      if (tabId != null && manualCaptureTabs.has(tabId)) {
        manualCaptureTabs.delete(tabId);
      }
      updateCaptureDiagnostics({
        lastScanAt: new Date().toISOString(),
        status: msg.changed ? 'changed' : 'unchanged',
        source: sender && sender.url || sender && sender.tab && sender.tab.url || ''
      }).catch(e => warn('capture-diagnostics-status', e));
    } catch (e) { warn('capture-status', e); }
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type !== "PRONOTE_SNAPSHOT_READY") return;
  // Scanning no longer writes export files to the Downloads folder.
  try {
    const tabId = sender && sender.tab && sender.tab.id;
    if (tabId != null && manualCaptureTabs.has(tabId)) {
      manualCaptureTabs.delete(tabId);
    }
  } catch (e) { warn('snapshot-cleanup', e); }
  try {
    let parsed = null;
    try { parsed = JSON.parse(msg.homeworkJson || '{}'); } catch { parsed = null; }
    const items = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    updateCaptureDiagnostics({
      lastScanAt: new Date().toISOString(),
      status: 'captured',
      source: parsed && parsed.source || sender && sender.url || sender && sender.tab && sender.tab.url || '',
      itemCount: items.length
    }).catch(e => warn('capture-diagnostics-snapshot', e));
  } catch (e) { warn('snapshot-diagnostics', e); }
  triggerAutoGcalSync('snapshot-no-download');
  sendResponse({ ok: true });
  return true;
});

// Daily ICS refresh (optional): fetch ICS, parse, merge, and overwrite stable files if new items exist
(function setupIcsAlarm() {
  try {
    const NAME = 'pronote-ics-refresh';
    function ensureAlarm() {
      return new Promise(resolve => {
        try {
          chrome.storage.sync.get({ icsEnabled: false }, (cfg) => {
            chrome.alarms.get(NAME, (alarm) => {
              try {
                if (cfg && cfg.icsEnabled) {
                  if (!alarm) chrome.alarms.create(NAME, { periodInMinutes: 24 * 60 });
                } else {
                  if (alarm) chrome.alarms.clear(NAME);
                }
              } catch (e) { warn('ics-ensure-alarm', e); }
              resolve();
            });
          });
        } catch (e) { warn('ics-ensure-alarm', e); resolve(); }
      });
    }
    chrome.runtime.onInstalled.addListener(ensureAlarm);
    chrome.runtime.onStartup.addListener(ensureAlarm);
    chrome.storage.onChanged.addListener((chg, area) => { if (area === 'sync' && (chg.icsEnabled || chg.icsUrl)) ensureAlarm(); });

    chrome.alarms.onAlarm.addListener((a) => {
      if (a.name !== NAME) return;
      try { refreshIcsIfEnabled(); } catch (e) { warn('ics-on-alarm', e); }
    });
  } catch (e) { warn('setup-ics-alarm', e); }
})();

// Daily "due tomorrow" notification for homework/tests and dated reminders.
function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveReminderISO(rem) {
  try {
    if (!rem) return null;
    if (rem.weekday) {
      const map = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const target = map[String(rem.weekday).toLowerCase()];
      if (target == null) return null;
      const d = new Date();
      let diff = target - d.getDay();
      if (diff <= 0) diff += 7; // "next" occurrence
      d.setDate(d.getDate() + diff);
      return ymdLocal(d);
    }
    const m = /^(\d{1,2})[\/](\d{1,2})$/.exec(String(rem.dateText || '').trim());
    if (!m) return null;
    const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10);
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
    const yr = parseInt(rem.dueYear, 10);
    let year = Number.isFinite(yr) && yr >= 2000 ? yr : (new Date()).getFullYear();
    if (!Number.isFinite(yr) || yr < 2000) {
      const todayISO = ymdLocal(new Date());
      const candidateISO = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      if (candidateISO < todayISO) year += 1;
    }
    return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  } catch { return null; }
}

async function runDueNotifications() {
  if (!chrome.notifications) return;
  const today = new Date();
  const todayISO = ymdLocal(today);
  const tomorrowISO = ymdLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));

  // Fire at most once per calendar day, even if the service worker restarts.
  const state = await localGet({ lastDueNotifyDate: '' });
  if (state.lastDueNotifyDate === todayISO) return;

  const stored = await localGet({ pronoteItems: [], reminders: [] });
  const items = Array.isArray(stored.pronoteItems) ? stored.pronoteItems : [];
  const reminders = Array.isArray(stored.reminders) ? stored.reminders : [];
  const cfg = await syncGet({ language: 'en', ...DEFAULT_DUE_NOTIFICATION_PREFS });
  const lang = cfg.language === 'fr' ? 'fr' : 'en';
  if (!cfg.dueNotificationsEnabled) return;
  const includeHomework = cfg.dueNotifyHomework !== false;
  const includeReminders = cfg.dueNotifyReminders !== false;

  const dueItems = includeHomework ? items.filter(it => it && it.dueDate === tomorrowISO) : [];
  const dueReminders = includeReminders ? reminders.filter(r => resolveReminderISO(r) === tomorrowISO) : [];
  const total = dueItems.length + dueReminders.length;
  if (!total) { await localSet({ lastDueNotifyDate: todayISO }); return; }

  const labels = [];
  for (const it of dueItems) {
    const subj = String(it.subject || (lang === 'fr' ? 'Sans titre' : 'Untitled')).trim();
    const kind = (it.type === 'test') ? (lang === 'fr' ? 'éval.' : 'test') : (lang === 'fr' ? 'devoir' : 'hw');
    labels.push(`${subj} (${kind})`);
  }
  for (const r of dueReminders) {
    labels.push(String(r.title || r.note || (lang === 'fr' ? 'Rappel' : 'Reminder')).trim());
  }

  const title = lang === 'fr'
    ? `${total} ${total > 1 ? 'éléments dus' : 'élément dû'} demain`
    : `${total} item${total > 1 ? 's' : ''} due tomorrow`;
  const shown = labels.slice(0, 6).join(' • ');
  const more = labels.length > 6 ? (lang === 'fr' ? ` +${labels.length - 6} de plus` : ` +${labels.length - 6} more`) : '';

  await new Promise(resolve => {
    try {
      chrome.notifications.create('pronote-due-' + todayISO, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('Icon/Logo_128.png'),
        title,
        message: shown + more,
        priority: 1
      }, () => { void chrome.runtime.lastError; resolve(); });
    } catch { resolve(); }
  });
  await localSet({ lastDueNotifyDate: todayISO });
}

(function setupDueNotifyAlarm() {
  try {
    const NAME = 'pronote-due-notify';

    function nextFireTime(hour, minute) {
      const hh = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
      const mm = Math.max(0, Math.min(59, parseInt(minute, 10) || 0));
      const now = new Date();
      const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (fire.getTime() <= now.getTime()) fire.setDate(fire.getDate() + 1);
      return fire.getTime();
    }

    function ensureAlarm() {
      return new Promise(resolve => {
        try {
          chrome.storage.sync.get(DEFAULT_DUE_NOTIFICATION_PREFS, (cfg) => {
            chrome.alarms.get(NAME, (alarm) => {
              try {
                const createNext = () => {
                  if (!(cfg && cfg.dueNotificationsEnabled)) {
                    resolve();
                    return;
                  }
                  chrome.alarms.create(NAME, {
                    when: nextFireTime(cfg.dueNotifyHour, cfg.dueNotifyMinute),
                    periodInMinutes: 24 * 60
                  });
                  resolve();
                };
                if (alarm) chrome.alarms.clear(NAME, createNext);
                else createNext();
              } catch (e) { warn('due-notify-ensure', e); resolve(); }
            });
          });
        } catch (e) { warn('due-notify-ensure', e); resolve(); }
      });
    }

    chrome.runtime.onInstalled.addListener(ensureAlarm);
    chrome.runtime.onStartup.addListener(ensureAlarm);
    chrome.storage.onChanged.addListener((chg, area) => {
      if (area === 'sync' && (
        chg.dueNotificationsEnabled ||
        chg.dueNotifyHour ||
        chg.dueNotifyMinute ||
        chg.dueNotifyHomework ||
        chg.dueNotifyReminders
      )) ensureAlarm();
    });

    chrome.alarms.onAlarm.addListener((a) => {
      if (a.name !== NAME) return;
      runDueNotifications().catch(e => warn('due-notify-run', e));
    });

    if (chrome.notifications && chrome.notifications.onClicked) {
      chrome.notifications.onClicked.addListener((id) => {
        if (!String(id).startsWith('pronote-due-')) return;
        try { chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }); } catch { }
        try { chrome.notifications.clear(id); } catch { }
      });
    }
  } catch (e) { warn('setup-due-notify-alarm', e); }
})();

async function refreshIcsIfEnabled() {
  const cfg = await new Promise(r => chrome.storage.sync.get({ icsEnabled: false, icsUrl: '', studyWindows: null, studyDurations: defaultStudyDurations }, r));
  if (!cfg.icsEnabled || !cfg.icsUrl) return;
  let text = '';
  try {
    const resp = await fetch(cfg.icsUrl, { cache: 'no-cache' });
    text = await resp.text();
  } catch (e) { warn('ics-fetch', e); return { ok: false, added: 0, total: 0 }; }
  const icsItems = parseICSHomework(text);
  if (!icsItems.length) return { ok: true, added: 0, total: (await chrome.storage.local.get({ pronoteItems: [] })).pronoteItems?.length || 0 };
  const storedObj = await new Promise(r => chrome.storage.local.get({ pronoteItems: [] }, r));
  let stored = storedObj.pronoteItems || [];
  const { merged, added } = mergeItems(stored, consolidateItems(icsItems));
  if (added === 0) return { ok: true, added: 0, total: merged.length };
  await localSet({ pronoteItems: prunePronoteItems(merged) });
  // Imported items stay in local storage only. Files are written to disk exclusively
  // through the user-triggered .ics export and JSON backup actions.
  return { ok: true, added, total: merged.length };
}

function norm(s) { return String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

function parseICSHomework(text) {
  try {
    const lines = String(text || '').split(/\r?\n/);
    const items = [];
    let ev = null;
    const push = () => {
      if (!ev) return;
      const dateStr = (ev.DTSTART || '').replace(/[^0-9T]/g, '');
      let ymd = '';
      if (/^\d{8}T?/.test(dateStr)) {
        const y = dateStr.slice(0, 4), m = dateStr.slice(4, 6), d = dateStr.slice(6, 8);
        ymd = `${y}-${m}-${d}`;
      }
      const summary = (ev.SUMMARY || '').trim();
      const desc = (ev.DESCRIPTION || '').replace(/\\n/g, '\n').trim();
      if (!ymd || !summary) { ev = null; return; }
      const tWords = ["controle", "évaluation", "evaluation", "interrogation", "ds", "test", "quiz", "examen", "epreuve", "épreuve"];
      const isTest = tWords.some(w => norm(summary).includes(norm(w)) || norm(desc).includes(norm(w)));
      items.push({ subject: summary, dueDate: ymd, type: isTest ? 'test' : 'homework', notes: desc });
      ev = null;
    };
    for (let raw of lines) {
      if (raw === 'BEGIN:VEVENT') { ev = {}; continue; }
      if (raw === 'END:VEVENT') { push(); continue; }
      if (!ev) continue;
      if (/^[ \t]/.test(raw)) { const k = ev._lastKey; if (k) ev[k] = (ev[k] || '') + raw.replace(/^\s+/, ''); continue; }
      const m = raw.match(/^([A-Z][A-Z0-9-]*)(?:;[^:]*)?:(.*)$/i); if (!m) continue;
      const key = m[1].toUpperCase(); ev[key] = m[2]; ev._lastKey = key;
    }
    return items;
  } catch { return []; }
}

function consolidateItems(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const byKey = new Map();
  const normSubj = s => String(s || '').replace(/:\s*$/, '').trim();
  const nkey = s => norm(normSubj(s));
  const contains = (a, b) => { const A = norm(a || ''), B = norm(b || ''); return A && B && A.includes(B); };
  for (const it of list) {
    if (!it || !it.dueDate) continue;
    const key = `${nkey(it.subject)}|${it.dueDate}`;
    const ex = byKey.get(key);
    if (!ex) byKey.set(key, { subject: normSubj(it.subject), dueDate: it.dueDate, type: it.type || 'homework', notes: (it.notes || '').trim() });
    else {
      const cur = ex.type || 'homework'; const inc = it.type || 'homework'; if (cur !== inc) ex.type = 'both';
      const a = ex.notes || '', b = String(it.notes || '').trim();
      if (!a) ex.notes = b; else if (!b) { } else if (contains(a, b)) { } else if (contains(b, a)) ex.notes = b; else ex.notes = `${a} ${b}`.trim();
    }
  }
  return Array.from(byKey.values());
}

function mergeItems(stored, items) {
  const k = it => `${norm((it.subject || '').trim())}|${it.dueDate || ''}|${it.type || ''}`;
  const map = new Map();
  for (const s of (stored || [])) map.set(k(s), s);
  let added = 0;
  for (const it of (items || [])) { const kk = k(it); if (!map.has(kk)) { map.set(kk, it); added++; } }
  const merged = Array.from(map.values()).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || (a.subject || '').localeCompare(b.subject || ''));
  return { merged, added };
}

function pad(n) { return String(n).padStart(2, '0'); }
function dateFromISO(iso) { const [y, m, d] = iso.split('-').map(v => parseInt(v, 10)); return new Date(y, m - 1, d); }
function isoFromDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function resolveDifficulty(value) {
  const text = String(value || '').toLowerCase();
  if (text === 'easy' || text === 'hard') return text;
  if (text.includes('epreuve') || text.includes('épreuve')) return 'hard';
  return 'medium';
}

function daysUntilISO(iso) {
  const due = dateFromISO(iso);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function calculatePriorityScore(item, sessionDate = '') {
  if (!item) return 0;
  const kind = resolveItemKind(item);
  const diff = resolveDifficulty(item.difficulty);
  const days = daysUntilISO(item.dueDate || sessionDate);
  let score = 10;
  if (kind === 'test') score += 40;
  if (diff === 'hard') score += 25;
  else if (diff === 'medium') score += 12;
  if (days <= 1) score += 35;
  else if (days <= 3) score += 26;
  else if (days <= 7) score += 16;
  else if (days <= 14) score += 8;
  const notesLen = String(item.notes || '').length;
  if (notesLen > 140) score += 8;
  else if (notesLen > 80) score += 4;
  const manual = parseInt(item.manualMinutes, 10);
  if (Number.isFinite(manual) && manual >= 75) score += 6;
  if (sessionDate && item.dueDate) {
    const spacing = Math.max(0, Math.round((dateFromISO(item.dueDate) - dateFromISO(sessionDate)) / 86400000));
    if (spacing <= 1) score += 4;
  }
  return Math.max(0, Math.min(99, score));
}

function planPriorityScore(row) {
  const explicit = parseInt(row?.priorityScore, 10);
  if (Number.isFinite(explicit)) return explicit;
  return /^(r[ée]vision|review)\b/i.test(row?.title || '') ? 20 : 0;
}

function comparePlanRows(a, b) {
  return planPriorityScore(b) - planPriorityScore(a) ||
    (a.title || '').localeCompare(b.title || '') ||
    (a.id || '').localeCompare(b.id || '');
}

async function buildScheduledPlanFromStorage() {
  const storedObj = await localGet({ pronoteItems: [], recurringEvents: [], planOverrides: {} });
  const cfg = await syncGet({ studyWindows: null, studyDurations: defaultStudyDurations, language: 'en' });
  const items = Array.isArray(storedObj.pronoteItems) ? storedObj.pronoteItems : [];
  const recurring = Array.isArray(storedObj.recurringEvents) ? storedObj.recurringEvents : [];
  const overrides = storedObj.planOverrides || {};
  const durations = (cfg && cfg.studyDurations) || defaultStudyDurations;
  const plan = makeStudyPlan(items, durations, cfg.language || 'en');
  const recSlots = buildRecurringOccurrences(recurring, 365, cfg.language || 'en');
  const ovResult = applyPlanOverrides(plan, overrides, cfg.studyWindows, cfg.language || 'en');
  if (ovResult.staleOverrideIds && ovResult.staleOverrideIds.length) {
    const next = { ...overrides };
    for (const id of ovResult.staleOverrideIds) delete next[id];
    await localSet({ planOverrides: next });
  }
  return {
    cfg,
    items,
    recurring,
    plan,
    recSlots,
    scheduledPlan: ovResult.events || [],
    scheduled: (ovResult.events || []).concat(recSlots),
    staleOverrideIds: ovResult.staleOverrideIds || []
  };
}

function makeStudyPlan(items, studyDurations, language = 'en') {
  const isFr = String(language || '').toLowerCase() === 'fr';
  const sessions = [];
  const todayISO = isoFromDate(new Date());
  const buildDatesFromOffsets = (due, dueISO, offsets) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Set();
    const out = [];
    for (const off of (offsets || [])) {
      const d = new Date(due);
      d.setDate(d.getDate() - off);
      if (isoFromDate(d) < todayISO) d.setTime(today.getTime());
      const iso = isoFromDate(d);
      if (iso >= dueISO) continue;
      if (seen.has(iso)) continue;
      seen.add(iso);
      out.push(iso);
    }
    return out.sort();
  };

  const getMinutes = (it) => {
    const type = resolveItemKind(it);
    const diff = resolveDifficulty(it.difficulty);
    const source = studyDurations && studyDurations[type] ? studyDurations[type] : defaultStudyDurations[type];
    const fallback = defaultStudyDurations[type][diff] || defaultStudyDurations[type].medium;
    if (source && typeof source[diff] === 'number' && source[diff] > 0) return source[diff];
    return fallback;
  };
  const list = Array.isArray(items) ? items : [];
  const clampSessionCount = (it) => {
    const raw = parseInt(it?.sessionCount, 10);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.min(6, Math.max(1, raw));
  };
  for (let itemIdx = 0; itemIdx < list.length; itemIdx++) {
    const it = list[itemIdx];
    if (!it || !it.dueDate) continue;
    const due = dateFromISO(it.dueDate);
    const dueISO = isoFromDate(due);
    const notesLen = (it.notes || '').length;
    const kind = resolveItemKind(it);
    const manual = parseInt(it.manualMinutes, 10);
    const minutes = Number.isFinite(manual) && manual > 0 ? manual : getMinutes(it);
    const sessionCount = clampSessionCount(it);
    if (kind === 'test') {
      const count = sessionCount || 4;
      const offsets = Array.from({ length: count }, (_, i) => count - i);
      const dates = buildDatesFromOffsets(due, dueISO, offsets);
      for (let idx = 0; idx < dates.length; idx++) {
        const priorityScore = calculatePriorityScore(it, dates[idx]);
        sessions.push({
          id: `${it.dueDate || ''}|${it.subject || ''}|test|${idx}|${itemIdx}`,
          date: dates[idx],
          minutes,
          priorityScore,
          dueDate: it.dueDate || '',
          itemType: 'test',
          difficulty: resolveDifficulty(it.difficulty),
          title: `${isFr ? 'Révision' : 'Review'} ${it.subject || ''} (${idx + 1}/${dates.length})`.trim(),
          notes: `${isFr ? 'Préparer' : 'Prepare'} ${it.subject || ''} ${isFr ? 'pour le' : 'for'} ${dueISO}. ${(it.notes || '').slice(0, 160)}`
        });
      }
    } else {
      const offsets = sessionCount
        ? Array.from({ length: sessionCount }, (_, i) => sessionCount - i)
        : notesLen > 140 ? [3, 2, 1] : notesLen > 80 ? [2, 1] : [1];
      const dates = buildDatesFromOffsets(due, dueISO, offsets);
      for (let idx = 0; idx < dates.length; idx++) {
        const priorityScore = calculatePriorityScore(it, dates[idx]);
        sessions.push({
          id: `${it.dueDate || ''}|${it.subject || ''}|hw|${idx}|${itemIdx}`,
          date: dates[idx],
          minutes,
          priorityScore,
          dueDate: it.dueDate || '',
          itemType: 'homework',
          difficulty: resolveDifficulty(it.difficulty),
          title: `${isFr ? 'Devoir' : 'Homework'} ${it.subject || ''} (${idx + 1}/${dates.length})`.trim(),
          notes: `${isFr ? 'Terminer' : 'Finish'} ${it.subject || ''} ${isFr ? 'pour le' : 'for'} ${dueISO}. ${(it.notes || '').slice(0, 160)}`
        });
      }
    }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date) || comparePlanRows(a, b));
  return sessions;
}

function buildRecurringOccurrences(list, horizonDays = 365, language = 'en') {
  const out = [];
  const recs = Array.isArray(list) ? list : [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startBase = new Date(today);
  for (const rec of recs) {
    const days = (rec && rec.days ? rec.days : []).map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6);
    if (!rec || !rec.time || !days.length) continue;
    const parts = String(rec.time).split(':').map(x => parseInt(x, 10) || 0);
    const hh = Math.max(0, Math.min(23, parts[0] || 0));
    const mm = Math.max(0, Math.min(59, parts[1] || 0));
    const duration = Math.max(5, parseInt(rec.duration, 10) || 60);
    const skipWeeks = Math.max(0, parseInt(rec.skipWeeks, 10) || 0);
    const startDate = new Date(startBase);
    if (skipWeeks > 0) startDate.setDate(startDate.getDate() + skipWeeks * 7);
    for (let i = 0; i < horizonDays; i++) {
      const d = new Date(startDate); d.setDate(startDate.getDate() + i);
      if (!days.includes(d.getDay())) continue;
      const iso = isoFromDate(d);
      const start = rfc3339Local(iso, hh, mm);
      const end = addMinutesRfc3339(start, duration);
      const keySeed = `rec|${iso}|${rec.title || ''}|${rec.time || ''}|${duration}`;
      out.push({
        date: iso,
        minutes: duration,
        title: rec.title || (language === 'fr' ? 'Événement récurrent' : 'Recurring event'),
        notes: rec.notes || '',
        startDateTime: start,
        endDateTime: end,
        pronoteKey: `rec-${simpleHash(keySeed)}`
      });
    }
  }
  return out;
}

function toICS(rows, studyWindows) {
  const pad = (n) => String(n).padStart(2, '0');
  const dtStamp = new Date(); const dtStampStr = `${dtStamp.getUTCFullYear()}${pad(dtStamp.getUTCMonth() + 1)}${pad(dtStamp.getUTCDate())}T${pad(dtStamp.getUTCHours())}${pad(dtStamp.getUTCMinutes())}${pad(dtStamp.getUTCSeconds())}Z`;
  const escText = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PRONOTE Auto Study Plan//EN'];
  const gapMinutes = 5; const fmtLocal = dt => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const parseHM = t => { const [H, M] = String(t || '').split(':').map(x => parseInt(x, 10) || 0); return H * 60 + M; };
  const minutesToDate = (y, m, d, total) => new Date(y, m - 1, d, Math.floor(total / 60), total % 60, 0);
  const byDate = new Map(); for (const r of (rows || [])) { if (!r || !r.date) continue; if (!byDate.has(r.date)) byDate.set(r.date, []); byDate.get(r.date).push(r); }
  let uidCounter = 0; const sortedDates = Array.from(byDate.keys()).sort();
  for (const date of sortedDates) {
    const sessions = byDate.get(date).slice().sort(comparePlanRows);
    const [y, m, d] = date.split('-').map(x => parseInt(x, 10)); const weekday = (new Date(y, m - 1, d)).getDay();
    const wins = (studyWindows && studyWindows[String(weekday)] || []).map(w => ({ start: parseHM(w.start), end: parseHM(w.end) })).sort((a, b) => a.start - b.start);
    let winIdx = 0; let cursorMin = wins.length ? wins[0].start : 18 * 60;
    for (const s of sessions) {
      const mins = parseInt(s.minutes, 10) || 0;
      if (wins.length) {
        while (winIdx < wins.length && cursorMin > wins[winIdx].end) winIdx++;
        if (winIdx >= wins.length) cursorMin = wins[wins.length - 1].end + gapMinutes; else if (cursorMin < wins[winIdx].start) cursorMin = wins[winIdx].start;
        while (winIdx < wins.length && (cursorMin + mins) > wins[winIdx].end) { winIdx++; if (winIdx < wins.length) cursorMin = Math.max(cursorMin, wins[winIdx].start); }
        if (winIdx >= wins.length) cursorMin = wins[wins.length - 1].end + gapMinutes;
      }
      const start = minutesToDate(y, m, d, cursorMin), end = minutesToDate(y, m, d, cursorMin + mins); cursorMin += mins + gapMinutes;
      const uid = `${y}${pad(m)}${pad(d)}-${uidCounter++}-${simpleHash(String(s.title || ''))}@pronote-studyplan`;
      lines.push('BEGIN:VEVENT'); lines.push(`DTSTAMP:${dtStampStr}`); lines.push(`DTSTART:${fmtLocal(start)}`); lines.push(`DTEND:${fmtLocal(end)}`); lines.push(`SUMMARY:${escText(s.title)}`); lines.push(`DESCRIPTION:${escText(s.notes || '')}`); lines.push(`UID:${uid}`); lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR'); return lines.join('\n');
}

function toScheduledICS(rows) {
  const pad2 = (n) => String(n).padStart(2, '0');
  const dtStamp = new Date();
  const dtStampStr = `${dtStamp.getUTCFullYear()}${pad2(dtStamp.getUTCMonth() + 1)}${pad2(dtStamp.getUTCDate())}T${pad2(dtStamp.getUTCHours())}${pad2(dtStamp.getUTCMinutes())}${pad2(dtStamp.getUTCSeconds())}Z`;
  const escText = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const fmtLocal = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PRONOTE Planner//EN'];
  let uidCounter = 0;
  for (const r of (rows || [])) {
    if (!r) continue;
    const mins = Math.max(5, parseInt(r.minutes, 10) || 30);
    const startValue = r.startDateTime || (r.date ? rfc3339Local(r.date, 18, 0) : '');
    const endValue = r.endDateTime || (startValue ? addMinutesRfc3339(startValue, mins) : '');
    const start = fmtLocal(startValue);
    const end = fmtLocal(endValue);
    if (!start || !end) continue;
    const seed = r.pronoteKey || r.id || `${r.date || ''}|${r.title || ''}|${uidCounter}`;
    const uid = `${simpleHash(seed)}-${uidCounter++}@pronote-studyplan`;
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTAMP:${dtStampStr}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${escText(r.title || 'Study session')}`);
    lines.push(`DESCRIPTION:${escText(r.notes || '')}`);
    lines.push(`UID:${uid}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\n');
}

// Compute non-overlapping start/end times for GCal based on study windows
function schedulePlan(rows, studyWindows) {
  const gapMinutes = 5;
  const parseHM = t => { const [H, M] = String(t || '').split(':').map(x => parseInt(x, 10) || 0); return H * 60 + M; };
  const byDate = new Map();
  for (const r of (rows || [])) { if (!r || !r.date) continue; if (!byDate.has(r.date)) byDate.set(r.date, []); byDate.get(r.date).push(r); }
  const out = [];
  const sortedDates = Array.from(byDate.keys()).sort();
  for (const date of sortedDates) {
    const list = byDate.get(date).slice().sort(comparePlanRows);
    const [y, m, d] = date.split('-').map(x => parseInt(x, 10));
    const weekday = (new Date(y, (m - 1), d)).getDay();
    const wins = (studyWindows && studyWindows[String(weekday)] || []).map(w => ({ start: parseHM(w.start), end: parseHM(w.end) })).sort((a, b) => a.start - b.start);
    let winIdx = 0;
    let cursorMin = wins.length ? wins[0].start : 18 * 60;
    for (const s of list) {
      const mins = parseInt(s.minutes, 10) || 0;
      if (wins.length) {
        while (winIdx < wins.length && cursorMin > wins[winIdx].end) winIdx++;
        if (winIdx >= wins.length) cursorMin = wins[wins.length - 1].end + gapMinutes; else if (cursorMin < wins[winIdx].start) cursorMin = wins[winIdx].start;
        while (winIdx < wins.length && (cursorMin + mins) > wins[winIdx].end) { winIdx++; if (winIdx < wins.length) cursorMin = Math.max(cursorMin, wins[winIdx].start); }
        if (winIdx >= wins.length) cursorMin = wins[wins.length - 1].end + gapMinutes;
      }
      const hour = Math.floor(cursorMin / 60), minute = cursorMin % 60;
      const start = rfc3339Local(date, hour, minute);
      const end = addMinutesRfc3339(start, mins);
      cursorMin += mins + gapMinutes;
      out.push({ ...s, startDateTime: start, endDateTime: end });
    }
  }
  return out;
}

// Apply manual overrides (date/time) to study plan rows; returns combined scheduled events
function applyPlanOverrides(plan, overrides, studyWindows, language = 'en') {
  const overrideIds = new Set(Object.keys(overrides || {}));
  const byId = new Map((plan || []).map(p => [p.id, p]));
  const manual = [];
  const staleOverrideIds = [];
  const defaultTitle = language === 'fr' ? 'Séance de révision' : 'Study session';
  for (const [id, ov] of Object.entries(overrides || {})) {
    if (!ov || !ov.date || !ov.time) continue;
    const base = byId.get(id);
    if (!base) {
      staleOverrideIds.push(id);
      continue;
    }
    const minutes = Math.max(5, parseInt(ov.minutes, 10) || (base ? base.minutes : 30) || 30);
    const title = ov.title || base?.title || defaultTitle;
    const [hh, mm] = String(ov.time).split(':').map(v => parseInt(v, 10) || 0);
    const start = rfc3339Local(ov.date, hh, mm);
    const end = addMinutesRfc3339(start, minutes);
    manual.push({
      ...(base || {}),
      id,
      date: ov.date,
      minutes,
      title,
      startDateTime: start,
      endDateTime: end,
      pronoteKey: id
    });
  }
  const remaining = (plan || []).filter(p => !overrideIds.has(p.id));
  const scheduled = schedulePlan(remaining, studyWindows);
  return { events: scheduled.concat(manual), staleOverrideIds };
}

// Preload existing events for the plan date range to avoid duplicates
async function preloadExistingEvents(token, calendarId, rows) {
  const headers = { 'Authorization': 'Bearer ' + token };
  const dates = (rows || []).map(r => r.date).filter(Boolean);
  const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  dates.push(todayIso);
  dates.sort();
  if (!dates.length) return { byPronoteKey: new Map() };
  const start = rfc3339Local(dates[0], 0, 0);
  const end = rfc3339Local(dates[dates.length - 1], 23, 59);
  const byPronoteKey = new Map();
  const duplicateIdsByPronoteKey = new Map();
  async function fetchPage(pageToken) {
    const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', timeMin: start, timeMax: end, maxResults: '2500' });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` + params.toString();
    const res = await fetch(url, { headers }); if (!res.ok) return { ok: false };
    const data = await res.json();
    for (const ev of (data.items || [])) {
      const pkey = ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.pronoteKey;
      if (!pkey || !ev.id) continue;
      if (!byPronoteKey.has(pkey)) {
        byPronoteKey.set(pkey, ev.id);
        continue;
      }
      const dups = duplicateIdsByPronoteKey.get(pkey) || [];
      dups.push(ev.id);
      duplicateIdsByPronoteKey.set(pkey, dups);
    }
    return { ok: true, nextPageToken: data.nextPageToken };
  }
  let pageToken = null; do { const r = await fetchPage(pageToken); if (!r.ok) break; pageToken = r.nextPageToken || null; } while (pageToken);
  return { byPronoteKey, duplicateIdsByPronoteKey };
}

// Google Calendar helpers
function getAuthToken(interactive) {
  return new Promise(res => chrome.identity.getAuthToken({ interactive }, t => {
    // chrome.runtime.lastError MUST be read inside the callback or Chrome logs it as
    // an unchecked error. Keep the message: it is the only clue the user ever gets
    // (e.g. "bad client id", "OAuth2 not granted or revoked", "user did not approve").
    const err = chrome.runtime.lastError;
    lastAuthError = err ? String(err.message || 'unknown auth error') : '';
    res(lastAuthError || !t ? null : t);
  }));
}
function getTokenInteractive() { return getAuthToken(true); }
function getTokenSilently() { return getAuthToken(false); }
function tzOffsetStr(d) { const mins = -d.getTimezoneOffset(); const s = mins >= 0 ? '+' : '-'; const a = Math.abs(mins); const hh = String(Math.floor(a / 60)).padStart(2, '0'); const mm = String(a % 60).padStart(2, '0'); return `${s}${hh}:${mm}`; }
function rfc3339Local(date, hour = 18, minute = 0) { const [y, m, d] = date.split('-').map(x => parseInt(x, 10)); const dt = new Date(y, m - 1, d, hour, minute, 0); const off = tzOffsetStr(dt); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:00${off}`; }
function addMinutesRfc3339(start, minutes) {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + minutes * 60000);
  return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00${tzOffsetStr(endDate)}`;
}
function simpleHash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return (h >>> 0).toString(16); }

async function ensureManagedCalendar(token) {
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const cached = await localGet({ [GCAL_CAL_ID_KEY]: '' });
  const cachedId = String(cached[GCAL_CAL_ID_KEY] || '').trim();
  if (cachedId) {
    try {
      const check = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cachedId)}`, { headers: { 'Authorization': 'Bearer ' + token } });
      if (check.ok) return cachedId;
    } catch (e) {
      warn('gcal-calendar-check', e);
    }
  }

  const body = {
    summary: MANAGED_CAL_SUMMARY,
    description: `PRONOTE planner managed calendar ${MANAGED_CAL_DESC_MARKER}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  };
  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Calendar create failed (${createRes.status}): ${txt.slice(0, 180)}`);
  }
  const created = await createRes.json();
  const createdId = String(created?.id || '').trim();
  if (!createdId) throw new Error('Calendar create failed: no id');
  await localSet({ [GCAL_CAL_ID_KEY]: createdId });
  return createdId;
}

function hasCalendarNotFound(errors) {
  return (errors || []).some((e) => {
    const msg = String(e?.error || '').toLowerCase();
    return /\b404\b/.test(msg) || /\bnot\s*found\b/.test(msg);
  });
}

async function upsertGcalPlan(token, calendarId, plan, existingIdx) {
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  let upserted = 0;
  let deleted = 0;
  const errors = [];

  const byKey = existingIdx?.byPronoteKey || new Map();
  const dupByKey = existingIdx?.duplicateIdsByPronoteKey || new Map();
  const planKeys = new Set();
  const pronoteKeyOf = (r) => r.pronoteKey || simpleHash(`${r.date}|${r.title}|${r.minutes}`);

  for (const r of (plan || [])) {
    const mins = parseInt(r.minutes, 10) || 30;
    const start = r.startDateTime || rfc3339Local(r.date, 18, 0);
    const end = r.endDateTime || addMinutesRfc3339(start, mins);
    const pronoteKey = pronoteKeyOf(r);
    planKeys.add(pronoteKey);
    const baseBody = {
      summary: r.title || 'Study session',
      description: r.notes || '',
      start: { dateTime: start },
      end: { dateTime: end },
      extendedProperties: { private: { pronoteKey } }
    };

    // Look only for extension-managed events by immutable private key.
    const existingId = byKey.get(pronoteKey) || null;
    if (existingId) {
      // PATCH existing
      try {
        const up = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/` + encodeURIComponent(existingId), { method: 'PATCH', headers, body: JSON.stringify(baseBody) });
        if (up.ok) {
          upserted++;
          const dupIds = dupByKey.get(pronoteKey) || [];
          for (const dupId of dupIds) {
            try {
              const delDup = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/` + encodeURIComponent(dupId), { method: 'DELETE', headers });
              if (delDup.ok || delDup.status === 404) deleted++;
              else {
                const errText = await delDup.text();
                errors.push({ title: '(duplicate cleanup)', error: `DELETE ${delDup.status}: ${errText}`.slice(0, 300) });
              }
            } catch (e) {
              errors.push({ title: '(duplicate cleanup)', error: ('DELETE failed: ' + String(e || '')).slice(0, 300) });
            }
          }
          continue;
        }
        const errText = await up.text();
        const errMsg = `PATCH ${up.status}: ${errText}`.slice(0, 300);
        console.warn('[gcal patch error]', errMsg);
        errors.push({ date: r.date, title: r.title, error: errMsg });
        continue;
      } catch (e) {
        const errMsg = ('PATCH failed: ' + String(e || '')).slice(0, 300);
        console.warn('[gcal patch error]', errMsg);
        errors.push({ date: r.date, title: r.title, error: errMsg });
        continue;
      }
    }

    // INSERT new (no client-specified id)
    try {
      const ins = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', headers, body: JSON.stringify(baseBody) });
      if (ins.ok) {
        upserted++; continue;
      }
      const errText = await ins.text();
      const errMsg = `POST ${ins.status}: ${errText}`.slice(0, 300);
      console.warn('[gcal post error]', errMsg);
      errors.push({ date: r.date, title: r.title, error: errMsg });
    } catch (e) {
      const errMsg = ('POST failed: ' + String(e || '')).slice(0, 300);
      console.warn('[gcal post error]', errMsg);
      errors.push({ date: r.date, title: r.title, error: errMsg });
    }
  }
  // Delete leftover events we previously created that are no longer in the plan
  for (const [pkey, evId] of byKey.entries()) {
    if (planKeys.has(pkey)) continue;
    try {
      const del = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/` + encodeURIComponent(evId), { method: 'DELETE', headers });
      if (del.ok || del.status === 404) { deleted++; continue; }
      const errText = await del.text();
      errors.push({ title: '(deleted item)', error: `DELETE ${del.status}: ${errText}`.slice(0, 300) });
    } catch (e) {
      errors.push({ title: '(deleted item)', error: ('DELETE failed: ' + String(e || '')).slice(0, 300) });
    }
  }
  // Also delete duplicate leftovers for keys that are no longer in the plan
  for (const [pkey, dupIds] of dupByKey.entries()) {
    if (planKeys.has(pkey)) continue;
    for (const dupId of (dupIds || [])) {
      try {
        const del = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/` + encodeURIComponent(dupId), { method: 'DELETE', headers });
        if (del.ok || del.status === 404) { deleted++; continue; }
        const errText = await del.text();
        errors.push({ title: '(duplicate leftover)', error: `DELETE ${del.status}: ${errText}`.slice(0, 300) });
      } catch (e) {
        errors.push({ title: '(duplicate leftover)', error: ('DELETE failed: ' + String(e || '')).slice(0, 300) });
      }
    }
  }
  return { upserted, deleted, errors };
}

function triggerAutoGcalSync(reason) {
  if (autoSyncInFlight) {
    autoSyncDirty = true;
    return;
  }
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => runAutoGcalSync(reason), 1500);
}

async function runAutoGcalSync(reason) {
  if (autoSyncInFlight) return;
  autoSyncInFlight = true;
  try {
    const cfg = await new Promise(r => chrome.storage.sync.get({ autoGcalEnabled: true, studyWindows: null, studyDurations: defaultStudyDurations, language: 'en' }, r));
    if (!cfg.autoGcalEnabled) return;
    const token = await getTokenSilently();
    if (!token) return;
    const storedObj = await new Promise(r => chrome.storage.local.get({ pronoteItems: [], recurringEvents: [], planOverrides: {} }, r));
    const items = storedObj.pronoteItems || [];
    const recurring = storedObj.recurringEvents || [];
    const overrides = storedObj.planOverrides || {};
    if (!items.length && !recurring.length) return;
    const durations = cfg.studyDurations || defaultStudyDurations;
    const plan = makeStudyPlan(items, durations, cfg.language);
    const recSlots = buildRecurringOccurrences(recurring, 365, cfg.language);
    if (!plan.length && !recSlots.length) return;
    const ovResult = applyPlanOverrides(plan, overrides, cfg.studyWindows, cfg.language);
    const scheduledPlan = ovResult.events || [];
    const scheduled = scheduledPlan.concat(recSlots);
    if (ovResult.staleOverrideIds && ovResult.staleOverrideIds.length) {
      const next = { ...overrides };
      for (const id of ovResult.staleOverrideIds) delete next[id];
      await localSet({ planOverrides: next });
    }
    console.info('[auto gcal sync]', { planCount: plan.length, recCount: recSlots.length, scheduled: scheduled.length, recRange: recSlots.length ? `${recSlots[0].date}..${recSlots[recSlots.length - 1].date}` : '' });
    if (!scheduled.length) return;
    const calendarId = await ensureManagedCalendar(token);
    const idx = await preloadExistingEvents(token, calendarId, scheduled);
    const result = await upsertGcalPlan(token, calendarId, scheduled, idx);
    if (hasCalendarNotFound(result.errors)) {
      await localRemove([GCAL_CAL_ID_KEY]);
      const retryCalendarId = await ensureManagedCalendar(token);
      const idx2 = await preloadExistingEvents(token, retryCalendarId, scheduled);
      await upsertGcalPlan(token, retryCalendarId, scheduled, idx2);
    }
  } catch (e) {
    console.warn('[auto gcal sync] failed', e);
  } finally {
    autoSyncInFlight = false;
    if (autoSyncDirty) {
      autoSyncDirty = false;
      triggerAutoGcalSync('queued-rerun');
    }
  }
}

const manualCaptureTabs = new Set();
const AUTO_CAPTURE_COOLDOWN_MS = 15000;
const lastAutoCaptureByTab = new Map();

function isPronoteUrl(url) {
  return !!(url && typeof url === 'string' && PRONOTE_PAGE_RE.test(url));
}

function shouldAutoCapture(tabId, url) {
  const now = Date.now();
  const prev = lastAutoCaptureByTab.get(tabId);
  if (!prev) {
    lastAutoCaptureByTab.set(tabId, { url, ts: now });
    return true;
  }
  if (prev.url !== url || (now - prev.ts) > AUTO_CAPTURE_COOLDOWN_MS) {
    lastAutoCaptureByTab.set(tabId, { url, ts: now });
    return true;
  }
  return false;
}

function scheduleAutoCapture(tabId, url, delayMs = 1500) {
  if (!shouldAutoCapture(tabId, url)) return;
  setTimeout(() => {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'PRONOTE_FORCE_CAPTURE' }, () => { void chrome.runtime.lastError; });
    } catch (e) { warn('auto-capture-send', e); }
  }, delayMs);
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  try {
    const url = info.url || (tab && tab.url) || '';
    if (!isPronoteUrl(url)) return;
    if (info.status === 'complete' || info.url) {
      scheduleAutoCapture(tabId, url, 1200);
    }
  } catch (e) { warn('tabs-onUpdated', e); }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  try { lastAutoCaptureByTab.delete(tabId); } catch (e) { warn('tabs-onRemoved', e); }
});

chrome.storage.onChanged.addListener((changes, area) => {
  try {
    if (area === 'local' && (changes.pronoteItems || changes.recurringEvents || changes.planOverrides)) triggerAutoGcalSync('items');
    if (area === 'sync' && (changes.studyWindows || changes.studyDurations || changes.autoGcalEnabled)) triggerAutoGcalSync('config');
  } catch (e) { warn('storage-onChanged', e); }
});

// Kick off one silent auto-sync shortly after the worker starts (if enabled and token available)
runStartupMigration();
setTimeout(() => triggerAutoGcalSync('startup'), 2500);
