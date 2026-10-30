// Calendar helpers: week ranges, clock maths, study windows, warnings, overrides.
// ---- Calendar (weekly grid) ----
function formatWeekRange(ws) {
  const end = new Date(ws); end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${ws.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

function isoDateFromDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHM(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapMinutes(totalMinutes, step = 15) {
  return Math.round(totalMinutes / step) * step;
}

function parseClockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function eventStartMinutes(ev) {
  return ev && ev.start instanceof Date ? ev.start.getHours() * 60 + ev.start.getMinutes() : 0;
}

function eventEndMinutes(ev) {
  if (!ev || !(ev.end instanceof Date)) return eventStartMinutes(ev) + 15;
  return Math.max(eventStartMinutes(ev) + 15, ev.end.getHours() * 60 + ev.end.getMinutes());
}

function studyWindowsForDay(studyWindows, day) {
  const source = studyWindows || defaultStudyWindows;
  return (source[String(day)] || [])
    .map((w) => ({ start: parseClockMinutes(w.start), end: parseClockMinutes(w.end) }))
    .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function addCalendarWarning(ev, message) {
  if (!ev || !message) return;
  const warnings = Array.isArray(ev.warnings) ? ev.warnings : [];
  if (!warnings.includes(message)) warnings.push(message);
  ev.warnings = warnings;
}

function annotateCalendarWarnings(events, studyWindows) {
  const list = (Array.isArray(events) ? events : [])
    .filter((ev) => ev && ev.start instanceof Date && ev.end instanceof Date)
    .map((ev) => ({ ...ev, warnings: Array.isArray(ev.warnings) ? ev.warnings.slice() : [] }));
  const recEvents = list.filter((ev) => ev.kind === 'rec');

  for (const ev of list) {
    if (ev.kind === 'rec') continue;
    const start = eventStartMinutes(ev);
    const end = eventEndMinutes(ev);
    const day = ev.start.getDay();
    const windows = studyWindowsForDay(studyWindows, day);
    if (windows.length && !windows.some((w) => start >= w.start && end <= w.end)) {
      addCalendarWarning(ev, t('calConflictOutside'));
    }
    const overlapsRecurring = recEvents.some((rec) => (
      rec.start.toDateString() === ev.start.toDateString() &&
      !(end <= eventStartMinutes(rec) || start >= eventEndMinutes(rec))
    ));
    if (overlapsRecurring) addCalendarWarning(ev, t('calConflictOverlap'));
  }
  return list;
}

function renderCalendarEvents(events, weekStart = calWeekStart) {
  const targetWeekStart = new Date(weekStart);
  syncGet({ studyWindows: defaultStudyWindows }, (cfg) => {
    if (isoDateFromDate(targetWeekStart) !== isoDateFromDate(calWeekStart)) return;
    const windows = cfg.studyWindows || defaultStudyWindows;
    const annotated = annotateCalendarWarnings(events, windows);
    const resolved = resolveHomeworkOverlaps(annotated);
    localGet({ [STUDY_SESSIONS_KEY]: {} }, (res) => {
      if (isoDateFromDate(targetWeekStart) !== isoDateFromDate(calWeekStart)) return;
      cachedStudySessions = normalizeStudySessions(res[STUDY_SESSIONS_KEY]);
      updateCalendarWarningSummary(resolved);
      renderCalendarGrid(resolved, targetWeekStart);
    });
  });
}

function updateCalendarWarningSummary(events) {
  if (!$calWarningSummary) return;
  const count = (Array.isArray(events) ? events : []).reduce((sum, ev) => sum + (Array.isArray(ev.warnings) ? ev.warnings.length : 0), 0);
  $calWarningSummary.classList.toggle('active', count > 0);
  $calWarningSummary.textContent = count > 0 ? formatTemplate(t('calWarningSummary'), { count }) : '';
}

function resolveHomeworkOverlaps(events) {
  const src = Array.isArray(events) ? events : [];
  if (!src.length) return src;
  const byDay = new Map();
  src.forEach((ev) => {
    if (!ev || !(ev.start instanceof Date) || Number.isNaN(ev.start.getTime())) return;
    const key = isoDateFromDate(ev.start);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(ev);
  });

  const out = [];
  const dayEnd = CAL_DAY_END;
  const gap = 5;
  for (const [day, list] of byDay.entries()) {
    const fixed = [];
    const movable = [];
    list.forEach((ev) => {
      const s = ev.start.getHours() * 60 + ev.start.getMinutes();
      const e = ev.end.getHours() * 60 + ev.end.getMinutes();
      const slot = { start: s, end: Math.max(s + 15, e) };
      if (ev.kind === 'rec') fixed.push(slot);
      else movable.push(ev);
    });

    // sort fixed so conflict checks are deterministic
    fixed.sort((a, b) => a.start - b.start || a.end - b.end);
    movable.sort((a, b) => a.start - b.start || a.end - b.end);

    for (const ev of movable) {
      const mins = Math.max(15, parseInt(ev.minutes, 10) || Math.round((ev.end - ev.start) / 60000) || 60);
      let startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
      if (startMin < CAL_DAY_START) startMin = CAL_DAY_START;

      let guard = 0;
      while (guard++ < 400) {
        const conflicts = fixed.filter((b) => !(startMin + mins <= b.start || startMin >= b.end));
        if (!conflicts.length) break;
        const latestEnd = Math.max(...conflicts.map((c) => c.end));
        startMin = latestEnd + gap;
        if (startMin + mins > dayEnd) {
          startMin = Math.max(CAL_DAY_START, dayEnd - mins);
          break;
        }
      }

      const [y, m, d] = day.split('-').map((v) => parseInt(v, 10) || 0);
      const st = new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60, 0, 0);
      const en = new Date(st.getTime() + mins * 60000);
      ev.start = st;
      ev.end = en;
      fixed.push({ start: startMin, end: startMin + mins });
      fixed.sort((a, b) => a.start - b.start || a.end - b.end);
    }

    out.push(...list);
  }

  return out.sort((a, b) => a.start - b.start || a.end - b.end || String(a.title || '').localeCompare(b.title || ''));
}

function savePlanOverride(id, date, time, minutes, title, done) {
  if (!id) return;
  localGet({ [PLAN_OVERRIDES_KEY]: {} }, (res) => {
    const overrides = { ...(res[PLAN_OVERRIDES_KEY] || {}) };
    overrides[id] = { date, time, minutes, title };
    localSet({ [PLAN_OVERRIDES_KEY]: overrides }, () => {
      renderCalendar();
      showToast(formatTemplate(t('planMoved'), { title: title || t('studySession'), date, time }), 'success');
      triggerGcalSync();
      if (typeof done === 'function') done();
    });
  });
}

function autoFitCurrentWeek() {
  const startIso = isoDateFromDate(calWeekStart);
  const end = new Date(calWeekStart);
  end.setDate(end.getDate() + 7);
  const endIso = isoDateFromDate(end);
  localGet({ [PLAN_OVERRIDES_KEY]: {} }, (res) => {
    const overrides = res[PLAN_OVERRIDES_KEY] || {};
    const next = {};
    for (const [id, value] of Object.entries(overrides)) {
      const date = String(value?.date || '');
      if (date && date >= startIso && date < endIso) continue;
      next[id] = value;
    }
    localSet({ [PLAN_OVERRIDES_KEY]: next }, () => {
      renderCalendar();
      triggerGcalSync();
      showToast(t('calAutoFitDone'), 'success');
    });
  });
}

