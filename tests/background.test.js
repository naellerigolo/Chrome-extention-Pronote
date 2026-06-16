const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function addDaysISO(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadBackgroundExports() {
  const sourcePath = path.join(__dirname, '..', 'background.js');
  const source = fs.readFileSync(sourcePath, 'utf8') + `
globalThis.__testExports = {
  applyPlanOverrides,
  buildRecurringOccurrences,
  calculatePriorityScore,
  makeStudyPlan,
  parseICSHomework,
  resolveReminderISO,
  schedulePlan,
  toICS,
  toScheduledICS
};
`;

  const noop = () => {};
  const storageState = { local: {}, sync: {} };
  const storageArea = (area) => ({
    get(defaults, cb) {
      cb({ ...(defaults || {}), ...storageState[area] });
    },
    set(patch, cb) {
      Object.assign(storageState[area], patch || {});
      if (cb) cb();
    },
    remove(keys, cb) {
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach((key) => delete storageState[area][key]);
      if (cb) cb();
    }
  });

  const context = {
    URL,
    URLSearchParams,
    console,
    fetch: async () => ({ ok: false, text: async () => '', json: async () => ({}) }),
    setTimeout: () => 0,
    clearTimeout: noop,
    chrome: {
      runtime: {
        id: 'test-extension',
        lastError: null,
        getURL: (value) => `chrome-extension://test/${value || ''}`,
        onMessage: { addListener: noop },
        onInstalled: { addListener: noop },
        onStartup: { addListener: noop }
      },
      storage: {
        local: storageArea('local'),
        sync: storageArea('sync'),
        onChanged: { addListener: noop }
      },
      alarms: {
        get(_name, cb) { cb(null); },
        create: noop,
        clear: noop,
        onAlarm: { addListener: noop }
      },
      tabs: {
        create: noop,
        get: noop,
        query: noop,
        sendMessage: noop,
        onUpdated: { addListener: noop, removeListener: noop },
        onRemoved: { addListener: noop }
      },
      identity: {
        getAuthToken(_opts, cb) { cb(null); },
        removeCachedAuthToken(_opts, cb) { cb(); }
      },
      notifications: {
        create(_id, _opts, cb) { if (cb) cb(); },
        clear: noop,
        onClicked: { addListener: noop }
      },
      downloads: {
        download(_opts, cb) { cb(1); }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: sourcePath });
  return context.__testExports;
}

test('parseICSHomework handles DTSTART parameters and folded descriptions', () => {
  const { parseICSHomework } = loadBackgroundExports();
  const items = parseICSHomework([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:20300105',
    'SUMMARY:Math homework',
    'DESCRIPTION:Read chapter 4',
    ' and finish exercises',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n'));

  assert.equal(items.length, 1);
  assert.equal(items[0].dueDate, '2030-01-05');
  assert.equal(items[0].subject, 'Math homework');
  assert.match(items[0].notes, /finish exercises/);
});

test('parseICSHomework classifies test-like entries', () => {
  const { parseICSHomework } = loadBackgroundExports();
  const items = parseICSHomework([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20300206T080000',
    'SUMMARY:Physics',
    'DESCRIPTION:Controle on electricity',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n'));

  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'test');
});

test('makeStudyPlan creates four review sessions for future tests', () => {
  const { makeStudyPlan } = loadBackgroundExports();
  const dueDate = addDaysISO(12);
  const plan = makeStudyPlan([
    { subject: 'Biology', dueDate, type: 'test', notes: 'Cell division' }
  ], {
    homework: { easy: 25, medium: 45, hard: 75 },
    test: { easy: 30, medium: 60, hard: 90 }
  }, 'en');

  assert.equal(plan.length, 4);
  assert.ok(plan.every((row) => row.date < dueDate));
  assert.deepEqual(Array.from(plan.map((row) => row.minutes)), [60, 60, 60, 60]);
});

test('toICS places review sessions before homework on the same day', () => {
  const { toICS } = loadBackgroundExports();
  const date = addDaysISO(8);
  const weekday = String(new Date(`${date}T00:00:00`).getDay());
  const text = toICS([
    { date, title: 'Homework Math', minutes: 30, notes: '' },
    { date, title: 'Review Biology', minutes: 30, notes: '' }
  ], {
    [weekday]: [{ start: '09:00', end: '12:00' }]
  });

  assert.ok(text.indexOf('SUMMARY:Review Biology') < text.indexOf('SUMMARY:Homework Math'));
});

test('toScheduledICS preserves explicit event start and end times', () => {
  const { toScheduledICS } = loadBackgroundExports();
  const text = toScheduledICS([
    {
      title: 'Manual study block',
      notes: 'Moved by drag/drop',
      minutes: 45,
      startDateTime: new Date(2030, 4, 1, 14, 30, 0),
      endDateTime: new Date(2030, 4, 1, 15, 15, 0),
      pronoteKey: 'manual-test'
    }
  ]);

  assert.match(text, /DTSTART:20300501T143000/);
  assert.match(text, /DTEND:20300501T151500/);
  assert.match(text, /SUMMARY:Manual study block/);
});

test('resolveReminderISO keeps no-year reminders on an upcoming date', () => {
  const { resolveReminderISO } = loadBackgroundExports();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const text = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}`;
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  assert.ok(resolveReminderISO({ dateText: text }) >= todayISO);
  assert.equal(resolveReminderISO({ dateText: '01/01', dueYear: 2031 }), '2031-01-01');
});

test('buildRecurringOccurrences respects skipWeeks before creating events', () => {
  const { buildRecurringOccurrences } = loadBackgroundExports();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const occurrences = buildRecurringOccurrences([
    { title: 'Gym', time: '18:30', days: [todayDay], duration: 45, skipWeeks: 1 }
  ], 16, 'en');

  assert.ok(occurrences.length >= 1);
  const firstDate = new Date(`${occurrences[0].date}T00:00:00`);
  assert.ok(firstDate.getTime() >= today.getTime() + 7 * 24 * 60 * 60 * 1000);
  assert.equal(occurrences[0].minutes, 45);
  assert.match(occurrences[0].pronoteKey, /^rec-/);
});

test('applyPlanOverrides separates stale overrides and keeps manual sessions explicit', () => {
  const { applyPlanOverrides } = loadBackgroundExports();
  const date = addDaysISO(4);
  const plan = [
    {
      id: `${date}|Math|hw|0|0`,
      date,
      title: 'Homework Math',
      notes: '',
      minutes: 30
    }
  ];

  const result = applyPlanOverrides(plan, {
    [plan[0].id]: { date, time: '20:15', minutes: 35, title: 'Moved Math' },
    stale: { date, time: '19:00', minutes: 20, title: 'Old item' }
  }, {
    [String(new Date(`${date}T00:00:00`).getDay())]: [{ start: '18:00', end: '21:00' }]
  }, 'en');

  assert.equal(result.staleOverrideIds.join(','), 'stale');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, 'Moved Math');
  assert.equal(result.events[0].minutes, 35);
  assert.match(String(result.events[0].startDateTime), /T20:15:00/);
});

test('calculatePriorityScore favors hard tests over easy homework', () => {
  const { calculatePriorityScore } = loadBackgroundExports();
  const dueSoon = addDaysISO(2);
  const hardTest = calculatePriorityScore({
    subject: 'Physics',
    dueDate: dueSoon,
    type: 'test',
    difficulty: 'hard',
    notes: 'Long chapter review with formulas and exercises.'
  });
  const easyHomework = calculatePriorityScore({
    subject: 'Art',
    dueDate: addDaysISO(14),
    type: 'homework',
    difficulty: 'easy',
    notes: 'Sketch.'
  });

  assert.ok(hardTest > easyHomework);
  assert.ok(hardTest >= 75);
});

test('schedulePlan places higher-priority sessions earlier in the same day', () => {
  const { schedulePlan } = loadBackgroundExports();
  const date = addDaysISO(6);
  const weekday = String(new Date(`${date}T00:00:00`).getDay());
  const scheduled = schedulePlan([
    { id: 'low', date, title: 'Homework Art', minutes: 30, priorityScore: 10 },
    { id: 'high', date, title: 'Review Physics', minutes: 30, priorityScore: 90 }
  ], {
    [weekday]: [{ start: '09:00', end: '11:00' }]
  });

  const first = scheduled[0];
  const second = scheduled[1];
  assert.equal(first.id, 'high');
  assert.equal(second.id, 'low');
  assert.match(String(first.startDateTime), /T09:00:00/);
});
