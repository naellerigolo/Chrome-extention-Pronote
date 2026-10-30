// Deleted-items view, tab switching and the top-level data load.
// ---- Deleted items stub ----
function renderDeletedItems(items) {
  if (!$deletedList) return;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) { $deletedList.textContent = 'No deleted items recorded yet.'; return; }
  $deletedList.innerHTML = '';
  list.forEach((it, idx) => {
    const block = document.createElement('div'); block.style.marginBottom = '10px';
    const subject = document.createElement('strong'); subject.textContent = it.subject || '(Untitled)'; block.appendChild(subject);
    const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = '#9ca3af'; const when = it.deletedAt ? new Date(it.deletedAt).toLocaleString() : ''; const due = it.dueDate ? `Due: ${it.dueDate}` : ''; meta.textContent = [when, due].filter(Boolean).join(' • '); block.appendChild(meta);
    $deletedList.appendChild(block);
  });
}

// ---- Tab switching ----
function setActiveTab(which) {
  const isHomework = which === 'homework';
  const isRecurring = which === 'recurring';
  const isCalendar = which === 'calendar';
  const isSoftware = which === 'software';
  const isTechniques = which === 'techniques';
  if ($tabHomework) $tabHomework.classList.toggle('active', isHomework);
  if ($tabRecurring) $tabRecurring.classList.toggle('active', isRecurring);
  if ($tabCalendar) $tabCalendar.classList.toggle('active', isCalendar);
  if ($tabSoftware) $tabSoftware.classList.toggle('active', isSoftware);
  if ($tabTechniques) $tabTechniques.classList.toggle('active', isTechniques);
  if ($sectionHomework) $sectionHomework.classList.toggle('hidden', !isHomework);
  if ($sectionRecurring) $sectionRecurring.classList.toggle('hidden', !isRecurring);
  if ($sectionCalendar) $sectionCalendar.classList.toggle('hidden', !isCalendar);
  if ($sectionSoftware) $sectionSoftware.classList.toggle('hidden', !isSoftware);
  if ($sectionTechniques) $sectionTechniques.classList.toggle('hidden', !isTechniques);
  if (isCalendar) renderCalendar();
  if (isSoftware) renderSoftwareList();
  if (isTechniques) renderTechniquesList();
}

function initTabs() {
  $tabHomework?.addEventListener('click', () => setActiveTab('homework'));
  $tabRecurring?.addEventListener('click', () => setActiveTab('recurring'));
  $tabCalendar?.addEventListener('click', () => setActiveTab('calendar'));
  $tabSoftware?.addEventListener('click', () => setActiveTab('software'));
  $tabTechniques?.addEventListener('click', () => setActiveTab('techniques'));
  setActiveTab('homework');
}

function initSoftwareFilter() {
  if (!$softwareFilters) return;
  buildSoftwareFilterOptions();
}

// ---- Load all data ----
function loadAll() {
  if (!chrome?.storage?.local) {
    renderOverviewList([]);
    renderCalendar();
    return;
  }
  localGet({ pronoteItems: [], reminders: [] }, (res) => {
    const pruned = pruneExpiredReminders(res.reminders || []);
    if (pruned.changed) {
      localSet({ reminders: pruned.kept });
    }
    const combined = combineItems(res.pronoteItems || [], pruned.kept);
    renderOverviewList(combined);
    renderCalendar();
  });
}

let storageRefreshTimer = null;
function scheduleStorageRefresh(fn, delay = 80) {
  clearTimeout(storageRefreshTimer);
  storageRefreshTimer = setTimeout(() => {
    storageRefreshTimer = null;
    try { fn(); } catch (e) { logStorageError('scheduleStorageRefresh', e); }
  }, delay);
}

