// Toasts, the first-run onboarding flow, and the Google Calendar / .ics triggers.
function showToast(message, kind = 'info') {
  if (!$toastHost || !message) return;
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`.trim();
  toast.textContent = message;
  $toastHost.appendChild(toast);
  const close = () => {
    toast.classList.add('out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 180);
  };
  setTimeout(close, 3200);
}

function formatTemplate(template, vars) {
  const map = vars || {};
  return String(template || '').replace(/\{(\w+)\}/g, (m, key) => (map[key] == null ? m : String(map[key])));
}

// Override with multi-step onboarding (interactive)
function showOnboarding() {
  const modalId = 'onboarding-modal';
  const existing = document.getElementById(modalId);
  if (existing) { existing.classList.remove('hidden'); return; }

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-card">
      <button id="onboarding-close" class="modal-close" aria-label="Close">×</button>
      <h2 class="modal-title" id="ob-title">Welcome!</h2>
      <div id="ob-step" class="modal-notes" style="margin-top:6px; display:flex; flex-direction:column; gap:10px;"></div>
      <div class="button-row" style="margin-top:12px; justify-content:flex-end; gap:8px;">
        <button id="onboarding-back" class="secondary" type="button">Back</button>
        <button id="onboarding-skip" class="secondary" type="button">Skip</button>
        <button id="onboarding-next" class="primary" type="button">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const answers = {
    lang: 'en',
    autoSync: false,
    timefmt: '12h',
    recurringDraft: null,
    windowsDraft: null,
    durations: { homework: {}, test: {} }
  };

  let winMap = null;
  const steps = [
    {
      title: 'Welcome to PRONOTE Planner',
      render: (host) => {
        host.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:14px; color:#e5e7eb; line-height:1.5;">
              This quick setup helps personalize your study plan in a few steps.
            </div>
            <div style="font-size:12px; color:#9ca3af;">
              You can skip any question and edit everything later in Settings.
            </div>
          </div>`;
      },
      collect: () => {}
    },
    
    
    {
      title: 'Choose your language',
      render: (host) => {
        host.innerHTML = `
          <label style="display:flex; flex-direction:column; gap:6px;">
            <span>Language</span>
            <select id="ob-lang" style="padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>`;
        const langSel = host.querySelector('#ob-lang');
        if (langSel) langSel.value = answers.lang === 'fr' ? 'fr' : 'en';
      },
      collect: () => { const sel = modal.querySelector('#ob-lang'); answers.lang = sel?.value === 'fr' ? 'fr' : 'en'; }
    },
    {
      title: 'Auto-sync to Google Calendar?',
      render: (host) => {
        host.innerHTML = `
          <label style="display:flex; align-items:center; gap:8px;">
            <input id="ob-autosync" type="checkbox" /> <span>Auto-sync study sessions to Google Calendar</span>
          </label>`;
        const autoSyncBox = host.querySelector('#ob-autosync');
        if (autoSyncBox) autoSyncBox.checked = !!answers.autoSync;
      },
      collect: () => { answers.autoSync = !!modal.querySelector('#ob-autosync')?.checked; }
    },
    {
      title: 'Time format',
      render: (host) => {
        host.innerHTML = `
          <label style="display:flex; flex-direction:column; gap:6px;">
            <span>Time format</span>
            <select id="ob-timefmt" style="padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </label>`;
        const fmtSel = host.querySelector('#ob-timefmt');
        if (fmtSel) fmtSel.value = answers.timefmt === '24h' ? '24h' : '12h';
      },
      collect: () => { const sel = modal.querySelector('#ob-timefmt'); answers.timefmt = sel?.value === '24h' ? '24h' : '12h'; }
    },
    {
      title: 'Add regular events',
      render: (host) => {
        const rec = answers.recurringDraft || {};
        const days = new Set(rec.days || []);
        const total = Number.isFinite(rec.duration) ? rec.duration : 0;
        const durH = Math.floor(total / 60);
        const durM = total % 60;
        host.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <input id="ob-rec-title" type="text" placeholder="Event name (e.g., Gym)" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <div style="display:flex; flex-direction:column; gap:4px; flex:1 1 160px;">
                <span style="color:#9ca3af; font-size:12px;">Start time</span>
                <input id="ob-rec-time" type="time" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px; flex:1 1 160px;">
                <span style="color:#9ca3af; font-size:12px;">Duration (hours & minutes)</span>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <input id="ob-rec-dur-h" type="number" min="0" max="12" placeholder="H" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
                  <input id="ob-rec-dur-m" type="number" min="0" max="59" placeholder="M" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb;">
                </div>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:#e5e7eb;">
              <label><input type="checkbox" value="1"> Mon</label>
              <label><input type="checkbox" value="2"> Tue</label>
              <label><input type="checkbox" value="3"> Wed</label>
              <label><input type="checkbox" value="4"> Thu</label>
              <label><input type="checkbox" value="5"> Fri</label>
              <label><input type="checkbox" value="6"> Sat</label>
              <label><input type="checkbox" value="0"> Sun</label>
            </div>
          </div>`;
        const recTitle = host.querySelector('#ob-rec-title');
        const recTime = host.querySelector('#ob-rec-time');
        const recDurH = host.querySelector('#ob-rec-dur-h');
        const recDurM = host.querySelector('#ob-rec-dur-m');
        if (recTitle) recTitle.value = String(rec.title || '');
        if (recTime) recTime.value = String(rec.time || '');
        if (recDurH && durH > 0) recDurH.value = String(durH);
        if (recDurM && durM > 0) recDurM.value = String(durM);
        host.querySelectorAll('input[type="checkbox"]').forEach((box) => {
          const day = parseInt(box.value, 10);
          box.checked = Number.isFinite(day) && days.has(day);
        });
      },
      collect: () => {
        const title = modal.querySelector('#ob-rec-title')?.value?.trim() || '';
        const time = modal.querySelector('#ob-rec-time')?.value || '';
        const h = parseInt(modal.querySelector('#ob-rec-dur-h')?.value, 10);
        const m = parseInt(modal.querySelector('#ob-rec-dur-m')?.value, 10);
        const duration = (Number.isFinite(h) ? h * 60 : 0) + (Number.isFinite(m) ? m : 0);
        const days = Array.from(modal.querySelectorAll('#ob-step input[type="checkbox"]:checked')).map((c) => parseInt(c.value, 10));
        answers.recurringDraft = { title, time, duration: duration > 0 ? duration : null, days };
      }
    },
    {
      title: 'Homework duration',
      render: (host) => {
        const hw = answers.durations.homework || {};
        const hwEasy = Number.isFinite(hw.easy) ? hw.easy : defaultStudyDurations.homework.easy;
        const hwMed = Number.isFinite(hw.medium) ? hw.medium : defaultStudyDurations.homework.medium;
        const hwHard = Number.isFinite(hw.hard) ? hw.hard : defaultStudyDurations.homework.hard;
        host.innerHTML = `
          <fieldset style="border:1px solid rgba(148,163,253,0.2); border-radius:10px; padding:8px 10px;">
            <legend style="font-size:12px; color:#9ca3af;">Homework minutes (easy / medium / hard)</legend>
            <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
              <input id="ob-hw-easy" type="number" min="5" placeholder="Easy" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
              <input id="ob-hw-med" type="number" min="5" placeholder="Medium" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
              <input id="ob-hw-hard" type="number" min="5" placeholder="Hard" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
            </div>
          </fieldset>`;
        const hwEasyInput = host.querySelector('#ob-hw-easy');
        const hwMedInput = host.querySelector('#ob-hw-med');
        const hwHardInput = host.querySelector('#ob-hw-hard');
        if (hwEasyInput) hwEasyInput.value = String(hwEasy);
        if (hwMedInput) hwMedInput.value = String(hwMed);
        if (hwHardInput) hwHardInput.value = String(hwHard);
      },
      collect: () => {
        const val = (sel) => { const v = parseInt(modal.querySelector(sel)?.value, 10); return Number.isFinite(v) && v > 0 ? v : undefined; };
        answers.durations.homework = { easy: val('#ob-hw-easy'), medium: val('#ob-hw-med'), hard: val('#ob-hw-hard') };
      }
    },
    {
      title: 'Test revision duration',
      render: (host) => {
        const test = answers.durations.test || {};
        const testEasy = Number.isFinite(test.easy) ? test.easy : defaultStudyDurations.test.easy;
        const testMed = Number.isFinite(test.medium) ? test.medium : defaultStudyDurations.test.medium;
        const testHard = Number.isFinite(test.hard) ? test.hard : defaultStudyDurations.test.hard;
        host.innerHTML = `
          <fieldset style="border:1px solid rgba(148,163,253,0.2); border-radius:10px; padding:8px 10px;">
            <legend style="font-size:12px; color:#9ca3af;">Test revision minutes (easy / medium / hard)</legend>
            <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
              <input id="ob-test-easy" type="number" min="5" placeholder="Easy" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
              <input id="ob-test-med" type="number" min="5" placeholder="Medium" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
              <input id="ob-test-hard" type="number" min="5" placeholder="Hard" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid rgba(148,163,253,0.3); background:#0b1020; color:#e5e7eb; text-align:center;">
            </div>
          </fieldset>`;
        const testEasyInput = host.querySelector('#ob-test-easy');
        const testMedInput = host.querySelector('#ob-test-med');
        const testHardInput = host.querySelector('#ob-test-hard');
        if (testEasyInput) testEasyInput.value = String(testEasy);
        if (testMedInput) testMedInput.value = String(testMed);
        if (testHardInput) testHardInput.value = String(testHard);
      },
      collect: () => {
        const val = (sel) => { const v = parseInt(modal.querySelector(sel)?.value, 10); return Number.isFinite(v) && v > 0 ? v : undefined; };
        answers.durations.test = { easy: val('#ob-test-easy'), medium: val('#ob-test-med'), hard: val('#ob-test-hard') };
      }
    },
    {
      title: 'Study windows',
      wide: true,
      render: (host) => {
        const START = 6 * 60, END = 24 * 60, totalMin = END - START;
        const snap = (m) => Math.round(m / 5) * 5;
        const toMinutes = (t) => {
          const [h, m] = String(t || '').split(':').map((v) => parseInt(v, 10) || 0);
          return Math.max(0, Math.min(24 * 60, h * 60 + m));
        };
        const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const mergeWins = (list) => {
          const items = (list || [])
            .map((w) => ({ start: toMinutes(w.start), end: toMinutes(w.end) }))
            .filter((w) => w.end > w.start)
            .sort((a, b) => a.start - b.start);
          const merged = [];
          items.forEach((w) => {
            const last = merged[merged.length - 1];
            if (!last || w.start > last.end) merged.push({ ...w });
            else last.end = Math.max(last.end, w.end);
          });
          return merged.map((w) => ({ start: toHM(w.start), end: toHM(w.end) }));
        };

        winMap = answers.windowsDraft ? { ...answers.windowsDraft } : JSON.parse(JSON.stringify(defaultStudyWindows));
        Object.keys(winMap).forEach((day) => { winMap[day] = mergeWins(winMap[day]); });
        host.innerHTML = `
          <div style="display:flex; justify-content:center;">
            <div id="ob-win-grid" style="border:1px solid rgba(148,163,253,0.25); border-radius:14px; padding:12px; background:rgba(9,13,30,0.88); min-height:520px; width:100%; overflow:hidden; margin:0 auto;">
              <div style="display:grid; grid-template-columns:90px repeat(7, minmax(0, 1fr)); gap:12px; position:relative; width:100%; margin:0 auto;">
                <div></div>
                ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div style="text-align:center; color:#e5e7eb; font-size:12px;">${d}</div>`).join('')}
                <div style="position:relative; grid-column:1 / span 8; min-height:480px;">
                  <div id="ob-time-col" style="position:absolute; left:0; top:0; bottom:0; width:90px;"></div>
                  <div id="ob-days" style="margin-left:90px; display:grid; grid-template-columns:repeat(7,1fr); gap:12px; position:relative; min-height:480px;"></div>
                </div>
              </div>
            </div>
          </div>
          <div style="font-size:11px; color:#9ca3af; margin-top:6px; text-align:center;">Drag on a day column to add a window. Click a window to remove.</div>
        `;
        const timeCol = host.querySelector('#ob-time-col');
        const daysEl = host.querySelector('#ob-days');
        const minutesToPct = (m) => ((m - START) / totalMin) * 100;
        if (timeCol) {
          for (let h = 6; h <= 24; h += 2) {
            const t = document.createElement('div');
            t.style.position = 'absolute';
            t.style.left = '4px';
            t.style.top = `calc(${minutesToPct(h * 60)}% - 8px)`;
            t.style.fontSize = '10px';
            t.style.color = '#9ca3af';
            t.textContent = h === 24 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
            timeCol.appendChild(t);
          }
        }
        const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
        const dayCols = [];
        dayOrder.forEach(() => {
          const col = document.createElement('div');
          col.style.position = 'relative';
          col.style.minHeight = '480px';
          col.style.background = 'rgba(255,255,255,0.02)';
          col.style.border = '1px solid rgba(148,163,253,0.15)';
          col.style.borderRadius = '10px';
          daysEl?.appendChild(col);
          dayCols.push(col);
        });

        function renderBlocks() {
          dayCols.forEach(c => c.innerHTML = '');
          dayOrder.forEach((day, idx) => {
            const col = dayCols[idx];
            const wins = winMap[String(day)] || [];
            wins.forEach(win => {
              const [sh, sm] = String(win.start || '').split(':').map(n => parseInt(n, 10) || 0);
              const [eh, em] = String(win.end || '').split(':').map(n => parseInt(n, 10) || 0);
              const s = sh * 60 + sm, e = eh * 60 + em;
              if (e <= s) return;
              const block = document.createElement('div');
              block.style.position = 'absolute';
              block.style.left = '4px';
              block.style.right = '4px';
              block.style.top = `calc(${minutesToPct(s)}%)`;
              block.style.height = `calc(${minutesToPct(e) - minutesToPct(s)}%)`;
              block.style.background = 'rgba(59,130,246,0.25)';
              block.style.border = '1px solid rgba(59,130,246,0.5)';
              block.style.borderRadius = '8px';
              block.style.color = '#e5e7eb';
              block.style.fontSize = '11px';
              block.style.display = 'flex';
              block.style.alignItems = 'center';
              block.style.justifyContent = 'center';
              block.style.cursor = 'pointer';
              block.textContent = `${win.start} - ${win.end}`;
              block.addEventListener('click', () => {
                winMap[String(day)] = wins.filter(w => w !== win);
                renderBlocks();
              });
              col.appendChild(block);
            });
          });
        }

        let drag = null;
        function onDown(ev) {
          if (ev.button !== 0) return;
          const col = ev.currentTarget;
          const rect = col.getBoundingClientRect();
          const y = Math.min(Math.max(ev.clientY - rect.top, 0), rect.height);
          const pct = y / rect.height;
          drag = { colIdx: dayCols.indexOf(col), startM: START + pct * totalMin };
          const preview = document.createElement('div');
          preview.style.position = 'absolute';
          preview.style.left = '4px';
          preview.style.right = '4px';
          preview.style.background = 'rgba(59,130,246,0.18)';
          preview.style.border = '1px dashed rgba(59,130,246,0.7)';
          preview.style.borderRadius = '8px';
          preview.style.color = '#e5e7eb';
          preview.style.fontSize = '11px';
          preview.style.display = 'flex';
          preview.style.alignItems = 'center';
          preview.style.justifyContent = 'center';
          preview.style.pointerEvents = 'none';
          preview.textContent = '';
          col.appendChild(preview);
          drag.preview = preview;
          updatePreview(ev.clientY);
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp, { once: true });
        }
        function updatePreview(clientY) {
          if (!drag) return;
          const col = dayCols[drag.colIdx];
          const rect = col.getBoundingClientRect();
          const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
          const pct = y / rect.height;
          let startM = drag.startM;
          let endM = START + pct * totalMin;
          if (endM < startM) [startM, endM] = [endM, startM];
          startM = snap(startM);
          endM = snap(endM);
          if (endM - startM < 5) endM = startM + 5;
          const top = minutesToPct(startM);
          const height = Math.max(2, minutesToPct(endM) - minutesToPct(startM));
          if (drag.preview) {
            drag.preview.style.top = `calc(${top}%)`;
            drag.preview.style.height = `calc(${height}%)`;
            drag.preview.textContent = `${toHM(startM)} - ${toHM(endM)}`;
          }
        }
        function onMove(ev) {
          updatePreview(ev.clientY);
        }
        function onUp(ev) {
          if (!drag) return;
          const col = dayCols[drag.colIdx];
          const rect = col.getBoundingClientRect();
          const y = Math.min(Math.max(ev.clientY - rect.top, 0), rect.height);
          const pct = y / rect.height;
          let startM = drag.startM;
          let endM = START + pct * totalMin;
          if (endM < startM) [startM, endM] = [endM, startM];
          startM = snap(startM); endM = snap(endM);
          if (endM - startM < 15) { drag = null; document.removeEventListener('mousemove', onMove); return; }
          const day = String(dayOrder[drag.colIdx]);
          if (!winMap[day]) winMap[day] = [];
          winMap[day].push({ start: toHM(startM), end: toHM(endM) });
          winMap[day] = mergeWins(winMap[day]);
          renderBlocks();
          if (drag.preview && drag.preview.parentNode) drag.preview.parentNode.removeChild(drag.preview);
          drag = null;
          document.removeEventListener('mousemove', onMove);
        }
        dayCols.forEach(col => col.addEventListener('mousedown', onDown));
        renderBlocks();
      },
      collect: () => {
        answers.windowsDraft = {};
        Object.entries(winMap).forEach(([day, wins]) => { answers.windowsDraft[day] = wins.slice(); });
      }
    }
  ];

  let step = 0;
  const titleEl = modal.querySelector('#ob-title');
  const stepHost = modal.querySelector('#ob-step');
  const nextBtn = modal.querySelector('#onboarding-next');
  const skipBtn = modal.querySelector('#onboarding-skip');
  const backBtn = modal.querySelector('#onboarding-back');

  function renderStep() {
    const cur = steps[step];
    if (titleEl) titleEl.textContent = cur.title;
    cur.render(stepHost);
    const card = modal.querySelector('.modal-card');
    if (card) {
      card.classList.toggle('ob-wide', !!cur.wide);
    }
    if (backBtn) {
      backBtn.disabled = step === 0;
      backBtn.style.opacity = step === 0 ? '0.5' : '1';
      backBtn.style.pointerEvents = step === 0 ? 'none' : 'auto';
    }
    if (nextBtn) nextBtn.textContent = step === steps.length - 1 ? 'Finish' : 'Next';
  }

  function applyAnswers() {
    setLanguage(answers.lang);
    syncSet({
      autoGcalEnabled: answers.autoSync,
      timeFormat: answers.timefmt,
      studyDurations: answers.durations,
      studyWindows: buildStudyWindowsFromDraft(answers.windowsDraft)
    });
    const recurringDraft = sanitizeRecurringDraft(answers.recurringDraft);
    localGet({ [RECURRING_KEY]: [] }, (res) => {
      const currentRecurring = Array.isArray(res[RECURRING_KEY]) ? res[RECURRING_KEY].slice() : [];
      if (recurringDraft) {
        const exists = currentRecurring.some((it) => (
          String(it?.title || '') === recurringDraft.title &&
          String(it?.time || '') === recurringDraft.time &&
          parseInt(it?.duration, 10) === recurringDraft.duration &&
          JSON.stringify(Array.isArray(it?.days) ? it.days.slice().sort() : []) === JSON.stringify(recurringDraft.days.slice().sort())
        ));
        if (!exists) currentRecurring.push(recurringDraft);
      }
      localSet({ onboardingAnswers: answers, [RECURRING_KEY]: currentRecurring, [ONBOARDING_KEY]: true }, () => {
        loadRecurring();
        loadAll();
        triggerGcalSync();
      });
    });
  }

  function buildStudyWindowsFromDraft(draft) {
    if (!draft || typeof draft !== 'object') return null;
    return draft;
  }

  function sanitizeRecurringDraft(rec) {
    if (!rec || typeof rec !== 'object') return null;
    const title = String(rec.title || '').trim();
    const time = String(rec.time || '').trim();
    const duration = parseInt(rec.duration, 10);
    const days = Array.isArray(rec.days)
      ? rec.days.map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6)
      : [];
    if (!title || !time || !days.length || !Number.isFinite(duration) || duration <= 0) return null;
    return { title, time, duration, days };
  }

  // Every exit from the modal must record that onboarding was seen, or the welcome
  // window reappears on the next load. The X and the backdrop used to only hide it.
  function dismissOnboarding() {
    localSet({ [ONBOARDING_KEY]: true });
    modal.classList.add('hidden');
  }

  nextBtn?.addEventListener('click', () => {
    try { steps[step].collect(); } catch (e) { logStorageError('onboarding-collect-next', e); }
    if (step < steps.length - 1) {
      step += 1;
      renderStep();
    } else {
      applyAnswers();
      modal.classList.add('hidden');
    }
  });
  skipBtn?.addEventListener('click', () => {
    dismissOnboarding();
  });
  backBtn?.addEventListener('click', () => {
    if (step <= 0) return;
    try { steps[step].collect(); } catch (e) { logStorageError('onboarding-collect-back', e); }
    step -= 1;
    renderStep();
  });

  modal.querySelector('#onboarding-close')?.addEventListener('click', () => dismissOnboarding());
  modal.querySelector('.modal-backdrop')?.addEventListener('click', () => dismissOnboarding());

  renderStep();
}
function triggerGcalSync() {
  try {
    chrome.runtime.sendMessage({ type: 'GCAL_SYNC_NOW' }, () => { void chrome.runtime.lastError; });
  } catch (e) { logStorageError('triggerGcalSync', e); }
}

function exportIcsNow() {
  try {
    chrome.runtime.sendMessage({ type: 'PRONOTE_EXPORT_ICS_NOW' }, (resp) => {
      if (chrome.runtime.lastError) {
        showToast(t('calExportFailed'), 'error');
        return;
      }
      if (resp && resp.ok) {
        showToast(t('calExported'), 'success');
        return;
      }
      if (resp && (resp.reason === 'no_items' || resp.reason === 'no_plan')) {
        showToast(t('calExportEmpty'), 'error');
        return;
      }
      showToast(t('calExportFailed'), 'error');
    });
  } catch (e) {
    logStorageError('exportIcsNow', e);
    showToast(t('calExportFailed'), 'error');
  }
}

