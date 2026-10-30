// Study-session timer state machine and its modal.
function normalizeStudySessions(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function studySessionState(id) {
  if (!id) return null;
  return normalizeStudySessions(cachedStudySessions)[id] || null;
}

function studySessionElapsedSeconds(state) {
  if (!state) return 0;
  const base = Math.max(0, parseInt(state.elapsedSeconds, 10) || 0);
  if (state.status !== 'running' || !state.startedAt) return base;
  const started = new Date(state.startedAt);
  if (!(started instanceof Date) || Number.isNaN(started.getTime())) return base;
  return base + Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
}

function plannedSessionSeconds(event) {
  return Math.max(60, (parseInt(event?.minutes, 10) || 30) * 60);
}

function formatSessionClock(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function persistStudySession(id, patch, cb) {
  if (!id) return;
  localGet({ [STUDY_SESSIONS_KEY]: {} }, (res) => {
    const all = normalizeStudySessions(res[STUDY_SESSIONS_KEY]);
    if (patch === null) {
      delete all[id];
      cachedStudySessions = all;
      localSet({ [STUDY_SESSIONS_KEY]: all }, () => {
        if (typeof cb === 'function') cb(null);
        renderCalendar();
      });
      return;
    }
    const previous = all[id] || {};
    const next = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    all[id] = next;
    cachedStudySessions = all;
    localSet({ [STUDY_SESSIONS_KEY]: all }, () => {
      if (typeof cb === 'function') cb(next);
      renderCalendar();
    });
  });
}

function sessionStatusLabel(state) {
  if (!state || !state.status) return t('sessionStatusReady');
  if (state.status === 'completed') return t('sessionStatusCompleted');
  if (state.status === 'running') return t('sessionStatusRunning');
  if (state.status === 'paused') return t('sessionStatusPaused');
  return t('sessionStatusReady');
}

function updateStudySessionModal() {
  if (!$studySessionModal || !currentStudySessionId || !currentStudySessionEvent) return;
  const state = studySessionState(currentStudySessionId);
  const elapsed = studySessionElapsedSeconds(state);
  const planned = plannedSessionSeconds(currentStudySessionEvent);
  const pct = Math.max(0, Math.min(100, (elapsed / planned) * 100));
  if ($studySessionTitle) $studySessionTitle.textContent = currentStudySessionEvent.title || t('studySession');
  if ($studySessionTimer) $studySessionTimer.textContent = `${formatSessionClock(elapsed)} / ${formatSessionClock(planned)}`;
  if ($studySessionProgress) $studySessionProgress.style.width = `${pct}%`;
  if ($studySessionMeta) {
    const parts = [
      currentStudySessionEvent.date || '',
      formatDuration(currentStudySessionEvent.minutes || 0),
      `${t('priorityLabel')} ${currentStudySessionEvent.priorityScore || 0}`,
      sessionStatusLabel(state)
    ].filter(Boolean);
    $studySessionMeta.textContent = parts.join(' • ');
  }
  const status = state?.status || 'ready';
  if ($studySessionStart) $studySessionStart.disabled = status === 'running' || status === 'completed';
  if ($studySessionPause) $studySessionPause.disabled = status !== 'running';
  if ($studySessionDone) $studySessionDone.disabled = status === 'completed';
}

function startStudySessionTicker() {
  clearInterval(studySessionTick);
  updateStudySessionModal();
  studySessionTick = setInterval(updateStudySessionModal, 1000);
}

function closeStudySessionModal() {
  clearInterval(studySessionTick);
  studySessionTick = null;
  currentStudySessionId = null;
  currentStudySessionEvent = null;
  $studySessionModal?.classList.add('hidden');
}

function openStudySession(event) {
  if (!event || !event.id) return;
  currentStudySessionId = event.id;
  currentStudySessionEvent = {
    id: event.id,
    title: event.title || t('studySession'),
    date: event.date || '',
    minutes: Math.max(1, parseInt(event.minutes, 10) || 30),
    priorityScore: parseInt(event.priorityScore, 10) || 0,
    itemIndex: event.itemIndex,
    dueDate: event.dueDate || '',
    subject: event.subject || ''
  };
  $studySessionModal?.classList.remove('hidden');
  startStudySessionTicker();
}

function startCurrentStudySession() {
  if (!currentStudySessionId || !currentStudySessionEvent) return;
  const state = studySessionState(currentStudySessionId);
  const elapsed = studySessionElapsedSeconds(state);
  persistStudySession(currentStudySessionId, {
    title: currentStudySessionEvent.title,
    minutes: currentStudySessionEvent.minutes,
    priorityScore: currentStudySessionEvent.priorityScore,
    status: 'running',
    startedAt: new Date().toISOString(),
    elapsedSeconds: elapsed
  }, () => {
    showToast(t('sessionStarted'), 'success');
    startStudySessionTicker();
  });
}

function pauseCurrentStudySession() {
  if (!currentStudySessionId) return;
  const state = studySessionState(currentStudySessionId);
  persistStudySession(currentStudySessionId, {
    status: 'paused',
    startedAt: null,
    elapsedSeconds: studySessionElapsedSeconds(state)
  }, () => {
    showToast(t('sessionPaused'), 'success');
    updateStudySessionModal();
  });
}

function completeCurrentStudySession() {
  if (!currentStudySessionId || !currentStudySessionEvent) return;
  const state = studySessionState(currentStudySessionId);
  const planned = plannedSessionSeconds(currentStudySessionEvent);
  persistStudySession(currentStudySessionId, {
    status: 'completed',
    startedAt: null,
    completedAt: new Date().toISOString(),
    elapsedSeconds: Math.max(studySessionElapsedSeconds(state), planned)
  }, () => {
    showToast(t('sessionCompleted'), 'success');
    updateStudySessionModal();
  });
}

function resetCurrentStudySession() {
  if (!currentStudySessionId) return;
  persistStudySession(currentStudySessionId, null, () => {
    showToast(t('sessionResetDone'), 'success');
    updateStudySessionModal();
  });
}

function openCurrentSessionHomework() {
  if (!currentStudySessionEvent) return;
  const ev = { ...currentStudySessionEvent, planId: currentStudySessionEvent.id };
  closeStudySessionModal();
  openHomeworkFromCalendar(ev);
}

