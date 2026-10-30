// Recurring-event list and its modal.
function renderRecurring(list) {
  if (!$recList) return;
  const items = Array.isArray(list) ? list : [];
  $recList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'rec-card';
    empty.textContent = t('emptyRec');
    $recList.appendChild(empty);
    return;
  }
  items.forEach((ev, idx) => {
    const card = document.createElement('div'); card.className = 'rec-card';
    const info = document.createElement('div'); info.className = 'rec-info';
    const title = document.createElement('div'); title.className = 'rec-title'; title.textContent = ev.title || `(${t('untitled')})`;
    const meta = document.createElement('div'); meta.className = 'rec-meta';
    const daysStr = (ev.days || []).map(d => TRANSLATIONS[currentLang].days[d]?.slice(0, 3)).join(', ');
    const durationStr = ev.duration ? ` • ${formatDuration(ev.duration)}` : '';
    meta.textContent = `${ev.time || ''} • ${daysStr}${durationStr}`;
    info.append(title, meta);
    if (ev.skipWeeks > 0) {
      const skipMeta = document.createElement('div');
      skipMeta.className = 'rec-meta';
      skipMeta.textContent = t('recSkip').replace('{n}', ev.skipWeeks);
      info.append(skipMeta);
    }
    const controls = document.createElement('div'); controls.className = 'rec-controls';
    const skipRow = document.createElement('div'); skipRow.className = 'rec-skip-row';
    const skipLabel = document.createElement('span'); skipLabel.textContent = ev.skipWeeks > 0 ? t('recSkip').replace('{n}', ev.skipWeeks) : t('recSkipPlaceholder');
    const skipInput = document.createElement('input'); skipInput.className = 'rec-skip-input'; skipInput.type = 'number'; skipInput.min = '1'; skipInput.placeholder = '1'; if (ev.skipWeeks > 0) skipInput.value = String(ev.skipWeeks);
    const applySkip = document.createElement('button'); applySkip.className = 'details-btn'; applySkip.textContent = t('recApply');
    applySkip.addEventListener('click', () => {
      const n = parseInt(skipInput.value, 10);
      if (!Number.isFinite(n) || n <= 0) { setRecStatus(t('recErrWeeks'), 'err'); return; }
      const next = items.slice();
      next[idx] = { ...next[idx], skipWeeks: n };
      localSet({ [RECURRING_KEY]: next }, () => { setRecStatus(t('recSaved'), 'ok'); renderRecurring(next); });
    });
    const clearSkip = document.createElement('button'); clearSkip.className = 'details-btn'; clearSkip.textContent = t('recClear');
    clearSkip.addEventListener('click', () => {
      const next = items.slice();
      if (next[idx]) delete next[idx].skipWeeks;
      localSet({ [RECURRING_KEY]: next }, () => { setRecStatus(t('recSaved'), 'ok'); renderRecurring(next); });
    });
    skipRow.append(skipLabel, skipInput, applySkip, clearSkip);
    controls.append(skipRow);
    const del = document.createElement('button'); del.className = 'details-btn'; del.textContent = t('recDelete'); del.addEventListener('click', () => { const next = items.slice(); next.splice(idx, 1); localSet({ [RECURRING_KEY]: next }, () => renderRecurring(next)); });
    controls.append(del);
    card.append(info, controls); $recList.appendChild(card);
  });
}

function setRecStatus(msg = '', cls = '') {
  if (!$recStatus) return;
  $recStatus.textContent = msg;
  $recStatus.className = cls ? `status-inline ${cls}` : 'status-inline';
}

function resetRecForm() {
  if ($recTitle) $recTitle.value = '';
  if ($recTime) $recTime.value = '';
  if ($recDurationHours) $recDurationHours.value = '';
  if ($recDurationMinutes) $recDurationMinutes.value = '';
  $recDays?.forEach((box) => { box.checked = false; });
  setRecStatus('');
}

function openRecModal() {
  if (!$recModal) return;
  resetRecForm();
  $recModal.classList.remove('hidden');
}

function closeRecModal() {
  if (!$recModal) return;
  $recModal.classList.add('hidden');
}

// ---- Recurring loader ----
function loadRecurring() {
  if (!chrome?.storage?.local) return;
  localGet({ [RECURRING_KEY]: [] }, (res) => renderRecurring(res[RECURRING_KEY] || []));
}

