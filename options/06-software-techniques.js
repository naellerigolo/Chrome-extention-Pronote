// Software grid and learning-technique panels.
function buildSoftwareFilterOptions() {
  if (!$softwareFilters) return;
  $softwareFilters.innerHTML = '';
  const makeBtn = (key, label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'software-filter-btn';
    if (softwareFilterKey === key) btn.classList.add('active');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      softwareFilterKey = key;
      buildSoftwareFilterOptions();
      renderSoftwareList();
    });
    return btn;
  };
  $softwareFilters.appendChild(makeBtn('all', t('softwareAll')));
  SOFTWARE_CATEGORIES.forEach((cat) => {
    $softwareFilters.appendChild(makeBtn(cat.titleKey, t(cat.titleKey)));
  });
}

const SOFTWARE_ICON_MAP = {
  'penseum.ai': 'Icon/software/penseum.ai.svg'
};

function resolveSoftwareIconCandidates(url) {
  try {
    const u = new URL(String(url || '').trim());
    const host = String(u.hostname || '').toLowerCase();
    const safeHost = host.replace(/[^a-z0-9.-]/gi, '_');
    const mapped = SOFTWARE_ICON_MAP[host];
    const candidates = [];
    if (mapped) candidates.push(mapped);
    candidates.push(`Icon/software/${safeHost}.png`);
    candidates.push(`Icon/software/${safeHost}.ico`);
    return candidates;
  } catch {
    return [];
  }
}

function renderSoftwareList() {
  if (!$softwareGrid) return;
  $softwareGrid.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'software-app-grid';
  const items = SOFTWARE_CATEGORIES.reduce((acc, cat) => {
    (cat.items || []).forEach((it) => acc.push({ ...it, _cat: cat.titleKey }));
    return acc;
  }, []);
  const filtered = (softwareFilterKey && softwareFilterKey !== 'all')
    ? items.filter((it) => it._cat === softwareFilterKey)
    : items;
  filtered.forEach((item) => {
    const card = document.createElement('a');
    card.className = 'software-app-card';
    card.href = item.url;
    card.target = '_blank';
    card.rel = 'noopener';
    const iconWrap = document.createElement('div');
    const fallback = document.createElement('div');
    fallback.className = 'software-icon-fallback';
    fallback.textContent = String(t(item.nameKey || '')).trim().charAt(0).toUpperCase() || '•';
    const iconCandidates = resolveSoftwareIconCandidates(item.url);
    if (iconCandidates.length) {
      const icon = document.createElement('img');
      icon.className = 'software-icon';
      icon.alt = String(t(item.nameKey || '')).trim();
      let iconIdx = 0;
      const setNextIcon = () => {
        if (iconIdx >= iconCandidates.length) {
          if (icon.parentNode) icon.parentNode.replaceChild(fallback, icon);
          return;
        }
        icon.src = chrome.runtime.getURL(iconCandidates[iconIdx++]);
      };
      icon.addEventListener('error', () => {
        setNextIcon();
      });
      setNextIcon();
      iconWrap.appendChild(icon);
    } else {
      iconWrap.appendChild(fallback);
    }

    const name = document.createElement('div');
    name.textContent = t(item.nameKey);
    name.className = 'software-app-name';
    if (item._cat === 'swCatAi' && item.useKey) {
      const use = document.createElement('div');
      use.className = 'software-app-use';
      use.textContent = t(item.useKey);
      card.append(iconWrap, name, use);
    } else {
      card.append(iconWrap, name);
    }
    grid.appendChild(card);
  });
  $softwareGrid.appendChild(grid);
}

function renderTechniquesList() {
  if (!$techniquesGrid) return;
  $techniquesGrid.innerHTML = '';
  if ($techniqueDetail) $techniqueDetail.classList.add('hidden');
  if ($techniquesGrid) $techniquesGrid.classList.remove('hidden');
  const addSection = (wrap, labelKey, text) => {
    if (!text) return;
    const section = document.createElement('div');
    section.className = 'technique-section';
    const label = document.createElement('div');
    label.className = 'technique-label';
    label.textContent = t(labelKey);
    const body = document.createElement('div');
    body.className = 'technique-text';
    body.textContent = text;
    section.append(label, body);
    wrap.appendChild(section);
  };
  LEARNING_TECHNIQUES.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'technique-card';
    const title = document.createElement('div');
    title.className = 'technique-title';
    title.textContent = item.title;
    const summary = document.createElement('div');
    summary.className = 'technique-section';
    const summaryLabel = document.createElement('div');
    summaryLabel.className = 'technique-label';
    summaryLabel.textContent = t('techniqueWhen');
    const summaryBody = document.createElement('div');
    summaryBody.className = 'technique-text';
    summaryBody.textContent = item.best || '';
    summary.append(summaryLabel, summaryBody);
    card.addEventListener('click', () => {
      showTechniqueDetail(idx);
    });
    card.append(title, summary);
    $techniquesGrid.appendChild(card);
  });
}

function showTechniqueDetail(index) {
  if (!$techniqueDetail || !$techniqueDetailTitle || !$techniqueDetailBody || !$techniquesGrid) return;
  const item = LEARNING_TECHNIQUES[index];
  if (!item) return;
  $techniqueDetailTitle.textContent = item.title;
  $techniqueDetailBody.innerHTML = '';
  if ($techniqueVideoPanel) {
    $techniqueVideoPanel.innerHTML = '';
    $techniqueVideoPanel.classList.add('hidden');
  }
  const addSection = (labelKey, text) => {
    if (!text) return;
    const section = document.createElement('div');
    section.className = 'technique-section';
    const label = document.createElement('div');
    label.className = 'technique-label';
    label.textContent = t(labelKey);
    const body = document.createElement('div');
    body.className = 'technique-text';
    body.textContent = text;
    section.append(label, body);
    $techniqueDetailBody.appendChild(section);
  };
  addSection('techniqueWhat', item.what);
  addSection('techniqueHow', item.how);
  addSection('techniqueUse', item.use);
  addSection('techniqueBest', item.best);
  addSection('techniqueWhy', item.why);
  addSection('techniqueExamples', item.examples);
  addSection('techniqueSteps', item.steps);
  addSection('techniqueMistakes', item.mistakes);
  if (item.videoUrl && $techniqueVideoPanel) {
    const label = document.createElement('div');
    label.className = 'technique-label';
    label.textContent = t('techniqueVideo');
    const link = document.createElement('a');
    link.className = 'technique-video-link';
    link.href = item.videoUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    const thumb = document.createElement('img');
    thumb.className = 'technique-video-thumb';
    const match = String(item.videoUrl).match(/v=([^&]+)/);
    const videoId = match ? match[1] : '';
    if (videoId) {
      thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      thumb.alt = item.videoTitle || 'Video';
    }
    link.append(thumb);
    $techniqueVideoPanel.append(label, link);
    $techniqueVideoPanel.classList.remove('hidden');
  }
  $techniquesGrid.classList.add('hidden');
  $techniqueDetail.classList.remove('hidden');
}

