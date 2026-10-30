(() => {
  const PLAN_OVERRIDES_KEY = 'planOverrides';
  const defaultLinks = {
    pronote: 'https://4040004j.index-education.net/pronote/eleve.html',
    scheduling: chrome.runtime.getURL('options.html'),
    google: 'https://calendar.google.com'
  };
  const statusEl = document.getElementById('popup-status');
  const scheduleLinkEl = document.getElementById('popup-schedule-link');
  const pronoteLinkEl = document.getElementById('popup-pronote-link');
  const googleLinkEl = document.getElementById('popup-gcal-link');
  const scheduleIconEl = document.getElementById('schedule-icon');
  const pronoteIconEl = document.getElementById('pronote-icon');
  const googleIconEl = document.getElementById('google-icon');
  const reminderUseWeekday = document.getElementById('reminder-use-weekday');
  const reminderDateInput = document.getElementById('reminder-datetime');
  const reminderWeekdaySelect = document.getElementById('reminder-weekday');
  const reminderTitle = document.getElementById('reminder-title');
  const reminderNote = document.getElementById('reminder-note');
  const reminderTagInput = document.getElementById('reminder-tag');
  const reminderSave = document.getElementById('reminder-save');
  const reminderList = document.getElementById('reminder-list');
  const resetRescanBtn = document.getElementById('reset-and-rescan');
  let popupLinks = { ...defaultLinks };
  const setStatus = (t, isError) => {
    if (!statusEl) return;
    statusEl.textContent = t || '';
    statusEl.style.color = isError ? '#f87171' : '#9ca3af';
  };

  const TRANSLATIONS = {
    en: {
      login: 'Sign in to Google Calendar',
      sync: 'Sync Now',
      reset: 'Reset & Rescan',
      schedule: 'Open Schedule',
      openPronote: 'Open Pronote',
      openGcal: 'Open GCal'
    },
    fr: {
      login: 'Se connecter à Google Agenda',
      sync: 'Synchroniser maintenant',
      reset: 'Réinitialiser & Scanner',
      schedule: 'Ouvrir le planning',
      openPronote: 'Ouvrir Pronote',
      openGcal: 'Ouvrir Google Agenda'
    }
  };
  let currentLang = 'en';

  function applyTranslations() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    const btnLogin = document.getElementById('gcal-login');
    const btnSync = document.getElementById('gcal-sync');
    if (btnLogin) btnLogin.textContent = t.login;
    if (btnSync) btnSync.textContent = t.sync;
    if (resetRescanBtn) resetRescanBtn.textContent = '↻ ' + t.reset;
    // Remove any trailing text nodes for link buttons; icons only.
    if (scheduleLinkEl && scheduleLinkEl.lastChild) scheduleLinkEl.lastChild.textContent = '';
    if (pronoteLinkEl && pronoteLinkEl.lastChild) pronoteLinkEl.lastChild.textContent = '';
    if (googleLinkEl && googleLinkEl.lastChild) googleLinkEl.lastChild.textContent = '';
  }

  function hasChromeApis() {
    try {
      return !!(chrome && chrome.runtime && chrome.tabs && chrome.storage);
    } catch {
      return false;
    }
  }

  function applyPopupLinks(links) {
    popupLinks = { ...defaultLinks, ...(links || {}) };
    if (scheduleLinkEl) {
      scheduleLinkEl.href = popupLinks.scheduling;
      scheduleLinkEl.title = '';
    }
    if (pronoteLinkEl) {
      pronoteLinkEl.href = popupLinks.pronote;
      pronoteLinkEl.title = '';
    }
    if (googleLinkEl) {
      googleLinkEl.href = popupLinks.google;
      googleLinkEl.title = '';
    }
  }

  chrome.storage.sync.get({ popupLinks: defaultLinks, language: 'en' }, (res) => {
    currentLang = res.language || 'en';
    applyTranslations();
    applyPopupLinks(res.popupLinks);
  });

  if (scheduleIconEl) scheduleIconEl.src = chrome.runtime.getURL('Icon/Schedule.png');
  if (pronoteIconEl) pronoteIconEl.src = chrome.runtime.getURL('Icon/Pronote icon.png');
  if (googleIconEl) googleIconEl.src = chrome.runtime.getURL('Icon/Google_Calender.png');

  function refreshReminderMode() {
    if (!reminderUseWeekday || !reminderDateInput || !reminderWeekdaySelect) return;
    const useWeekday = reminderUseWeekday.checked;
    reminderDateInput.classList.toggle('hidden', useWeekday);
    reminderWeekdaySelect.classList.toggle('hidden', !useWeekday);
    if (useWeekday) {
      reminderDateInput.value = '';
    } else {
      reminderWeekdaySelect.value = '';
    }
  }

  if (reminderUseWeekday) {
    reminderUseWeekday.addEventListener('change', refreshReminderMode);
    refreshReminderMode();
  }

  function parseReminderDate(reminder) {
    if (!reminder || reminder.weekday) return null;
    const text = String(reminder.dateText || '').trim();
    if (!text) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (iso) {
      return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    }
    const ddmm = /^(\d{1,2})[\/](\d{1,2})$/.exec(text);
    if (!ddmm) return null;
    const dd = parseInt(ddmm[1], 10);
    const mm = parseInt(ddmm[2], 10);
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
    const dueYear = parseInt(reminder.dueYear, 10);
    const year = Number.isFinite(dueYear) && dueYear >= 2000 ? dueYear : (new Date()).getFullYear();
    return new Date(year, mm - 1, dd);
  }

  function reminderExpired(reminder) {
    const d = parseReminderDate(reminder);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }

  function nextWeekdayDate(weekday) {
    const map = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const target = map[String(weekday || '').toLowerCase()];
    if (target == null) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function reminderSortDate(reminder) {
    if (reminder && reminder.weekday) return nextWeekdayDate(reminder.weekday);
    return parseReminderDate(reminder);
  }

  function formatReminderDue(reminder) {
    if (reminder && reminder.weekday) {
      const label = String(reminder.weekday || '').trim();
      return label ? `Next ${label.charAt(0).toUpperCase()}${label.slice(1)}` : 'No date';
    }
    const d = parseReminderDate(reminder);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 'No date';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderReminderList(reminders) {
    if (!reminderList) return;
    const arr = (Array.isArray(reminders) ? reminders : [])
      .filter((it) => !reminderExpired(it))
      .slice()
      .sort((a, b) => {
        const da = reminderSortDate(a);
        const db = reminderSortDate(b);
        const ta = da instanceof Date && !Number.isNaN(da.getTime()) ? da.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = db instanceof Date && !Number.isNaN(db.getTime()) ? db.getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb || String(a?.title || a?.note || '').localeCompare(String(b?.title || b?.note || ''));
      });
    reminderList.innerHTML = '';
    if (!arr.length) {
      const empty = document.createElement('div');
      empty.className = 'reminder-empty';
      empty.textContent = 'No reminders yet.';
      reminderList.appendChild(empty);
      return;
    }
    arr.forEach((reminder) => {
      const item = document.createElement('div');
      item.className = 'reminder-item';

      const main = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'reminder-item-title';
      title.textContent = reminder.title || reminder.note || 'Reminder';
      const meta = document.createElement('div');
      meta.className = 'reminder-item-meta';
      meta.textContent = [formatReminderDue(reminder), reminder.tag || ''].filter(Boolean).join(' • ');
      main.append(title, meta);
      if (reminder.note && reminder.note !== reminder.title) {
        const note = document.createElement('div');
        note.className = 'reminder-item-note';
        note.textContent = reminder.note;
        main.appendChild(note);
      }

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'reminder-delete';
      del.setAttribute('aria-label', 'Delete reminder');
      del.textContent = '×';
      del.addEventListener('click', () => deleteReminder(reminder.id));

      item.append(main, del);
      reminderList.appendChild(item);
    });
  }

  function loadReminderList() {
    if (!hasChromeApis()) return;
    chrome.storage.local.get({ reminders: [] }, (res) => {
      const src = Array.isArray(res.reminders) ? res.reminders : [];
      const kept = src.filter((it) => !reminderExpired(it));
      if (kept.length !== src.length) {
        chrome.storage.local.set({ reminders: kept }, () => renderReminderList(kept));
        return;
      }
      renderReminderList(kept);
    });
  }

  function deleteReminder(id) {
    if (!hasChromeApis()) return;
    chrome.storage.local.get({ reminders: [] }, (res) => {
      const src = Array.isArray(res.reminders) ? res.reminders : [];
      const next = src.filter((it) => it && it.id !== id);
      chrome.storage.local.set({ reminders: next }, () => {
        renderReminderList(next);
        setStatus('Reminder deleted.');
      });
    });
  }

  function normalizeDueYear(dateText) {
    const ddmm = /^(\d{1,2})[\/](\d{1,2})$/.exec(String(dateText || '').trim());
    if (!ddmm) return null;
    const dd = parseInt(ddmm[1], 10);
    const mm = parseInt(ddmm[2], 10);
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let year = today.getFullYear();
    const candidate = new Date(year, mm - 1, dd);
    if (candidate < today) year += 1;
    return year;
  }

  function saveReminder() {
    if (!hasChromeApis()) return;
    const title = (reminderTitle?.value || '').trim();
    const note = (reminderNote?.value || '').trim();
    const tag = (reminderTagInput?.value || '').trim();
    const useWeekday = !!reminderUseWeekday?.checked;
    const weekday = useWeekday ? (reminderWeekdaySelect?.value || '') : '';
    const dateText = useWeekday ? '' : (reminderDateInput?.value || '').trim();
    if (!title && !note) return;
    const r = {
      id: Date.now(),
      title,
      note,
      weekday: weekday || null,
      dateText: dateText || ''
    };
    const dueYear = normalizeDueYear(dateText);
    if (dueYear) r.dueYear = dueYear;
    if (tag) r.tag = tag;
    chrome.storage.local.get({ reminders: [] }, (res) => {
      const arr = (Array.isArray(res.reminders) ? res.reminders : []).filter((it) => !reminderExpired(it));
      arr.push(r);
      chrome.storage.local.set({ reminders: arr }, () => {
        if (reminderTitle) reminderTitle.value = '';
        if (reminderNote) reminderNote.value = '';
        if (reminderTagInput) reminderTagInput.value = '';
        if (reminderDateInput) reminderDateInput.value = '';
        if (reminderWeekdaySelect) reminderWeekdaySelect.value = '';
        renderReminderList(arr);
        setStatus('Reminder saved.');
      });
    });
  }

  if (reminderSave) {
    reminderSave.addEventListener('click', saveReminder);
  }

  loadReminderList();

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.reminders) loadReminderList();
    });
  } catch { }

  resetRescanBtn?.addEventListener('click', () => {
    if (!hasChromeApis()) return;
    if (!confirm('Delete all stored homework/tests and re-run the scanner?')) return;
    chrome.storage.local.set({ pronoteItems: [], [PLAN_OVERRIDES_KEY]: {} }, () => {
      setStatus('Sent re-scan…');
      try {
        const targetUrl = popupLinks.pronote || defaultLinks.pronote;
        const sendCapture = (tabId) => {
          if (!tabId) return;
          chrome.tabs.sendMessage(tabId, { type: 'PRONOTE_SET_REPLACE_MODE' }, () => { void chrome.runtime.lastError; });
          chrome.tabs.sendMessage(tabId, { type: 'PRONOTE_FORCE_CAPTURE' }, () => { void chrome.runtime.lastError; });
        };
        const sendWhenReady = (tabId) => {
          if (!tabId) return;
          chrome.tabs.get(tabId, (t) => {
            if (chrome.runtime.lastError) return;
            if (t && t.status === 'complete') {
              sendCapture(tabId);
              return;
            }
            const listener = (updatedId, info) => {
              if (updatedId !== tabId || info.status !== 'complete') return;
              chrome.tabs.onUpdated.removeListener(listener);
              sendCapture(tabId);
            };
            chrome.tabs.onUpdated.addListener(listener);
          });
        };
        chrome.tabs.query({ url: ['*://*.index-education.net/pronote/*'] }, (tabs) => {
          const pronoteTabs = (tabs || []).filter(t => !!t.id);
          if (pronoteTabs.length) {
            pronoteTabs.forEach(tab => sendWhenReady(tab.id));
            return;
          }
          chrome.tabs.create({ url: targetUrl, active: true }, (tab) => {
            if (!tab || !tab.id) return;
            sendWhenReady(tab.id);
          });
        });
      } catch (e) { console.warn('[popup:reset-rescan]', e); }
    });
  });

  // Google Calendar login
  document.getElementById('gcal-login')?.addEventListener('click', () => {
    try {
      if (!hasChromeApis()) {
        setStatus('Extension APIs not available', true);
        return;
      }

      setStatus('Signing in...');
      chrome.runtime.sendMessage({ type: 'GCAL_LOGIN' }, (res) => {
        if (chrome.runtime.lastError) {
          console.error('Login error:', chrome.runtime.lastError);
          setStatus('Login failed', true);
          return;
        }
        if (res && res.ok) {
          setStatus('Signed in successfully');
        } else {
          setStatus('Login failed', true);
        }
      });
    } catch (e) {
      console.error('Login failed:', e);
      setStatus('Login failed', true);
    }
  });

  // Google Calendar sync
  document.getElementById('gcal-sync')?.addEventListener('click', () => {
    try {
      if (!hasChromeApis()) {
        setStatus('Not running as an extension popup.', true);
        return;
      }
      setStatus('Syncing…');
      chrome.runtime.sendMessage({ type: 'GCAL_SYNC_NOW' }, (res) => {
        if (chrome.runtime.lastError) { setStatus('Sync failed to start.', true); return; }
        if (!res || !res.ok) { setStatus(`Sync failed: ${res?.error || 'unknown error'}`, true); return; }
        if (res.reason === 'no_items') { setStatus('No stored homework to sync', true); return; }
        if (res.reason === 'no_plan') { setStatus('No sessions to sync (no upcoming items)', true); return; }
        const up = res.upserted || 0;
        const del = res.deleted || 0;
        if (up > 0 || del > 0) { setStatus(`Synced to PRONOTE Planner calendar: +${up}, removed ${del}`); return; }
        if (res.errors && res.errors.length) { const e = res.errors[0]; setStatus(`No events added. ${e.error || 'API error'}`, true); return; }
        setStatus('No events added', true);
      });
    } catch (e) { setStatus('Sync failed.', true); }
  });

  // Initial check
  if (!hasChromeApis()) setStatus('Open via the extension icon in Chrome.', true);
  else setStatus('Google sync uses the PRONOTE Planner calendar.');
})();
