// Up-next and check-in panels on the homework page.
function formatClock(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const h24 = cachedTimeFormat === '24h';
  return date.toLocaleTimeString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
    hour: h24 ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !h24
  });
}

// The next few study sessions, with the clock times the calendar would show.
function renderUpNextRows(panel, events) {
  if (!panel) return;
  panel.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'hw-subjects-title';
  title.textContent = t('sumUpNext');
  panel.appendChild(title);
  const now = new Date();
  const todayISO = homeworkFilters.todayISO || formatISODate(now) || '';
  const upcoming = (events || [])
    .filter((ev) => ev && ev.kind !== 'rec' && ev.start instanceof Date && ev.end instanceof Date && ev.end > now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);
  if (!upcoming.length) {
    const empty = document.createElement('div');
    empty.className = 'hw-upnext-empty';
    empty.textContent = t('sumNoSessions');
    panel.appendChild(empty);
    return;
  }
  upcoming.forEach((ev, idx) => {
    const row = document.createElement('div');
    row.className = idx === 0 ? 'hw-upnext-row is-next' : 'hw-upnext-row';
    const when = document.createElement('span');
    when.className = 'hw-upnext-time';
    when.textContent = `${formatClock(ev.start)} - ${formatClock(ev.end)}`;
    const name = document.createElement('span');
    name.className = 'hw-upnext-name';
    name.textContent = ev.subject || ev.title || '';
    const day = document.createElement('span');
    day.className = 'hw-upnext-day';
    day.textContent = relativeDueLabel(formatISODate(ev.start), todayISO);
    row.append(when, name, day);
    panel.appendChild(row);
  });
}

// Where a missed session should move to: the day after the slot it missed, never
// in the past and never later than the homework is actually due.
function rescheduleDateFor(ev) {
  const todayISO = homeworkFilters.todayISO || formatISODate(new Date()) || '';
  const sessionISO = formatISODate(ev.start) || todayISO;
  let candidate = addDaysISO(sessionISO, 1) || todayISO;
  if (ev.dueDate && candidate > ev.dueDate) candidate = ev.dueDate;
  if (todayISO && candidate < todayISO) candidate = todayISO;
  return candidate;
}

function clockValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '18:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Sessions whose slot has passed and that were never marked done. Answering "Not
// yet" moves the session on instead of silently leaving a hole in the plan.
function renderCheckInRows(panel, events, sessionStates) {
  if (!panel) return;
  panel.innerHTML = '';
  const now = new Date();
  const todayISO = homeworkFilters.todayISO || formatISODate(now) || '';
  const states = normalizeStudySessions(sessionStates);
  const missed = (events || [])
    .filter((ev) => ev && ev.kind !== 'rec' && ev.id && ev.end instanceof Date && ev.end < now)
    .filter((ev) => (states[ev.id] || {}).status !== 'completed')
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);
  if (!missed.length) return;

  const title = document.createElement('div');
  title.className = 'hw-subjects-title';
  title.textContent = t('ciTitle');
  panel.appendChild(title);

  missed.forEach((ev) => {
    const row = document.createElement('div');
    row.className = 'hw-checkin-row';
    const name = document.createElement('span');
    name.className = 'hw-checkin-name';
    name.textContent = ev.subject || ev.title || '';
    const when = document.createElement('span');
    when.className = 'hw-checkin-when';
    when.textContent = `${relativeDueLabel(formatISODate(ev.start), todayISO)} ${formatClock(ev.start)}`;
    const actions = document.createElement('div');
    actions.className = 'hw-checkin-actions';

    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'hw-checkin-btn is-yes';
    yes.textContent = t('ciYes');
    yes.addEventListener('click', () => {
      persistStudySession(ev.id, {
        status: 'completed',
        startedAt: null,
        completedAt: new Date().toISOString(),
        elapsedSeconds: Math.max(60, (parseInt(ev.minutes, 10) || 30) * 60)
      }, () => {
        showToast(t('sessionCompleted'), 'success');
        loadAll();
      });
    });

    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'hw-checkin-btn';
    no.textContent = t('ciNo');
    no.addEventListener('click', () => {
      const date = rescheduleDateFor(ev);
      savePlanOverride(ev.id, date, clockValue(ev.start), parseInt(ev.minutes, 10) || 30, ev.title || '', () => {
        loadAll();
      });
    });

    actions.append(yes, no);
    row.append(name, when, actions);
    panel.appendChild(row);
  });
}

// Prefers the worker's scheduled plan so the times match the Calendar tab
// exactly, including manual drag/drop overrides.
function refreshSchedulePanels() {
  const panels = homeworkSchedulePanels;
  if (!panels || !panels.upNext || !panels.upNext.isConnected) return;
  loadSchedulePanels(panels.upNext, panels.checkIn);
}

function loadSchedulePanels(upNextPanel, checkInPanel) {
  const fallback = () => {
    localGet({ pronoteItems: [], recurringEvents: [] }, (res) => {
      const items = res.pronoteItems || [];
      const recurring = res.recurringEvents || [];
      const thisWeek = startOfWeek(new Date());
      const nextWeek = new Date(thisWeek); nextWeek.setDate(nextWeek.getDate() + 7);
      const events = buildWeekEvents(thisWeek, items, recurring)
        .concat(buildWeekEvents(nextWeek, items, recurring));
      renderUpNextRows(upNextPanel, events);
      // Locally built events carry no plan id, so there is nothing a check-in
      // could safely mark done or move. Leave that panel empty.
    });
  };
  try {
    chrome.runtime.sendMessage({ type: 'GET_LOCAL_SCHEDULE' }, (resp) => {
      if (chrome.runtime.lastError || !resp || !resp.ok || !Array.isArray(resp.events)) {
        fallback();
        return;
      }
      const events = resp.events.map((ev) => {
        const st = ev.startDateTime ? new Date(ev.startDateTime) : null;
        const minutes = parseInt(ev.minutes, 10) || 30;
        const en = ev.endDateTime
          ? new Date(ev.endDateTime)
          : (st ? new Date(st.getTime() + minutes * 60000) : null);
        const info = parsePlanId(ev.id || '');
        return {
          start: st,
          end: en,
          id: ev.id || '',
          minutes,
          title: ev.title || '',
          subject: (info && info.subject) || '',
          dueDate: (info && info.dueDate) || ev.date || '',
          kind: ev.pronoteKey && String(ev.pronoteKey).startsWith('rec-') ? 'rec' : 'hw'
        };
      }).filter((ev) => ev.start && ev.end && !Number.isNaN(ev.start.getTime()));
      renderUpNextRows(upNextPanel, events);
      localGet({ [STUDY_SESSIONS_KEY]: {} }, (stored) => {
        renderCheckInRows(checkInPanel, events, stored[STUDY_SESSIONS_KEY]);
      });
    });
  } catch {
    fallback();
  }
}

function addDaysISO(iso, days) {
  const base = parseISODateLocal(iso);
  if (!base) return '';
  base.setDate(base.getDate() + days);
  return formatISODate(base) || '';
}

function relativeDueLabel(iso, todayISO) {
  const due = parseISODateLocal(iso);
  const today = parseISODateLocal(todayISO);
  if (!due || !today) return String(iso || '');
  const days = Math.round((due - today) / 86400000);
  if (days === 0) return t('sumToday');
  if (days === 1) return t('sumTomorrow');
  if (days > 1) return `${t('sumInDays')} ${days} ${t('sumDays')}`;
  return overviewColumnLabel(iso);
}

function makeKpiTile(labelKey, value, modifier) {
  const tile = document.createElement('div');
  tile.className = modifier ? `hw-kpi ${modifier}` : 'hw-kpi';
  const label = document.createElement('span');
  label.className = 'hw-kpi-label';
  label.textContent = t(labelKey);
  const val = document.createElement('span');
  val.className = 'hw-kpi-value';
  val.textContent = String(value);
  tile.append(label, val);
  return tile;
}

