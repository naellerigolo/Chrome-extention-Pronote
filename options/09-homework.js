// Homework list: status line, detail modal, item writes and the filter bar.
function setStatus(msg = '', cls = '') {
  if (!$status) return;
  $status.textContent = msg;
  $status.className = cls ? `status-inline ${cls}` : 'status-inline';
}

function extractLinks(text) {
  const regex = /(https?:\/\/[^\s]+)/gi;
  const links = [];
  let m;
  while ((m = regex.exec(text || '')) !== null) links.push(m[0]);
  return links;
}

function loadStudyDurations(done) {
  syncGet({ studyDurations: defaultStudyDurations, timeFormat: '12h' }, (res) => {
    cachedStudyDurations = res.studyDurations || defaultStudyDurations;
    cachedTimeFormat = res.timeFormat === '24h' ? '24h' : '12h';
    if (typeof done === 'function') done();
  });
}

function updateModalEstimate(item) {
  if (!$modalEstimate) return;
  const minutes = getEstimatedMinutes(item);
  if (minutes) {
    const formatted = formatDuration(minutes) || `${minutes}m`;
    $modalEstimate.textContent = `${t('estimateLabel')}: ${formatted}`;
  } else {
    $modalEstimate.textContent = `${t('estimateLabel')}: ${t('phAuto')}`;
  }
}

function showHomeworkModal(item, index) {
  if (!$homeworkModal) return;
  modalCurrentIndex = index;
  modalCurrentItem = item;
  $modalSubject.textContent = item.subject || 'Untitled';
  $modalDue.textContent = item.dueDate || 'No due date';
  $modalType.textContent = item.type || 'homework';
  updateModalEstimate(item);
  $modalNotes.textContent = item.notes || '';
  if ($modalLinks) {
    $modalLinks.innerHTML = '';
    extractLinks(item.notes || '').forEach((link) => {
      const a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = link;
      $modalLinks.appendChild(a);
    });
  }
  if ($modalDifficultySelect) $modalDifficultySelect.value = item.difficulty || 'medium';
  if ($modalMinutesInput) $modalMinutesInput.value = item.manualMinutes || '';
  $homeworkModal.classList.remove('hidden');
  loadStudyDurations(() => updateModalEstimate(item));
}

function hideHomeworkModal() {
  $homeworkModal?.classList.add('hidden');
  modalCurrentIndex = null;
  modalCurrentItem = null;
}

$modalClose?.addEventListener('click', hideHomeworkModal);
$homeworkModal?.querySelector('.modal-backdrop')?.addEventListener('click', hideHomeworkModal);

function savePronoteItems(items, cb) {
  localSet({ pronoteItems: prunePronoteItems(items) }, cb);
}

function updatePronoteItem(index, patch) {
  localGet({ pronoteItems: [] }, (res) => {
    const arr = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
    if (!arr[index]) return;
    const next = { ...arr[index], ...patch };
    arr[index] = next;
    if (modalCurrentIndex === index) {
      modalCurrentItem = next;
      updateModalEstimate(next);
    }
    savePronoteItems(arr, () => renderOverviewList(arr));
  });
}

function readHomeworkFilters() {
  homeworkFilters.query = String($homeworkFilterQuery?.value || '').trim().toLowerCase();
  homeworkFilters.type = String($homeworkFilterType?.value || 'all').toLowerCase();
  homeworkFilters.difficulty = String($homeworkFilterDifficulty?.value || 'all').toLowerCase();
  homeworkFilters.dueDate = String($homeworkFilterDate?.value || '').trim();
  homeworkFilters.showPast = !!$homeworkFilterPast?.checked;
  homeworkFilters.todayISO = formatISODate(new Date()) || '';
}

function hasActiveHomeworkFilters() {
  return !!(homeworkFilters.query ||
    (homeworkFilters.type && homeworkFilters.type !== 'all') ||
    (homeworkFilters.difficulty && homeworkFilters.difficulty !== 'all') ||
    homeworkFilters.dueDate);
}

function itemMatchesType(item, typeFilter) {
  if (!typeFilter || typeFilter === 'all') return true;
  if (item?.isReminder) return typeFilter === 'reminder';
  const raw = String(item?.type || 'homework').toLowerCase();
  if (typeFilter === 'homework') return raw === 'homework' || raw === 'both';
  if (typeFilter === 'test') return raw === 'test' || raw === 'both';
  return raw === typeFilter;
}

function itemMatchesFilters(item) {
  if (!item) return false;
  const f = homeworkFilters;
  // Hide work whose due date has passed unless the user asks to see it.
  if (!f.showPast && f.todayISO && String(item.dueDate || '') && String(item.dueDate) < f.todayISO) return false;
  if (!itemMatchesType(item, f.type)) return false;
  if (f.difficulty && f.difficulty !== 'all') {
    if (item.isReminder) return false;
    const diff = String(item.difficulty || 'medium').toLowerCase();
    if (diff !== f.difficulty) return false;
  }
  if (f.dueDate && String(item.dueDate || '') !== f.dueDate) return false;
  if (f.query) {
    const haystack = [
      item.subject,
      item.notes,
      item.reminderTag,
      item.type,
      item.dueDate
    ].map(v => String(v || '').toLowerCase()).join(' ');
    if (!haystack.includes(f.query)) return false;
  }
  return true;
}

function resetHomeworkFilters() {
  if ($homeworkFilterQuery) $homeworkFilterQuery.value = '';
  if ($homeworkFilterType) $homeworkFilterType.value = 'all';
  if ($homeworkFilterDifficulty) $homeworkFilterDifficulty.value = 'all';
  if ($homeworkFilterDate) $homeworkFilterDate.value = '';
  if ($homeworkFilterPast) $homeworkFilterPast.checked = false;
  readHomeworkFilters();
  loadAll();
}

$modalDifficultySelect?.addEventListener('change', () => {
  if (modalCurrentIndex === null) return;
  updatePronoteItem(modalCurrentIndex, { difficulty: $modalDifficultySelect.value });
});
$modalMinutesInput?.addEventListener('change', () => {
  if (modalCurrentIndex === null) return;
  const val = parseInt($modalMinutesInput.value, 10);
  updatePronoteItem(modalCurrentIndex, { manualMinutes: Number.isFinite(val) && val > 0 ? val : null });
});

