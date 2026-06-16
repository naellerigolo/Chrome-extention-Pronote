
(() => {
const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
};
const $overview = document.getElementById('overview');
const $deleteAllBtn = document.getElementById('delete-all-items');
const $viewDeletedBtn = document.getElementById('view-deleted-items');
const $deletedModal = document.getElementById('deleted-modal');
const $deletedClose = document.getElementById('deleted-close');
const $deletedList = document.getElementById('deleted-list');
const $studyPageButton = document.getElementById('open-study-duration-page');
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
const $calHeader = document.querySelector('.cal-header');
const $calSentinel = document.getElementById('cal-sentinel');
const $planModal = document.getElementById('plan-modal');
const $planModalDate = document.getElementById('plan-modal-date');
const $planModalTime = document.getElementById('plan-modal-time');
const $planModalSave = document.getElementById('plan-modal-save');
const $planModalReset = document.getElementById('plan-modal-reset');
const $planModalClose = document.getElementById('plan-modal-close');
const $planModalTitle = document.getElementById('plan-modal-title');
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
const defaultReminderTag = 'Reminder';
const ONBOARDING_KEY = 'onboarding_seen';
const MAX_PRONOTE_ITEMS = 1200;
const MAX_DELETED_ITEMS = 200;
const defaultStudyDurations = {
  homework: { easy: 25, medium: 45, hard: 75 },
  test: { easy: 30, medium: 60, hard: 90 }
};
let cachedStudyDurations = defaultStudyDurations;
const defaultStudyWindows = {
  '1': [{ start: '18:00', end: '21:00' }],
  '2': [{ start: '18:00', end: '21:00' }],
  '3': [{ start: '18:00', end: '21:00' }],
  '4': [{ start: '18:00', end: '21:00' }],
  '5': [{ start: '18:00', end: '21:00' }],
  '6': [{ start: '10:00', end: '20:00' }],
  '0': [{ start: '10:00', end: '20:00' }]
};

function logStorageError(scope, err) {
  console.warn(`[options:${scope}]`, err && err.message ? err.message : err);
}

function localGet(defaults, cb) {
  try {
    chrome.storage.local.get(defaults, (res) => {
      if (chrome.runtime.lastError) logStorageError('localGet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb(res || defaults || {});
    });
  } catch (e) {
    logStorageError('localGet', e);
    if (typeof cb === 'function') cb(defaults || {});
  }
}

function localSet(patch, cb) {
  try {
    chrome.storage.local.set(patch, () => {
      if (chrome.runtime.lastError) logStorageError('localSet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('localSet', e);
    if (typeof cb === 'function') cb();
  }
}

function syncGet(defaults, cb) {
  try {
    chrome.storage.sync.get(defaults, (res) => {
      if (chrome.runtime.lastError) logStorageError('syncGet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb(res || defaults || {});
    });
  } catch (e) {
    logStorageError('syncGet', e);
    if (typeof cb === 'function') cb(defaults || {});
  }
}

function syncSet(patch, cb) {
  try {
    chrome.storage.sync.set(patch, () => {
      if (chrome.runtime.lastError) logStorageError('syncSet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('syncSet', e);
    if (typeof cb === 'function') cb();
  }
}

function localRemove(keys, cb) {
  try {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) logStorageError('localRemove', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('localRemove', e);
    if (typeof cb === 'function') cb();
  }
}

function prunePronoteItems(list) {
  const src = Array.isArray(list) ? list : [];
  if (src.length <= MAX_PRONOTE_ITEMS) return src;
  return src.slice(-MAX_PRONOTE_ITEMS);
}
let modalCurrentIndex = null;
let modalCurrentItem = null;
let calWeekStart = startOfWeek(new Date());
const TRANSLATIONS = {
  en: {
    days: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    langLabel: 'Language',
    langEn: 'English',
    langFr: 'Français',
    tabHomework: 'Homework',
    tabRecurring: 'Recurring events',
    tabCalendar: 'Calendar',
    tabSoftware: 'Software',
    hwTitle: 'Homework Overview',
    hwHint: 'Snapshot of your stored homework. Upcoming items are grouped by due date so you can quickly adjust type & difficulty.',
    btnDeleteAll: 'Delete all homework & tests',
    btnViewDeleted: 'View deleted items',
    labelDifficulty: 'Difficulty',
    diffEasy: 'Easy',
    diffMedium: 'Medium',
    diffHard: 'Hard',
    labelMinutes: 'Minutes',
    estimateLabel: 'Estimated time',
    phAuto: 'auto',
    calPill: 'Calendar',
    calTitle: 'Your calendar',
    calHint: 'Week view of your homework and recurring events.',
    calUpdate: 'Update calendar',
    calUpdated: 'Calendar updated.',
    calClear: 'Clear calendar',
    calClearConfirm: 'Clear recurring events and manual moves from the calendar?',
    calCleared: 'Calendar cleared.',
    calExport: 'Download .ics',
    calExported: 'ICS file downloaded.',
    calExportEmpty: 'No study sessions to export.',
    calExportFailed: 'Could not export calendar.',
    softwarePill: 'Software',
    softwareTitle: 'Best free student software',
    softwareHint: 'Web-only tools that are free and useful for high school.',
    tabTechniques: 'Techniques',
    techniquesPill: 'Techniques',
    techniquesTitle: 'Learning techniques',
    techniquesHint: 'Simple methods students can use to study smarter.',
    techniqueBack: 'Back',
    techniqueWhat: 'What it is',
    techniqueHow: 'How it works',
    techniqueUse: 'How to use it',
    techniqueBest: 'Best for',
    techniqueWhen: 'When to use it',
    techniqueWhy: 'Why it’s powerful',
    techniqueExamples: 'Examples',
    techniqueSteps: 'Step-by-step',
    techniqueMistakes: 'Common mistakes',
    techniqueVideo: 'Video',
    softwareSortLabel: 'Sort by',
    softwareAll: 'All',
    softwareTool: 'Tool',
    softwareWhy: 'Why it’s great',
    techActiveRecallTitle: 'Active recall',
    techActiveRecallDesc: 'Test yourself without notes; it builds stronger memory.',
    techSpacedRepetitionTitle: 'Spaced repetition',
    techSpacedRepetitionDesc: 'Review over days/weeks to lock in long‑term memory.',
    techPomodoroTitle: 'Pomodoro focus',
    techPomodoroDesc: 'Work in short focused sprints with breaks (e.g., 25/5).',
    techFeynmanTitle: 'Feynman technique',
    techFeynmanDesc: 'Explain it simply to reveal gaps, then refine.',
    techInterleavingTitle: 'Interleaving',
    techInterleavingDesc: 'Mix topics or problem types to improve flexibility.',
    techElaborationTitle: 'Elaboration',
    techElaborationDesc: 'Ask “why/how” and connect new ideas to what you know.',
    techDualCodingTitle: 'Dual coding',
    techDualCodingDesc: 'Combine words with visuals to improve recall.',
    techPracticeTestTitle: 'Practice testing',
    techPracticeTestDesc: 'Use past papers or quizzes to simulate exam conditions.',
    techBlurtingTitle: 'Blurting',
    techBlurtingDesc: 'Write everything you know, then fill gaps.',
    techSQ3RTitle: 'SQ3R reading',
    techSQ3RDesc: 'Survey, Question, Read, Recite, Review for comprehension.',
    swCatNotes: '📓 Free Note-Taking & Organization',
    swCatTasks: '✔️ Task & Time Management',
    swCatFocus: '⏱️ Focus & Productivity',
    swCatReading: '📖 Reading & Annotation',
    swCatFlashcards: '🧠 Flashcards & Memorization',
    swCatWriting: '✍️ Writing & Editing',
    swCatMath: '🧮 Math & STEM Tools',
    swCatCoding: '💻 Coding & Tech Tools',
    swCatLearning: '🎥 Learning & Courses',
    swCatCloud: '📂 Cloud Storage',
    swCatGroup: '🧑‍🤝‍🧑 Group Work & Chat',
    swCatAi: '🤖 AI Tools',
    swNotionName: 'Notion (Free Plan)',
    swNotionDesc: 'All‑in‑one workspace for notes, tasks, databases.',
    swOneNoteName: 'Microsoft OneNote',
    swOneNoteDesc: 'Free, flexible notebooks with sections & pages.',
    swObsidianName: 'Obsidian (Free for personal use)',
    swObsidianDesc: 'Markdown + knowledge linking, great for deep study.',
    swKeepName: 'Google Keep',
    swKeepDesc: 'Quick notes and reminders synced with Google.',
    swTodoistName: 'Todoist (Free)',
    swTodoistDesc: 'Simple tasks & deadlines.',
    swGcalName: 'Google Calendar',
    swGcalDesc: 'Scheduling, reminders, time‑blocking.',
    swTrelloName: 'Trello (Free)',
    swTrelloDesc: 'Kanban boards for project tracking.',
    swTickTickName: 'TickTick (Free tier)',
    swTickTickDesc: 'Tasks + simple habit tracking.',
    swPomodoroName: 'Pomodoro Timers (Free websites)',
    swPomodoroDesc: '25‑minute focus sessions with breaks.',
    swForestName: 'Forest (Free on web)',
    swForestDesc: 'Grow a forest while you stay focused.',
    swStayFocusdName: 'StayFocusd (Browser extension)',
    swStayFocusdDesc: 'Blocks distracting sites while you study.',
    swAcrobatName: 'Adobe Acrobat Reader DC',
    swAcrobatDesc: 'Free PDF reading & basic annotations.',
    swXodoName: 'Xodo (Free)',
    swXodoDesc: 'PDF reader + annotations.',
    swHypothesisName: 'Hypothesis (Free)',
    swHypothesisDesc: 'Web & PDF highlighting with notes.',
    swAnkiName: 'Anki',
    swAnkiDesc: 'Spaced‑repetition flashcards (free on desktop).',
    swQuizletName: 'Quizlet (Free)',
    swQuizletDesc: 'Make flashcards + study games.',
    swMemriseName: 'Memrise (Free tier)',
    swMemriseDesc: 'Language & memory training.',
    swDocsName: 'Google Docs',
    swDocsDesc: 'Free, cloud‑saved essays & collaborative docs.',
    swLibreOfficeName: 'LibreOffice Writer',
    swLibreOfficeDesc: 'Full offline word processor.',
    swGrammarlyName: 'Grammarly (Free)',
    swGrammarlyDesc: 'Spelling & grammar help.',
    swDesmosName: 'Desmos',
    swDesmosDesc: 'Graphing calculator in browser.',
    swGeoName: 'GeoGebra',
    swGeoDesc: 'Geometry & algebra visuals.',
    swWolframName: 'WolframAlpha (Free queries)',
    swWolframDesc: 'Solve & explore math problems.',
    swSymbolabName: 'Symbolab (Free)',
    swSymbolabDesc: 'Math problem solver with steps.',
    swVSCodeName: 'VS Code',
    swVSCodeDesc: 'Free code editor for most languages.',
    swGitHubName: 'GitHub (Free)',
    swGitHubDesc: 'Host code and version control.',
    swReplitName: 'Replit (Free)',
    swReplitDesc: 'Browser coding & projects.',
    swJupyterName: 'Jupyter Notebook (Free)',
    swJupyterDesc: 'Python notebooks for data & learning.',
    swKhanName: 'Khan Academy',
    swKhanDesc: 'Full core‑subject lessons.',
    swYouTubeEduName: 'YouTube EDU',
    swYouTubeEduDesc: 'Free explainers & educational videos.',
    swEdxName: 'edX (audit free)',
    swEdxDesc: 'College courses you can audit for free.',
    swCourseraName: 'Coursera (audit free)',
    swCourseraDesc: 'College courses you can audit for free.',
    swDriveName: 'Google Drive (Free 15 GB)',
    swDriveDesc: 'Store files & collaborate.',
    swDropboxName: 'Dropbox Basic',
    swDropboxDesc: 'Cloud files & backup (limited space).',
    swDiscordName: 'Discord',
    swDiscordDesc: 'Build study servers & voice/text chats.',
    swSlackName: 'Slack (Free)',
    swSlackDesc: 'Team communication & channels.',
    swChatgptName: 'ChatGPT (Free plan)',
    swChatgptDesc: 'Ask questions, explain concepts, draft essays, debug code.',
    swPerplexityName: 'Perplexity AI',
    swPerplexityDesc: 'Research answers with sources and quick summaries.',
    swSocraticName: 'Google Socratic',
    swSocraticDesc: 'Snap a problem or type a question; step-by-step help.',
    swGrammarlyName: 'Grammarly (Free)',
    swGrammarlyDesc: 'Grammar, clarity, and basic writing suggestions.',
    swPenseumName: 'Penseum',
    swPenseumDesc: 'Turns PDFs/notes into study guides, quizzes, flashcards.',
    swStudyFetchName: 'StudyFetch',
    swStudyFetchDesc: 'Upload materials to get quizzes and flashcards.',
    swMindgraspName: 'Mindgrasp',
    swMindgraspDesc: 'Converts lectures and notes into summaries.',
    swOtterName: 'Otter.ai (Free tier)',
    swOtterDesc: 'Lecture transcription with free minutes each month.',
    swAiUseHomework: 'Homework Help & Q&A',
    swAiUseResearch: 'Research & Summaries',
    swAiUseExplained: 'Homework Explained',
    swAiUseWriting: 'Writing Help',
    swAiUseNotes: 'Study Guides & Notes',
    swAiUseTranscription: 'Lecture Transcription',
    swAiUseFlashcards: 'Flashcards & Practice',
    legendPlan: 'Study plan',
    legendHw: 'Homework',
    legendRec: 'Recurring',
    planMove: 'Move study session',
    planMoved: 'Moved: {title} to {date} {time}.',
    calItemMissing: 'Could not open that homework item.',
    planDate: 'Date',
    planTime: 'Start time',
    planSave: 'Save',
    planReset: 'Reset to auto',
    recPill: 'Recurring Events',
    recTitle: 'Set recurring events',
    recHint: 'Add things like “Gym” every weekday at 6:30 PM. They are saved locally.',
    recButton: 'Create new recurring event',
    recModalTitle: 'New recurring event',
    recPlaceholder: 'Event name (e.g., Gym)',
    recStart: 'Start time',
    recDuration: 'Duration (hours & minutes)',
    recSave: 'Save recurring event',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
    deletedTitle: 'Deleted items',
    emptyRec: 'No recurring events yet.',
    untitled: 'Untitled',
    recSkip: 'Skipping next {n} week(s)',
    recSkipPlaceholder: 'Skip upcoming weeks',
    recApply: 'Apply skip',
    recErrWeeks: 'Enter weeks to skip',
    recSaved: 'Saved',
    recClear: 'Clear skip',
    recDelete: 'Delete',
    recErrMissing: 'Add {missing}',
    noEvents: 'No events in this week.',
    studySession: 'Study session',
    manual: 'manual',
    settingsTitle: 'Settings',
    settingsHint: 'Manage preferences for language and calendar sync.',
    langLabel: 'Language',
    langEn: 'English',
    langFr: 'French'
  },
  fr: {
    days: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
    langLabel: 'Langue',
    langEn: 'Anglais',
    langFr: 'Français',
    tabHomework: 'Devoirs',
    tabRecurring: 'Évènements récurrents',
    tabCalendar: 'Calendrier',
    tabSoftware: 'Logiciels',
    hwTitle: 'Vue des devoirs',
    hwHint: 'Aperçu des devoirs enregistrés, groupés par date pour ajuster rapidement type et difficulté.',
    btnDeleteAll: 'Supprimer tous les devoirs et tests',
    btnViewDeleted: 'Voir les éléments supprimés',
    labelDifficulty: 'Difficulté',
    diffEasy: 'Facile',
    diffMedium: 'Moyen',
    diffHard: 'Difficile',
    labelMinutes: 'Minutes',
    estimateLabel: 'Temps estimé',
    phAuto: 'auto',
    calPill: 'Calendrier',
    calTitle: 'Votre calendrier',
    calHint: 'Vue hebdo des devoirs et évènements récurrents.',
    calUpdate: 'Mettre à jour le calendrier',
    calUpdated: 'Calendrier mis à jour.',
    calClear: 'Vider le calendrier',
    calClearConfirm: 'Supprimer les évènements récurrents et les déplacements manuels ?',
    calCleared: 'Calendrier vidé.',
    calExport: 'Télécharger .ics',
    calExported: 'Fichier ICS téléchargé.',
    calExportEmpty: 'Aucune séance à exporter.',
    calExportFailed: 'Impossible d’exporter le calendrier.',
    softwarePill: 'Logiciels',
    softwareTitle: 'Meilleurs logiciels gratuits',
    softwareHint: 'Outils web gratuits utiles au lycée.',
    tabTechniques: 'Méthodes',
    techniquesPill: 'Méthodes',
    techniquesTitle: 'Techniques d’apprentissage',
    techniquesHint: 'Méthodes simples pour mieux étudier.',
    techniqueBack: 'Retour',
    techniqueWhat: 'Ce que c’est',
    techniqueHow: 'Comment ça marche',
    techniqueUse: 'Comment l’utiliser',
    techniqueBest: 'Idéal pour',
    techniqueWhen: 'Quand l’utiliser',
    techniqueWhy: 'Pourquoi c’est puissant',
    techniqueExamples: 'Exemples',
    techniqueSteps: 'Étapes',
    techniqueMistakes: 'Erreurs courantes',
    techniqueVideo: 'Vidéo',
    softwareSortLabel: 'Filtrer',
    softwareAll: 'Tout',
    softwareTool: 'Outil',
    softwareWhy: 'Pourquoi c’est utile',
    techActiveRecallTitle: 'Rappel actif',
    techActiveRecallDesc: 'Se tester sans notes renforce la mémoire.',
    techSpacedRepetitionTitle: 'Répétition espacée',
    techSpacedRepetitionDesc: 'Réviser sur plusieurs jours pour ancrer.',
    techPomodoroTitle: 'Pomodoro',
    techPomodoroDesc: 'Sessions courtes et pauses régulières (25/5).',
    techFeynmanTitle: 'Technique de Feynman',
    techFeynmanDesc: 'Expliquer simplement pour voir les lacunes.',
    techInterleavingTitle: 'Entrelacement',
    techInterleavingDesc: 'Mixer les types d’exercices pour progresser.',
    techElaborationTitle: 'Élaboration',
    techElaborationDesc: 'Se demander “pourquoi/comment” et relier.',
    techDualCodingTitle: 'Double codage',
    techDualCodingDesc: 'Mots + visuels pour mieux retenir.',
    techPracticeTestTitle: 'Tests blancs',
    techPracticeTestDesc: 'S’entraîner en conditions d’examen.',
    techBlurtingTitle: 'Blurting',
    techBlurtingDesc: 'Tout écrire de mémoire puis combler.',
    techSQ3RTitle: 'Lecture SQ3R',
    techSQ3RDesc: 'Survoler, questionner, lire, réciter, revoir.',
    swCatNotes: '📓 Prise de notes & organisation',
    swCatTasks: '✔️ Gestion des tâches & du temps',
    swCatFocus: '⏱️ Focus & productivité',
    swCatReading: '📖 Lecture & annotation',
    swCatFlashcards: '🧠 Cartes mémoire',
    swCatWriting: '✍️ Rédaction & édition',
    swCatMath: '🧮 Maths & outils STEM',
    swCatCoding: '💻 Code & tech',
    swCatLearning: '🎥 Cours & apprentissages',
    swCatCloud: '📂 Stockage cloud',
    swCatGroup: '🧑‍🤝‍🧑 Travail en groupe & chat',
    swCatAi: '🤖 Outils IA',
    swNotionName: 'Notion (gratuit)',
    swNotionDesc: 'Espace tout‑en‑un pour notes, tâches, bases.',
    swOneNoteName: 'Microsoft OneNote',
    swOneNoteDesc: 'Cahiers flexibles avec sections et pages.',
    swObsidianName: 'Obsidian (gratuit perso)',
    swObsidianDesc: 'Markdown + liens de connaissances.',
    swKeepName: 'Google Keep',
    swKeepDesc: 'Notes rapides et rappels synchronisés.',
    swTodoistName: 'Todoist (gratuit)',
    swTodoistDesc: 'Tâches simples et échéances.',
    swGcalName: 'Google Calendar',
    swGcalDesc: 'Planning, rappels, time‑blocking.',
    swTrelloName: 'Trello (gratuit)',
    swTrelloDesc: 'Tableaux Kanban pour projets.',
    swTickTickName: 'TickTick (gratuit)',
    swTickTickDesc: 'Tâches + habitudes simples.',
    swPomodoroName: 'Pomodoro (sites gratuits)',
    swPomodoroDesc: 'Sessions de 25 min + pauses.',
    swForestName: 'Forest (web gratuit)',
    swForestDesc: 'Reste concentré et fais pousser une forêt.',
    swStayFocusdName: 'StayFocusd (extension)',
    swStayFocusdDesc: 'Bloque les sites distrayants.',
    swAcrobatName: 'Adobe Acrobat Reader DC',
    swAcrobatDesc: 'Lecture PDF + annotations basiques.',
    swXodoName: 'Xodo (gratuit)',
    swXodoDesc: 'Lecteur PDF + annotations.',
    swHypothesisName: 'Hypothesis (gratuit)',
    swHypothesisDesc: 'Surlignage web/PDF avec notes.',
    swAnkiName: 'Anki',
    swAnkiDesc: 'Cartes mémoire à répétition espacée.',
    swQuizletName: 'Quizlet (gratuit)',
    swQuizletDesc: 'Cartes + jeux d’étude.',
    swMemriseName: 'Memrise (gratuit)',
    swMemriseDesc: 'Langues & mémorisation.',
    swDocsName: 'Google Docs',
    swDocsDesc: 'Rédaction en ligne + collaboration.',
    swLibreOfficeName: 'LibreOffice Writer',
    swLibreOfficeDesc: 'Traitement de texte complet.',
    swGrammarlyName: 'Grammarly (gratuit)',
    swGrammarlyDesc: 'Orthographe & grammaire.',
    swDesmosName: 'Desmos',
    swDesmosDesc: 'Calculatrice graphique en ligne.',
    swGeoName: 'GeoGebra',
    swGeoDesc: 'Géométrie et algèbre interactives.',
    swWolframName: 'WolframAlpha (gratuit)',
    swWolframDesc: 'Résoudre & explorer des maths.',
    swSymbolabName: 'Symbolab (gratuit)',
    swSymbolabDesc: 'Solveur de maths avec étapes.',
    swVSCodeName: 'VS Code',
    swVSCodeDesc: 'Éditeur de code gratuit.',
    swGitHubName: 'GitHub (gratuit)',
    swGitHubDesc: 'Héberger du code et versionner.',
    swReplitName: 'Replit (gratuit)',
    swReplitDesc: 'Coder dans le navigateur.',
    swJupyterName: 'Jupyter Notebook (gratuit)',
    swJupyterDesc: 'Notebooks Python pour apprendre.',
    swKhanName: 'Khan Academy',
    swKhanDesc: 'Cours et exercices gratuits.',
    swYouTubeEduName: 'YouTube EDU',
    swYouTubeEduDesc: 'Vidéos éducatives gratuites.',
    swEdxName: 'edX (audit gratuit)',
    swEdxDesc: 'Cours universitaires en accès libre.',
    swCourseraName: 'Coursera (audit gratuit)',
    swCourseraDesc: 'Cours universitaires en accès libre.',
    swDriveName: 'Google Drive (15 Go)',
    swDriveDesc: 'Stocker des fichiers & collaborer.',
    swDropboxName: 'Dropbox Basic',
    swDropboxDesc: 'Stockage cloud (limité).',
    swDiscordName: 'Discord',
    swDiscordDesc: 'Serveurs d’étude + audio/texte.',
    swSlackName: 'Slack (gratuit)',
    swSlackDesc: 'Communication d’équipe.',
    swChatgptName: 'ChatGPT (gratuit)',
    swChatgptDesc: 'Questions, explications, brouillons, code.',
    swPerplexityName: 'Perplexity AI',
    swPerplexityDesc: 'Recherche avec sources et résumés rapides.',
    swSocraticName: 'Google Socratic',
    swSocraticDesc: 'Photo ou question; aide pas à pas.',
    swPenseumName: 'Penseum',
    swPenseumDesc: 'Transforme notes/PDFs en quiz et fiches.',
    swStudyFetchName: 'StudyFetch',
    swStudyFetchDesc: 'Importe des cours pour créer des quiz.',
    swMindgraspName: 'Mindgrasp',
    swMindgraspDesc: 'Convertit cours et notes en résumés.',
    swOtterName: 'Otter.ai (gratuit)',
    swOtterDesc: 'Transcription de cours (minutes gratuites).',
    swAiUseHomework: 'Aide aux devoirs & Q/R',
    swAiUseResearch: 'Recherche & Résumés',
    swAiUseExplained: 'Devoirs expliqués',
    swAiUseWriting: 'Aide à l’écriture',
    swAiUseNotes: 'Fiches & Notes',
    swAiUseTranscription: 'Transcription de cours',
    swAiUseFlashcards: 'Flashcards & Entraînement',
    legendPlan: 'Plan de révision',
    legendHw: 'Devoirs',
    legendRec: 'Récurrents',
    planMove: 'Déplacer la séance',
    planMoved: 'Déplacé : {title} à {date} {time}.',
    calItemMissing: 'Impossible d’ouvrir ce devoir.',
    planDate: 'Date',
    planTime: 'Heure de début',
    planSave: 'Enregistrer',
    planReset: 'Revenir en auto',
    recPill: 'Évènements récurrents',
    recTitle: 'Définir des évènements récurrents',
    recHint: 'Ajoutez par exemple « Sport » chaque soir. Sauvegarde locale.',
    recButton: 'Créer un évènement récurrent',
    recModalTitle: 'Nouvel évènement récurrent',
    recPlaceholder: 'Nom de l’évènement (ex : Sport)',
    recStart: 'Heure de début',
    recDuration: 'Durée (heures et minutes)',
    recSave: 'Enregistrer l’évènement',
    mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim',
    deletedTitle: 'Éléments supprimés',
    emptyRec: 'Aucun évènement récurrent.',
    untitled: 'Sans titre',
    recSkip: 'Saut des {n} semaine(s) suivantes',
    recSkipPlaceholder: 'Sauter des semaines',
    recApply: 'Appliquer',
    recErrWeeks: 'Indiquez le nombre de semaines',
    recSaved: 'Enregistré',
    recClear: 'Effacer',
    recDelete: 'Supprimer',
    recErrMissing: 'Ajoutez {missing}',
    noEvents: 'Aucun évènement cette semaine.',
    studySession: 'Séance de révision',
    manual: 'manuel',
    settingsTitle: 'Paramètres',
    settingsHint: 'Gérez la langue et la synchronisation calendrier.',
    langLabel: 'Langue',
    langEn: 'Anglais',
    langFr: 'Français'
  }
};
let currentLang = 'en';
function t(key) {
  const pack = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return pack[key] || TRANSLATIONS.en[key] || key;
}

const SOFTWARE_CATEGORIES = [
  {
    titleKey: 'swCatNotes',
    items: [
      { nameKey: 'swNotionName', descKey: 'swNotionDesc', url: 'https://www.notion.so' },
      { nameKey: 'swOneNoteName', descKey: 'swOneNoteDesc', url: 'https://www.onenote.com' },
      { nameKey: 'swObsidianName', descKey: 'swObsidianDesc', url: 'https://obsidian.md' },
      { nameKey: 'swKeepName', descKey: 'swKeepDesc', url: 'https://keep.google.com' }
    ]
  },
  {
    titleKey: 'swCatTasks',
    items: [
      { nameKey: 'swTodoistName', descKey: 'swTodoistDesc', url: 'https://todoist.com' },
      { nameKey: 'swGcalName', descKey: 'swGcalDesc', url: 'https://calendar.google.com' },
      { nameKey: 'swTrelloName', descKey: 'swTrelloDesc', url: 'https://trello.com' },
      { nameKey: 'swTickTickName', descKey: 'swTickTickDesc', url: 'https://ticktick.com' }
    ]
  },
  {
    titleKey: 'swCatFocus',
    items: [
      { nameKey: 'swPomodoroName', descKey: 'swPomodoroDesc', url: 'https://pomofocus.io' },
      { nameKey: 'swForestName', descKey: 'swForestDesc', url: 'https://www.forestapp.cc' },
      { nameKey: 'swStayFocusdName', descKey: 'swStayFocusdDesc', url: 'https://chrome.google.com/webstore/detail/stayfocusd/laankejkbhbdhmipfmgcngdelahlfoji' }
    ]
  },
  {
    titleKey: 'swCatReading',
    items: [
      { nameKey: 'swAcrobatName', descKey: 'swAcrobatDesc', url: 'https://get.adobe.com/reader/' },
      { nameKey: 'swXodoName', descKey: 'swXodoDesc', url: 'https://xodo.com' },
      { nameKey: 'swHypothesisName', descKey: 'swHypothesisDesc', url: 'https://hypothes.is' }
    ]
  },
  {
    titleKey: 'swCatFlashcards',
    items: [
      { nameKey: 'swAnkiName', descKey: 'swAnkiDesc', url: 'https://apps.ankiweb.net' },
      { nameKey: 'swQuizletName', descKey: 'swQuizletDesc', url: 'https://quizlet.com' },
      { nameKey: 'swMemriseName', descKey: 'swMemriseDesc', url: 'https://www.memrise.com' }
    ]
  },
  {
    titleKey: 'swCatWriting',
    items: [
      { nameKey: 'swDocsName', descKey: 'swDocsDesc', url: 'https://docs.google.com' },
      { nameKey: 'swLibreOfficeName', descKey: 'swLibreOfficeDesc', url: 'https://www.libreoffice.org' },
      { nameKey: 'swGrammarlyName', descKey: 'swGrammarlyDesc', url: 'https://www.grammarly.com' }
    ]
  },
  {
    titleKey: 'swCatMath',
    items: [
      { nameKey: 'swDesmosName', descKey: 'swDesmosDesc', url: 'https://www.desmos.com/calculator' },
      { nameKey: 'swGeoName', descKey: 'swGeoDesc', url: 'https://www.geogebra.org' },
      { nameKey: 'swWolframName', descKey: 'swWolframDesc', url: 'https://www.wolframalpha.com' },
      { nameKey: 'swSymbolabName', descKey: 'swSymbolabDesc', url: 'https://www.symbolab.com' }
    ]
  },
  {
    titleKey: 'swCatCoding',
    items: [
      { nameKey: 'swVSCodeName', descKey: 'swVSCodeDesc', url: 'https://code.visualstudio.com' },
      { nameKey: 'swGitHubName', descKey: 'swGitHubDesc', url: 'https://github.com' },
      { nameKey: 'swReplitName', descKey: 'swReplitDesc', url: 'https://replit.com' },
      { nameKey: 'swJupyterName', descKey: 'swJupyterDesc', url: 'https://jupyter.org/try' }
    ]
  },
  {
    titleKey: 'swCatLearning',
    items: [
      { nameKey: 'swKhanName', descKey: 'swKhanDesc', url: 'https://www.khanacademy.org' },
      { nameKey: 'swYouTubeEduName', descKey: 'swYouTubeEduDesc', url: 'https://www.youtube.com/education' },
      { nameKey: 'swEdxName', descKey: 'swEdxDesc', url: 'https://www.edx.org' },
      { nameKey: 'swCourseraName', descKey: 'swCourseraDesc', url: 'https://www.coursera.org' }
    ]
  },
  {
    titleKey: 'swCatCloud',
    items: [
      { nameKey: 'swDriveName', descKey: 'swDriveDesc', url: 'https://drive.google.com' },
      { nameKey: 'swDropboxName', descKey: 'swDropboxDesc', url: 'https://www.dropbox.com' }
    ]
  },
  {
    titleKey: 'swCatGroup',
    items: [
      { nameKey: 'swDiscordName', descKey: 'swDiscordDesc', url: 'https://discord.com' },
      { nameKey: 'swSlackName', descKey: 'swSlackDesc', url: 'https://slack.com' }
    ]
  },
  {
    titleKey: 'swCatAi',
    items: [
      { nameKey: 'swChatgptName', descKey: 'swChatgptDesc', useKey: 'swAiUseHomework', url: 'https://chatgpt.com' },
      { nameKey: 'swPerplexityName', descKey: 'swPerplexityDesc', useKey: 'swAiUseResearch', url: 'https://www.perplexity.ai' },
      { nameKey: 'swSocraticName', descKey: 'swSocraticDesc', useKey: 'swAiUseExplained', url: 'https://socratic.org' },
      { nameKey: 'swGrammarlyName', descKey: 'swGrammarlyDesc', useKey: 'swAiUseWriting', url: 'https://www.grammarly.com' },
      { nameKey: 'swPenseumName', descKey: 'swPenseumDesc', useKey: 'swAiUseNotes', url: 'https://penseum.ai' },
      { nameKey: 'swStudyFetchName', descKey: 'swStudyFetchDesc', useKey: 'swAiUseNotes', url: 'https://studyfetch.com' },
      { nameKey: 'swMindgraspName', descKey: 'swMindgraspDesc', useKey: 'swAiUseNotes', url: 'https://www.mindgrasp.ai' },
      { nameKey: 'swOtterName', descKey: 'swOtterDesc', useKey: 'swAiUseTranscription', url: 'https://otter.ai' },
      { nameKey: 'swQuizletName', descKey: 'swQuizletDesc', useKey: 'swAiUseFlashcards', url: 'https://quizlet.com' }
    ]
  }
];

const LEARNING_TECHNIQUES = [
  {
    title: 'Active Recall',
    what: 'Actively trying to remember information without looking at your notes.',
    how: 'Forces your brain to retrieve info, which strengthens memory pathways.',
    use: 'Close notes and write what you remember; answer practice questions; use flashcards.',
    best: 'Tests, definitions, formulas, dates, long‑term memory.',
    why: 'Struggling to remember makes learning stick.',
    examples: 'Define 10 terms from memory; answer past‑paper questions.',
    steps: 'Pick a topic → quiz yourself → check answers → retry weak items.',
    mistakes: 'Only rereading notes; checking answers too quickly.',
    videoTitle: 'How to Study Effectively – Active Recall (Ali Abdaal)',
    videoUrl: 'https://www.youtube.com/watch?v=ukLnPbIffxE'
  },
  {
    title: 'Spaced Repetition',
    what: 'Reviewing material multiple times over increasing time intervals.',
    how: 'You review right before you forget, reinforcing memory efficiently.',
    use: 'Review today → in 2 days → 1 week → 1 month; use Anki or a calendar plan.',
    best: 'Vocabulary, languages, biology, history, formulas.',
    why: 'Prevents cramming and builds durable memory.',
    examples: 'Daily Anki deck; weekly formula review.',
    steps: 'Learn → schedule reviews → keep intervals growing.',
    mistakes: 'Skipping scheduled reviews; adding too many cards at once.',
    videoTitle: 'Spaced Repetition: The Most Powerful Way to Remember What You Study',
    videoUrl: 'https://www.youtube.com/watch?v=eVajQPuRmk8'
  },
  {
    title: 'Blurting',
    what: 'Writing everything you know from memory, then checking gaps.',
    how: 'Reveals exactly what you don’t know so studying is targeted.',
    use: 'Read once, close notes, write from memory, then compare and fix gaps.',
    best: 'Science, history, essay‑based subjects.',
    why: 'Combines active recall with gap analysis.',
    examples: 'Brain‑dump a chapter on photosynthesis.',
    steps: 'Skim → close notes → dump from memory → fix gaps.',
    mistakes: 'Copying notes while blurting; skipping the gap‑fix step.',
    videoTitle: 'The Blurting Method – How Top Students Study',
    videoUrl: 'https://www.youtube.com/watch?v=C5JpX2aV4b8'
  },
  {
    title: 'Feynman Technique',
    what: 'Explaining a topic in simple words, like teaching a beginner.',
    how: 'If you can’t explain it simply, you don’t fully understand it.',
    use: 'Write a simple explanation, find confusing parts, clarify, simplify again.',
    best: 'Math concepts, physics, philosophy, economics.',
    why: 'Turns passive knowledge into real understanding.',
    examples: 'Explain “derivative” to a 10‑year‑old.',
    steps: 'Explain simply → spot gaps → review → re‑explain.',
    mistakes: 'Using jargon; not checking for real understanding.',
    videoTitle: 'The Feynman Technique Explained',
    videoUrl: 'https://www.youtube.com/watch?v=_f-qkGJBPts'
  },
  {
    title: 'Practice Testing',
    what: 'Studying by doing exam‑style questions.',
    how: 'Simulates test conditions and strengthens recall under pressure.',
    use: 'Past exams, timed quizzes, self‑made questions.',
    best: 'Standardized tests, math, science, reading comprehension.',
    why: 'Improves memory and confidence.',
    examples: 'Timed SAT section; end‑of‑chapter quiz.',
    steps: 'Take a test → review errors → redo weak areas.',
    mistakes: 'Only doing easy questions; not reviewing mistakes.',
    videoTitle: 'Practice Testing: Studying That Actually Works (Learning Scientists)',
    videoUrl: 'https://www.youtube.com/watch?v=YLkOZhROvA4'
  },
  {
    title: 'Interleaving',
    what: 'Mixing different topics or problem types in one session.',
    how: 'Forces your brain to choose the right method vs. memorizing patterns.',
    use: 'Mix algebra + geometry; alternate history themes; rotate subjects.',
    best: 'Math, physics, problem‑solving subjects.',
    why: 'Improves adaptability and exam performance.',
    examples: 'Alternate trig and algebra problems.',
    steps: 'Pick 2–3 topics → rotate every few problems.',
    mistakes: 'Switching too often; mixing without reviewing basics.',
    videoTitle: 'Interleaving: Why Mixing Topics Improves Learning',
    videoUrl: 'https://www.youtube.com/watch?v=kV64Bu6sec0'
  },
  {
    title: 'Elaborative Interrogation',
    what: 'Asking “why?” and “how?” constantly.',
    how: 'Connects new information to logic and prior knowledge.',
    use: 'Ask: “Why does this happen?” “How does this connect to what I learned?”',
    best: 'Biology, history, social sciences.',
    why: 'Builds deep conceptual understanding.',
    examples: 'Why did WWI start? How does it link to alliances?',
    steps: 'Read → ask why/how → answer in your words.',
    mistakes: 'Asking questions but not answering them.',
    videoTitle: 'Asking “Why?” to Learn Better – Elaborative Interrogation',
    videoUrl: 'https://www.youtube.com/watch?v=Q0n3n0k7ZkY'
  },
  {
    title: 'Mind Mapping',
    what: 'Visual organization of ideas around a central concept.',
    how: 'Shows relationships between ideas instead of linear notes.',
    use: 'Central topic → branches → sub‑branches; use keywords.',
    best: 'Big chapters, essay planning, brainstorming.',
    why: 'Great for seeing the big picture.',
    examples: 'Map causes/effects of the French Revolution.',
    steps: 'Center topic → add main branches → add details.',
    mistakes: 'Writing full sentences; making it too cluttered.',
    videoTitle: 'How to Mind Map Like a Pro',
    videoUrl: 'https://www.youtube.com/watch?v=ZrQhZt8N2Z4'
  },
  {
    title: 'Cornell Note‑Taking',
    what: 'A structured way to take notes that promotes review.',
    how: 'Divides a page into notes, questions, and summary.',
    use: 'Write questions after class; answer them during review.',
    best: 'Lectures, humanities, science classes.',
    why: 'Turns notes into an active study tool.',
    examples: 'Left column: questions; right: lecture notes.',
    steps: 'Take notes → add questions → write summary → review.',
    mistakes: 'Skipping the question/summary parts.',
    videoTitle: 'Cornell Notes Explained',
    videoUrl: 'https://www.youtube.com/watch?v=WtW9IyE04OQ'
  },
  {
    title: 'Pomodoro Technique',
    what: 'Studying in focused time blocks with breaks.',
    how: 'Prevents burnout and maintains attention.',
    use: '25 min study, 5 min break; repeat 4 times then a long break.',
    best: 'Long study sessions, homework, essay writing.',
    why: 'Boosts focus and consistency.',
    examples: '4×25/5 then a 20‑minute break.',
    steps: 'Set timer → focus → short break → repeat.',
    mistakes: 'Skipping breaks; multitasking during focus time.',
    videoTitle: 'Pomodoro Technique – How to Use It Properly',
    videoUrl: 'https://www.youtube.com/watch?v=mNBmG24djoY'
  },
  {
    title: 'Dual Coding',
    what: 'Combining words with visuals.',
    how: 'Your brain processes images and text differently, improving recall.',
    use: 'Diagrams, charts, labeled drawings.',
    best: 'Biology, geography, physics.',
    why: 'Creates multiple memory pathways.',
    examples: 'Label a cell diagram; sketch a physics setup.',
    steps: 'Read → create a visual → label it in your words.',
    mistakes: 'Copying images without understanding them.',
    videoTitle: 'Dual Coding Theory Explained',
    videoUrl: 'https://www.youtube.com/watch?v=K3-0NnFzv50'
  },
  {
    title: 'Teaching Someone Else',
    what: 'Explaining material to another person.',
    how: 'Forces clarity, structure, and confidence.',
    use: 'Study groups, pretend audience, record yourself explaining.',
    best: 'Oral exams, concept‑heavy subjects.',
    why: 'Reveals weak points instantly.',
    examples: 'Teach a friend the steps of factoring.',
    steps: 'Outline → teach → note gaps → review → re‑teach.',
    mistakes: 'Reading notes aloud; not checking if they follow.',
    videoTitle: 'Why Teaching Others Helps You Learn',
    videoUrl: 'https://www.youtube.com/watch?v=Zq9-6n0xPzI'
  },
  {
    title: 'Retrieval + Error Correction',
    what: 'Actively recalling, then fixing mistakes immediately.',
    how: 'Correcting errors prevents false memory.',
    use: 'Practice → check → rewrite the correct version.',
    best: 'Math, grammar, science.',
    why: 'Mistakes become learning anchors.',
    examples: 'Do 10 problems, fix every wrong step.',
    steps: 'Attempt → check → correct → retry later.',
    mistakes: 'Ignoring errors; not retrying the same problem.',
    videoTitle: 'Why Making Mistakes Helps You Learn',
    videoUrl: 'https://www.youtube.com/watch?v=Y6X7q6R3qGQ'
  },
  {
    title: 'Distributed Practice',
    what: 'Studying multiple subjects across the week instead of one at a time.',
    how: 'Reduces mental fatigue and improves retention.',
    use: 'Short sessions per subject daily.',
    best: 'Heavy workloads, multiple exams.',
    why: 'Keeps your brain fresh.',
    examples: 'Mon: math+bio, Tue: history+French.',
    steps: 'Plan weekly blocks → rotate subjects.',
    mistakes: 'Cramming one subject in a single day.',
    videoTitle: 'Distributed Practice vs Cramming',
    videoUrl: 'https://www.youtube.com/watch?v=E8Y4Rkz9XnQ'
  },
  {
    title: 'Reflection & Self‑Assessment',
    what: 'Evaluating what worked and what didn’t.',
    how: 'Improves future study efficiency.',
    use: 'After each session ask: What did I learn? What’s still unclear?',
    best: 'Long‑term improvement, exam prep cycles.',
    why: 'Turns studying into a skill you refine.',
    examples: 'Weekly review note: wins + weak spots.',
    steps: 'After study → write 2 wins + 2 gaps → adjust plan.',
    mistakes: 'Skipping reflection; being too vague.',
    videoTitle: 'How to Reflect After Studying (Metacognition)',
    videoUrl: 'https://www.youtube.com/watch?v=ZcW3t8l7F94'
  }
];

let softwareFilterKey = 'all';
function dayLabel(idx) {
  const arr = DAY_NAMES[currentLang] || DAY_NAMES.en;
  return arr[idx] || DAY_NAMES.en[idx] || '';
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
    if (step < steps.length - 1) {
      step += 1;
      renderStep();
    } else {
      localSet({ [ONBOARDING_KEY]: true });
      modal.classList.add('hidden');
    }
  });
  backBtn?.addEventListener('click', () => {
    if (step <= 0) return;
    try { steps[step].collect(); } catch (e) { logStorageError('onboarding-collect-back', e); }
    step -= 1;
    renderStep();
  });

  modal.querySelector('#onboarding-close')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('.modal-backdrop')?.addEventListener('click', () => modal.classList.add('hidden'));

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

function formatDuration(minutes) {
  const min = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function getEstimatedMinutes(item) {
  if (!item) return null;
  const manual = parseInt(item.manualMinutes, 10);
  if (Number.isFinite(manual) && manual > 0) return manual;
  const type = (item.type === 'test' || item.type === 'both') ? 'test' : 'homework';
  const diff = String(item.difficulty || 'medium').toLowerCase();
  const source = (cachedStudyDurations && cachedStudyDurations[type]) ? cachedStudyDurations[type] : defaultStudyDurations[type];
  const fallback = defaultStudyDurations[type][diff] || defaultStudyDurations[type].medium;
  const val = source && typeof source[diff] === 'number' ? source[diff] : null;
  return Number.isFinite(val) && val > 0 ? val : fallback;
}

function formatISODate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDateFromWeekday(weekday) {
  if (!weekday) return null;
  const map = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const target = map[String(weekday).toLowerCase()];
  if (target === undefined) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delta = ((target - today.getDay()) + 7) % 7 || 7; // next occurrence, not today
  const d = new Date(today);
  d.setDate(today.getDate() + delta);
  return d;
}

function nextDateFromDdMm(text) {
  if (!text) return null;
  const m = /^\s*(\d{1,2})[\/](\d{1,2})\s*$/.exec(text);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let candidate = new Date(today.getFullYear(), mm - 1, dd);
  if (candidate < today) candidate = new Date(today.getFullYear() + 1, mm - 1, dd);
  return candidate;
}

function reminderDueDate(reminder) {
  if (!reminder) return null;
  if (reminder.weekday) return nextDateFromWeekday(reminder.weekday);
  const text = String(reminder.dateText || '').trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    return new Date(y, m - 1, d);
  }
  const ddmm = /^(\d{1,2})[\/](\d{1,2})$/.exec(text);
  if (!ddmm) return null;
  const dd = parseInt(ddmm[1], 10);
  const mm = parseInt(ddmm[2], 10);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  const dueYear = parseInt(reminder.dueYear, 10);
  const year = Number.isFinite(dueYear) && dueYear >= 2000 ? dueYear : (new Date()).getFullYear();
  return new Date(year, mm - 1, dd);
}

function isReminderExpired(reminder, refDate = new Date()) {
  if (!reminder || reminder.weekday) return false;
  const d = reminderDueDate(reminder);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function pruneExpiredReminders(reminders) {
  const src = Array.isArray(reminders) ? reminders : [];
  const kept = src.filter((r) => !isReminderExpired(r));
  return { kept, changed: kept.length !== src.length };
}

function combineItems(pronoteItems, reminders) {
  const base = Array.isArray(pronoteItems) ? pronoteItems.slice() : [];
  const rems = Array.isArray(reminders) ? reminders : [];
  rems.forEach((r) => {
    const d = reminderDueDate(r);
    const dueDate = formatISODate(d);
    if (!dueDate) return;
    base.push({
      subject: r.title || 'Reminder',
      notes: r.note || '',
      reminderTag: r.tag || defaultReminderTag,
      isReminder: true,
      reminderId: r.id,
      dateText: r.dateText || '',
      weekday: r.weekday || '',
      dueDate,
      type: 'reminder'
    });
  });
  return base;
}

function setStatus(msg = '', cls = '') {
  if (!$status) return;
  $status.textContent = msg;
  $status.className = cls ? `status-inline ${cls}` : 'status-inline';
}

function extractLinks(text) {
  const regex = /(https?:\/\/[^\s]+)/gi;
  const links = [];
  let m;
  while ((m = regex.exec(text || '')) !== null) links.push(m[0]);
  return links;
}

function loadStudyDurations(done) {
  syncGet({ studyDurations: defaultStudyDurations }, (res) => {
    cachedStudyDurations = res.studyDurations || defaultStudyDurations;
    if (typeof done === 'function') done();
  });
}

function updateModalEstimate(item) {
  if (!$modalEstimate) return;
  const minutes = getEstimatedMinutes(item);
  if (minutes) {
    const formatted = formatDuration(minutes) || `${minutes}m`;
    $modalEstimate.textContent = `${t('estimateLabel')}: ${formatted}`;
  } else {
    $modalEstimate.textContent = `${t('estimateLabel')}: ${t('phAuto')}`;
  }
}

function showHomeworkModal(item, index) {
  if (!$homeworkModal) return;
  modalCurrentIndex = index;
  modalCurrentItem = item;
  $modalSubject.textContent = item.subject || 'Untitled';
  $modalDue.textContent = item.dueDate || 'No due date';
  $modalType.textContent = item.type || 'homework';
  updateModalEstimate(item);
  $modalNotes.textContent = item.notes || '';
  if ($modalLinks) {
    $modalLinks.innerHTML = '';
    extractLinks(item.notes || '').forEach((link) => {
      const a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = link;
      $modalLinks.appendChild(a);
    });
  }
  if ($modalDifficultySelect) $modalDifficultySelect.value = item.difficulty || 'medium';
  if ($modalMinutesInput) $modalMinutesInput.value = item.manualMinutes || '';
  $homeworkModal.classList.remove('hidden');
  loadStudyDurations(() => updateModalEstimate(item));
}

function hideHomeworkModal() {
  $homeworkModal?.classList.add('hidden');
  modalCurrentIndex = null;
  modalCurrentItem = null;
}

$modalClose?.addEventListener('click', hideHomeworkModal);
$homeworkModal?.querySelector('.modal-backdrop')?.addEventListener('click', hideHomeworkModal);

function savePronoteItems(items, cb) {
  localSet({ pronoteItems: prunePronoteItems(items) }, cb);
}

function updatePronoteItem(index, patch) {
  localGet({ pronoteItems: [] }, (res) => {
    const arr = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
    if (!arr[index]) return;
    const next = { ...arr[index], ...patch };
    arr[index] = next;
    if (modalCurrentIndex === index) {
      modalCurrentItem = next;
      updateModalEstimate(next);
    }
    savePronoteItems(arr, () => renderOverviewList(arr));
  });
}

$modalDifficultySelect?.addEventListener('change', () => {
  if (modalCurrentIndex === null) return;
  updatePronoteItem(modalCurrentIndex, { difficulty: $modalDifficultySelect.value });
});
$modalMinutesInput?.addEventListener('change', () => {
  if (modalCurrentIndex === null) return;
  const val = parseInt($modalMinutesInput.value, 10);
  updatePronoteItem(modalCurrentIndex, { manualMinutes: Number.isFinite(val) && val > 0 ? val : null });
});

function renderOverviewList(items) {
  if (!$overview) return;
  const src = Array.isArray(items) ? items : [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cols = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  src.forEach((it, idx) => {
    if (!it || !it.dueDate) return;
    try {
      const [y, m, d] = it.dueDate.split('-').map((v) => parseInt(v, 10));
      const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
      const wd = dt.getDay();
      if (cols[wd]) cols[wd].push({ ...it, _dt: dt, _index: idx });
    } catch (e) { logStorageError('renderOverviewList-date-parse', e); }
  });
  Object.values(cols).forEach(arr => arr.sort((a, b) => a._dt - b._dt || String(a.subject || '').localeCompare(b.subject || '')));
  const total = Object.values(cols).reduce((s, a) => s + a.length, 0);
  if (!total) {
    $overview.className = 'day';
    $overview.innerHTML = `<div class="empty">No upcoming homework stored yet.</div>`;
    return;
  }
  const wrapper = document.createElement('div'); wrapper.className = 'overview-grid';
  function deleteItem(index) {
    localGet({ pronoteItems: [], pronoteDeletedItems: [], [PLAN_OVERRIDES_KEY]: {} }, (res) => {
      const arr = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
      const del = Array.isArray(res.pronoteDeletedItems) ? res.pronoteDeletedItems : [];
      const overrides = res[PLAN_OVERRIDES_KEY] || {};
      if (!arr[index]) return;
      del.unshift({ ...arr[index], deletedAt: new Date().toISOString() });
      arr.splice(index, 1);
      const nextOverrides = cleanPlanOverrides(overrides, arr);
      localSet({ pronoteItems: arr, pronoteDeletedItems: del.slice(0, MAX_DELETED_ITEMS), [PLAN_OVERRIDES_KEY]: nextOverrides }, () => {
        renderOverviewList(arr);
        triggerGcalSync();
      });
    });
  }
  function deleteReminder(reminderId, reminderItem) {
    localGet({ reminders: [] }, (res) => {
      const arr = Array.isArray(res.reminders) ? res.reminders.slice() : [];
      const next = arr.filter((r) => {
        if (!r) return false;
        if (reminderId != null) return r.id !== reminderId;
        const sameTitle = String(r.title || '').trim() === String(reminderItem?.subject || '').trim();
        const sameNote = String(r.note || '').trim() === String(reminderItem?.notes || '').trim();
        const sameDate = String(r.dateText || '').trim() === String(reminderItem?.dateText || '').trim();
        const sameWeekday = String(r.weekday || '').trim() === String(reminderItem?.weekday || '').trim();
        return !(sameTitle && sameNote && sameDate && sameWeekday);
      });
      if (next.length === arr.length) return;
      localSet({ reminders: next }, () => {
        loadAll();
      });
    });
  }
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  for (const k of dayOrder) {
    const sec = document.createElement('div'); sec.className = 'col';
    const header = document.createElement('div'); header.className = 'col-header';
    const title = document.createElement('div'); title.className = 'col-title'; title.textContent = dayLabel(k);
    const count = document.createElement('div'); count.className = 'count-badge'; count.textContent = cols[k].length + ' item(s)';
    header.append(title, count);
    const list = document.createElement('div'); list.className = 'items';
    for (const it of cols[k]) {
      const card = document.createElement('div'); card.className = 'item'; card.dataset.index = String(it._index);
      const top = document.createElement('div'); top.className = 'item-top';
      const subj = document.createElement('div'); subj.className = 'subject'; subj.textContent = it.subject || '';
      const delBtn = document.createElement('button'); delBtn.className = 'delete-x'; delBtn.textContent = '×'; delBtn.title = 'Remove this item';
      if (!it.isReminder) {
        delBtn.addEventListener('click', (ev) => { if (confirm('Remove this item?')) deleteItem(it._index); ev.stopPropagation(); });
        top.append(subj, delBtn);
        card.addEventListener('click', () => showHomeworkModal(it, it._index));
      } else {
        delBtn.addEventListener('click', (ev) => {
          if (!confirm('Remove this reminder?')) return;
          deleteReminder(it.reminderId, it);
          ev.stopPropagation();
        });
        top.append(subj, delBtn);
      }
      const meta = document.createElement('div'); meta.className = 'item-meta';
      if (it.isReminder) {
        const badge = document.createElement('span'); badge.className = 'badge main-type-badge badge-test'; badge.textContent = it.reminderTag || defaultReminderTag; meta.append(badge);
      } else {
        let curType = it.type === 'test' ? 'test' : 'homework';
        const typeBadge = document.createElement('span'); typeBadge.className = 'badge main-type-badge ' + (curType === 'test' ? 'badge-test' : 'badge-homework');
        const label = () => currentLang === 'fr' ? (curType === 'test' ? 'test' : 'devoir') : curType;
        typeBadge.textContent = label();
        typeBadge.addEventListener('click', () => {
          const next = curType === 'test' ? 'homework' : 'test';
          curType = next;
          typeBadge.className = 'badge main-type-badge ' + (curType === 'test' ? 'badge-test' : 'badge-homework');
          typeBadge.textContent = label();
          updatePronoteItem(it._index, { type: curType });
        });
        const diffWrap = document.createElement('div'); diffWrap.className = 'pill-select-wrap';
        const diffLabel = document.createElement('span'); diffLabel.className = 'pill-label'; diffLabel.textContent = 'Diff';
        const diffSelect = document.createElement('select'); diffSelect.className = 'pill-select';
        [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['epreuve blanche', 'Epreuve Blanche']].forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; diffSelect.appendChild(o); });
        diffSelect.value = it.difficulty || 'medium';
        diffSelect.addEventListener('change', () => updatePronoteItem(it._index, { difficulty: diffSelect.value }));
        diffWrap.append(diffLabel, diffSelect);
        meta.append(typeBadge, diffWrap);
      }
      const notes = document.createElement('div'); notes.className = 'notes'; if (it.notes) notes.textContent = it.notes.slice(0, 240);
      card.append(top, meta, notes);
      list.appendChild(card);
    }
    sec.append(header, list); wrapper.appendChild(sec);
  }
  $overview.className = ''; $overview.innerHTML = ''; $overview.appendChild(wrapper);
}

function updateReminder(id, patch) {
  localGet({ reminders: [] }, (res) => {
    const arr = Array.isArray(res.reminders) ? res.reminders.slice() : [];
    const idx = arr.findIndex((r) => r && r.id === id);
    if (idx === -1) return;
    arr[idx] = { ...arr[idx], ...patch };
    localSet({ reminders: arr });
  });
}

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

// ---- Calendar (weekly grid) ----
function formatWeekRange(ws) {
  const end = new Date(ws); end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${ws.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

function isoDateFromDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHM(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapMinutes(totalMinutes, step = 15) {
  return Math.round(totalMinutes / step) * step;
}

function resolveHomeworkOverlaps(events) {
  const src = Array.isArray(events) ? events : [];
  if (!src.length) return src;
  const byDay = new Map();
  src.forEach((ev) => {
    if (!ev || !(ev.start instanceof Date) || Number.isNaN(ev.start.getTime())) return;
    const key = isoDateFromDate(ev.start);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(ev);
  });

  const out = [];
  const dayEnd = CAL_DAY_END;
  const gap = 5;
  for (const [day, list] of byDay.entries()) {
    const fixed = [];
    const movable = [];
    list.forEach((ev) => {
      const s = ev.start.getHours() * 60 + ev.start.getMinutes();
      const e = ev.end.getHours() * 60 + ev.end.getMinutes();
      const slot = { start: s, end: Math.max(s + 15, e) };
      if (ev.kind === 'rec') fixed.push(slot);
      else movable.push(ev);
    });

    // sort fixed so conflict checks are deterministic
    fixed.sort((a, b) => a.start - b.start || a.end - b.end);
    movable.sort((a, b) => a.start - b.start || a.end - b.end);

    for (const ev of movable) {
      const mins = Math.max(15, parseInt(ev.minutes, 10) || Math.round((ev.end - ev.start) / 60000) || 60);
      let startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
      if (startMin < CAL_DAY_START) startMin = CAL_DAY_START;

      let guard = 0;
      while (guard++ < 400) {
        const conflicts = fixed.filter((b) => !(startMin + mins <= b.start || startMin >= b.end));
        if (!conflicts.length) break;
        const latestEnd = Math.max(...conflicts.map((c) => c.end));
        startMin = latestEnd + gap;
        if (startMin + mins > dayEnd) {
          startMin = Math.max(CAL_DAY_START, dayEnd - mins);
          break;
        }
      }

      const [y, m, d] = day.split('-').map((v) => parseInt(v, 10) || 0);
      const st = new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60, 0, 0);
      const en = new Date(st.getTime() + mins * 60000);
      ev.start = st;
      ev.end = en;
      fixed.push({ start: startMin, end: startMin + mins });
      fixed.sort((a, b) => a.start - b.start || a.end - b.end);
    }

    out.push(...list);
  }

  return out.sort((a, b) => a.start - b.start || a.end - b.end || String(a.title || '').localeCompare(b.title || ''));
}

function savePlanOverride(id, date, time, minutes, title) {
  if (!id) return;
  localGet({ [PLAN_OVERRIDES_KEY]: {} }, (res) => {
    const overrides = { ...(res[PLAN_OVERRIDES_KEY] || {}) };
    overrides[id] = { date, time, minutes, title };
    localSet({ [PLAN_OVERRIDES_KEY]: overrides }, () => {
      renderCalendar();
      showToast(formatTemplate(t('planMoved'), { title: title || t('studySession'), date, time }), 'success');
      triggerGcalSync();
    });
  });
}

function parsePlanId(planId) {
  const raw = String(planId || '');
  if (!raw) return null;
  const parts = raw.split('|');
  if (parts.length < 2) return null;
  const dueDate = parts[0];
  const subject = parts[1];
  const kind = parts.length >= 3 ? parts[2] : '';
  const idxRaw = parts[parts.length - 1];
  const index = Number.isFinite(parseInt(idxRaw, 10)) ? parseInt(idxRaw, 10) : null;
  return { dueDate, subject, index, kind };
}

function cleanPlanOverrides(overrides, items) {
  const src = (overrides && typeof overrides === 'object') ? overrides : {};
  const arr = Array.isArray(items) ? items : [];
  const out = {};
  for (const [id, value] of Object.entries(src)) {
    const info = parsePlanId(id);
    if (!info) continue;
    const atIndex = Number.isFinite(info.index) ? arr[info.index] : null;
    const exactMatch = !!(atIndex &&
      String(atIndex.dueDate || '') === String(info.dueDate || '') &&
      String(atIndex.subject || '') === String(info.subject || ''));
    const fallbackMatch = arr.some((it) => (
      it &&
      String(it.dueDate || '') === String(info.dueDate || '') &&
      String(it.subject || '') === String(info.subject || '')
    ));
    if (exactMatch || fallbackMatch) out[id] = value;
  }
  return out;
}

function openHomeworkFromCalendar(ev) {
  if (!ev) return;
  localGet({ pronoteItems: [] }, (res) => {
    const items = Array.isArray(res.pronoteItems) ? res.pronoteItems : [];
    const info = parsePlanId(ev.planId || ev.id || '');
    const dueDate = String(ev.dueDate || info?.dueDate || '').trim();
    const subject = String(ev.subject || info?.subject || '').trim();
    let idx = Number.isFinite(parseInt(ev.itemIndex, 10)) ? parseInt(ev.itemIndex, 10) : null;
    if (idx == null && info && Number.isFinite(info.index)) idx = info.index;
    let item = (idx != null && items[idx]) ? items[idx] : null;
    if (!item && dueDate) {
      item = items.find((it) => (
        it && it.dueDate === dueDate &&
        (subject ? String(it.subject || '') === subject : true)
      )) || null;
      if (item) idx = items.indexOf(item);
    }
    if (!item && dueDate) {
      const subjLower = String(subject || '').toLowerCase();
      item = items.find((it) => {
        if (!it || it.dueDate !== dueDate) return false;
        if (!subjLower) return true;
        return String(it.subject || '').toLowerCase() === subjLower;
      }) || null;
      if (item) idx = items.indexOf(item);
    }
    if (item && idx != null) {
      showHomeworkModal(item, idx);
      return;
    }
    showToast(t('calItemMissing'), 'error');
  });
}

function buildWeekEvents(weekStart, items, recurring) {
  const out = [];
  const start = new Date(weekStart);
  const end = new Date(weekStart); end.setDate(end.getDate() + 7);
  const inRange = (iso) => {
    // Parse the date-only dueDate as LOCAL midnight to match start/end (a bare
    // "YYYY-MM-DD" passed to new Date() is parsed as UTC, shifting it a day for
    // users behind UTC and dropping boundary items from the week).
    const [y, m, d] = String(iso).split('-').map(v => parseInt(v, 10));
    if (!Number.isFinite(y)) return false;
    const dt = new Date(y, m - 1, d, 0, 0, 0);
    return dt >= start && dt < end;
  };
  const defaultMinutes = (it) => {
    const m = parseInt(it?.manualMinutes, 10);
    return Number.isFinite(m) && m > 0 ? m : 60;
  };

  // bucket by date
  const byDate = new Map();
  function addToDay(dateStr, ev) {
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr).push(ev);
  }

  (recurring || []).forEach(r => {
    const days = Array.isArray(r.days) ? r.days.map(v => parseInt(v, 10)) : [];
    if (!r.time || !days.length) return;
    for (let i = 0; i < 7; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      if (!days.includes(day.getDay())) continue;
      const [hh, mm] = String(r.time).split(':').map(v => parseInt(v, 10) || 0);
      const dur = Math.max(5, parseInt(r.duration, 10) || 60);
      const st = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, 0);
      const en = new Date(st.getTime() + dur * 60000);
      addToDay(isoDateFromDate(st), {
        start: st,
        end: en,
        title: r.title || 'Recurring',
        meta: `${r.time}${r.duration ? ` • ${formatDuration(r.duration)}` : ''}`,
        kind: 'rec'
      });
    }
  });

  (items || []).forEach((it, idx) => {
    if (!it || !it.dueDate) return;
    if (!inRange(it.dueDate)) return;
    const mins = defaultMinutes(it);
    const [y, m, d] = it.dueDate.split('-').map(v => parseInt(v, 10) || 0);
    const st = new Date(y, m - 1, d, 0, 0, 0);
    const en = new Date(st.getTime() + mins * 60000);
    addToDay(it.dueDate, {
      start: st,
      end: en,
      minutes: mins,
      title: it.subject || '(Untitled)',
      meta: it.notes ? it.notes.slice(0, 120) : '',
      kind: 'hw',
      dueDate: it.dueDate,
      subject: it.subject || '',
      itemIndex: idx
    });
  });

  // For each day, place homework sequentially without overlap, respecting recurring busy times
  const dates = Array.from(byDate.keys()).sort();
  dates.forEach(dateStr => {
    const dayEvents = byDate.get(dateStr) || [];
    const busy = [];
    // keep rec events fixed, collect busy slots
    dayEvents.filter(ev => ev.kind === 'rec').forEach(ev => {
      const startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
      const endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
      busy.push({ start: startMin, end: endMin });
    });
    // place homework
    const homework = dayEvents.filter(ev => ev.kind !== 'rec');
    const placed = [];
    const gap = 5;
    const placeHw = (ev) => {
      const mins = Math.max(15, ev.minutes || 60);
      let cursor = CAL_DAY_START;
      while (true) {
        const conflict = busy.find(b => !(cursor + mins <= b.start || cursor >= b.end));
        if (!conflict) {
          const st = new Date(ev.start);
          st.setHours(0, 0, 0, 0);
          st.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
          const en = new Date(st.getTime() + mins * 60000);
          busy.push({ start: cursor, end: cursor + mins });
          ev.start = st; ev.end = en;
          placed.push(ev);
          break;
        }
        cursor = Math.max(cursor, conflict.end) + gap;
        if (cursor + mins > CAL_DAY_END) break;
      }
    };
    homework.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    homework.forEach(placeHw);
    // merge rec + placed
    out.push(...dayEvents.filter(ev => ev.kind === 'rec'), ...placed);
  });

  return out;
}

function renderCalendarGrid(events, weekStart) {
  if ($calWeekLabel) $calWeekLabel.textContent = formatWeekRange(weekStart);
  if (!$calGrid) return;
  const list = Array.isArray(events) ? events : [];
  const rangeMinutes = CAL_DAY_END - CAL_DAY_START;
  $calGrid.innerHTML = '';
  // time column with header spacer
  const timeCol = document.createElement('div');
  timeCol.className = 'cal-time-col';
  const timeHeader = document.createElement('div');
  timeHeader.className = 'cal-time-header';
  const timeBody = document.createElement('div');
  timeBody.className = 'cal-time-body';
  const startHour = Math.floor(CAL_DAY_START / 60);
  for (let h = startHour; h <= 24; h += 2) {
    const t = document.createElement('div');
    t.className = 'cal-time';
    const top = ((h * 60 - CAL_DAY_START) / rangeMinutes) * 100;
    t.style.top = `${top}%`;
    t.textContent = `${String(h).padStart(2, '0')}:00`;
    timeBody.appendChild(t);
  }
  timeCol.append(timeHeader, timeBody);
  $calGrid.appendChild(timeCol);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayCol = document.createElement('div');
    dayCol.className = 'cal-day';
    const header = document.createElement('div');
    header.className = 'cal-day-header';
    const opts = { weekday: 'short', day: 'numeric' };
    header.textContent = dayDate.toLocaleDateString(undefined, opts);
    const body = document.createElement('div');
    body.className = 'cal-day-body';
    body.dataset.dateIso = isoDateFromDate(dayDate);

    const todaysEvents = (list || [])
      .filter((e) => e.start.toDateString() === dayDate.toDateString())
      .map((ev) => {
        const startMin = Math.max(CAL_DAY_START, Math.min(CAL_DAY_END, ev.start.getHours() * 60 + ev.start.getMinutes()));
        const endMin = Math.max(startMin + 15, Math.min(CAL_DAY_END, ev.end.getHours() * 60 + ev.end.getMinutes()));
        return { ev, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const overlapGroups = [];
    let currentGroup = [];
    let currentGroupEnd = -1;
    todaysEvents.forEach((item) => {
      if (!currentGroup.length) {
        currentGroup = [item];
        currentGroupEnd = item.endMin;
        return;
      }
      if (item.startMin < currentGroupEnd) {
        currentGroup.push(item);
        currentGroupEnd = Math.max(currentGroupEnd, item.endMin);
        return;
      }
      overlapGroups.push(currentGroup);
      currentGroup = [item];
      currentGroupEnd = item.endMin;
    });
    if (currentGroup.length) overlapGroups.push(currentGroup);

    const placed = [];
    overlapGroups.forEach((group) => {
      const colsEnd = [];
      const temp = group.map((item) => {
        let col = colsEnd.findIndex((end) => item.startMin >= end);
        if (col === -1) {
          col = colsEnd.length;
          colsEnd.push(item.endMin);
        } else {
          colsEnd[col] = item.endMin;
        }
        return { ...item, col };
      });
      const colCount = Math.max(1, colsEnd.length);
      temp.forEach((entry) => placed.push({ ...entry, colCount }));
    });

    placed.forEach(({ ev, startMin, endMin, col, colCount }) => {
      const top = ((startMin - CAL_DAY_START) / rangeMinutes) * 100;
      const height = ((endMin - startMin) / rangeMinutes) * 100;
      const slot = document.createElement('div');
      const slotKind = ev.kind === 'rec' ? 'rec' : 'hw';
      slot.className = `cal-slot ${slotKind}`;
      slot.style.top = `${top}%`;
      slot.style.height = `${height}%`;
      const gap = colCount > 1 ? 4 : 0;
      const widthPct = 100 / colCount;
      slot.style.left = `calc(${widthPct * col}% + ${gap * col}px)`;
      slot.style.width = `calc(${widthPct}% - ${gap}px)`;
      slot.style.right = 'auto';
      const minutes = ev.minutes || Math.round((ev.end - ev.start) / 60000);
      const eventId = ev.id || '';
      slot.dataset.eventId = eventId;
      slot.dataset.minutes = String(minutes);
      slot.dataset.title = ev.title || '';
      slot.dataset.kind = slotKind;
      if (ev.itemIndex != null) slot.dataset.itemIndex = String(ev.itemIndex);
      if (eventId) slot.dataset.planId = eventId;
      if (ev.dueDate) slot.dataset.dueDate = ev.dueDate;
      if (ev.subject) slot.dataset.subject = ev.subject;
      if (slotKind === 'hw') slot.classList.add('clickable');
      const title = document.createElement('div');
      title.className = 'cal-slot-title';
      title.textContent = ev.title || '';
      const meta = document.createElement('div');
      meta.className = 'cal-slot-meta';
      meta.textContent = ev.meta || '';
      slot.append(title, meta);
      if (slotKind === 'hw' && eventId) {
        slot.classList.add('draggable');
        const handle = document.createElement('div');
        handle.className = 'cal-slot-handle';
        handle.textContent = '::';
        handle.title = t('planMove');
        handle.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          if (startDrag(slot, ev)) {
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp, { once: true });
          }
        });
        slot.appendChild(handle);
        slot.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return;
          if (ev.target && ev.target.closest('.cal-slot-handle')) return;
          pendingDrag = { slot, startX: ev.clientX, startY: ev.clientY };
          document.addEventListener('pointermove', onPendingMove);
          document.addEventListener('pointerup', onPendingUp, { once: true });
        });
      }
      body.appendChild(slot);
    });

    dayCol.append(header, body);
    $calGrid.appendChild(dayCol);
  }

  const dayBodies = Array.from($calGrid.querySelectorAll('.cal-day-body'));
  if (!dayBodies.length) return;
  let dragState = null;
  let pendingDrag = null;

  const pickDayBody = (x) => {
    for (const body of dayBodies) {
      const rect = body.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right) return body;
    }
    return dayBodies[0];
  };

  const updateGhost = (clientX, clientY) => {
    if (!dragState) return;
    const body = pickDayBody(clientX);
    if (body && dragState.body !== body) {
      dragState.body = body;
      body.appendChild(dragState.ghost);
    }
    const rect = dragState.body.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    const pct = y / rect.height;
    let startMin = CAL_DAY_START + pct * rangeMinutes;
    startMin = snapMinutes(startMin, 15);
    startMin = Math.min(CAL_DAY_END - dragState.minutes, Math.max(CAL_DAY_START, startMin));
    const topPct = ((startMin - CAL_DAY_START) / rangeMinutes) * 100;
    const heightPct = (dragState.minutes / rangeMinutes) * 100;
    dragState.ghost.style.top = `${topPct}%`;
    dragState.ghost.style.height = `${heightPct}%`;
    dragState.date = dragState.body.dataset.dateIso || '';
    dragState.time = formatHM(startMin);
  };

  const startDrag = (slot, ev) => {
    const eventId = slot.dataset.eventId;
    if (!eventId) return false;
    const minutes = Math.max(15, parseInt(slot.dataset.minutes, 10) || 60);
    const ghost = slot.cloneNode(true);
    ghost.classList.add('dragging');
    ghost.style.pointerEvents = 'none';
    const body = slot.closest('.cal-day-body') || dayBodies[0];
    if (body) body.appendChild(ghost);
    slot.classList.add('drag-source');
    dragState = {
      eventId,
      minutes,
      title: slot.dataset.title || '',
      body,
      ghost,
      source: slot,
      date: body?.dataset?.dateIso || '',
      time: ''
    };
    document.body.style.userSelect = 'none';
    updateGhost(ev.clientX, ev.clientY);
    return true;
  };

  const onPointerMove = (ev) => {
    if (!dragState) return;
    updateGhost(ev.clientX, ev.clientY);
  };

  const onPointerUp = () => {
    if (dragState) {
      const { eventId, minutes, title, date, time, source } = dragState;
      if (dragState.ghost && dragState.ghost.parentNode) dragState.ghost.parentNode.removeChild(dragState.ghost);
      if (source) source.classList.remove('drag-source');
      document.body.style.userSelect = '';
      if (eventId && date && time) savePlanOverride(eventId, date, time, minutes, title);
      justDroppedPlan = true;
      setTimeout(() => { justDroppedPlan = false; }, 250);
      dragState = null;
    }
    document.removeEventListener('pointermove', onPointerMove);
  };

  const onPendingMove = (ev) => {
    if (!pendingDrag) return;
    const dx = ev.clientX - pendingDrag.startX;
    const dy = ev.clientY - pendingDrag.startY;
    if (Math.hypot(dx, dy) < 4) return;
    document.removeEventListener('pointermove', onPendingMove);
    const slot = pendingDrag.slot;
    pendingDrag = null;
    if (startDrag(slot, ev)) {
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    }
  };

  const onPendingUp = () => {
    document.removeEventListener('pointermove', onPendingMove);
    pendingDrag = null;
  };

  $calGrid.querySelectorAll('.cal-slot.clickable').forEach((slot) => {
    slot.addEventListener('click', () => {
      if (justDroppedPlan) return;
      if (slot.dataset.kind !== 'hw') return;
      openHomeworkFromCalendar({
        id: slot.dataset.planId || slot.dataset.eventId || '',
        itemIndex: slot.dataset.itemIndex,
        title: slot.dataset.title || '',
        dueDate: slot.dataset.dueDate || '',
        subject: slot.dataset.subject || ''
      });
    });
  });
}

function renderCalendar() {
  const start = new Date(calWeekStart);
  const end = new Date(calWeekStart); end.setDate(end.getDate() + 7);
  const inRange = (d) => d >= start && d < end;

  const fallback = () => {
    localGet({ pronoteItems: [], recurringEvents: [] }, (res) => {
      const events = buildWeekEvents(calWeekStart, res.pronoteItems || [], res.recurringEvents || []);
      renderCalendarGrid(resolveHomeworkOverlaps(events), calWeekStart);
    });
  };

  try {
    chrome.runtime.sendMessage({ type: 'GET_LOCAL_SCHEDULE' }, (resp) => {
      if (!resp || !resp.ok || !Array.isArray(resp.events)) { fallback(); return; }
      const events = resp.events.map((ev) => {
        const st = ev.startDateTime ? new Date(ev.startDateTime) : new Date(ev.date || calWeekStart);
        const en = ev.endDateTime ? new Date(ev.endDateTime) : new Date(st.getTime() + (ev.minutes || 60) * 60000);
        const minutes = parseInt(ev.minutes, 10) || Math.max(15, Math.round((en - st) / 60000));
        const info = parsePlanId(ev.id || '');
        return {
          start: st,
          end: en,
          title: ev.title || '',
          meta: ev.notes ? String(ev.notes).slice(0, 120) : `${minutes} min`,
          kind: ev.pronoteKey && ev.pronoteKey.startsWith('rec-') ? 'rec' : 'hw',
          id: ev.id || '',
          minutes,
          dueDate: info?.dueDate || '',
          subject: info?.subject || ''
        };
      }).filter(ev => inRange(ev.start));
      renderCalendarGrid(resolveHomeworkOverlaps(events), calWeekStart);
    });
  } catch {
    fallback();
  }
}

function updateCalendarFloating() { /* no-op simplified */ }

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

// ---- Buttons ----
$uiLanguage?.addEventListener('change', () => {
  const lang = ($uiLanguage.value || '').toLowerCase() === 'fr' ? 'fr' : 'en';
  setLanguage(lang);
});

$studyPageButton?.addEventListener('click', () => { window.location.href = chrome.runtime.getURL('study_durations.html'); });
$techniqueBack?.addEventListener('click', () => {
  renderTechniquesList();
});
$calRefresh?.addEventListener('click', () => {
  loadAll();
  renderCalendar();
  showToast(t('calUpdated'), 'success');
});
$calExport?.addEventListener('click', exportIcsNow);
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
        const needsCalendarReload = !!(changes[RECURRING_KEY] || changes[PLAN_OVERRIDES_KEY]);
        const needsDeletedReload = !!changes.pronoteDeletedItems;
        if (needsAllReload) {
          scheduleStorageRefresh(() => loadAll(), 60);
        } else if (needsCalendarReload) {
          scheduleStorageRefresh(() => {
            renderCalendar();
            loadRecurring();
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

})();
