// Event listeners and start-up. Loaded last, so every function above is defined.
calWeekStart = startOfWeek(new Date());

// ---- Buttons ----
$uiLanguage?.addEventListener('change', () => {
  const lang = ($uiLanguage.value || '').toLowerCase() === 'fr' ? 'fr' : 'en';
  setLanguage(lang);
});

$settingsPageButton?.addEventListener('click', () => { window.location.href = chrome.runtime.getURL('settings.html'); });
$techniqueBack?.addEventListener('click', () => {
  renderTechniquesList();
});
[$homeworkFilterQuery, $homeworkFilterType, $homeworkFilterDifficulty, $homeworkFilterDate, $homeworkFilterPast].forEach((el) => {
  el?.addEventListener(el === $homeworkFilterQuery ? 'input' : 'change', () => {
    readHomeworkFilters();
    scheduleStorageRefresh(() => loadAll(), 80);
  });
});
$homeworkFilterReset?.addEventListener('click', resetHomeworkFilters);
$calRefresh?.addEventListener('click', () => {
  loadAll();
  renderCalendar();
  showToast(t('calUpdated'), 'success');
});
$calAutoFit?.addEventListener('click', autoFitCurrentWeek);
$calExport?.addEventListener('click', exportIcsNow);
$studySessionClose?.addEventListener('click', closeStudySessionModal);
$studySessionModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeStudySessionModal);
$studySessionStart?.addEventListener('click', startCurrentStudySession);
$studySessionPause?.addEventListener('click', pauseCurrentStudySession);
$studySessionDone?.addEventListener('click', completeCurrentStudySession);
$studySessionReset?.addEventListener('click', resetCurrentStudySession);
$studySessionOpenHomework?.addEventListener('click', openCurrentSessionHomework);
$calClear?.addEventListener('click', () => {
  if (!confirm(t('calClearConfirm'))) return;
  localSet({ [RECURRING_KEY]: [], [PLAN_OVERRIDES_KEY]: {} }, () => {
    renderRecurring([]);
    renderCalendar();
    triggerGcalSync();
    showToast(t('calCleared'), 'success');
  });
});
$recNew?.addEventListener('click', openRecModal);
$recModalClose?.addEventListener('click', closeRecModal);
$recModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeRecModal);
$recAdd?.addEventListener('click', () => {
  const title = String($recTitle?.value || '').trim();
  const time = String($recTime?.value || '').trim();
  const hours = parseInt($recDurationHours?.value, 10);
  const minutes = parseInt($recDurationMinutes?.value, 10);
  const duration = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  const days = Array.from($recDays || []).filter((box) => box.checked).map((box) => parseInt(box.value, 10)).filter((d) => d >= 0 && d <= 6);
  const missing = [];
  if (!title) missing.push('title');
  if (!time) missing.push('time');
  if (!days.length) missing.push('days');
  if (!duration) missing.push('duration');
  if (missing.length) {
    setRecStatus(t('recErrMissing').replace('{missing}', missing.join(', ')), 'err');
    return;
  }
  const rec = { title, time, days, duration };
  localGet({ [RECURRING_KEY]: [] }, (res) => {
    const arr = Array.isArray(res[RECURRING_KEY]) ? res[RECURRING_KEY].slice() : [];
    arr.push(rec);
    localSet({ [RECURRING_KEY]: arr }, () => {
      setRecStatus(t('recSaved'), 'ok');
      renderRecurring(arr);
      closeRecModal();
      triggerGcalSync();
    });
  });
});
$deleteAllBtn?.addEventListener('click', () => {
  if (!confirm('Delete all stored homework/tests?')) return;
  localSet({ pronoteItems: [], [PLAN_OVERRIDES_KEY]: {} }, () => {
    loadAll();
    triggerGcalSync();
  });
});
$viewDeletedBtn?.addEventListener('click', () => {
  localGet({ pronoteDeletedItems: [] }, (res) => {
    renderDeletedItems(res.pronoteDeletedItems || []);
    $deletedModal?.classList.remove('hidden');
  });
});
$deletedClose?.addEventListener('click', () => $deletedModal?.classList.add('hidden'));
$deletedModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => $deletedModal?.classList.add('hidden'));

$calPrev?.addEventListener('click', () => { calWeekStart.setDate(calWeekStart.getDate() - 7); renderCalendar(); });
$calNext?.addEventListener('click', () => { calWeekStart.setDate(calWeekStart.getDate() + 7); renderCalendar(); });

// ---- Init ----
  initTabs();
  initSoftwareFilter();
  loadStudyDurations();
  syncGet({ language: 'en' }, (res) => {
    const lang = (res && res.language === 'fr') ? 'fr' : 'en';
    setLanguage(lang, false);
  });
  // Onboarding: show once for first-time users
  localGet({ [ONBOARDING_KEY]: false }, (res) => {
    if (!res[ONBOARDING_KEY]) {
      showOnboarding();
    }
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!changes) return;
      if (area === 'local') {
        const needsAllReload = !!(changes.pronoteItems || changes.reminders);
        const needsCalendarReload = !!(changes[RECURRING_KEY] || changes[PLAN_OVERRIDES_KEY] || changes[STUDY_SESSIONS_KEY]);
        const needsDeletedReload = !!changes.pronoteDeletedItems;
        if (needsAllReload) {
          scheduleStorageRefresh(() => loadAll(), 60);
        } else if (needsCalendarReload) {
          scheduleStorageRefresh(() => {
            renderCalendar();
            loadRecurring();
            refreshSchedulePanels();
          }, 60);
        } else if (needsDeletedReload && $deletedModal && !$deletedModal.classList.contains('hidden')) {
          localGet({ pronoteDeletedItems: [] }, (res) => {
            renderDeletedItems(res.pronoteDeletedItems || []);
          });
        }
      }
      if (area === 'sync' && changes.language) {
        const next = changes.language?.newValue === 'fr' ? 'fr' : 'en';
        if (next !== currentLang) setLanguage(next, false);
      }
    });
  } catch (e) { logStorageError('storage-onChanged', e); }

