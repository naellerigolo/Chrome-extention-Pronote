// Item helpers: durations, due dates, difficulty, priority scoring, reminders.
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

function parseISODateLocal(iso) {
  const [y, m, d] = String(iso || '').split('-').map(v => parseInt(v, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function resolveItemDifficulty(item) {
  const text = String(item?.difficulty || '').toLowerCase();
  if (text === 'easy' || text === 'hard') return text;
  if (text.includes('epreuve') || text.includes('épreuve')) return 'hard';
  return 'medium';
}

function daysUntilDue(iso) {
  const due = parseISODateLocal(iso);
  if (!(due instanceof Date) || Number.isNaN(due.getTime())) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function calculateItemPriorityScore(item, sessionDate = '') {
  if (!item || item.isReminder) return 0;
  const kind = resolveItemKind(item);
  const diff = resolveItemDifficulty(item);
  const days = daysUntilDue(item.dueDate || sessionDate);
  let score = 10;
  if (kind === 'test') score += 40;
  if (diff === 'hard') score += 25;
  else if (diff === 'medium') score += 12;
  if (days <= 1) score += 35;
  else if (days <= 3) score += 26;
  else if (days <= 7) score += 16;
  else if (days <= 14) score += 8;
  const notesLen = String(item.notes || '').length;
  if (notesLen > 140) score += 8;
  else if (notesLen > 80) score += 4;
  const manual = parseInt(item.manualMinutes, 10);
  if (Number.isFinite(manual) && manual >= 75) score += 6;
  if (sessionDate && item.dueDate) {
    const due = parseISODateLocal(item.dueDate);
    const session = parseISODateLocal(sessionDate);
    if (due && session) {
      const spacing = Math.max(0, Math.round((due - session) / 86400000));
      if (spacing <= 1) score += 4;
    }
  }
  return Math.max(0, Math.min(99, score));
}

function priorityScoreOf(row) {
  const explicit = parseInt(row?.priorityScore, 10);
  if (Number.isFinite(explicit)) return explicit;
  return row && !row.isReminder ? calculateItemPriorityScore(row, row.dueDate || row.date || '') : 0;
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

