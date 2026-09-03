const ADMIN_DASHBOARD = {
  TITLE: 'Quản trị suất ăn',
  SOURCE_LABELS: {
    USER_BOOK: 'Người dùng báo',
    USER_CANCEL: 'Người dùng hủy',
    USER_CANCEL_FUTURE: 'Hủy trước',
    BOOK_AUTO: 'Tự động',
    ADMIN_BOOK: 'Admin đánh hộ',
    ADMIN_BOOK_LUNCH: 'Admin đánh hộ',
    ADMIN_BOOK_DINNER: 'Admin đánh hộ',
    ADMIN_EXTERNAL_BOOK: 'Báo ngoài',
    ADMIN_EXTERNAL_BOOK_LUNCH: 'Báo ngoài',
    ADMIN_EXTERNAL_BOOK_DINNER: 'Báo ngoài',
    ADMIN_CANCEL: 'Admin cắt',
    ADMIN_CANCEL_LUNCH: 'Admin cắt',
    ADMIN_CANCEL_DINNER: 'Admin cắt',
    ADMIN_CLEAR: 'Admin xóa',
    ADMIN_CLEAR_LUNCH: 'Admin xóa',
    ADMIN_CLEAR_DINNER: 'Admin xóa',
    ADMIN_BOOK_ALL: 'Admin đặt tất cả',
    ADMIN_BOOK_ALL_LUNCH: 'Admin đặt tất cả trưa',
    ADMIN_BOOK_ALL_DINNER: 'Admin đặt tất cả tối',
    ADMIN_CANCEL_ALL: 'Admin cắt tất cả',
    ADMIN_CANCEL_ALL_LUNCH: 'Admin cắt tất cả trưa',
    ADMIN_CANCEL_ALL_DINNER: 'Admin cắt tất cả tối',
    ADMIN_CLOSE_DAY: 'Khóa ngày nghỉ',
    ADMIN_REOPEN_DAY: 'Mở lại ngày',
    ADMIN_RECONCILE_DAY: 'Đã đối soát',
    ADMIN_REOPEN_RECONCILIATION: 'Mở lại đối soát',
    AUTO_BOOK_ON: 'Bật tự động',
    AUTO_BOOK_OFF: 'Tắt tự động',
    ADMIN_MEMBER_ACTIVE: 'Kích hoạt thành viên',
    ADMIN_MEMBER_INACTIVE: 'Tạm ngừng thành viên',
    ADMIN_MEMBER_ADD: 'Thêm thành viên',
    ADMIN_SAVE_DAILY_SETTLEMENT: 'Sửa quyết toán thực tế',
    ADMIN_SET_MONTH_STATUS: 'Đổi trạng thái tháng',
    ENABLE_WEEKEND_SERVICE: 'Bật ăn cuối tuần',
    DISABLE_WEEKEND_SERVICE: 'Tắt ăn cuối tuần',
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍚 Quản trị suất ăn')
    .addItem('Mở Admin Dashboard', 'showAdminDashboard')
    .addSeparator()
    .addItem('Gửi báo cáo trưa hôm nay', 'adminMenuSendToday')
    .addItem('Gửi tổng kết tháng trước', 'adminMenuSendPreviousMonth')
    .addToUi();
}

function showAdminDashboard() {
  assertAdmin_();
  const template = HtmlService.createTemplateFromFile('AdminDashboard');
  template.isWebApp = false;
  const html = template
    .evaluate()
    .setTitle(ADMIN_DASHBOARD.TITLE)
    .setWidth(1240)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, ADMIN_DASHBOARD.TITLE);
}

function adminMenuSendToday() {
  assertAdmin_();
  sendDailySummaryForDate_(dateKey_(new Date()), true);
  SpreadsheetApp.getUi().alert('Đã gửi báo cáo cơm trưa hôm nay.');
}

function adminMenuSendPreviousMonth() {
  assertAdmin_();
  sendMonthlySummary_(previousMonthKey_(new Date()), true);
  SpreadsheetApp.getUi().alert('Đã gửi tổng kết tháng trước.');
}

/**
 * Lấy toàn bộ dữ liệu quản trị cho ngày và tháng được chọn.
 * Bao gồm cả Cơm Trưa, Cơm Tối, trạng thái ngày nghỉ và đối soát chốt sổ.
 */
function adminGetDashboardData(dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey || dateKey_(new Date()));
  const selectedMonth = normalizeMonthKey_(monthKey || selectedDate.slice(0, 7));
  const members = getMembers_(true);
  const stateByMember = getAdminDateState_(selectedDate);
  const closedDay = getClosedDay_(selectedDate);
  const reconciliation = getDailyReconciliation_(selectedDate);
  const emailStatus = getDailyEmailStatus_(selectedDate);

  const rows = members.map(member => {
    const memberMeals = stateByMember[member.id] || {
      LUNCH: { status: 'NONE', updatedAt: '', source: '' },
      DINNER: { status: 'NONE', updatedAt: '', source: '' },
    };

    const lunchRaw = memberMeals.LUNCH || { status: 'NONE', updatedAt: '', source: '' };
    const dinnerRaw = memberMeals.DINNER || { status: 'NONE', updatedAt: '', source: '' };

    const lunchStatus = lunchRaw.status === APP.MEAL_STATES.BOOKED ? 'BOOKED' : lunchRaw.status === APP.MEAL_STATES.CANCELLED ? 'CANCELLED' : 'NONE';
    const dinnerStatus = dinnerRaw.status === APP.MEAL_STATES.BOOKED ? 'BOOKED' : dinnerRaw.status === APP.MEAL_STATES.CANCELLED ? 'CANCELLED' : 'NONE';

    return {
      memberId: member.id,
      name: member.name,
      active: member.active,
      autoBook: member.autoBook,
      lunch: {
        status: lunchStatus,
        statusLabel: adminStatusLabel_(lunchStatus),
        source: lunchRaw.source || '',
        sourceLabel: adminSourceLabel_(lunchRaw.source || ''),
        updatedAt: lunchRaw.updatedAt || '',
      },
      dinner: {
        status: dinnerStatus,
        statusLabel: adminStatusLabel_(dinnerStatus),
        source: dinnerRaw.source || '',
        sourceLabel: adminSourceLabel_(dinnerRaw.source || ''),
        updatedAt: dinnerRaw.updatedAt || '',
      },
      total: (lunchStatus === 'BOOKED' ? 1 : 0) + (dinnerStatus === 'BOOKED' ? 1 : 0),
    };
  });

  const activeRows = rows.filter(row => row.active);
  const counts = {
    active: activeRows.length,
    lunchBooked: activeRows.filter(r => r.lunch.status === 'BOOKED').length,
    lunchCancelled: activeRows.filter(r => r.lunch.status === 'CANCELLED').length,
    lunchNone: activeRows.filter(r => r.lunch.status === 'NONE').length,
    dinnerBooked: activeRows.filter(r => r.dinner.status === 'BOOKED').length,
    dinnerCancelled: activeRows.filter(r => r.dinner.status === 'CANCELLED').length,
    dinnerNone: activeRows.filter(r => r.dinner.status === 'NONE').length,
  };
  counts.totalBooked = counts.lunchBooked + counts.dinnerBooked;
  counts.booked = counts.lunchBooked; // Tương thích cũ
  counts.cancelled = counts.lunchCancelled;
  counts.none = counts.lunchNone;

  const dailySettlement = getDailySettlement_(selectedDate);
  const softwareLunch = counts.lunchBooked;
  const lunchActual = (dailySettlement && dailySettlement.lunchActual !== null) ? dailySettlement.lunchActual : null;
  const officialLunch = lunchActual !== null ? lunchActual : softwareLunch;
  const diff = officialLunch - softwareLunch;
  const dinnerNoteCount = dailySettlement ? dailySettlement.dinnerNoteCount : 0;
  const dinnerNote = dailySettlement ? dailySettlement.dinnerNote : '';
  const settlementStatus = dailySettlement ? dailySettlement.status : 'DRAFT';
  const settlementSource = dailySettlement ? dailySettlement.source : (lunchActual !== null ? 'ADMIN' : 'SOFTWARE');
  const settlementNote = dailySettlement ? dailySettlement.note : '';
  const isWeekendDay = isWeekend_(dateFromKey_(selectedDate));
  const isWeekendService = isMealServiceDay_(dateFromKey_(selectedDate));

  return {
    ok: true,
    adminEmail: getAdminEmail_(),
    selectedDate,
    selectedDateLabel: dateDisplayFromKey_(selectedDate),
    selectedMonth,
    cutoff: cutoffLabel_(),
    closedDay,
    reconciliation,
    emailStatus,
    counts,
    dailySettlement: {
      softwareLunch,
      lunchActual,
      officialLunch,
      diff,
      dinnerNoteCount,
      dinnerNote,
      status: settlementStatus,
      source: settlementSource,
      note: settlementNote,
      isWeekend: isWeekendDay,
      isWeekendService,
    },
    rows,
    monthlySummary: getMonthlySummary_(selectedMonth),
  };
}

/**
 * Thao tác chỉnh sửa suất ăn cho từng người, từng ngày, từng bữa.
 * Admin bypass cutoff, cho phép sửa cả ngày quá khứ.
 */
function adminSetMeal(memberId, dateKey, mealType, action, mode, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const targetMeal = normalizeMealType_(mealType);
  const member = adminFindMember_(memberId);
  const normalizedAction = String(action || '').toUpperCase();
  const isOutside = String(mode || '').toUpperCase() === 'OUTSIDE';

  let status = APP.MEAL_STATES.BOOKED;
  let auditAction = '';

  if (normalizedAction === 'BOOK') {
    status = APP.MEAL_STATES.BOOKED;
    if (targetMeal === APP.MEAL_TYPES.DINNER) {
      auditAction = isOutside ? 'ADMIN_EXTERNAL_BOOK_DINNER' : 'ADMIN_BOOK_DINNER';
    } else {
      auditAction = isOutside ? 'ADMIN_EXTERNAL_BOOK_LUNCH' : 'ADMIN_BOOK_LUNCH';
    }
  } else if (normalizedAction === 'CANCEL') {
    status = APP.MEAL_STATES.CANCELLED;
    auditAction = targetMeal === APP.MEAL_TYPES.DINNER ? 'ADMIN_CANCEL_DINNER' : 'ADMIN_CANCEL_LUNCH';
  } else if (normalizedAction === 'CLEAR') {
    status = APP.MEAL_STATES.CLEARED;
    auditAction = targetMeal === APP.MEAL_TYPES.DINNER ? 'ADMIN_CLEAR_DINNER' : 'ADMIN_CLEAR_LUNCH';
  } else {
    throw new Error('Thao tác không hợp lệ.');
  }

  adminUpsertBooking_(selectedDate, member, targetMeal, status, auditAction);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

// Backward-compatibility wrappers
function adminBookMeal(memberId, dateKey, mode, monthKey) {
  return adminSetMeal(memberId, dateKey, APP.MEAL_TYPES.LUNCH, 'BOOK', mode, monthKey);
}

function adminCancelMeal(memberId, dateKey, monthKey) {
  return adminSetMeal(memberId, dateKey, APP.MEAL_TYPES.LUNCH, 'CANCEL', '', monthKey);
}

function adminClearMeal(memberId, dateKey, monthKey) {
  return adminSetMeal(memberId, dateKey, APP.MEAL_TYPES.LUNCH, 'CLEAR', '', monthKey);
}

/**
 * Thao tác hàng loạt theo loại bữa (LUNCH hoặc DINNER).
 * Bắt buộc cô lập theo meal type: Đặt/Cắt trưa không ảnh hưởng tối và ngược lại.
 */
function adminBulkSetMeals(dateKey, mealType, action, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const targetMeal = normalizeMealType_(mealType);
  const normalizedAction = String(action || '').toUpperCase();
  if (!['BOOK_ALL', 'CANCEL_ALL'].includes(normalizedAction)) throw new Error('Thao tác hàng loạt không hợp lệ.');

  const members = getMembers_().filter(member => member.active);
  const status = normalizedAction === 'BOOK_ALL' ? APP.MEAL_STATES.BOOKED : APP.MEAL_STATES.CANCELLED;

  let auditAction = '';
  if (targetMeal === APP.MEAL_TYPES.DINNER) {
    auditAction = normalizedAction === 'BOOK_ALL' ? 'ADMIN_BOOK_ALL_DINNER' : 'ADMIN_CANCEL_ALL_DINNER';
  } else {
    auditAction = normalizedAction === 'BOOK_ALL' ? 'ADMIN_BOOK_ALL_LUNCH' : 'ADMIN_CANCEL_ALL_LUNCH';
  }

  adminSetBookingStatusForMembers_(selectedDate, members, targetMeal, status, auditAction);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

/**
 * Khóa ngày nghỉ: Ghi 'CLOSED' vào NGAY_NGHI.
 * BẢO TOÀN DỮ LIỆU: TUYỆT ĐỐI KHÔNG mutate CHAM_COM hàng loạt.
 */
function adminCloseDay(dateKey, note, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const cleanNote = String(note || '').trim().slice(0, 300);
  const now = new Date();
  getSheet_(APP.SHEETS.CLOSED_DAYS).appendRow([selectedDate, 'CLOSED', cleanNote, getAdminEmail_(), now]);
  appendAudit_(selectedDate, { id: '', name: '' }, '', 'ADMIN_CLOSE_DAY', 'ADMIN', cleanNote, now);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

/**
 * Mở lại ngày nghỉ: Ghi 'OPEN' vào NGAY_NGHI.
 * Trạng thái trước đó trong CHAM_COM tự động khôi phục hoàn toàn.
 */
function adminReopenDay(dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const now = new Date();
  getSheet_(APP.SHEETS.CLOSED_DAYS).appendRow([selectedDate, 'OPEN', '', getAdminEmail_(), now]);
  appendAudit_(selectedDate, { id: '', name: '' }, '', 'ADMIN_REOPEN_DAY', 'ADMIN', '', now);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

/**
 * Đối soát / Chốt sổ ngày: Lưu snapshot hash của ngày để phát hiện chỉnh sửa sau đối soát.
 */
function adminReconcileDay(dateKey, note, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  adminReconcileDay_(selectedDate, note);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminReopenReconciliation(dateKey, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  adminReopenReconciliation_(selectedDate);
  return adminGetDashboardData(selectedDate, normalizeMonthKey_(monthKey || selectedDate.slice(0, 7)));
}

function adminSetAutoBooking(memberId, enabled, dateKey, monthKey) {
  assertAdmin_();
  const member = adminFindMember_(memberId);
  const autoBook = parseBool_(enabled);
  const now = new Date();
  getSheet_(APP.SHEETS.MEMBERS).getRange(member.rowNumber, 4).setValue(autoBook);
  appendAudit_(dateKey_(now), member, APP.MEAL_TYPES.LUNCH, autoBook ? 'AUTO_BOOK_ON' : 'AUTO_BOOK_OFF', 'ADMIN', '');
  return adminGetDashboardData(dateKey || dateKey_(now), monthKey);
}

function adminSetMemberActive(memberId, enabled, dateKey, monthKey) {
  assertAdmin_();
  const member = adminFindMember_(memberId);
  const active = parseBool_(enabled);
  const now = new Date();
  getSheet_(APP.SHEETS.MEMBERS).getRange(member.rowNumber, 3).setValue(active);
  appendAudit_(dateKey_(now), member, '', active ? 'ADMIN_MEMBER_ACTIVE' : 'ADMIN_MEMBER_INACTIVE', 'ADMIN', '');
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
  appendAudit_(dateKey_(new Date()), member, '', 'ADMIN_MEMBER_ADD', 'ADMIN', '');
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
  return { ok: true, message: `Đã gửi báo cáo cơm trưa ngày ${dateDisplayFromKey_(selectedDate)}.` };
}

function adminSendMonthlyEmail(monthKey) {
  assertAdmin_();
  const selectedMonth = normalizeMonthKey_(monthKey);
  sendMonthlySummary_(selectedMonth, true);
  return { ok: true, message: `Đã gửi tổng kết ${monthDisplay_(selectedMonth)}.` };
}

/**
 * Kiểm tra quyền quản trị phía server.
 * Bắt buộc Session.getActiveUser().getEmail() thuộc danh sách Admin.
 */
function assertAdmin_() {
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const adminEmails = getAdminEmails_();
  if (!activeEmail || !adminEmails.includes(activeEmail)) {
    throw new Error('Không có quyền quản trị.');
  }
}

function getAdminEmail_() {
  return String(getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL) || APP.ADMIN_EMAIL).trim();
}

function getAdminEmails_() {
  const configured = getConfig_('ADMIN_EMAILS', APP.ADMIN_EMAILS.join(','));
  const legacy = getAdminEmail_();
  const raw = String(configured) + ',' + String(legacy);
  return [...new Set(raw
    .split(/[;,\n]+/)
    .map(email => String(email || '').trim().toLowerCase())
    .filter(Boolean))];
}

function adminFindMember_(memberId) {
  const member = getMembers_(true).find(item => item.id === String(memberId || ''));
  if (!member) throw new Error('Không tìm thấy thành viên.');
  return member;
}

function adminUpsertBooking_(dateKey, member, mealType, status, action) {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = findBookingRow_(sh, dateKey, member.id, mealType);
    const row = [dateKey, member.id, member.name, mealType, status, now];
    if (existing.rowNumber) sh.getRange(existing.rowNumber, 1, 1, 6).setValues([row]);
    else sh.appendRow(row);
    appendAudit_(dateKey, member, mealType, action, 'ADMIN', '');
  } finally {
    lock.releaseLock();
  }
}

function adminSetBookingStatusForMembers_(dateKey, members, mealType, status, action, note) {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    members.forEach(member => {
      const existing = findBookingRow_(sh, dateKey, member.id, mealType);
      const row = [dateKey, member.id, member.name, mealType, status, now];
      if (existing.rowNumber) sh.getRange(existing.rowNumber, 1, 1, 6).setValues([row]);
      else sh.appendRow(row);
      appendAudit_(dateKey, member, mealType, action, 'ADMIN', note || '', now);
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lấy trạng thái của tất cả thành viên cho cả Trưa và Tối trong ngày.
 */
function getAdminDateState_(dateKey) {
  const result = {};
  const states = getFinalBookingStateForDate_(dateKey);

  Object.keys(states).forEach(key => {
    const row = states[key];
    if (!result[row.memberId]) {
      result[row.memberId] = {
        LUNCH: { status: 'NONE', updatedAt: '', source: '' },
        DINNER: { status: 'NONE', updatedAt: '', source: '' },
      };
    }
    const meal = row.mealType === APP.MEAL_TYPES.DINNER ? 'DINNER' : 'LUNCH';
    result[row.memberId][meal] = {
      status: row.status,
      updatedAt: formatDateTime_(row.updatedAt),
      source: '',
    };
  });

  try {
    const auditSheet = getSheet_(APP.SHEETS.AUDIT);
    const auditLastRow = auditSheet.getLastRow();
    if (auditLastRow >= 2) {
      const width = Math.min(8, auditSheet.getLastColumn());
      const auditRows = auditSheet.getRange(2, 1, auditLastRow - 1, width).getValues();
      auditRows.forEach(row => {
        const auditDate = normalizeDateCell_(row[1]);
        const memberId = String(row[2] || '');
        if (auditDate !== dateKey || !memberId) return;
        if (!result[memberId]) return;

        const meal = width >= 8 ? (normalizeMealType_(row[4]) === APP.MEAL_TYPES.DINNER ? 'DINNER' : 'LUNCH') : 'LUNCH';
        const action = String(width >= 8 ? row[5] : row[4] || '');
        if (result[memberId][meal]) {
          result[memberId][meal].source = action;
        }
      });
    }
  } catch (error) {}

  return result;
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
  if (status === APP.MEAL_STATES.BOOKED) return 'Đã đặt';
  if (status === APP.MEAL_STATES.CANCELLED) return 'Đã cắt';
  return 'Chưa báo';
}

function adminSourceLabel_(source) {
  if (!source) return '';
  return ADMIN_DASHBOARD.SOURCE_LABELS[source] || source;
}

/**
 * Lưu số quyết toán thực tế cơm trưa và ghi chú cơm tối cho ngày.
 */
function adminSaveDailySettlement(dateKey, lunchActual, dinnerNoteCount, dinnerNote, status, note, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const adminEmail = getAdminEmail_();

  upsertDailySettlement_(selectedDate, {
    lunchActual: lunchActual !== '' && lunchActual !== null ? Number(lunchActual) : null,
    dinnerNoteCount: dinnerNoteCount !== '' && dinnerNoteCount !== null ? Number(dinnerNoteCount) : 0,
    dinnerNote,
    status: status || APP.SETTLEMENT_STATES.DRAFT,
    note,
    source: 'ADMIN',
  }, adminEmail);

  appendAudit_(selectedDate, { id: 'ADMIN', name: 'Admin' }, APP.MEAL_TYPES.LUNCH, 'ADMIN_SAVE_DAILY_SETTLEMENT', 'ADMIN', `Quyết toán trưa: ${lunchActual}, ghi chú tối: ${dinnerNoteCount}`, new Date());
  return adminGetDashboardData(selectedDate, monthKey);
}

/**
 * Cập nhật trạng thái đối soát/chốt sổ của tháng (OPEN, RECONCILING, LOCKED).
 */
function adminSetMonthStatus(monthKey, status, note, dateKey) {
  assertAdmin_();
  const selectedMonth = normalizeMonthKey_(monthKey);
  const adminEmail = getAdminEmail_();
  const summary = getMonthlySummary_(selectedMonth);

  setMonthSettlementStatus_(selectedMonth, status, note, adminEmail, {
    totalSoftware: summary.totalSoftwareLunch,
    totalOfficial: summary.totalOfficialLunch,
    diff: summary.diff,
    dinnerNotes: summary.dinnerNotes,
  });

  appendAudit_(selectedMonth + '-01', { id: 'ADMIN', name: 'Admin' }, APP.MEAL_TYPES.LUNCH, 'ADMIN_SET_MONTH_STATUS', 'ADMIN', `Trạng thái tháng: ${status}`, new Date());
  return adminGetDashboardData(dateKey, selectedMonth);
}

/**
 * Bật/tắt chế độ tổ chức ăn trưa cho ngày cuối tuần (SERVICE_DAY).
 */
function adminToggleWeekendServiceDay(dateKey, enabled, monthKey) {
  assertAdmin_();
  const selectedDate = normalizeDateKey_(dateKey);
  const val = enabled ? '1' : '0';
  setConfigValue_('SERVICE_DAY_' + selectedDate, val);

  appendAudit_(selectedDate, { id: 'ADMIN', name: 'Admin' }, APP.MEAL_TYPES.LUNCH, enabled ? 'ENABLE_WEEKEND_SERVICE' : 'DISABLE_WEEKEND_SERVICE', 'ADMIN', `Tổ chức ăn trưa cuối tuần: ${enabled}`, new Date());
  return adminGetDashboardData(selectedDate, monthKey);
}
