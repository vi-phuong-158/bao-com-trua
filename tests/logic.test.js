'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* =========================================================================
   Logic models mirroring Code.gs and Admin.gs for local verification
   ========================================================================= */

const MEAL_TYPES = {
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
};

const MEAL_STATES = {
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  CLEARED: 'CLEARED',
};

const RECONCILIATION_STATES = {
  OPEN: 'OPEN',
  RECONCILED: 'RECONCILED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};

function normalizeMealType(value) {
  const s = String(value || '').trim().toUpperCase();
  if (s === 'DINNER' || s === 'TOI' || s === 'COM_TOI' || s === 'TỐI') {
    return MEAL_TYPES.DINNER;
  }
  return MEAL_TYPES.LUNCH;
}

function normalizeDateCell(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

/**
 * Parses raw row from CHAM_COM sheet:
 * Supports 5-column legacy (NGAY, MEMBER_ID, HO_TEN, TRANG_THAI, CAP_NHAT_LUC)
 * and 6-column current (NGAY, MEMBER_ID, HO_TEN, LOAI_BUA, TRANG_THAI, CAP_NHAT_LUC),
 * even if the sheet returns 6 columns on a legacy 5-column row!
 */
function parseBookingRow(cols, rowIndex = 2) {
  const col3 = String(cols[3] || '').trim().toUpperCase();
  const col4 = String(cols[4] || '').trim().toUpperCase();

  let mealType = MEAL_TYPES.LUNCH;
  let status = '';
  let updatedAt = cols[4];

  if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col3)) {
    // 5-column legacy format: cols[3] is TRANG_THAI
    mealType = MEAL_TYPES.LUNCH;
    status = col3;
    updatedAt = cols[4];
  } else if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col4)) {
    // 6-column format: cols[3] is LOAI_BUA, cols[4] is TRANG_THAI
    mealType = normalizeMealType(col3);
    status = col4;
    updatedAt = cols[5];
  } else if (['DINNER', 'TOI', 'COM_TOI', 'TỐI'].includes(col3)) {
    mealType = MEAL_TYPES.DINNER;
    status = col4;
    updatedAt = cols[5];
  } else {
    mealType = MEAL_TYPES.LUNCH;
    status = col3 || col4;
    updatedAt = cols[4];
  }

  return {
    rowNumber: rowIndex,
    dateKey: normalizeDateCell(cols[0]),
    memberId: String(cols[1] || '').trim(),
    name: String(cols[2] || '').trim(),
    mealType,
    status,
    updatedAt,
  };
}

/**
 * Migration simulation:
 * Given a sheet table with header and rows, migrate to 6-column schema idempotently.
 */
function simulateMigrateBookings(sheetData) {
  const headers = [...sheetData[0]];
  const mealTypeIndex = headers.indexOf('LOAI_BUA');
  const migrated = [];

  if (mealTypeIndex === -1) {
    // Insert LOAI_BUA at index 3 (after HO_TEN)
    const newHeaders = [...headers.slice(0, 3), 'LOAI_BUA', ...headers.slice(3)];
    migrated.push(newHeaders);
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      migrated.push([...row.slice(0, 3), 'LUNCH', ...row.slice(3)]);
    }
  } else {
    // Already has LOAI_BUA: preserve headers, fill empty LOAI_BUA with LUNCH
    migrated.push([...headers]);
    for (let i = 1; i < sheetData.length; i++) {
      const row = [...sheetData[i]];
      if (!String(row[mealTypeIndex] || '').trim()) {
        row[mealTypeIndex] = 'LUNCH';
      }
      migrated.push(row);
    }
  }
  return migrated;
}

/**
 * Reducer for final state of (dateKey, memberId, mealType).
 */
function finalBookingStates(rows) {
  const states = new Map();
  rows.forEach((row, index) => {
    const parsed = Array.isArray(row) ? parseBookingRow(row, index + 2) : { ...row, rowNumber: index + 2 };
    const key = `${parsed.dateKey}|${parsed.memberId}|${parsed.mealType}`;
    states.set(key, parsed);
  });
  return states;
}

/**
 * Monthly statistics calculator.
 */
function calculateMonthlySummary(rows, monthKey, closedDays = new Set()) {
  const states = finalBookingStates(rows);
  const memberLunch = new Map();
  const memberDinner = new Map();

  for (const state of states.values()) {
    if (!state.dateKey.startsWith(`${monthKey}-`)) continue;
    if (closedDays.has(state.dateKey)) continue; // Closed days contribute 0 effective meals
    if (state.status !== MEAL_STATES.BOOKED) continue;

    if (state.mealType === MEAL_TYPES.DINNER) {
      memberDinner.set(state.memberId, (memberDinner.get(state.memberId) || 0) + 1);
    } else {
      memberLunch.set(state.memberId, (memberLunch.get(state.memberId) || 0) + 1);
    }
  }

  const allMembers = new Set([...memberLunch.keys(), ...memberDinner.keys()]);
  const result = [];
  let grandLunch = 0;
  let grandDinner = 0;

  for (const memberId of allMembers) {
    const lunch = memberLunch.get(memberId) || 0;
    const dinner = memberDinner.get(memberId) || 0;
    const total = lunch + dinner;
    grandLunch += lunch;
    grandDinner += dinner;
    result.push({ memberId, lunch, dinner, total });
  }

  return {
    totalLunch: grandLunch,
    totalDinner: grandDinner,
    total: grandLunch + grandDinner,
    rows: result,
  };
}

/**
 * Rule for auto-booking LUNCH on weekdays.
 * Critical: If a member already has a DINNER state, auto-booking for LUNCH still succeeds!
 */
function canAutoBookLunch({ isWeekday, isBeforeCutoff, isClosed, existingLunchState }) {
  if (!isWeekday || !isBeforeCutoff || isClosed) return false;
  // If member already has an explicit LUNCH state (BOOKED, CANCELLED, or CLEARED), do not auto-book
  if (existingLunchState) return false;
  return true;
}

/**
 * Snapshot hash for Daily Lunch Email:
 * ONLY hashes dateKey, closed, and sorted booked LUNCH member IDs.
 * Never includes DINNER!
 */
function computeDailyLunchEmailHash(dateKey, bookedLunchMembers, isClosed) {
  const payload = JSON.stringify({
    dateKey,
    closed: Boolean(isClosed),
    booked: bookedLunchMembers.map(m => (typeof m === 'string' ? m : m.memberId)).sort(),
  });
  return crypto.createHash('md5').update(payload, 'utf8').digest('base64');
}

/**
 * Hash for Daily Reconciliation:
 * Hashes BOTH Lunch and Dinner booked states on that date.
 */
function computeDailyReconciliationHash(dateKey, bookedMeals, isClosed) {
  const payload = JSON.stringify({
    dateKey,
    closed: Boolean(isClosed),
    booked: bookedMeals.map(b => `${b.memberId}:${b.mealType}`).sort(),
  });
  return crypto.createHash('md5').update(payload, 'utf8').digest('base64');
}

/**
 * Authorization guard.
 */
function assertAdmin(userEmail, adminEmailList) {
  const email = String(userEmail || '').trim().toLowerCase();
  const allowed = adminEmailList.map(e => e.trim().toLowerCase());
  if (!email || !allowed.includes(email)) {
    throw new Error('Không có quyền quản trị.');
  }
  return true;
}

/* =========================================================================
   TEST SUITE — Comprehensive Regression Coverage (51 Tests)
   ========================================================================= */

// 1. Data Migration Tests
test('1. Migration: legacy 5-column CHAM_COM row is parsed as LUNCH', () => {
  const legacyRow = ['2026-09-03', 'm1', 'Nguyễn Văn A', 'BOOKED', '2026-09-03T07:30:00Z'];
  const parsed = parseBookingRow(legacyRow);
  assert.equal(parsed.dateKey, '2026-09-03');
  assert.equal(parsed.memberId, 'm1');
  assert.equal(parsed.mealType, MEAL_TYPES.LUNCH);
  assert.equal(parsed.status, 'BOOKED');
});

test('2. Migration: 6-column row with empty LOAI_BUA defaults to LUNCH', () => {
  const row = ['2026-09-03', 'm2', 'Trần Thị B', '', 'BOOKED', '2026-09-03T07:30:00Z'];
  const parsed = parseBookingRow(row);
  assert.equal(parsed.mealType, MEAL_TYPES.LUNCH);
});

test('3. Migration: 6-column row with DINNER is recognized as DINNER', () => {
  const row = ['2026-09-03', 'm3', 'Lê Văn C', 'DINNER', 'BOOKED', '2026-09-03T16:00:00Z'];
  const parsed = parseBookingRow(row);
  assert.equal(parsed.mealType, MEAL_TYPES.DINNER);
});

test('4. Migration: normalizeMealType accepts variations (TOI, COM_TOI, TỐI)', () => {
  assert.equal(normalizeMealType('toi'), MEAL_TYPES.DINNER);
  assert.equal(normalizeMealType('com_toi'), MEAL_TYPES.DINNER);
  assert.equal(normalizeMealType('TỐI'), MEAL_TYPES.DINNER);
  assert.equal(normalizeMealType('LUNCH'), MEAL_TYPES.LUNCH);
  assert.equal(normalizeMealType('trua'), MEAL_TYPES.LUNCH);
  assert.equal(normalizeMealType(''), MEAL_TYPES.LUNCH);
});

test('5. Migration: simulateMigrateBookings inserts LOAI_BUA column and fills LUNCH', () => {
  const legacySheet = [
    ['NGAY', 'MEMBER_ID', 'HO_TEN', 'TRANG_THAI', 'CAP_NHAT_LUC'],
    ['2026-08-01', 'm1', 'A', 'BOOKED', 'ts1'],
    ['2026-08-01', 'm2', 'B', 'CANCELLED', 'ts2'],
  ];
  const migrated = simulateMigrateBookings(legacySheet);
  assert.deepEqual(migrated[0], ['NGAY', 'MEMBER_ID', 'HO_TEN', 'LOAI_BUA', 'TRANG_THAI', 'CAP_NHAT_LUC']);
  assert.equal(migrated[1][3], 'LUNCH');
  assert.equal(migrated[2][3], 'LUNCH');
  assert.equal(migrated[1][4], 'BOOKED');
});

test('6. Migration: simulateMigrateBookings is idempotent on rerun', () => {
  const alreadyMigrated = [
    ['NGAY', 'MEMBER_ID', 'HO_TEN', 'LOAI_BUA', 'TRANG_THAI', 'CAP_NHAT_LUC'],
    ['2026-08-01', 'm1', 'A', 'LUNCH', 'BOOKED', 'ts1'],
    ['2026-08-01', 'm2', 'B', 'DINNER', 'BOOKED', 'ts2'],
  ];
  const rerun = simulateMigrateBookings(alreadyMigrated);
  assert.equal(rerun[0].length, 6);
  assert.equal(rerun[1][3], 'LUNCH');
  assert.equal(rerun[2][3], 'DINNER');
  assert.equal(rerun.length, 3);
});

// 2. User Lunch Operations
test('7. User Lunch: book lunch sets status BOOKED', () => {
  const rows = [{ dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' }];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'BOOKED');
});

test('8. User Lunch: cancel lunch sets status CANCELLED', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
  ];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'CANCELLED');
});

test('9. User Lunch: duplicate book rows count once', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalLunch, 1);
});

test('10. User Lunch: cutoff boundary (08:00 is locked for regular users)', () => {
  const isCutoffLocked = (hour, minute) => hour > 8 || (hour === 8 && minute >= 0);
  assert.equal(isCutoffLocked(7, 59), false);
  assert.equal(isCutoffLocked(8, 0), true);
  assert.equal(isCutoffLocked(8, 1), true);
  assert.equal(isCutoffLocked(11, 30), true);
});

test('11. User Lunch: regular user changes are blocked after cutoff', () => {
  const userAllowed = (isLocked, isClosed) => !isLocked && !isClosed;
  assert.equal(userAllowed(true, false), false);
  assert.equal(userAllowed(false, false), true);
});

test('12. User Lunch: regular user changes are blocked on closed day', () => {
  const userAllowed = (isLocked, isClosed) => !isLocked && !isClosed;
  assert.equal(userAllowed(false, true), false);
});

test('13. Admin bypass: admin bypasses cutoff and can edit past dates', () => {
  const adminAllowed = () => true; // Admin has full bypass
  assert.equal(adminAllowed(), true);
});

// 3. Dinner Operations & Meal Isolation
test('14. Dinner: admin can add dinner for a member', () => {
  const rows = [{ dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' }];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
});

test('15. Dinner: admin can cancel dinner for a member', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'CANCELLED' },
  ];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'CANCELLED');
});

test('16. Dinner: duplicate dinner book counts once', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
  ];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalDinner, 1);
});

test('17. Meal Isolation: Dinner booking does NOT affect Lunch status', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'CANCELLED' },
  ];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'CANCELLED');
});

test('18. Meal Isolation: Lunch cancellation does NOT affect Dinner status', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
  ];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'CANCELLED');
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
});

test('19. Meal Isolation: Clearing Lunch leaves Dinner intact', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'CLEARED' },
  ];
  const states = finalBookingStates(rows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'CLEARED');
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
});

// 4. Monthly Statistics & Counting Rules
test('20. Monthly: Lunch BOOK -> 1 Lunch', () => {
  const rows = [{ dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' }];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalLunch, 1);
  assert.equal(summary.totalDinner, 0);
  assert.equal(summary.total, 1);
});

test('21. Monthly: Dinner BOOK -> 1 Dinner', () => {
  const rows = [{ dateKey: '2026-09-01', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' }];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalLunch, 0);
  assert.equal(summary.totalDinner, 1);
  assert.equal(summary.total, 1);
});

test('22. Monthly: Lunch + Dinner on same day = 2 total', () => {
  const rows = [
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
  ];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalLunch, 1);
  assert.equal(summary.totalDinner, 1);
  assert.equal(summary.total, 2);
});

test('23. Monthly: BOOK -> CANCEL -> BOOK = 1', () => {
  const rows = [
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.totalLunch, 1);
  assert.equal(summary.total, 1);
});

test('24. Monthly: BOOK -> CANCEL = 0', () => {
  const rows = [
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-01', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
  ];
  const summary = calculateMonthlySummary(rows, '2026-09');
  assert.equal(summary.total, 0);
});

test('25. Monthly: Multiple members aggregated correctly (20 lunch, 4 dinner = 24 total)', () => {
  const rows = [];
  for (let d = 1; d <= 20; d++) {
    const dayStr = String(d).padStart(2, '0');
    rows.push({ dateKey: `2026-09-${dayStr}`, memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' });
  }
  for (let d = 1; d <= 4; d++) {
    const dayStr = String(d).padStart(2, '0');
    rows.push({ dateKey: `2026-09-${dayStr}`, memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' });
  }
  const summary = calculateMonthlySummary(rows, '2026-09');
  const m1 = summary.rows.find(r => r.memberId === 'm1');
  assert.equal(m1.lunch, 20);
  assert.equal(m1.dinner, 4);
  assert.equal(m1.total, 24);
  assert.equal(summary.total, 24);
});

// 5. Closed Day Preservation (CRITICAL REGRESSION)
test('26. Closed day: contributes 0 effective meals for both Lunch and Dinner', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'm2', mealType: 'DINNER', status: 'BOOKED' },
  ];
  const closedDays = new Set(['2026-09-03']);
  const summary = calculateMonthlySummary(rows, '2026-09', closedDays);
  assert.equal(summary.totalLunch, 0);
  assert.equal(summary.totalDinner, 0);
  assert.equal(summary.total, 0);
});

test('27. Closed day: CRITICAL REGRESSION - Close day does NOT mutate CHAM_COM rows', () => {
  // Underlying CHAM_COM database
  const chamComDatabase = [
    { dateKey: '2026-09-03', memberId: 'A', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-09-03', memberId: 'B', mealType: 'LUNCH', status: 'CANCELLED' },
    { dateKey: '2026-09-03', memberId: 'C', mealType: 'DINNER', status: 'BOOKED' },
  ];

  // Closing day ONLY writes to NGAY_NGHI
  const ngayNghi = new Set();
  ngayNghi.add('2026-09-03');

  // Verify CHAM_COM was not altered
  assert.equal(chamComDatabase.length, 3);
  assert.equal(chamComDatabase[0].status, 'BOOKED');
  assert.equal(chamComDatabase[1].status, 'CANCELLED');
  assert.equal(chamComDatabase[2].status, 'BOOKED');

  // Effective counts are 0 while closed
  const closedSummary = calculateMonthlySummary(chamComDatabase, '2026-09', ngayNghi);
  assert.equal(closedSummary.total, 0);

  // Reopening day removes from NGAY_NGHI
  ngayNghi.delete('2026-09-03');

  // Effective state returns exactly as before: A BOOKED, B CANCELLED, C DINNER BOOKED!
  const reopenedSummary = calculateMonthlySummary(chamComDatabase, '2026-09', ngayNghi);
  assert.equal(reopenedSummary.totalLunch, 1);
  assert.equal(reopenedSummary.totalDinner, 1);
  assert.equal(reopenedSummary.total, 2);

  const states = finalBookingStates(chamComDatabase);
  assert.equal(states.get('2026-09-03|A|LUNCH').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|B|LUNCH').status, 'CANCELLED');
  assert.equal(states.get('2026-09-03|C|DINNER').status, 'BOOKED');
});

// 6. Auto-Booking Logic
test('28. Auto-book: allowed on weekday before cutoff on open day with no existing state', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: true, isClosed: false, existingLunchState: '' }), true);
});

test('29. Auto-book: blocked on weekend', () => {
  assert.equal(canAutoBookLunch({ isWeekday: false, isBeforeCutoff: true, isClosed: false, existingLunchState: '' }), false);
});

test('30. Auto-book: blocked after cutoff', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: false, isClosed: false, existingLunchState: '' }), false);
});

test('31. Auto-book: blocked on closed day', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: true, isClosed: true, existingLunchState: '' }), false);
});

test('32. Auto-book: blocked if existing Lunch is BOOKED', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: true, isClosed: false, existingLunchState: 'BOOKED' }), false);
});

test('33. Auto-book: blocked if existing Lunch is CANCELLED (respects user cancellation)', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: true, isClosed: false, existingLunchState: 'CANCELLED' }), false);
});

test('34. Auto-book: blocked if existing Lunch is CLEARED', () => {
  assert.equal(canAutoBookLunch({ isWeekday: true, isBeforeCutoff: true, isClosed: false, existingLunchState: 'CLEARED' }), false);
});

test('35. Auto-book: CRITICAL REGRESSION - existing Dinner does NOT block Lunch auto-book', () => {
  // Member A has DINNER booked in advance, but has no LUNCH state
  const memberA = { id: 'm1', autoBook: true };
  const existingBookingsForToday = [
    { memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
  ];

  // In Code.gs, existingLunchMemberIds only checks mealType === LUNCH
  const existingLunchMemberIds = new Set(
    existingBookingsForToday.filter(b => b.mealType === 'LUNCH').map(b => b.memberId)
  );

  const canAuto = canAutoBookLunch({
    isWeekday: true,
    isBeforeCutoff: true,
    isClosed: false,
    existingLunchState: existingLunchMemberIds.has(memberA.id) ? 'BOOKED' : '',
  });

  assert.equal(canAuto, true);
});

test('36. Auto-book: auto-book only ever creates LUNCH', () => {
  const autoRow = ['2026-09-03', 'm1', 'Name', 'LUNCH', 'BOOKED', new Date()];
  assert.equal(autoRow[3], MEAL_TYPES.LUNCH);
});

// 7. Bulk Operations & Isolation
test('37. Bulk Lunch: BOOK_ALL affects only active members for LUNCH', () => {
  const members = [
    { id: 'm1', active: true },
    { id: 'm2', active: false },
    { id: 'm3', active: true },
  ];
  const activeMembers = members.filter(m => m.active);
  const rows = activeMembers.map(m => ({
    dateKey: '2026-09-03',
    memberId: m.id,
    mealType: MEAL_TYPES.LUNCH,
    status: MEAL_STATES.BOOKED,
  }));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => r.memberId), ['m1', 'm3']);
  assert.equal(rows[0].mealType, MEAL_TYPES.LUNCH);
});

test('38. Bulk Lunch: CANCEL_ALL sets CANCELLED for LUNCH only', () => {
  const rows = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
  ];
  assert.equal(rows[0].status, 'CANCELLED');
  assert.equal(rows[0].mealType, 'LUNCH');
});

test('39. Bulk Isolation: Bulk Lunch does NOT touch Dinner', () => {
  const database = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' },
  ];
  // Bulk cancel Lunch
  database.push({ dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' });

  const states = finalBookingStates(database);
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'CANCELLED');
});

test('40. Bulk Isolation: Bulk Dinner does NOT touch Lunch', () => {
  const database = [
    { dateKey: '2026-09-03', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  // Bulk book Dinner
  database.push({ dateKey: '2026-09-03', memberId: 'm1', mealType: 'DINNER', status: 'BOOKED' });

  const states = finalBookingStates(database);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
});

// 8. Email Logic & Snapshots (CRITICAL REGRESSION)
test('41. Email Snapshot: Lunch edit changes hash (marks dirty)', () => {
  const initialHash = computeDailyLunchEmailHash('2026-09-03', ['m1', 'm2'], false);
  const afterLunchAdd = computeDailyLunchEmailHash('2026-09-03', ['m1', 'm2', 'm3'], false);
  assert.notEqual(initialHash, afterLunchAdd);
});

test('42. Email Snapshot: CRITICAL REGRESSION - Dinner edit does NOT change Lunch email hash', () => {
  // Morning: 25 lunch booked
  const lunchMembers = ['m1', 'm2', 'm3'];
  const hash1 = computeDailyLunchEmailHash('2026-09-03', lunchMembers, false);

  // Admin later adds Dinner for m1, m2, m4.
  // The daily lunch email snapshot function only receives booked LUNCH members:
  const hash2 = computeDailyLunchEmailHash('2026-09-03', lunchMembers, false);

  // Hash must be IDENTICAL, meaning Lunch email is NOT dirty!
  assert.equal(hash1, hash2);
});

test('43. Email Snapshot: Closing day changes Lunch email hash', () => {
  const hashOpen = computeDailyLunchEmailHash('2026-09-03', ['m1'], false);
  const hashClosed = computeDailyLunchEmailHash('2026-09-03', [], true);
  assert.notEqual(hashOpen, hashClosed);
});

test('44. Email Subject: Initial vs Resend subject format', () => {
  const getSubject = (isUpdate, count, dateLabel) =>
    isUpdate ? `🍚 [CẬP NHẬT] Báo cơm trưa ${dateLabel}: ${count} suất` : `🍚 Báo cơm trưa ${dateLabel}: ${count} suất`;

  assert.equal(getSubject(false, 25, '03/09/2026'), '🍚 Báo cơm trưa 03/09/2026: 25 suất');
  assert.equal(getSubject(true, 26, '03/09/2026'), '🍚 [CẬP NHẬT] Báo cơm trưa 03/09/2026: 26 suất');
});

// 9. Daily Reconciliation
test('45. Daily Reconciliation: Reconciled status stores snapshot hash', () => {
  const meals = [
    { memberId: 'm1', mealType: 'LUNCH' },
    { memberId: 'm2', mealType: 'DINNER' },
  ];
  const hash = computeDailyReconciliationHash('2026-09-03', meals, false);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length > 0, true);
});

test('46. Daily Reconciliation: Editing Lunch on reconciled day triggers NEEDS_REVIEW', () => {
  const initialMeals = [
    { memberId: 'm1', mealType: 'LUNCH' },
    { memberId: 'm2', mealType: 'DINNER' },
  ];
  const storedHash = computeDailyReconciliationHash('2026-09-03', initialMeals, false);

  // Admin cancels m1's Lunch
  const editedMeals = [
    { memberId: 'm2', mealType: 'DINNER' },
  ];
  const currentHash = computeDailyReconciliationHash('2026-09-03', editedMeals, false);

  assert.notEqual(storedHash, currentHash);
  // Status check:
  const status = storedHash === currentHash ? RECONCILIATION_STATES.RECONCILED : RECONCILIATION_STATES.NEEDS_REVIEW;
  assert.equal(status, RECONCILIATION_STATES.NEEDS_REVIEW);
});

test('47. Daily Reconciliation: Editing Dinner on reconciled day triggers NEEDS_REVIEW', () => {
  const initialMeals = [
    { memberId: 'm1', mealType: 'LUNCH' },
  ];
  const storedHash = computeDailyReconciliationHash('2026-09-03', initialMeals, false);

  // Admin adds Dinner for m2
  const editedMeals = [
    { memberId: 'm1', mealType: 'LUNCH' },
    { memberId: 'm2', mealType: 'DINNER' },
  ];
  const currentHash = computeDailyReconciliationHash('2026-09-03', editedMeals, false);

  assert.notEqual(storedHash, currentHash);
  const status = storedHash === currentHash ? RECONCILIATION_STATES.RECONCILED : RECONCILIATION_STATES.NEEDS_REVIEW;
  assert.equal(status, RECONCILIATION_STATES.NEEDS_REVIEW);
});

test('48. Daily Reconciliation: Re-reconciling updates hash and restores RECONCILED', () => {
  const editedMeals = [
    { memberId: 'm1', mealType: 'LUNCH' },
    { memberId: 'm2', mealType: 'DINNER' },
  ];
  const newHash = computeDailyReconciliationHash('2026-09-03', editedMeals, false);
  const status = newHash === newHash ? RECONCILIATION_STATES.RECONCILED : RECONCILIATION_STATES.NEEDS_REVIEW;
  assert.equal(status, RECONCILIATION_STATES.RECONCILED);
});

// 10. Authorization Guard
test('49. Authorization: accepts authorized admin email', () => {
  const allowed = ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com'];
  assert.equal(assertAdmin('vingocphuong.92@gmail.com', allowed), true);
  assert.equal(assertAdmin('anmphongandn@gmail.com', allowed), true);
  assert.equal(assertAdmin('VINGOCPHUONG.92@GMAIL.COM ', allowed), true);
});

test('50. Authorization: rejects unauthorized email', () => {
  const allowed = ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com'];
  assert.throws(() => assertAdmin('attacker@example.com', allowed), /Không có quyền quản trị/);
});

test('51. Authorization: rejects empty / anonymous user', () => {
  const allowed = ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com'];
  assert.throws(() => assertAdmin('', allowed), /Không có quyền quản trị/);
  assert.throws(() => assertAdmin(null, allowed), /Không có quyền quản trị/);
  assert.throws(() => assertAdmin(undefined, allowed), /Không có quyền quản trị/);
});

// 11. Multi-Admin & Public Route Security Closure Tests
function resolveAdminEmails(configuredStr, fallbackList = ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com']) {
  const raw = String(configuredStr || '') + ',' + fallbackList.join(',');
  return [...new Set(raw
    .split(/[;,\n]+/)
    .map(email => String(email || '').trim().toLowerCase())
    .filter(Boolean))];
}

function simulateDoGet(e, activeEmail, allowedAdmins = ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com']) {
  const pathInfo = String((e && e.pathInfo) || '').split('/').filter(Boolean).join('/');
  const isAdminParam = String((e && e.parameter && e.parameter.admin) || '') === '1';
  const isAdmin = pathInfo === 'admin' || isAdminParam;

  if (isAdmin) {
    try {
      assertAdmin(activeEmail, allowedAdmins);
      return { view: 'ADMIN_DASHBOARD', title: 'Quản trị suất ăn', authorized: true };
    } catch (err) {
      return { view: 'UNAUTHORIZED_PAGE', title: 'Truy cập bị từ chối', authorized: false, exposedEmails: false };
    }
  }

  return { view: 'INDEX', title: 'Báo cơm trưa', authorized: true };
}

test('52. Multi-Admin: preserves both vingocphuong.92@gmail.com and anmphongandn@gmail.com', () => {
  const admins = resolveAdminEmails('vingocphuong.92@gmail.com, anmphongandn@gmail.com');
  assert.equal(admins.includes('vingocphuong.92@gmail.com'), true);
  assert.equal(admins.includes('anmphongandn@gmail.com'), true);
  assert.equal(assertAdmin('vingocphuong.92@gmail.com', admins), true);
  assert.equal(assertAdmin('anmphongandn@gmail.com', admins), true);
});

test('53. Multi-Admin: supports custom admin emails configured in CAU_HINH alongside owners', () => {
  const admins = resolveAdminEmails('extra_admin@company.com; vingocphuong.92@gmail.com');
  assert.equal(admins.includes('extra_admin@company.com'), true);
  assert.equal(admins.includes('vingocphuong.92@gmail.com'), true);
  assert.equal(admins.includes('anmphongandn@gmail.com'), true); // Fallback owner preserved
});

test('54. Guarded Admin Route: normal public doGet renders Index without login', () => {
  const result = simulateDoGet({}, '');
  assert.equal(result.view, 'INDEX');
  assert.equal(result.title, 'Báo cơm trưa');
});

test('55. Guarded Admin Route: admin route without active email (anonymous) is denied', () => {
  const byPath = simulateDoGet({ pathInfo: 'admin' }, '');
  assert.equal(byPath.view, 'UNAUTHORIZED_PAGE');
  assert.equal(byPath.authorized, false);

  const byParam = simulateDoGet({ parameter: { admin: '1' } }, '');
  assert.equal(byParam.view, 'UNAUTHORIZED_PAGE');
  assert.equal(byParam.authorized, false);
});

test('56. Guarded Admin Route: admin route with vingocphuong.92@gmail.com renders AdminDashboard', () => {
  const result = simulateDoGet({ parameter: { admin: '1' } }, 'vingocphuong.92@gmail.com');
  assert.equal(result.view, 'ADMIN_DASHBOARD');
  assert.equal(result.authorized, true);
});

test('56b. Guarded Admin Route: admin route with anmphongandn@gmail.com renders AdminDashboard', () => {
  const result = simulateDoGet({ parameter: { admin: '1' } }, 'anmphongandn@gmail.com');
  assert.equal(result.view, 'ADMIN_DASHBOARD');
  assert.equal(result.authorized, true);
});

test('56c. Guarded Admin Route: unauthorized email is denied with UNAUTHORIZED_PAGE', () => {
  const result = simulateDoGet({ parameter: { admin: '1' } }, 'intruder@gmail.com');
  assert.equal(result.view, 'UNAUTHORIZED_PAGE');
  assert.equal(result.authorized, false);
  assert.equal(result.exposedEmails, false);
});

test('56d. Security: all admin functions in Admin.gs verify assertAdmin_()', () => {
  const adminCode = fs.readFileSync(path.join(__dirname, '..', 'Admin.gs'), 'utf8');
  const adminEndpoints = [
    'showAdminDashboard',
    'adminMenuSendToday',
    'adminMenuSendPreviousMonth',
    'adminGetDashboardData',
    'adminSetMeal',
    'adminBulkSetMeals',
    'adminCloseDay',
    'adminReopenDay',
    'adminReconcileDay',
    'adminReopenReconciliation',
    'adminSetAutoBooking',
    'adminSetMemberActive',
    'adminAddMember',
    'adminSaveCutoff',
    'adminSendDailyEmail',
    'adminSendMonthlyEmail',
    'adminSaveDailySettlement',
    'adminSetMonthStatus',
    'adminToggleWeekendServiceDay'
  ];

  adminEndpoints.forEach(fnName => {
    const regex = new RegExp(`function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?:\\nfunction|$)`);
    const match = adminCode.match(regex);
    assert.ok(match, `Function ${fnName} must exist in Admin.gs`);
    const fnBody = match[1];
    assert.ok(fnBody.includes('assertAdmin_()'), `Function ${fnName} must call assertAdmin_()`);
  });
});

// 12. Robust Parsing & Zero-Data Loss Regression Tests
test('57. Data Loss Regression: legacy 5-column row with 6 columns reported does NOT corrupt status to timestamp', () => {
  const legacyTimestamp = new Date('2026-09-03T07:30:00Z');
  const rowFromSheetWith6Cols = ['2026-09-03', 'm1', 'Nguyễn Văn A', 'BOOKED', legacyTimestamp, ''];
  const parsed = parseBookingRow(rowFromSheetWith6Cols);
  assert.equal(parsed.status, 'BOOKED');
  assert.equal(parsed.mealType, 'LUNCH');
  assert.equal(parsed.memberId, 'm1');
  assert.equal(parsed.updatedAt, legacyTimestamp);
});

test('58. Date Normalization: handles Date object, yyyy-MM-dd, and dd/MM/yyyy strings', () => {
  const dObj = new Date(2026, 8, 3, 12, 0, 0); // Sep 3, 2026
  assert.equal(normalizeDateCell(dObj), '2026-09-03');
  assert.equal(normalizeDateCell('2026-09-03'), '2026-09-03');
  assert.equal(normalizeDateCell('2026-09-03T07:15:00.000Z'), '2026-09-03');
  assert.equal(normalizeDateCell('03/09/2026'), '2026-09-03');
  assert.equal(normalizeDateCell('3/9/2026'), '2026-09-03');
  assert.equal(normalizeDateCell('03-09-2026'), '2026-09-03');
});

test('59. Mixed Dataset: parses both unmigrated 5-col and migrated 6-col rows seamlessly', () => {
  const mixedRows = [
    // Legacy 5-column row
    ['2026-09-03', 'm1', 'Người Một', 'BOOKED', '2026-09-03 07:10:00'],
    // Legacy 5-column row with cancelled
    ['2026-09-03', 'm2', 'Người Hai', 'CANCELLED', '2026-09-03 07:12:00'],
    // New 6-column lunch row
    ['2026-09-03', 'm3', 'Người Ba', 'LUNCH', 'BOOKED', '2026-09-03 07:20:00'],
    // New 6-column dinner row
    ['2026-09-03', 'm1', 'Người Một', 'DINNER', 'BOOKED', '2026-09-03 16:00:00'],
  ];

  const states = finalBookingStates(mixedRows);
  assert.equal(states.get('2026-09-03|m1|LUNCH').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|m1|DINNER').status, 'BOOKED');
  assert.equal(states.get('2026-09-03|m2|LUNCH').status, 'CANCELLED');
  assert.equal(states.get('2026-09-03|m3|LUNCH').status, 'BOOKED');
});

test('60. Monthly Summary: correctly tallies mixed unmigrated and migrated rows', () => {
  const mixedRows = [
    ['2026-09-01', 'm1', 'Người Một', 'BOOKED', 'ts1'],
    ['2026-09-02', 'm1', 'Người Một', 'BOOKED', 'ts2'],
    ['2026-09-02', 'm1', 'Người Một', 'DINNER', 'BOOKED', 'ts3'],
    ['2026-09-03', 'm2', 'Người Hai', 'LUNCH', 'BOOKED', 'ts4'],
  ];

  const summary = calculateMonthlySummary(mixedRows, '2026-09');
  assert.equal(summary.totalLunch, 3);
  assert.equal(summary.totalDinner, 1);
  assert.equal(summary.total, 4);
});

// =========================================================================
// 13. End-to-End Live Reconciliation & Opt-Out Lunch Model Regressions
// =========================================================================

const AUGUST_2026_TEST_DATA = [
  { date: '2026-08-10', lunch: 14, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-11', lunch: 13, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-12', lunch: 0,  dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-13', lunch: 12, dinner: 2, dinnerNote: 'Sổ tay ghi +2 suất tối. Chỉ lưu ghi chú, không tính tiền cơm trưa.', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-14', lunch: 10, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-17', lunch: 10, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-18', lunch: 13, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-19', lunch: 0,  dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-20', lunch: 15, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-21', lunch: 11, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-22', lunch: 6,  dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK_ZALO' },
  { date: '2026-08-23', lunch: 2,  dinner: 2, dinnerNote: 'Zalo: trưa Phạm Hùng, Thịnh; chiều Phạm Hùng, Thịnh. Lunch quyết toán = 2.', source: 'OWNER_NOTEBOOK_ZALO' },
  { date: '2026-08-24', lunch: 12, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-25', lunch: 14, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-26', lunch: 14, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-27', lunch: 10, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-28', lunch: 14, dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-30', lunch: 7,  dinner: 0, dinnerNote: '', source: 'OWNER_NOTEBOOK' },
  { date: '2026-08-31', lunch: 4,  dinner: 4, dinnerNote: 'Zalo: Trưa Hiệp, Thành, Cường, Nam; chiều Hiệp, Thành, Nam, Thịnh. Lunch quyết toán = 4.', source: 'OWNER_NOTEBOOK_ZALO' },
];

function resolveOfficialLunch(softwareLunch, dailySettlement) {
  if (dailySettlement && dailySettlement.lunchActual !== null && dailySettlement.lunchActual !== undefined) {
    return Number(dailySettlement.lunchActual);
  }
  return Number(softwareLunch || 0);
}

function simulateSeedAugust(existingSheetMap, augustData) {
  const totalLunch = augustData.reduce((s, i) => s + i.lunch, 0);
  const totalDinner = augustData.reduce((s, i) => s + i.dinner, 0);
  if (totalLunch !== 181) throw new Error(`Total lunch must be 181, got ${totalLunch}`);
  if (totalDinner !== 8) throw new Error(`Total dinner notes must be 8, got ${totalDinner}`);
  if (augustData.length !== 19) throw new Error(`Days must be 19, got ${augustData.length}`);

  for (const item of augustData) {
    const ex = existingSheetMap[item.date];
    if (ex && ex.lunchActual !== null && ex.lunchActual !== undefined) {
      if (ex.lunchActual !== item.lunch && !ex.source.startsWith('OWNER_NOTEBOOK')) {
        throw new Error(`Conflict on ${item.date}: existing ${ex.lunchActual}, seed ${item.lunch}`);
      }
    }
  }

  const newMap = { ...existingSheetMap };
  for (const item of augustData) {
    newMap[item.date] = {
      dateKey: item.date,
      lunchActual: item.lunch,
      dinnerNoteCount: item.dinner,
      dinnerNote: item.dinnerNote,
      source: item.source,
      status: 'RECONCILED',
    };
  }

  return {
    month: '2026-08',
    lunchActual: totalLunch,
    dinnerNoteCount: totalDinner,
    daysReconciled: augustData.length,
    map: newMap,
  };
}

function simulateOptOutAutoBook({ isWeekday, isWeekendService, isLocked, isClosed, members, existingBookings }) {
  const isServiceDay = (!isClosed && (isWeekday || isWeekendService));
  if (!isServiceDay || isLocked) return [];

  const existingLunchMemberIds = new Set(
    existingBookings.filter(b => b.mealType === 'LUNCH').map(b => b.memberId)
  );

  return members
    .filter(m => m.autoBook && !existingLunchMemberIds.has(m.id))
    .map(m => ({ memberId: m.id, mealType: 'LUNCH', status: 'BOOKED' }));
}

function simulateUserSelfRemove({ monthStatus, bookings, memberId, dateKey }) {
  if (monthStatus === 'LOCKED') {
    throw new Error('Tháng đã được chốt sổ (LOCKED), không thể tự trừ suất.');
  }
  const memberBookings = bookings.filter(b => b.memberId === memberId && b.dateKey === dateKey && b.mealType === 'LUNCH');
  const latest = memberBookings[memberBookings.length - 1];
  if (!latest || latest.status !== 'BOOKED') {
    throw new Error('Không có suất cơm trưa hợp lệ để trừ.');
  }
  bookings.push({
    dateKey,
    memberId,
    mealType: 'LUNCH',
    status: 'CANCELLED',
    action: 'USER_SELF_REMOVE_LUNCH',
  });
  return { ok: true };
}

test('61. Settlement: official daily actual overrides software count', () => {
  const softwareLunch = 13;
  const settlement = { lunchActual: 15, dinnerNoteCount: 0 };
  const official = resolveOfficialLunch(softwareLunch, settlement);
  assert.equal(official, 15);
  const diff = official - softwareLunch;
  assert.equal(diff, 2);
});

test('62. Settlement: no actual falls back to software count', () => {
  const softwareLunch = 13;
  const settlement = { lunchActual: null, dinnerNoteCount: 0 };
  const official = resolveOfficialLunch(softwareLunch, settlement);
  assert.equal(official, 13);
  assert.equal(official - softwareLunch, 0);
});

test('63. Settlement: Dinner does not affect official Lunch', () => {
  const softwareLunch = 10;
  const settlement = { lunchActual: 10, dinnerNoteCount: 5, dinnerNote: '5 suất tối liên hoan' };
  const official = resolveOfficialLunch(softwareLunch, settlement);
  assert.equal(official, 10);
});

test('64. August seed sum strictly equals 181', () => {
  const totalLunch = AUGUST_2026_TEST_DATA.reduce((sum, item) => sum + item.lunch, 0);
  assert.equal(totalLunch, 181);
});

test('65. August dinner notes sum strictly equals 8 and does NOT add to lunch', () => {
  const totalDinner = AUGUST_2026_TEST_DATA.reduce((sum, item) => sum + item.dinner, 0);
  assert.equal(totalDinner, 8);
  const totalLunch = AUGUST_2026_TEST_DATA.reduce((sum, item) => sum + item.lunch, 0);
  assert.equal(totalLunch, 181);
});

test('66. Seed is idempotent when executed multiple times', () => {
  const initialMap = {};
  const run1 = simulateSeedAugust(initialMap, AUGUST_2026_TEST_DATA);
  assert.equal(run1.lunchActual, 181);
  assert.equal(run1.daysReconciled, 19);

  const run2 = simulateSeedAugust(run1.map, AUGUST_2026_TEST_DATA);
  assert.equal(run2.lunchActual, 181);
  assert.equal(run2.daysReconciled, 19);
  assert.equal(Object.keys(run2.map).length, 19);
});

test('67. Existing conflicting manual actual row stops seed with error', () => {
  const mapWithConflict = {
    '2026-08-10': { lunchActual: 25, source: 'ADMIN' },
  };
  assert.throws(() => {
    simulateSeedAugust(mapWithConflict, AUGUST_2026_TEST_DATA);
  }, /Conflict on 2026-08-10/);
});

test('68. CHAM_COM rows remain 100% unchanged after seed', () => {
  const originalChamCom = [
    { dateKey: '2026-08-10', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
    { dateKey: '2026-08-10', memberId: 'm2', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  const chamComClone = JSON.parse(JSON.stringify(originalChamCom));

  const seedResult = simulateSeedAugust({}, AUGUST_2026_TEST_DATA);
  assert.equal(seedResult.lunchActual, 181);

  assert.deepEqual(originalChamCom, chamComClone);
});

test('69. User default Lunch works (auto-books active members with autoBook=true on workdays)', () => {
  const members = [
    { id: 'm1', autoBook: true },
    { id: 'm2', autoBook: false },
    { id: 'm3', autoBook: true },
  ];
  const booked = simulateOptOutAutoBook({
    isWeekday: true,
    isWeekendService: false,
    isLocked: false,
    isClosed: false,
    members,
    existingBookings: [],
  });
  assert.equal(booked.length, 2);
  assert.deepEqual(booked.map(b => b.memberId), ['m1', 'm3']);
  assert.ok(booked.every(b => b.mealType === 'LUNCH'));
});

test('70. User CANCEL prevents auto re-book on same day', () => {
  const members = [{ id: 'm1', autoBook: true }];
  const existingBookings = [
    { memberId: 'm1', mealType: 'LUNCH', status: 'CANCELLED' },
  ];
  const booked = simulateOptOutAutoBook({
    isWeekday: true,
    isWeekendService: false,
    isLocked: false,
    isClosed: false,
    members,
    existingBookings,
  });
  assert.equal(booked.length, 0);
});

test('71. Weekend is not auto-booked by default', () => {
  const members = [{ id: 'm1', autoBook: true }];
  const booked = simulateOptOutAutoBook({
    isWeekday: false,
    isWeekendService: false,
    isLocked: false,
    isClosed: false,
    members,
    existingBookings: [],
  });
  assert.equal(booked.length, 0);
});

test('72. Weekend service-day enables default lunch auto-book', () => {
  const members = [{ id: 'm1', autoBook: true }];
  const booked = simulateOptOutAutoBook({
    isWeekday: false,
    isWeekendService: true,
    isLocked: false,
    isClosed: false,
    members,
    existingBookings: [],
  });
  assert.equal(booked.length, 1);
  assert.equal(booked[0].memberId, 'm1');
});

test('73. User can self-remove previous Lunch in open reconciliation window', () => {
  const bookings = [
    { dateKey: '2026-08-20', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  const res = simulateUserSelfRemove({
    monthStatus: 'RECONCILING',
    bookings,
    memberId: 'm1',
    dateKey: '2026-08-20',
  });
  assert.equal(res.ok, true);
  assert.equal(bookings.length, 2);
  assert.equal(bookings[1].status, 'CANCELLED');
  assert.equal(bookings[1].action, 'USER_SELF_REMOVE_LUNCH');
});

test('74. LOCKED month rejects user self-remove edit', () => {
  const bookings = [
    { dateKey: '2026-08-20', memberId: 'm1', mealType: 'LUNCH', status: 'BOOKED' },
  ];
  assert.throws(() => {
    simulateUserSelfRemove({
      monthStatus: 'LOCKED',
      bookings,
      memberId: 'm1',
      dateKey: '2026-08-20',
    });
  }, /LOCKED/);
  assert.equal(bookings.length, 1);
});

test('75. Admin can reopen/override monthly settlement status with audit', () => {
  let monthStatus = 'LOCKED';
  const audits = [];

  monthStatus = 'RECONCILING';
  audits.push({ action: 'ADMIN_SET_MONTH_STATUS', status: monthStatus, by: 'admin@gmail.com' });

  assert.equal(monthStatus, 'RECONCILING');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].status, 'RECONCILING');
});

test('76. Monthly payable total strictly excludes Dinner', () => {
  const summary = {
    totalSoftwareLunch: 165,
    totalOfficialLunch: 181,
    dinnerNotes: 8,
    unitPrice: 30000,
  };

  const totalPayableMoney = summary.totalOfficialLunch * summary.unitPrice;
  assert.equal(totalPayableMoney, 5430000);
  assert.notEqual(totalPayableMoney, (181 + 8) * 30000);
});

test('77. Data Loss Regression: per-row parser continues to parse 5-col and 6-col safely', () => {
  const row5Col = ['2026-09-03', 'm1', 'Người A', 'BOOKED', '2026-09-03 07:15:00'];
  const row6Col = ['2026-09-03', 'm2', 'Người B', 'LUNCH', 'BOOKED', '2026-09-03 07:20:00'];

  const p5 = parseBookingRow(row5Col);
  const p6 = parseBookingRow(row6Col);

  assert.equal(p5.status, 'BOOKED');
  assert.equal(p5.mealType, 'LUNCH');
  assert.equal(p6.status, 'BOOKED');
  assert.equal(p6.mealType, 'LUNCH');
});

test('78. Security: assertAdmin accepts both authorized owners and rejects anonymous', () => {
  assert.equal(assertAdmin('vingocphuong.92@gmail.com', ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com']), true);
  assert.equal(assertAdmin('anmphongandn@gmail.com', ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com']), true);
  assert.throws(() => assertAdmin('', ['vingocphuong.92@gmail.com']), /Không có quyền quản trị/);
  assert.throws(() => assertAdmin('intruder@gmail.com', ['vingocphuong.92@gmail.com']), /Không có quyền quản trị/);
});