// Shared constants, element handles and mutable page state. Loaded first; everything else reads these.
const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
};
const $overview = document.getElementById('overview');
const $hwSummary = document.getElementById('hw-summary');
const $deleteAllBtn = document.getElementById('delete-all-items');
const $viewDeletedBtn = document.getElementById('view-deleted-items');
const $deletedModal = document.getElementById('deleted-modal');
const $deletedClose = document.getElementById('deleted-close');
const $deletedList = document.getElementById('deleted-list');
const $settingsPageButton = document.getElementById('open-settings-page');
const $homeworkModal = document.getElementById('homework-modal');
const $modalSubject = document.getElementById('modal-subject');
const $modalDue = document.getElementById('modal-due');
const $modalType = document.getElementById('modal-type');
const $modalNotes = document.getElementById('modal-notes');
const $modalEstimate = document.getElementById('modal-estimate');
const $modalLinks = document.getElementById('modal-links');
const $modalDifficultySelect = document.getElementById('modal-difficulty-select');
const $modalMinutesInput = document.getElementById('modal-minutes-input');
const $modalClose = document.getElementById('modal-close');
const $status = document.getElementById('status');

// Recurring DOM
const $recNew = document.getElementById('rec-new');
const $recList = document.getElementById('rec-list');
const $recModal = document.getElementById('recurring-modal');
const $recModalClose = document.getElementById('rec-modal-close');
const $recTitle = document.getElementById('rec-title');
const $recTime = document.getElementById('rec-time');
const $recDurationHours = document.getElementById('rec-duration-hours');
const $recDurationMinutes = document.getElementById('rec-duration-minutes');
const $recDays = document.querySelectorAll('.rec-days input[type="checkbox"]');
const $recAdd = document.getElementById('rec-add');
const $recStatus = document.getElementById('rec-status');
const $tabHomework = document.getElementById('tab-homework');
const $tabRecurring = document.getElementById('tab-recurring');
const $tabCalendar = document.getElementById('tab-calendar');
const $tabSoftware = document.getElementById('tab-software');
const $tabTechniques = document.getElementById('tab-techniques');


const $uiLanguage = document.getElementById('ui-language');
const $sectionHomework = document.getElementById('section-homework');
const $sectionRecurring = document.getElementById('section-recurring');
const $sectionCalendar = document.getElementById('section-calendar');
const $sectionSoftware = document.getElementById('section-software');
const $sectionTechniques = document.getElementById('section-techniques');
const $homeworkFilterQuery = document.getElementById('homework-filter-query');
const $homeworkFilterType = document.getElementById('homework-filter-type');
const $homeworkFilterDifficulty = document.getElementById('homework-filter-difficulty');
const $homeworkFilterDate = document.getElementById('homework-filter-date');
const $homeworkFilterPast = document.getElementById('homework-filter-past');
const $homeworkFilterReset = document.getElementById('homework-filter-reset');
const $softwareGrid = document.getElementById('software-grid');
const $softwareFilters = document.getElementById('software-filters');
const $techniquesGrid = document.getElementById('techniques-grid');
const $techniqueDetail = document.getElementById('technique-detail');
const $techniqueDetailTitle = document.getElementById('technique-detail-title');
const $techniqueDetailBody = document.querySelector('#technique-detail .technique-details');
const $techniqueBack = document.getElementById('technique-back');
const $techniqueVideoPanel = document.getElementById('technique-video-panel');
const $calGrid = document.getElementById('cal-grid');
const $calWeekLabel = document.getElementById('cal-week-label');
const $calPrev = document.getElementById('cal-prev');
const $calNext = document.getElementById('cal-next');
const $calRefresh = document.getElementById('cal-refresh');
const $calClear = document.getElementById('cal-clear');
const $calExport = document.getElementById('cal-export-ics');
const $calAutoFit = document.getElementById('cal-autofit');
const $calWarningSummary = document.getElementById('cal-warning-summary');
const $calHeader = document.querySelector('.cal-header');
const $calSentinel = document.getElementById('cal-sentinel');
const $planModal = document.getElementById('plan-modal');
const $planModalDate = document.getElementById('plan-modal-date');
const $planModalTime = document.getElementById('plan-modal-time');
const $planModalSave = document.getElementById('plan-modal-save');
const $planModalReset = document.getElementById('plan-modal-reset');
const $planModalClose = document.getElementById('plan-modal-close');
const $planModalTitle = document.getElementById('plan-modal-title');
const $studySessionModal = document.getElementById('study-session-modal');
const $studySessionClose = document.getElementById('study-session-close');
const $studySessionTitle = document.getElementById('study-session-title');
const $studySessionMeta = document.getElementById('study-session-meta');
const $studySessionTimer = document.getElementById('study-session-timer');
const $studySessionProgress = document.getElementById('study-session-progress');
const $studySessionStart = document.getElementById('study-session-start');
const $studySessionPause = document.getElementById('study-session-pause');
const $studySessionDone = document.getElementById('study-session-done');
const $studySessionReset = document.getElementById('study-session-reset');
const $studySessionOpenHomework = document.getElementById('study-session-open-homework');
const $toastHost = document.getElementById('toast-host');
let calFloatScheduled = false;
let currentPlanId = null;
let dragPlan = null;
let justDroppedPlan = false;
const planOverridesMem = {};
const CAL_DAY_START = 6 * 60;
const CAL_DAY_END = 24 * 60;

const RECURRING_KEY = 'recurringEvents';
const PLAN_OVERRIDES_KEY = 'planOverrides';
const STUDY_SESSIONS_KEY = 'studySessions';
const defaultReminderTag = 'Reminder';
const ONBOARDING_KEY = 'onboarding_seen';
const MAX_PRONOTE_ITEMS = 1200;
const MAX_DELETED_ITEMS = 200;
const defaultStudyDurations = {
  homework: { easy: 25, medium: 45, hard: 75 },
  test: { easy: 30, medium: 60, hard: 90 }
};
let cachedStudyDurations = defaultStudyDurations;
let cachedTimeFormat = '12h';
let homeworkSchedulePanels = null;
const defaultStudyWindows = {
  '1': [{ start: '18:00', end: '21:00' }],
  '2': [{ start: '18:00', end: '21:00' }],
  '3': [{ start: '18:00', end: '21:00' }],
  '4': [{ start: '18:00', end: '21:00' }],
  '5': [{ start: '18:00', end: '21:00' }],
  '6': [{ start: '10:00', end: '20:00' }],
  '0': [{ start: '10:00', end: '20:00' }]
};
const homeworkFilters = {
  query: '',
  type: 'all',
  difficulty: 'all',
  dueDate: '',
  showPast: false,
  todayISO: ''
};

let modalCurrentIndex = null;
let modalCurrentItem = null;
let calWeekStart = null; // set in 17-init.js, once startOfWeek() is loaded
let cachedStudySessions = {};
let currentStudySessionId = null;
let currentStudySessionEvent = null;
let studySessionTick = null;
