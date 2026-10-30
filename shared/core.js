// Values and pure helpers shared by the service worker, the options page and the
// settings page. Each of them loads this first: background.js importScripts() it,
// options.html and settings.html load it ahead of their own scripts.

const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
};

// Minutes per item type and difficulty. The worker schedules against these and
// both pages display them, so they have to be one list.
const defaultStudyDurations = {
  homework: { easy: 25, medium: 45, hard: 75 },
  test: { easy: 30, medium: 60, hard: 90 }
};

const defaultStudyWindows = {
  '1': [{ start: '18:00', end: '21:00' }],
  '2': [{ start: '18:00', end: '21:00' }],
  '3': [{ start: '18:00', end: '21:00' }],
  '4': [{ start: '18:00', end: '21:00' }],
  '5': [{ start: '18:00', end: '21:00' }],
  '6': [{ start: '10:00', end: '20:00' }],
  '0': [{ start: '10:00', end: '20:00' }]
};

const RECURRING_KEY = 'recurringEvents';
const PLAN_OVERRIDES_KEY = 'planOverrides';
const STUDY_SESSIONS_KEY = 'studySessions';
const ONBOARDING_KEY = 'onboarding_seen';
const MAX_PRONOTE_ITEMS = 1200;

function resolveItemKind(item) {
  const type = String(item?.type || '').toLowerCase();
  return type === 'test' || type === 'both' ? 'test' : 'homework';
}

// Keeps the MAX_PRONOTE_ITEMS items with the latest due dates, so pruning drops
// the oldest work first. The options page used to keep whichever items happened to
// sit at the end of the array, which pruned a different set than the worker did
// from the same stored list.
function prunePronoteItems(list) {
  const src = Array.isArray(list) ? list : [];
  if (src.length <= MAX_PRONOTE_ITEMS) return src;
  return src
    .slice()
    .sort((a, b) => String(a?.dueDate || '').localeCompare(String(b?.dueDate || '')))
    .slice(-MAX_PRONOTE_ITEMS);
}
