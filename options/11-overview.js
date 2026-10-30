// Homework summary tiles and the overview list.
// Headline numbers for the homework page. Reads the same filtered set the grid
// renders, so the summary always describes what is actually on screen.
function renderHomeworkSummary(allItems, visibleItems) {
  if (!$hwSummary) return;
  $hwSummary.innerHTML = '';
  const todayISO = homeworkFilters.todayISO;
  const visible = (visibleItems || []).filter((it) => it && it.dueDate && !it.isReminder);
  if (!todayISO || !visible.length) return;

  const tomorrowISO = addDaysISO(todayISO, 1);
  const weekISO = addDaysISO(todayISO, 7);
  const countWhere = (fn) => visible.filter(fn).length;
  const dueToday = countWhere((it) => it.dueDate === todayISO);
  const dueTomorrow = countWhere((it) => tomorrowISO && it.dueDate === tomorrowISO);
  const thisWeek = countWhere((it) => weekISO && it.dueDate >= todayISO && it.dueDate <= weekISO);
  const tests = countWhere((it) => resolveItemKind(it) === 'test');
  const hiddenPast = homeworkFilters.showPast
    ? 0
    : (allItems || []).filter((it) => it && it.dueDate && String(it.dueDate) < todayISO).length;
  const totalMinutes = visible.reduce((sum, it) => sum + (getEstimatedMinutes(it) || 0), 0);
  const next = visible
    .slice()
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || priorityScoreOf(b) - priorityScoreOf(a))[0];

  const hero = document.createElement('div');
  hero.className = 'hw-hero';
  const heroValue = document.createElement('div');
  heroValue.className = 'hw-hero-value';
  heroValue.textContent = String(visible.length);
  const heroLabel = document.createElement('div');
  heroLabel.className = 'hw-hero-label';
  heroLabel.textContent = t('sumUpcoming');
  hero.append(heroValue, heroLabel);
  const sub = document.createElement('div');
  sub.className = 'hw-hero-sub';
  if (totalMinutes > 0) {
    const line = document.createElement('div');
    line.textContent = `${formatDuration(totalMinutes)} ${t('sumStudyPlanned')}`;
    sub.appendChild(line);
  }
  if (next) {
    const line = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = next.subject || '';
    line.append(document.createTextNode(`${t('sumNextUp')} `), name);
    const when = relativeDueLabel(next.dueDate, todayISO);
    if (when) line.appendChild(document.createTextNode(` · ${when}`));
    sub.appendChild(line);
  }
  hero.appendChild(sub);

  const panels = document.createElement('div');
  panels.className = 'hw-panels';
  const checkIn = document.createElement('div');
  checkIn.className = 'hw-checkin';
  panels.appendChild(checkIn);
  const upNext = document.createElement('div');
  upNext.className = 'hw-upnext';
  panels.appendChild(upNext);
  homeworkSchedulePanels = { upNext, checkIn };
  loadSchedulePanels(upNext, checkIn);
  const kpis = document.createElement('div');
  kpis.className = 'hw-kpis';
  kpis.appendChild(makeKpiTile('sumDueToday', dueToday, dueToday > 0 ? 'is-urgent' : ''));
  kpis.appendChild(makeKpiTile('sumDueTomorrow', dueTomorrow, ''));
  kpis.appendChild(makeKpiTile('sumNext7', thisWeek, ''));
  kpis.appendChild(makeKpiTile('sumTests', tests, ''));
  if (hiddenPast > 0) kpis.appendChild(makeKpiTile('sumPastHidden', hiddenPast, 'is-muted'));
  panels.appendChild(kpis);

  const bySubject = new Map();
  for (const it of visible) {
    const name = String(it.subject || '').trim() || '-';
    bySubject.set(name, (bySubject.get(name) || 0) + 1);
  }
  const ranked = Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length) {
    const box = document.createElement('div');
    box.className = 'hw-subjects';
    const title = document.createElement('div');
    title.className = 'hw-subjects-title';
    title.textContent = t('sumSubjects');
    box.appendChild(title);
    const top = ranked.slice(0, 6);
    const max = top[0][1] || 1;
    for (const [name, count] of top) {
      const row = document.createElement('div');
      row.className = 'hw-subject-row';
      const fill = document.createElement('div');
      fill.className = 'hw-subject-fill';
      fill.style.width = `${Math.max(6, Math.round((count / max) * 100))}%`;
      const label = document.createElement('span');
      label.className = 'hw-subject-name';
      label.textContent = name;
      const value = document.createElement('span');
      value.className = 'hw-subject-count';
      value.textContent = String(count);
      row.append(fill, label, value);
      box.appendChild(row);
    }
    if (ranked.length > top.length) {
      const more = document.createElement('div');
      more.className = 'hw-subject-more';
      more.textContent = `+${ranked.length - top.length} ${t('sumMore')}`;
      box.appendChild(more);
    }
    panels.appendChild(box);
  }

  $hwSummary.append(hero, panels);
}

function renderOverviewList(items) {
  if (!$overview) return;
  readHomeworkFilters();
  const raw = Array.isArray(items) ? items : [];
  const src = raw
    .map((it, idx) => (it && typeof it === 'object') ? { ...it, _sourceIndex: idx } : it)
    .filter(itemMatchesFilters);
  renderHomeworkSummary(raw, src);
  // One column per due date. Bucketing by weekday instead would stack every
  // Tuesday of the year into a single column.
  const cols = new Map();
  src.forEach((it, idx) => {
    if (!it || !it.dueDate) return;
    try {
      const [y, m, d] = it.dueDate.split('-').map((v) => parseInt(v, 10));
      const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
      if (Number.isNaN(dt.getTime())) return;
      const sourceIndex = Number.isFinite(it._sourceIndex) ? it._sourceIndex : idx;
      if (!cols.has(it.dueDate)) cols.set(it.dueDate, []);
      cols.get(it.dueDate).push({ ...it, _index: sourceIndex });
    } catch (e) { logStorageError('renderOverviewList-date-parse', e); }
  });
  cols.forEach(arr => arr.sort((a, b) => String(a.subject || '').localeCompare(b.subject || '')));
  let total = 0;
  cols.forEach(arr => { total += arr.length; });
  if (!total) {
    $overview.className = 'day';
    $overview.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    const hiddenPast = !homeworkFilters.showPast && homeworkFilters.todayISO &&
      raw.some((it) => it && it.dueDate && String(it.dueDate) < homeworkFilters.todayISO);
    empty.textContent = hasActiveHomeworkFilters() ? t('filterEmpty')
      : hiddenPast ? t('emptyPastHidden')
        : 'No upcoming homework stored yet.';
    $overview.appendChild(empty);
    return;
  }
  const wrapper = document.createElement('div'); wrapper.className = 'overview-grid';
  function deleteItem(index) {
    localGet({ pronoteItems: [], pronoteDeletedItems: [], [PLAN_OVERRIDES_KEY]: {} }, (res) => {
      const arr = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
      const del = Array.isArray(res.pronoteDeletedItems) ? res.pronoteDeletedItems : [];
      const overrides = res[PLAN_OVERRIDES_KEY] || {};
      if (!arr[index]) return;
      del.unshift({ ...arr[index], deletedAt: new Date().toISOString() });
      arr.splice(index, 1);
      const nextOverrides = cleanPlanOverrides(overrides, arr);
      localSet({ pronoteItems: arr, pronoteDeletedItems: del.slice(0, MAX_DELETED_ITEMS), [PLAN_OVERRIDES_KEY]: nextOverrides }, () => {
        renderOverviewList(arr);
        triggerGcalSync();
      });
    });
  }
  function deleteReminder(reminderId, reminderItem) {
    localGet({ reminders: [] }, (res) => {
      const arr = Array.isArray(res.reminders) ? res.reminders.slice() : [];
      const next = arr.filter((r) => {
        if (!r) return false;
        if (reminderId != null) return r.id !== reminderId;
        const sameTitle = String(r.title || '').trim() === String(reminderItem?.subject || '').trim();
        const sameNote = String(r.note || '').trim() === String(reminderItem?.notes || '').trim();
        const sameDate = String(r.dateText || '').trim() === String(reminderItem?.dateText || '').trim();
        const sameWeekday = String(r.weekday || '').trim() === String(reminderItem?.weekday || '').trim();
        return !(sameTitle && sameNote && sameDate && sameWeekday);
      });
      if (next.length === arr.length) return;
      localSet({ reminders: next }, () => {
        loadAll();
      });
    });
  }
  const dayOrder = Array.from(cols.keys()).sort(); // ISO strings sort chronologically
  for (const k of dayOrder) {
    const dayItems = cols.get(k) || [];
    const sec = document.createElement('div'); sec.className = 'col';
    const header = document.createElement('div'); header.className = 'col-header';
    const title = document.createElement('div'); title.className = 'col-title'; title.textContent = overviewColumnLabel(k);
    const count = document.createElement('div'); count.className = 'count-badge'; count.textContent = dayItems.length + ' item(s)';
    header.append(title, count);
    const list = document.createElement('div'); list.className = 'items';
    for (const it of dayItems) {
      const card = document.createElement('div'); card.className = 'item'; card.dataset.index = String(it._index);
      const top = document.createElement('div'); top.className = 'item-top';
      const subj = document.createElement('div'); subj.className = 'subject'; subj.textContent = it.subject || '';
      const delBtn = document.createElement('button'); delBtn.className = 'delete-x'; delBtn.textContent = '×'; delBtn.title = 'Remove this item';
      if (!it.isReminder) {
        delBtn.addEventListener('click', (ev) => { if (confirm('Remove this item?')) deleteItem(it._index); ev.stopPropagation(); });
        top.append(subj, delBtn);
        card.addEventListener('click', () => showHomeworkModal(it, it._index));
      } else {
        delBtn.addEventListener('click', (ev) => {
          if (!confirm('Remove this reminder?')) return;
          deleteReminder(it.reminderId, it);
          ev.stopPropagation();
        });
        top.append(subj, delBtn);
      }
      const meta = document.createElement('div'); meta.className = 'item-meta';
      if (it.isReminder) {
        const badge = document.createElement('span'); badge.className = 'badge main-type-badge badge-test'; badge.textContent = it.reminderTag || defaultReminderTag; meta.append(badge);
      } else {
        let curType = it.type === 'test' ? 'test' : 'homework';
        const typeBadge = document.createElement('span'); typeBadge.className = 'badge main-type-badge ' + (curType === 'test' ? 'badge-test' : 'badge-homework');
        const label = () => currentLang === 'fr' ? (curType === 'test' ? 'test' : 'devoir') : curType;
        typeBadge.textContent = label();
        typeBadge.addEventListener('click', () => {
          const next = curType === 'test' ? 'homework' : 'test';
          curType = next;
          typeBadge.className = 'badge main-type-badge ' + (curType === 'test' ? 'badge-test' : 'badge-homework');
          typeBadge.textContent = label();
          updatePronoteItem(it._index, { type: curType });
        });
        const diffWrap = document.createElement('div'); diffWrap.className = 'pill-select-wrap';
        const diffLabel = document.createElement('span'); diffLabel.className = 'pill-label'; diffLabel.textContent = 'Diff';
        const diffSelect = document.createElement('select'); diffSelect.className = 'pill-select';
        [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['epreuve blanche', 'Epreuve Blanche']].forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; diffSelect.appendChild(o); });
        diffSelect.value = it.difficulty || 'medium';
        diffSelect.addEventListener('change', () => updatePronoteItem(it._index, { difficulty: diffSelect.value }));
        diffWrap.append(diffLabel, diffSelect);
        meta.append(typeBadge, diffWrap);
      }
      const notes = document.createElement('div'); notes.className = 'notes'; if (it.notes) notes.textContent = it.notes.slice(0, 240);
      card.append(top, meta, notes);
      list.appendChild(card);
    }
    sec.append(header, list); wrapper.appendChild(sec);
  }
  $overview.className = ''; $overview.innerHTML = ''; $overview.appendChild(wrapper);
}

function updateReminder(id, patch) {
  localGet({ reminders: [] }, (res) => {
    const arr = Array.isArray(res.reminders) ? res.reminders.slice() : [];
    const idx = arr.findIndex((r) => r && r.id === id);
    if (idx === -1) return;
    arr[idx] = { ...arr[idx], ...patch };
    localSet({ reminders: arr });
  });
}

