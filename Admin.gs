const ADMIN_DASHBOARD = {
  TITLE: 'Quản trị cơm trưa',
  SOURCE_LABELS: {
    USER_BOOK: 'Người dùng báo',
    USER_CANCEL: 'Người dùng hủy',
    USER_CANCEL_FUTURE: 'Hủy trước',
    BOOK_AUTO: 'Tự động',
    ADMIN_BOOK: 'Admin đánh hộ',
    ADMIN_EXTERNAL_BOOK: 'Báo ngoài',
    ADMIN_CANCEL: 'Admin cắt',
    ADMIN_CLEAR: 'Admin xóa trạng thái',
    ADMIN_BOOK_ALL: 'Admin đặt tất cả',
    ADMIN_CANCEL_ALL: 'Admin cắt tất cả',
    ADMIN_CLOSE_DAY: 'Khóa ngày nghỉ',
    ADMIN_REOPEN_DAY: 'Mở lại ngày',
    AUTO_BOOK_ON: 'Bật tự động',
    AUTO_BOOK_OFF: 'Tắt tự động',
    ADMIN_MEMBER_ACTIVE: 'Kích hoạt thành viên',
    ADMIN_MEMBER_INACTIVE: 'Tạm ngừng thành viên',
    ADMIN_MEMBER_ADD: 'Thêm thành viên',
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍚 Quản trị cơm trưa')
    .addItem('Mở Admin Dashboard', 'showAdminDashboard')
    .addSeparator()
    .addItem('Gửi báo cáo hôm nay', 'adminMenuSendToday')
    .addItem('Gửi tổng kết tháng trước', 'adminMenuSendPreviousMonth')
    .addToUi();
}

function showAdminDashboard() {
  assertAdmin_();
  const html = HtmlService.createTemplateFromFile('Admin')
    .evaluate()
    .setTitle(ADMIN_DASHBOARD.TITLE)
    .setWidth(1240)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, ADMIN_DASHBOARD.TITLE);
}

function adminMenuSendToday() {
  assertAdmin_();
  sendDailySummaryForDate_(dateKey_(new Date()), true);
  SpreadsheetApp.getUi().alert('Đã gửi báo cáo cơm hôm nay.');
}

function adminMenuSendPreviousMonth() {
  assertAdmin_();
  sendMonthlySummary_(previousMonthKey_(new Date()), true);
  SpreadsheetApp.getUi().alert('Đã gửi tổng kết tháng trước.');
}

function adminGetDashboardData(dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey || dateKey_(new Date()));
  const selectedMonth = normalizeMonthKey_(monthKey || selectedDate.slice(0, 7));
  const members = getMembers_(true);
  const stateByMember = getAdminDateState_(selectedDate);
  const closedDay = getClosedDay_(selectedDate);
  const rows = members.map(member => {
    const state = stateByMember[member.id] || {};
    const status = state.status === 'BOOKED' ? 'BOOKED' : state.status === 'CANCELLED' ? 'CANCELLED' : 'NONE';
    return {
      memberId: member.id,
      name: member.name,
      active: member.active,
      autoBook: member.autoBook,
      status,
      statusLabel: adminStatusLabel_(status),
      source: state.source || '',
      sourceLabel: adminSourceLabel_(state.source || ''),
      updatedAt: state.updatedAt || '',
    };
  });

  const activeRows = rows.filter(row => row.active);
  const counts = activeRows.reduce((acc, row) => {
    if (row.status === 'BOOKED') acc.booked++;
    else if (row.status === 'CANCELLED') acc.cancelled++;
    else acc.none++;
    return acc;
  }, { booked: 0, cancelled: 0, none: 0 });

  return {
    ok: true,
    adminEmail: getAdminEmail_(),
    selectedDate,
    selectedDateLabel: dateDisplayFromKey_(selectedDate),
    selectedMonth,
    cutoff: cutoffLabel_(),
    closedDay,
    emailStatus: getDailyEmailStatus_(selectedDate),
    counts: { active: activeRows.length, booked: counts.booked, cancelled: counts.cancelled, none: counts.none },
    rows,
    monthlySummary: getAdminMonthlySummary_(selectedMonth),
  };
}

function adminBookMeal(memberId, dateKey, mode, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const member = adminFindMember_(memberId);
  const isOutside = String(mode || '').toUpperCase() === 'OUTSIDE';
  adminUpsertBooking_(selectedDate, member, 'BOOKED', isOutside ? 'ADMIN_EXTERNAL_BOOK' : 'ADMIN_BOOK');
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminCancelMeal(memberId, dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const member = adminFindMember_(memberId);
  adminUpsertBooking_(selectedDate, member, 'CANCELLED', 'ADMIN_CANCEL');
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminClearMeal(memberId, dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const member = adminFindMember_(memberId);
  adminUpsertBooking_(selectedDate, member, 'CLEARED', 'ADMIN_CLEAR');
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminBulkSetMeals(dateKey, action, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const normalizedAction = String(action || '').toUpperCase();
  if (!['BOOK_ALL', 'CANCEL_ALL'].includes(normalizedAction)) throw new Error('Thao tác hàng loạt không hợp lệ.');
  const members = getMembers_().filter(member => member.active);
  const status = normalizedAction === 'BOOK_ALL' ? 'BOOKED' : 'CANCELLED';
  const auditAction = normalizedAction === 'BOOK_ALL' ? 'ADMIN_BOOK_ALL' : 'ADMIN_CANCEL_ALL';
  adminSetBookingStatusForMembers_(selectedDate, members, status, auditAction);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminCloseDay(dateKey, note, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const cleanNote = String(note || '').trim().slice(0, 300);
  const members = getMembers_(true);
  adminSetBookingStatusForMembers_(selectedDate, members, 'CANCELLED', 'ADMIN_CANCEL_ALL', 'Ngày nghỉ');
  const now = new Date();
  getSheet_(APP.SHEETS.CLOSED_DAYS).appendRow([selectedDate, 'CLOSED', cleanNote, getAdminEmail_(), now]);
  appendAudit_(selectedDate, { id: '', name: '' }, 'ADMIN_CLOSE_DAY', 'ADMIN', cleanNote, now);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminReopenDay(dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const now = new Date();
  getSheet_(APP.SHEETS.CLOSED_DAYS).appendRow([selectedDate, 'OPEN', '', getAdminEmail_(), now]);
  appendAudit_(selectedDate, { id: '', name: '' }, 'ADMIN_REOPEN_DAY', 'ADMIN', '', now);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminSetAutoBooking(memberId, enabled, dateKey, monthKey) {
  assertAdmin_();
  const member = adminFindMember_(memberId);
  const autoBook = parseBool_(enabled);
  const now = new Date();
  getSheet_(APP.SHEETS.MEMBERS).getRange(member.rowNumber, 4).setValue(autoBook);
  appendAudit_(dateKey_(now), member, autoBook ? 'AUTO_BOOK_ON' : 'AUTO_BOOK_OFF', 'ADMIN', '');
  return adminGetDashboardData(dateKey || dateKey_(now), monthKey);
}

function adminSetMemberActive(memberId, enabled, dateKey, monthKey) {
  assertAdmin_();
  const member = adminFindMember_(memberId);
  const active = parseBool_(enabled);
  const now = new Date();
  getSheet_(APP.SHEETS.MEMBERS).getRange(member.rowNumber, 3).setValue(active);
  appendAudit_(dateKey_(now), member, active ? 'ADMIN_MEMBER_ACTIVE' : 'ADMIN_MEMBER_INACTIVE', 'ADMIN', '');
  return adminGetDashboardData(dateKey || dateKey_(now), monthKey);
}

function adminAddMember(name, dateKey, monthKey) {
  assertAdmin_();
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');
  if (normalizedName.length < 2) throw new Error('Họ tên không hợp lệ.');
  if (getMembers_(true).some(member => memberNameKey_(member.name) === memberNameKey_(normalizedName))) {
    throw new Error('Tên này đã có trong danh sách.');
  }
  const member = { id: Utilities.getUuid().slice(0, 8), name: normalizedName };
  getSheet_(APP.SHEETS.MEMBERS).appendRow([member.id, member.name, true, false]);
  appendAudit_(dateKey_(new Date()), member, 'ADMIN_MEMBER_ADD', 'ADMIN', '');
  return adminGetDashboardData(dateKey || dateKey_(new Date()), monthKey);
}

function adminSaveCutoff(cutoff, dateKey, monthKey) {
  assertAdmin_();
  const value = String(cutoff || '').trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error('Giờ chốt phải theo dạng HH:mm, ví dụ 08:00.');
  setConfigValue_('CUTOFF', `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`);
  return adminGetDashboardData(dateKey || dateKey_(new Date()), monthKey);
}

function adminSendDailyEmail(dateKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  sendDailySummaryForDate_(selectedDate, true);
  return { ok: true, message: `Đã gửi báo cáo ngày ${dateDisplayFromKey_(selectedDate)}.` };
}

function adminSendMonthlyEmail(monthKey) {
  assertAdmin_();
  const selectedMonth = normalizeMonthKey_(monthKey);
  sendMonthlySummary_(selectedMonth, true);
  return { ok: true, message: `Đã gửi tổng kết ${monthDisplay_(selectedMonth)}.` };
}

function assertAdmin_() {
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const adminEmail = getAdminEmail_().toLowerCase();
  if (!activeEmail || activeEmail !== adminEmail) {
    throw new Error(`Không có quyền quản trị. Hãy mở Google Sheet bằng tài khoản ${adminEmail}.`);
  }
}

function getAdminEmail_() {
  return String(getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL) || APP.ADMIN_EMAIL).trim();
}

function adminFindMember_(memberId) {
  const member = getMembers_(true).find(item => item.id === String(memberId || ''));
  if (!member) throw new Error('Không tìm thấy thành viên.');
  return member;
}

function adminUpsertBooking_(dateKey, member, status, action) {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = findBookingRow_(sh, dateKey, member.id);
    const row = [dateKey, member.id, member.name, status, now];
    if (existing.rowNumber) sh.getRange(existing.rowNumber, 1, 1, 5).setValues([row]);
    else sh.appendRow(row);
    appendAudit_(dateKey, member, action, 'ADMIN', '');
  } finally {
    lock.releaseLock();
  }
}

function adminSetBookingStatusForMembers_(dateKey, members, status, action, note) {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    members.forEach(member => {
      const existing = findBookingRow_(sh, dateKey, member.id);
      const row = [dateKey, member.id, member.name, status, now];
      if (existing.rowNumber) sh.getRange(existing.rowNumber, 1, 1, 5).setValues([row]);
      else sh.appendRow(row);
      appendAudit_(dateKey, member, action, 'ADMIN', note || '', now);
    });
  } finally {
    lock.releaseLock();
  }
}

function getAdminDateState_(dateKey) {
  const result = {};
  const states = getFinalBookingStateForDate_(dateKey);
  Object.keys(states).forEach(memberId => {
    const row = states[memberId];
    result[memberId] = { status: row.status, updatedAt: formatDateTime_(row.updatedAt), source: '' };
  });

  try {
    const auditSheet = getSheet_(APP.SHEETS.AUDIT);
    const auditLastRow = auditSheet.getLastRow();
    if (auditLastRow < 2) return result;
    const width = Math.max(5, Math.min(7, auditSheet.getLastColumn()));
    auditSheet.getRange(2, 1, auditLastRow - 1, width).getValues().forEach(row => {
      const auditDate = normalizeDateCell_(row[1]);
      const memberId = String(row[2] || '');
      if (auditDate !== dateKey || !memberId || !result[memberId]) return;
      result[memberId].source = String(row[4] || '');
    });
  } catch (error) {
    // Legacy deployments may not have the expanded audit columns yet.
  }
  return result;
}

function getAdminMonthlySummary_(monthKey) {
  const members = getMembers_(true);
  const counts = {};
  members.forEach(member => { counts[member.id] = 0; });
  const states = getFinalBookingStateMap_(monthKey);
  const closedDays = getClosedDayMap_(monthKey);
  Object.keys(states).forEach(key => {
    const row = states[key];
    if (row.status === 'BOOKED' && !closedDays[row.dateKey] && row.memberId in counts) counts[row.memberId]++;
  });
  const rows = members
    .map(member => ({ memberId: member.id, name: member.name, active: member.active, total: counts[member.id] || 0 }))
    .sort((a, b) => b.total - a.total || memberDisplayOrder_(a, b));
  return { month: monthKey, monthLabel: monthDisplay_(monthKey), total: rows.reduce((sum, row) => sum + row.total, 0), rows };
}

function setConfigValue_(key, value) {
  const sh = getSheet_(APP.SHEETS.CONFIG);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    const index = values.findIndex(row => String(row[0] || '') === key);
    if (index >= 0) {
      sh.getRange(index + 2, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

function adminStatusLabel_(status) {
  if (status === 'BOOKED') return 'Đã đặt';
  if (status === 'CANCELLED') return 'Đã cắt';
  return 'Chưa báo';
}

function adminSourceLabel_(source) {
  if (!source) return '';
  return ADMIN_DASHBOARD.SOURCE_LABELS[source] || source;
}
