// Builds and draws the weekly calendar grid.
function parsePlanId(planId) {
  const raw = String(planId || '');
  if (!raw) return null;
  const parts = raw.split('|');
  if (parts.length < 2) return null;
  const dueDate = parts[0];
  const subject = parts[1];
  const kind = parts.length >= 3 ? parts[2] : '';
  const idxRaw = parts[parts.length - 1];
  const index = Number.isFinite(parseInt(idxRaw, 10)) ? parseInt(idxRaw, 10) : null;
  return { dueDate, subject, index, kind };
}

function cleanPlanOverrides(overrides, items) {
  const src = (overrides && typeof overrides === 'object') ? overrides : {};
  const arr = Array.isArray(items) ? items : [];
  const out = {};
  for (const [id, value] of Object.entries(src)) {
    const info = parsePlanId(id);
    if (!info) continue;
    const atIndex = Number.isFinite(info.index) ? arr[info.index] : null;
    const exactMatch = !!(atIndex &&
      String(atIndex.dueDate || '') === String(info.dueDate || '') &&
      String(atIndex.subject || '') === String(info.subject || ''));
    const fallbackMatch = arr.some((it) => (
      it &&
      String(it.dueDate || '') === String(info.dueDate || '') &&
      String(it.subject || '') === String(info.subject || '')
    ));
    if (exactMatch || fallbackMatch) out[id] = value;
  }
  return out;
}

function openHomeworkFromCalendar(ev) {
  if (!ev) return;
  localGet({ pronoteItems: [] }, (res) => {
    const items = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
    const info = parsePlanId(ev.planId || ev.id || '');
    const dueDate = String(ev.dueDate || info?.dueDate || '').trim();
    const subject = String(ev.subject || info?.subject || '').trim();
    let idx = Number.isFinite(parseInt(ev.itemIndex, 10)) ? parseInt(ev.itemIndex, 10) : null;
    if (idx == null && info && Number.isFinite(info.index)) idx = info.index;
    let item = (idx != null && items[idx]) ? items[idx] : null;
    if (!item && dueDate) {
      item = items.find((it) => (
        it && it.dueDate === dueDate &&
        (subject ? String(it.subject || '') === subject : true)
      )) || null;
      if (item) idx = items.indexOf(item);
    }
    if (!item && dueDate) {
      const subjLower = String(subject || '').toLowerCase();
      item = items.find((it) => {
        if (!it || it.dueDate !== dueDate) return false;
        if (!subjLower) return true;
        return String(it.subject || '').toLowerCase() === subjLower;
      }) || null;
      if (item) idx = items.indexOf(item);
    }
    if (item && idx != null) {
      showHomeworkModal(item, idx);
      return;
    }
    showToast(t('calItemMissing'), 'error');
  });
}

function buildWeekEvents(weekStart, items, recurring) {
  const out = [];
  const start = new Date(weekStart);
  const end = new Date(weekStart); end.setDate(end.getDate() + 7);
  const inRange = (iso) => {
    // Parse the date-only dueDate as LOCAL midnight to match start/end (a bare
    // "YYYY-MM-DD" passed to new Date() is parsed as UTC, shifting it a day for
    // users behind UTC and dropping boundary items from the week).
    const [y, m, d] = String(iso).split('-').map(v => parseInt(v, 10));
    if (!Number.isFinite(y)) return false;
    const dt = new Date(y, m - 1, d, 0, 0, 0);
    return dt >= start && dt < end;
  };
  const defaultMinutes = (it) => {
    const m = parseInt(it?.manualMinutes, 10);
    return Number.isFinite(m) && m > 0 ? m : 60;
  };

  // bucket by date
  const byDate = new Map();
  function addToDay(dateStr, ev) {
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr).push(ev);
  }

  (recurring || []).forEach(r => {
    const days = Array.isArray(r.days) ? r.days.map(v => parseInt(v, 10)) : [];
    if (!r.time || !days.length) return;
    for (let i = 0; i < 7; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      if (!days.includes(day.getDay())) continue;
      const [hh, mm] = String(r.time).split(':').map(v => parseInt(v, 10) || 0);
      const dur = Math.max(5, parseInt(r.duration, 10) || 60);
      const st = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, 0);
      const en = new Date(st.getTime() + dur * 60000);
      addToDay(isoDateFromDate(st), {
        start: st,
        end: en,
        title: r.title || 'Recurring',
        meta: `${r.time}${r.duration ? ` • ${formatDuration(r.duration)}` : ''}`,
        kind: 'rec'
      });
    }
  });

  (items || []).forEach((it, idx) => {
    if (!it || !it.dueDate) return;
    if (!inRange(it.dueDate)) return;
    const mins = defaultMinutes(it);
    const priorityScore = priorityScoreOf(it);
    const [y, m, d] = it.dueDate.split('-').map(v => parseInt(v, 10) || 0);
    const st = new Date(y, m - 1, d, 0, 0, 0);
    const en = new Date(st.getTime() + mins * 60000);
    addToDay(it.dueDate, {
      start: st,
      end: en,
      minutes: mins,
      title: it.subject || '(Untitled)',
      meta: it.notes ? it.notes.slice(0, 120) : '',
      kind: 'hw',
      dueDate: it.dueDate,
      subject: it.subject || '',
      itemIndex: idx,
      priorityScore
    });
  });

  // For each day, place homework sequentially without overlap, respecting recurring busy times
  const dates = Array.from(byDate.keys()).sort();
  dates.forEach(dateStr => {
    const dayEvents = byDate.get(dateStr) || [];
    const busy = [];
    // keep rec events fixed, collect busy slots
    dayEvents.filter(ev => ev.kind === 'rec').forEach(ev => {
      const startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
      const endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
      busy.push({ start: startMin, end: endMin });
    });
    // place homework
    const homework = dayEvents.filter(ev => ev.kind !== 'rec');
    const placed = [];
    const gap = 5;
    const placeHw = (ev) => {
      const mins = Math.max(15, ev.minutes || 60);
      let cursor = CAL_DAY_START;
      while (true) {
        const conflict = busy.find(b => !(cursor + mins <= b.start || cursor >= b.end));
        if (!conflict) {
          const st = new Date(ev.start);
          st.setHours(0, 0, 0, 0);
          st.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
          const en = new Date(st.getTime() + mins * 60000);
          busy.push({ start: cursor, end: cursor + mins });
          ev.start = st; ev.end = en;
          placed.push(ev);
          break;
        }
        cursor = Math.max(cursor, conflict.end) + gap;
        if (cursor + mins > CAL_DAY_END) break;
      }
    };
    homework.sort((a, b) => priorityScoreOf(b) - priorityScoreOf(a) || (a.title || '').localeCompare(b.title || ''));
    homework.forEach(placeHw);
    // merge rec + placed
    out.push(...dayEvents.filter(ev => ev.kind === 'rec'), ...placed);
  });

  return out;
}

function renderCalendarGrid(events, weekStart) {
  if ($calWeekLabel) $calWeekLabel.textContent = formatWeekRange(weekStart);
  if (!$calGrid) return;
  const list = Array.isArray(events) ? events : [];
  const rangeMinutes = CAL_DAY_END - CAL_DAY_START;
  $calGrid.innerHTML = '';
  // time column with header spacer
  const timeCol = document.createElement('div');
  timeCol.className = 'cal-time-col';
  const timeHeader = document.createElement('div');
  timeHeader.className = 'cal-time-header';
  const timeBody = document.createElement('div');
  timeBody.className = 'cal-time-body';
  const startHour = Math.floor(CAL_DAY_START / 60);
  for (let h = startHour; h <= 24; h += 2) {
    const t = document.createElement('div');
    t.className = 'cal-time';
    const top = ((h * 60 - CAL_DAY_START) / rangeMinutes) * 100;
    t.style.top = `${top}%`;
    t.textContent = `${String(h).padStart(2, '0')}:00`;
    timeBody.appendChild(t);
  }
  timeCol.append(timeHeader, timeBody);
  $calGrid.appendChild(timeCol);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayCol = document.createElement('div');
    dayCol.className = 'cal-day';
    const header = document.createElement('div');
    header.className = 'cal-day-header';
    const opts = { weekday: 'short', day: 'numeric' };
    header.textContent = dayDate.toLocaleDateString(undefined, opts);
    const body = document.createElement('div');
    body.className = 'cal-day-body';
    body.dataset.dateIso = isoDateFromDate(dayDate);

    const todaysEvents = (list || [])
      .filter((e) => e.start.toDateString() === dayDate.toDateString())
      .map((ev) => {
        const startMin = Math.max(CAL_DAY_START, Math.min(CAL_DAY_END, ev.start.getHours() * 60 + ev.start.getMinutes()));
        const endMin = Math.max(startMin + 15, Math.min(CAL_DAY_END, ev.end.getHours() * 60 + ev.end.getMinutes()));
        return { ev, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const overlapGroups = [];
    let currentGroup = [];
    let currentGroupEnd = -1;
    todaysEvents.forEach((item) => {
      if (!currentGroup.length) {
        currentGroup = [item];
        currentGroupEnd = item.endMin;
        return;
      }
      if (item.startMin < currentGroupEnd) {
        currentGroup.push(item);
        currentGroupEnd = Math.max(currentGroupEnd, item.endMin);
        return;
      }
      overlapGroups.push(currentGroup);
      currentGroup = [item];
      currentGroupEnd = item.endMin;
    });
    if (currentGroup.length) overlapGroups.push(currentGroup);

    const placed = [];
    overlapGroups.forEach((group) => {
      const colsEnd = [];
      const temp = group.map((item) => {
        let col = colsEnd.findIndex((end) => item.startMin >= end);
        if (col === -1) {
          col = colsEnd.length;
          colsEnd.push(item.endMin);
        } else {
          colsEnd[col] = item.endMin;
        }
        return { ...item, col };
      });
      const colCount = Math.max(1, colsEnd.length);
      temp.forEach((entry) => placed.push({ ...entry, colCount }));
    });

    placed.forEach(({ ev, startMin, endMin, col, colCount }) => {
      const top = ((startMin - CAL_DAY_START) / rangeMinutes) * 100;
      const height = ((endMin - startMin) / rangeMinutes) * 100;
      const slot = document.createElement('div');
      const slotKind = ev.kind === 'rec' ? 'rec' : 'hw';
      slot.className = `cal-slot ${slotKind}`;
      const warnings = Array.isArray(ev.warnings) ? ev.warnings.filter(Boolean) : [];
      if (warnings.length) {
        slot.classList.add('warn');
        slot.title = warnings.join('\n');
      }
      slot.style.top = `${top}%`;
      slot.style.height = `${height}%`;
      const gap = colCount > 1 ? 4 : 0;
      const widthPct = 100 / colCount;
      slot.style.left = `calc(${widthPct * col}% + ${gap * col}px)`;
      slot.style.width = `calc(${widthPct}% - ${gap}px)`;
      slot.style.right = 'auto';
      const minutes = ev.minutes || Math.round((ev.end - ev.start) / 60000);
      const eventId = ev.id || '';
      slot.dataset.eventId = eventId;
      slot.dataset.minutes = String(minutes);
      slot.dataset.title = ev.title || '';
      slot.dataset.kind = slotKind;
      const sessionState = slotKind === 'hw' && eventId ? studySessionState(eventId) : null;
      if (sessionState?.status === 'completed') slot.classList.add('done');
      const priorityScore = priorityScoreOf(ev);
      if (slotKind === 'hw') {
        slot.dataset.priorityScore = String(priorityScore);
        if (priorityScore >= 70) slot.classList.add('high-priority');
      }
      if (ev.itemIndex != null) slot.dataset.itemIndex = String(ev.itemIndex);
      if (eventId) slot.dataset.planId = eventId;
      if (ev.dueDate) slot.dataset.dueDate = ev.dueDate;
      if (ev.subject) slot.dataset.subject = ev.subject;
      if (slotKind === 'hw') slot.classList.add('clickable');
      const title = document.createElement('div');
      title.className = 'cal-slot-title';
      title.textContent = ev.title || '';
      const meta = document.createElement('div');
      meta.className = 'cal-slot-meta';
      meta.textContent = ev.meta || '';
      slot.append(title, meta);
      if (warnings.length) {
        const warning = document.createElement('div');
        warning.className = 'cal-slot-warning';
        warning.textContent = warnings[0];
        slot.appendChild(warning);
      }
      if (slotKind === 'hw' && eventId) {
        const actions = document.createElement('div');
        actions.className = 'cal-slot-actions';
        const sessionBtn = document.createElement('button');
        sessionBtn.type = 'button';
        sessionBtn.className = 'session-action';
        if (sessionState?.status === 'completed') sessionBtn.classList.add('done');
        sessionBtn.textContent = sessionState?.status === 'completed' ? t('sessionButtonDone') : t('sessionButtonStart');
        const sessionEvent = {
          id: eventId,
          title: ev.title || '',
          date: isoDateFromDate(ev.start),
          minutes,
          priorityScore,
          itemIndex: ev.itemIndex,
          dueDate: ev.dueDate || '',
          subject: ev.subject || ''
        };
        sessionBtn.addEventListener('pointerdown', (buttonEv) => buttonEv.stopPropagation());
        sessionBtn.addEventListener('click', (buttonEv) => {
          buttonEv.preventDefault();
          buttonEv.stopPropagation();
          openStudySession(sessionEvent);
        });
        actions.appendChild(sessionBtn);
        slot.appendChild(actions);
      }
      if (slotKind === 'hw' && eventId) {
        slot.classList.add('draggable');
        const handle = document.createElement('div');
        handle.className = 'cal-slot-handle';
        handle.textContent = '::';
        handle.title = t('planMove');
        handle.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          if (startDrag(slot, ev)) {
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp, { once: true });
          }
        });
        slot.appendChild(handle);
        slot.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          if (ev.target && ev.target.closest('.cal-slot-handle')) return;
          pendingDrag = { slot, startX: ev.clientX, startY: ev.clientY };
          document.addEventListener('pointermove', onPendingMove);
          document.addEventListener('pointerup', onPendingUp, { once: true });
        });
      }
      body.appendChild(slot);
    });

    dayCol.append(header, body);
    $calGrid.appendChild(dayCol);
  }

  const dayBodies = Array.from($calGrid.querySelectorAll('.cal-day-body'));
  if (!dayBodies.length) return;
  let dragState = null;
  let pendingDrag = null;

  const pickDayBody = (x) => {
    for (const body of dayBodies) {
      const rect = body.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right) return body;
    }
    return dayBodies[0];
  };

  const updateGhost = (clientX, clientY) => {
    if (!dragState) return;
    const body = pickDayBody(clientX);
    if (body && dragState.body !== body) {
      dragState.body = body;
      body.appendChild(dragState.ghost);
    }
    const rect = dragState.body.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    const pct = y / rect.height;
    let startMin = CAL_DAY_START + pct * rangeMinutes;
    startMin = snapMinutes(startMin, 15);
    startMin = Math.min(CAL_DAY_END - dragState.minutes, Math.max(CAL_DAY_START, startMin));
    const topPct = ((startMin - CAL_DAY_START) / rangeMinutes) * 100;
    const heightPct = (dragState.minutes / rangeMinutes) * 100;
    dragState.ghost.style.top = `${topPct}%`;
    dragState.ghost.style.height = `${heightPct}%`;
    dragState.date = dragState.body.dataset.dateIso || '';
    dragState.time = formatHM(startMin);
  };

  const startDrag = (slot, ev) => {
    const eventId = slot.dataset.eventId;
    if (!eventId) return false;
    const minutes = Math.max(15, parseInt(slot.dataset.minutes, 10) || 60);
    const ghost = slot.cloneNode(true);
    ghost.classList.add('dragging');
    ghost.style.pointerEvents = 'none';
    const body = slot.closest('.cal-day-body') || dayBodies[0];
    if (body) body.appendChild(ghost);
    slot.classList.add('drag-source');
    dragState = {
      eventId,
      minutes,
      title: slot.dataset.title || '',
      body,
      ghost,
      source: slot,
      date: body?.dataset?.dateIso || '',
      time: ''
    };
    document.body.style.userSelect = 'none';
    updateGhost(ev.clientX, ev.clientY);
    return true;
  };

  const onPointerMove = (ev) => {
    if (!dragState) return;
    updateGhost(ev.clientX, ev.clientY);
  };

  const onPointerUp = () => {
    if (dragState) {
      const { eventId, minutes, title, date, time, source } = dragState;
      if (dragState.ghost && dragState.ghost.parentNode) dragState.ghost.parentNode.removeChild(dragState.ghost);
      if (source) source.classList.remove('drag-source');
      document.body.style.userSelect = '';
      if (eventId && date && time) savePlanOverride(eventId, date, time, minutes, title);
      justDroppedPlan = true;
      setTimeout(() => { justDroppedPlan = false; }, 250);
      dragState = null;
    }
    document.removeEventListener('pointermove', onPointerMove);
  };

  const onPendingMove = (ev) => {
    if (!pendingDrag) return;
    const dx = ev.clientX - pendingDrag.startX;
    const dy = ev.clientY - pendingDrag.startY;
    if (Math.hypot(dx, dy) < 4) return;
    document.removeEventListener('pointermove', onPendingMove);
    const slot = pendingDrag.slot;
    pendingDrag = null;
    if (startDrag(slot, ev)) {
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    }
  };

  const onPendingUp = () => {
    document.removeEventListener('pointermove', onPendingMove);
    pendingDrag = null;
  };

  $calGrid.querySelectorAll('.cal-slot.clickable').forEach((slot) => {
    slot.addEventListener('click', () => {
      if (justDroppedPlan) return;
      if (slot.dataset.kind !== 'hw') return;
      openHomeworkFromCalendar({
        id: slot.dataset.planId || slot.dataset.eventId || '',
        itemIndex: slot.dataset.itemIndex,
        title: slot.dataset.title || '',
        dueDate: slot.dataset.dueDate || '',
        subject: slot.dataset.subject || ''
      });
    });
  });
}

function renderCalendar() {
  const renderWeekStart = new Date(calWeekStart);
  const start = new Date(renderWeekStart);
  const end = new Date(renderWeekStart); end.setDate(end.getDate() + 7);
  const inRange = (d) => d >= start && d < end;

  const fallback = () => {
    localGet({ pronoteItems: [], recurringEvents: [] }, (res) => {
      const events = buildWeekEvents(renderWeekStart, res.pronoteItems || [], res.recurringEvents || []);
      renderCalendarEvents(events, renderWeekStart);
    });
  };

  try {
    chrome.runtime.sendMessage({ type: 'GET_LOCAL_SCHEDULE' }, (resp) => {
      if (!resp || !resp.ok || !Array.isArray(resp.events)) { fallback(); return; }
      const events = resp.events.map((ev) => {
        const st = ev.startDateTime ? new Date(ev.startDateTime) : new Date(ev.date || renderWeekStart);
        const en = ev.endDateTime ? new Date(ev.endDateTime) : new Date(st.getTime() + (ev.minutes || 60) * 60000);
        const minutes = parseInt(ev.minutes, 10) || Math.max(15, Math.round((en - st) / 60000));
        const info = parsePlanId(ev.id || '');
        return {
          start: st,
          end: en,
          title: ev.title || '',
          meta: ev.notes ? String(ev.notes).slice(0, 120) : `${minutes} min`,
          kind: ev.pronoteKey && ev.pronoteKey.startsWith('rec-') ? 'rec' : 'hw',
          id: ev.id || '',
          minutes,
          priorityScore: ev.priorityScore,
          dueDate: info?.dueDate || '',
          subject: info?.subject || ''
        };
      }).filter(ev => inRange(ev.start));
      renderCalendarEvents(events, renderWeekStart);
    });
  } catch {
    fallback();
  }
}

function updateCalendarFloating() { /* no-op simplified */ }

