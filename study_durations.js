(() => {
  // Default minutes per combination
  const defaultStudyDurations = {
    homework: { easy: 25, medium: 45, hard: 75 },
    test: { easy: 30, medium: 60, hard: 90 }
  };

  const DAY_NAMES = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  };

  const DAY_RENDER_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const START_HOUR = 6;
  const END_HOUR = 23;
  const ROW_HEIGHT = 48; // px per hour
  const SNAP_MIN = 15;
  const totalHeight = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT;

  const defaultStudyWindows = {
    '1': [{ start: '18:00', end: '21:00' }],
    '2': [{ start: '18:00', end: '21:00' }],
    '3': [{ start: '18:00', end: '21:00' }],
    '4': [{ start: '18:00', end: '21:00' }],
    '5': [{ start: '18:00', end: '21:00' }],
    '0': [{ start: '10:00', end: '20:00' }],
    '6': [{ start: '10:00', end: '20:00' }]
  };

  const $hwEasy = document.getElementById('dur-hw-easy');
  const $hwMed = document.getElementById('dur-hw-med');
  const $hwHard = document.getElementById('dur-hw-hard');
  const $testEasy = document.getElementById('dur-test-easy');
  const $testMed = document.getElementById('dur-test-med');
  const $testHard = document.getElementById('dur-test-hard');
  const $sdLanguage = document.getElementById('sd-language');
  const $sdTimeFormat = document.getElementById('sd-time-format');
  const $save = document.getElementById('save');
  const $reset = document.getElementById('reset');
  const $status = document.getElementById('status');
  const $backToOptions = document.getElementById('back-to-options');
  const $calendarGrid = document.getElementById('calendar-grid');
  const $calendarShell = document.getElementById('calendar-shell');
  const $classicShell = document.getElementById('classic-shell');
  const $days = document.getElementById('days');
  const $viewToggle = document.getElementById('view-toggle');
  const $saveWindows = document.getElementById('save-windows');
  const $resetWindows = document.getElementById('reset-windows');
  const $windowsStatus = document.getElementById('windows-status');

  let currentWindows = {};
  let dayCols = new Map();
  let drag = null;
  let blockList = {};
  let currentLang = 'en';
  let currentTimeFormat = '12h';
  const TRANSLATIONS = {
    en: {
      sdSettingsPill: 'Settings',
      sdSettingsTitle: 'Settings',
      sdSettingsSubtitle: 'Adjust study durations and allowed windows. Language is set above.',
      sdLangLabel: 'Language',
      sdLangEn: 'English',
      sdLangFr: 'French',
      sdTimeLabel: 'Time format',
      sdTime12: '12-hour (AM/PM)',
      sdTime24: '24-hour',
      sdBack: '← Back to planner',
      sdHomework: 'Homework',
      sdHwEasy: 'Easy homework',
      sdHwMed: 'Medium homework',
      sdHwHard: 'Hard homework',
      sdTests: 'Tests / Exams',
      sdTestEasy: 'Easy test',
      sdTestMed: 'Medium test',
      sdTestHard: 'Hard test',
      sdMin: 'min',
      sdHintExample: 'Example: If “Homework · Medium” is 45, a medium homework item will be planned as ~45 minutes.',
      sdSave: 'Save',
      sdReset: 'Reset to defaults',
      sdSchedPill: 'Scheduling Rules',
      sdSchedTitle: 'Allowed Time Windows',
      sdClassic: 'Classic list',
      sdCalendar: 'Calendar view',
      sdStart: 'Start',
      sdEnd: 'End',
      sdAddWindow: 'Add window',
      sdRemove: 'Remove',
      sdSchedHint: 'Drag on the grid to create allowed blocks. Drag edges to resize; click a block to delete. Sessions are packed inside these windows.',
      sdHelp: 'Tip: drag to create; drag edges to resize; click to delete.',
      sdSaveWindows: 'Save windows',
      sdResetWindows: 'Reset to defaults',
      monShort: 'Mon', tueShort: 'Tue', wedShort: 'Wed', thuShort: 'Thu', friShort: 'Fri', satShort: 'Sat', sunShort: 'Sun'
    },
    fr: {
      sdSettingsPill: 'Paramètres',
      sdSettingsTitle: 'Paramètres',
      sdSettingsSubtitle: 'Ajustez les durées et les créneaux autorisés. La langue se règle ci-dessous.',
      sdLangLabel: 'Langue',
      sdLangEn: 'Anglais',
      sdLangFr: 'Français',
      sdTimeLabel: 'Format horaire',
      sdTime12: '12 h (AM/PM)',
      sdTime24: '24 h',
      sdBack: '← Retour au planning',
      sdHomework: 'Devoirs',
      sdHwEasy: 'Devoir facile',
      sdHwMed: 'Devoir moyen',
      sdHwHard: 'Devoir difficile',
      sdTests: 'Tests / Examens',
      sdTestEasy: 'Test facile',
      sdTestMed: 'Test moyen',
      sdTestHard: 'Test difficile',
      sdMin: 'min',
      sdHintExample: 'Exemple : si « Devoir · Moyen » est 45, un devoir moyen sera prévu pour ~45 minutes.',
      sdSave: 'Enregistrer',
      sdReset: 'Rétablir les valeurs par défaut',
      sdSchedPill: 'Règles de planification',
      sdSchedTitle: 'Créneaux autorisés',
      sdClassic: 'Liste classique',
      sdCalendar: 'Vue calendrier',
      sdStart: 'Début',
      sdEnd: 'Fin',
      sdAddWindow: 'Ajouter un créneau',
      sdRemove: 'Supprimer',
      sdSchedHint: 'Cliquez-glissez sur la grille pour créer un créneau. Glissez les bords pour redimensionner ; cliquez pour supprimer. Les séances sont placées dans ces créneaux.',
      sdHelp: 'Astuce : glisser pour créer, glisser les bords pour ajuster, cliquer pour supprimer.',
      sdSaveWindows: 'Enregistrer les créneaux',
      sdResetWindows: 'Valeurs par défaut',
      monShort: 'Lun', tueShort: 'Mar', wedShort: 'Mer', thuShort: 'Jeu', friShort: 'Ven', satShort: 'Sam', sunShort: 'Dim'
    }
  };

  function t(key) {
    const pack = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    return pack[key] || TRANSLATIONS.en[key] || key;
  }

  function applyToInputs(durations) {
    const d = durations || defaultStudyDurations;

    function val(obj, cat, diff, fallback) {
      return obj &&
        obj[cat] &&
        typeof obj[cat][diff] === 'number' &&
        obj[cat][diff] > 0
        ? obj[cat][diff]
        : fallback;
    }

    $hwEasy.value = val(d, 'homework', 'easy', defaultStudyDurations.homework.easy);
    $hwMed.value = val(d, 'homework', 'medium', defaultStudyDurations.homework.medium);
    $hwHard.value = val(d, 'homework', 'hard', defaultStudyDurations.homework.hard);

    $testEasy.value = val(d, 'test', 'easy', defaultStudyDurations.test.easy);
    $testMed.value = val(d, 'test', 'medium', defaultStudyDurations.test.medium);
    $testHard.value = val(d, 'test', 'hard', defaultStudyDurations.test.hard);
  }

  function readFromInputs() {
    function norm(input, fallback) {
      const v = parseInt(input.value, 10);
      if (isNaN(v) || v <= 0) return fallback;
      return v;
    }

    return {
      homework: {
        easy: norm($hwEasy, defaultStudyDurations.homework.easy),
        medium: norm($hwMed, defaultStudyDurations.homework.medium),
        hard: norm($hwHard, defaultStudyDurations.homework.hard)
      },
      test: {
        easy: norm($testEasy, defaultStudyDurations.test.easy),
        medium: norm($testMed, defaultStudyDurations.test.medium),
        hard: norm($testHard, defaultStudyDurations.test.hard)
      }
    };
  }

  function setStatus(msg, cls) {
    if (!$status) return;
    $status.textContent = msg || '';
    $status.className = cls || '';
    if (msg) {
      setTimeout(() => {
        $status.textContent = '';
        $status.className = '';
      }, 1600);
    }
  }

  function setWindowStatus(msg, cls) {
    if (!$windowsStatus) return;
    $windowsStatus.textContent = msg || '';
    $windowsStatus.className = cls ? `status-inline ${cls}` : 'status-inline';
    if (msg) {
      setTimeout(() => {
        $windowsStatus.textContent = '';
        $windowsStatus.className = 'status-inline';
      }, 1600);
    }
  }

  function minutesFromHM(hm) {
    const [h, m] = String(hm || '0:0').split(':').map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  }

  function hmFromMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function normalizeWindows(w) {
    const out = {};
    const clamp = (n) => Math.min(Math.max(n, START_HOUR * 60), END_HOUR * 60);
    for (const day of DAY_RENDER_ORDER) {
      const list = (w && w[String(day)]) || [];
      const cleaned = [];
      for (const win of list) {
        const s = clamp(minutesFromHM(win.start));
        const e = clamp(minutesFromHM(win.end));
        if (e <= s) continue;
        cleaned.push({ start: s, end: e });
      }
      cleaned.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const win of cleaned) {
        const last = merged[merged.length - 1];
        if (last && win.start <= last.end) {
          last.end = Math.max(last.end, win.end);
        } else merged.push({ ...win });
      }
      if (merged.length) out[String(day)] = merged.map((x) => ({ start: hmFromMinutes(x.start), end: hmFromMinutes(x.end) }));
    }
    return out;
  }

  function formatHourLabel(h) {
    if (currentTimeFormat === '24h') {
      return `${String(h).padStart(2, '0')}:00`;
    }
    const hour12 = ((h + 11) % 12) + 1;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12} ${suffix}`;
  }

  function buildGrid() {
    if (!$calendarGrid) return;
    $calendarGrid.innerHTML = '';
    dayCols = new Map();

    const timeCol = document.createElement('div');
    timeCol.className = 'time-col';
    timeCol.style.height = `${totalHeight}px`;

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const label = document.createElement('div');
      label.className = 'time-label';
      label.textContent = formatHourLabel(h);
      label.style.top = `${(h - START_HOUR) * ROW_HEIGHT - 6}px`;
      timeCol.appendChild(label);

      const line = document.createElement('div');
      line.className = 'hour-line';
      line.style.top = `${(h - START_HOUR) * ROW_HEIGHT}px`;
      timeCol.appendChild(line);
    }
    $calendarGrid.appendChild(timeCol);

    for (const day of DAY_RENDER_ORDER) {
      const col = document.createElement('div');
      col.className = 'day-col';
      col.dataset.day = String(day);
      col.style.height = `${totalHeight}px`;

      for (let h = START_HOUR; h <= END_HOUR; h++) {
        const line = document.createElement('div');
        line.className = 'hour-line';
        line.style.top = `${(h - START_HOUR) * ROW_HEIGHT}px`;
        col.appendChild(line);
      }

      col.addEventListener('mousedown', (ev) => onDayMouseDown(ev, day, col));
      $calendarGrid.appendChild(col);
      dayCols.set(String(day), col);
    }
  }

  function dayLabel(idx) {
    const arr = DAY_NAMES[currentLang] || DAY_NAMES.en;
    return arr[idx] || DAY_NAMES.en[idx] || '';
  }

  function buildClassic() {
    if (!$days) return;
    $days.innerHTML = '';
    blockList = {};
    for (const day of DAY_RENDER_ORDER) {
      const div = document.createElement('div');
      div.className = 'day';
      const h = document.createElement('strong');
      h.textContent = dayLabel(day);
      const row = document.createElement('div');
      row.className = 'row';
      const addBtn = document.createElement('button');
      addBtn.textContent = t('sdAddWindow');
      addBtn.className = 'add-window';

      const key = String(day);
      const wins = currentWindows[key] || [];

      const addWin = (win) => {
        const wrap = document.createElement('div');
        wrap.className = 'row';
        const s = document.createElement('input');
        s.type = 'time';
        s.value = win.start || '18:00';
        const e = document.createElement('input');
        e.type = 'time';
        e.value = win.end || '21:00';
        const del = document.createElement('button');
        del.textContent = t('sdRemove');
        del.addEventListener('click', () => {
          row.removeChild(wrap);
          syncClassicToState();
        });
        [s, e].forEach((inp) => inp.addEventListener('change', syncClassicToState));
        wrap.append(t('sdStart'), s, t('sdEnd'), e, del);
        wrap.$start = s;
        wrap.$end = e;
        row.appendChild(wrap);
      };

      wins.forEach((w) => addWin(w));
      if (!wins.length) addWin({ start: '18:00', end: '21:00' });

      addBtn.addEventListener('click', () => {
        addWin({ start: '18:00', end: '21:00' });
        syncClassicToState();
      });

      div.append(h, row, addBtn);
      $days.appendChild(div);
      blockList[key] = row;
    }
  }

  function syncClassicToState() {
    const next = {};
    for (const day of DAY_RENDER_ORDER) {
      const key = String(day);
      const row = blockList[key];
      if (!row) continue;
      const vals = [];
      for (const child of Array.from(row.children)) {
        const s = child.$start?.value || '00:00';
        const e = child.$end?.value || '00:00';
        if (s && e && s < e) vals.push({ start: s, end: e });
      }
      if (vals.length) next[key] = vals;
    }
    currentWindows = normalizeWindows(next);
    renderBlocks();
  }

  function yToMinutes(y) {
    const minutes = START_HOUR * 60 + (y / ROW_HEIGHT) * 60;
    const snapped = Math.round(minutes / SNAP_MIN) * SNAP_MIN;
    return Math.min(Math.max(snapped, START_HOUR * 60), END_HOUR * 60);
  }

  function minutesToY(mins) {
    return ((mins - START_HOUR * 60) / 60) * ROW_HEIGHT;
  }

  function renderBlocks() {
    for (const [, col] of dayCols) {
      Array.from(col.querySelectorAll('.block, .drag-hint')).forEach((n) => n.remove());
    }
    for (const day of DAY_RENDER_ORDER) {
      const col = dayCols.get(String(day));
      if (!col) continue;
      const wins = (currentWindows[String(day)] || []).map((w) => ({
        start: minutesFromHM(w.start),
        end: minutesFromHM(w.end)
      }));
      wins.sort((a, b) => a.start - b.start);
      wins.forEach((win, idx) => {
        const block = document.createElement('div');
        block.className = 'block';
        block.dataset.day = String(day);
        block.dataset.idx = String(idx);
        const top = minutesToY(win.start);
        const height = minutesToY(win.end) - minutesToY(win.start);
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.innerHTML = `<div class="time-range">${hmFromMinutes(win.start)} – ${hmFromMinutes(win.end)}</div>`;

        const handleTop = document.createElement('div');
        handleTop.className = 'block-handle top';
        const handleBottom = document.createElement('div');
        handleBottom.className = 'block-handle bottom';
        block.append(handleTop, handleBottom);

        handleTop.addEventListener('mousedown', (ev) => {
          ev.stopPropagation();
          startResize(day, idx, 'start', ev);
        });
        handleBottom.addEventListener('mousedown', (ev) => {
          ev.stopPropagation();
          startResize(day, idx, 'end', ev);
        });
        block.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteWindow(day, idx);
        });
        col.appendChild(block);
      });
    }
  }

  function deleteWindow(day, idx) {
    const list = currentWindows[String(day)] || [];
    if (!list[idx]) return;
    list.splice(idx, 1);
    currentWindows[String(day)] = list;
    renderBlocks();
  }

  function onDayMouseDown(ev, day, col) {
    if ((ev.target && ev.target.closest('.block'))) return;
    const rect = col.getBoundingClientRect();
    const y = Math.max(0, Math.min(ev.clientY - rect.top, totalHeight));
    const start = yToMinutes(y);
    drag = {
      mode: 'create',
      day,
      start,
      end: start + SNAP_MIN,
      hint: createHint(col)
    };
    updateHint();
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd, { once: true });
  }

  function startResize(day, idx, edge, ev) {
    ev.preventDefault();
    const list = (currentWindows[String(day)] || []).map((w) => ({
      start: minutesFromHM(w.start),
      end: minutesFromHM(w.end)
    }));
    const win = list[idx];
    if (!win) return;
    const col = dayCols.get(String(day));
    drag = {
      mode: edge === 'start' ? 'resize-start' : 'resize-end',
      day,
      idx,
      start: win.start,
      end: win.end,
      hint: createHint(col)
    };
    updateHint();
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd, { once: true });
  }

  function createHint(col) {
    const hint = document.createElement('div');
    hint.className = 'drag-hint';
    col.appendChild(hint);
    return hint;
  }

  function updateHint() {
    if (!drag || !drag.hint) return;
    const a = Math.min(drag.start, drag.end);
    const b = Math.max(drag.start, drag.end);
    drag.hint.style.top = `${minutesToY(a)}px`;
    drag.hint.style.height = `${minutesToY(b) - minutesToY(a)}px`;
  }

  function onDragMove(ev) {
    if (!drag) return;
    const col = dayCols.get(String(drag.day));
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = Math.max(0, Math.min(ev.clientY - rect.top, totalHeight));
    const minutes = yToMinutes(y);
    if (drag.mode === 'create') {
      drag.end = minutes;
    } else if (drag.mode === 'resize-start') {
      drag.start = Math.min(minutes, drag.end - SNAP_MIN);
    } else if (drag.mode === 'resize-end') {
      drag.end = Math.max(minutes, drag.start + SNAP_MIN);
    }
    updateHint();
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    if (!drag) return;
    const a = Math.min(drag.start, drag.end);
    const b = Math.max(drag.start, drag.end);
    if (drag.hint) drag.hint.remove();

    if (b - a < SNAP_MIN) {
      drag = null;
      return;
    }

    if (drag.mode === 'create') {
      addWindow(drag.day, a, b);
    } else if (drag.mode === 'resize-start' || drag.mode === 'resize-end') {
      resizeWindow(drag.day, drag.idx, a, b);
    }
    drag = null;
  }

  function addWindow(day, startMin, endMin) {
    const key = String(day);
    const list = (currentWindows[key] || []).map((w) => ({
      start: minutesFromHM(w.start),
      end: minutesFromHM(w.end)
    }));
    list.push({ start: startMin, end: endMin });
    list.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const w of list) {
      const last = merged[merged.length - 1];
      if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
      else merged.push({ ...w });
    }
    currentWindows[key] = merged.map((w) => ({ start: hmFromMinutes(w.start), end: hmFromMinutes(w.end) }));
    renderBlocks();
  }

  function resizeWindow(day, idx, startMin, endMin) {
    const key = String(day);
    const list = (currentWindows[key] || []).map((w) => ({
      start: minutesFromHM(w.start),
      end: minutesFromHM(w.end)
    }));
    if (!list[idx]) return;
    list[idx] = { start: startMin, end: endMin };
    list.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const w of list) {
      const last = merged[merged.length - 1];
      if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
      else merged.push({ ...w });
    }
    currentWindows[key] = merged.map((w) => ({ start: hmFromMinutes(w.start), end: hmFromMinutes(w.end) }));
    renderBlocks();
  }

  // Load existing durations
  chrome.storage.sync.get({ studyDurations: defaultStudyDurations }, (res) => {
    try {
      applyToInputs(res.studyDurations || defaultStudyDurations);
    } catch {
      applyToInputs(defaultStudyDurations);
    }
  });

  // Save button
  $save.addEventListener('click', () => {
    try {
      const durations = readFromInputs();
      chrome.storage.sync.set({ studyDurations: durations }, () => {
        setStatus('Saved', 'ok');
      });
    } catch (e) {
      setStatus('Failed to save', 'err');
    }
  });

  // Reset button
  $reset.addEventListener('click', () => {
    chrome.storage.sync.set(
      { studyDurations: defaultStudyDurations },
      () => {
        applyToInputs(defaultStudyDurations);
        setStatus('Defaults restored', 'ok');
      }
    );
  });

  // Optional: autosave on change (lightweight)
  [
    $hwEasy,
    $hwMed,
    $hwHard,
    $testEasy,
    $testMed,
    $testHard
  ].forEach((input) => {
    input.addEventListener('change', () => {
      const durations = readFromInputs();
      chrome.storage.sync.set({ studyDurations: durations });
    });
  });

  function loadStudyWindows() {
    chrome.storage.sync.get({ studyWindows: defaultStudyWindows }, (res) => {
      currentWindows = normalizeWindows(res.studyWindows || defaultStudyWindows);
      renderBlocks();
      buildClassic();
    });
  }

  if ($saveWindows) {
    $saveWindows.addEventListener('click', () => {
      try {
        const clean = normalizeWindows(currentWindows);
        chrome.storage.sync.set({ studyWindows: clean }, () => setWindowStatus('Saved', 'ok'));
      } catch (e) {
        setWindowStatus('Save failed', 'err');
      }
    });
  }

  if ($resetWindows) {
    $resetWindows.addEventListener('click', () => {
      chrome.storage.sync.set({ studyWindows: defaultStudyWindows }, () => {
        currentWindows = normalizeWindows(defaultStudyWindows);
        renderBlocks();
        buildClassic();
        setWindowStatus('Defaults restored', 'ok');
      });
    });
  }

  if ($backToOptions) {
    $backToOptions.addEventListener('click', () => {
      window.location.href = chrome.runtime.getURL('options.html');
    });
  }

  function initLanguagePicker() {
    if (!$sdLanguage) return;
    chrome.storage.sync.get({ language: 'en', timeFormat: '12h' }, (res) => {
      currentLang = res && res.language === 'fr' ? 'fr' : 'en';
      $sdLanguage.value = currentLang;
      currentTimeFormat = res && res.timeFormat === '24h' ? '24h' : '12h';
      if ($sdTimeFormat) $sdTimeFormat.value = currentTimeFormat;
      applyTranslations();
      buildGrid();
      buildClassic();
      renderBlocks();
    });
    $sdLanguage.addEventListener('change', () => {
      currentLang = $sdLanguage.value === 'fr' ? 'fr' : 'en';
      chrome.storage.sync.set({ language: currentLang });
      applyTranslations();
      buildGrid();
      buildClassic();
      renderBlocks();
    });
    if ($sdTimeFormat) {
      $sdTimeFormat.addEventListener('change', () => {
        currentTimeFormat = $sdTimeFormat.value === '24h' ? '24h' : '12h';
        chrome.storage.sync.set({ timeFormat: currentTimeFormat });
        buildGrid();
        renderBlocks();
      });
    }
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // Update day headers in calendar grid if present
    document.querySelectorAll('.calendar-header [data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // Update minutes suffix spans
    document.querySelectorAll('.minutes-suffix').forEach((el) => { el.textContent = t('sdMin'); });
  }

  if ($viewToggle) {
    $viewToggle.addEventListener('change', () => {
      const calendarMode = $viewToggle.checked;
      if ($calendarShell) $calendarShell.classList.toggle('hidden', !calendarMode);
      if ($classicShell) $classicShell.classList.toggle('hidden', calendarMode);
      if (!calendarMode) {
        buildClassic();
      } else {
        renderBlocks();
      }
    });
  }

  buildGrid();
  loadStudyWindows();
  initLanguagePicker();
})();
