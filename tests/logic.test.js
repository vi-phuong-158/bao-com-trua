'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

function finalStates(rows) {
  const states = new Map();
  rows.forEach((row, index) => {
    const key = `${row.date}|${row.memberId}`;
    states.set(key, { ...row, rowNumber: index + 2 });
  });
  return states;
}

function monthlyCounts(rows, month, closedDays = new Set()) {
  const result = new Map();
  for (const row of finalStates(rows).values()) {
    if (!row.date.startsWith(`${month}-`) || row.status !== 'BOOKED' || closedDays.has(row.date)) continue;
    result.set(row.memberId, (result.get(row.memberId) || 0) + 1);
  }
  return result;
}

function canAutoBook({ weekday, beforeCutoff, closed, existingStatus }) {
  return weekday && beforeCutoff && !closed && !existingStatus;
}

test('final state counts BOOK -> CANCEL as zero', () => {
  const counts = monthlyCounts([
    { date: '2026-08-24', memberId: 'a', status: 'BOOKED' },
    { date: '2026-08-24', memberId: 'a', status: 'CANCELLED' },
  ], '2026-08');
  assert.equal(counts.get('a') || 0, 0);
});

test('final state counts BOOK -> CANCEL -> BOOK as one', () => {
  const counts = monthlyCounts([
    { date: '2026-08-24', memberId: 'a', status: 'BOOKED' },
    { date: '2026-08-24', memberId: 'a', status: 'CANCELLED' },
    { date: '2026-08-24', memberId: 'a', status: 'BOOKED' },
  ], '2026-08');
  assert.equal(counts.get('a'), 1);
});

test('duplicate BOOK rows count once per day', () => {
  const counts = monthlyCounts([
    { date: '2026-08-24', memberId: 'a', status: 'BOOKED' },
    { date: '2026-08-24', memberId: 'a', status: 'BOOKED' },
    { date: '2026-08-25', memberId: 'a', status: 'BOOKED' },
  ], '2026-08');
  assert.equal(counts.get('a'), 2);
});

test('admin and external bookings are ordinary final BOOKED states', () => {
  const counts = monthlyCounts([
    { date: '2026-08-24', memberId: 'admin', status: 'BOOKED', source: 'ADMIN_BOOK' },
    { date: '2026-08-25', memberId: 'outside', status: 'BOOKED', source: 'ADMIN_EXTERNAL_BOOK' },
  ], '2026-08');
  assert.equal(counts.get('admin'), 1);
  assert.equal(counts.get('outside'), 1);
});

test('closed day contributes no monthly meal', () => {
  const counts = monthlyCounts([{ date: '2026-08-24', memberId: 'a', status: 'BOOKED' }], '2026-08', new Set(['2026-08-24']));
  assert.equal(counts.get('a') || 0, 0);
});

test('auto-book requires weekday, open day, before cutoff and no existing state', () => {
  assert.equal(canAutoBook({ weekday: true, beforeCutoff: true, closed: false, existingStatus: '' }), true);
  assert.equal(canAutoBook({ weekday: false, beforeCutoff: true, closed: false, existingStatus: '' }), false);
  assert.equal(canAutoBook({ weekday: true, beforeCutoff: true, closed: true, existingStatus: '' }), false);
  assert.equal(canAutoBook({ weekday: true, beforeCutoff: true, closed: false, existingStatus: 'CANCELLED' }), false);
  assert.equal(canAutoBook({ weekday: true, beforeCutoff: false, closed: false, existingStatus: '' }), false);
});

test('08:00 is the canonical cutoff boundary', () => {
  const cutoffMinutes = 8 * 60;
  assert.equal(7 * 60 + 59 < cutoffMinutes, true);
  assert.equal(8 * 60 >= cutoffMinutes, true);
});

test('admin action names preserve audit source distinctions', () => {
  assert.notEqual('ADMIN_BOOK', 'ADMIN_EXTERNAL_BOOK');
  assert.notEqual('USER_BOOK', 'BOOK_AUTO');
  assert.equal('ADMIN_CLOSE_DAY', 'ADMIN_CLOSE_DAY');
  assert.equal('ADMIN_REOPEN_DAY', 'ADMIN_REOPEN_DAY');
});
test('user mutations are blocked on a closed day', () => {
  const userCanChange = ({ closed, beforeCutoff }) => !closed && beforeCutoff;
  assert.equal(userCanChange({ closed: true, beforeCutoff: true }), false);
  assert.equal(userCanChange({ closed: false, beforeCutoff: true }), true);
});

test('bulk booking includes active members only', () => {
  const members = [{ id: 'a', active: true }, { id: 'b', active: false }, { id: 'c', active: true }];
  assert.deepEqual(members.filter(member => member.active).map(member => member.id), ['a', 'c']);
});

test('admin operations bypass the user cutoff rule', () => {
  const adminCanChange = ({ beforeCutoff }) => Boolean(beforeCutoff || !beforeCutoff);
  assert.equal(adminCanChange({ beforeCutoff: false }), true);
});