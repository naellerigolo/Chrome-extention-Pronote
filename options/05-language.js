// Day/week labels, language switching and translation application.
function dayLabel(idx) {
  const arr = DAY_NAMES[currentLang] || DAY_NAMES.en;
  return arr[idx] || DAY_NAMES.en[idx] || '';
}

function overviewColumnLabel(iso) {
  const [y, m, d] = String(iso || '').split('-').map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return String(iso || '');
  const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';
  return `${dayLabel(dt.getDay())} ${dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(ws) {
  const end = new Date(ws); end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';
  return `${ws.toLocaleDateString(locale, opts)} - ${end.toLocaleDateString(locale, opts)}`;
}

function toggleFloatingHeader(shouldFloat) {
  if (!$calHeader || !$sectionCalendar) return;
  $calHeader.classList.toggle('floating', shouldFloat);
  $sectionCalendar.classList.toggle('floating-pad', shouldFloat);
}

function setLanguage(lang, persist = true) {
  currentLang = (lang === 'fr') ? 'fr' : 'en';
  if ($uiLanguage) $uiLanguage.value = currentLang;
  if (persist && chrome?.storage?.sync) {
    syncSet({ language: currentLang });
  }
  applyUiTranslations();
  buildSoftwareFilterOptions();
  loadAll();
  loadRecurring();
  renderCalendar();
}

function applyUiTranslations() {
  const setText = (sel, key) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = t(key);
  };
  // data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  // Weekday labels in recurring checkboxes (already covered by data-i18n)
  renderSoftwareList();
  renderTechniquesList();
}

