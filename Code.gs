const APP = {
  TZ: 'Asia/Ho_Chi_Minh',
  ADMIN_EMAIL: 'vingocphuong.92@gmail.com',
  CUTOFF_HOUR: 8,
  CUTOFF_MINUTE: 0,
  DEFAULT_CUTOFF: '08:00',
  PRIORITY_MEMBER_NAME: 'Đỗ Đức Cường',
  DEFAULT_MEMBER_NAMES: [
    'Ngô Đức Thành',
    'Phạm Thị Thu Thủy',
    'Lê Xuân Độ',
    'Vi Thế Dũng',
    'Nguyễn Trường Thành',
    'Lê Thị Hiền',
    'Trần Thị Thu Hoà',
    'Vương Lan Anh',
    'Nguyễn Hoàng Hiệp',
    'Đỗ Đức Cường',
    'Nguyễn Cao Cường',
    'Lê Ngọc Cảnh',
    'Nguyễn Mạnh Hùng',
    'Vũ Tiến Thọ',
    'Bùi Nguyên Hồng Giang',
    'Phạm Việt Hùng',
    'Đoàn Văn Tiến',
    'Phạm Thị Hồng Vân',
    'Phạm Trung Thành',
    'Đỗ Anh Quang',
    'Bùi Hiếu Nam',
    'Hoàng Thị Kim Anh',
    'Nguyễn Thị Hoa',
    'Bạch Thị Phương Dung',
    'Đặng Thị Khánh Phương',
    'Nguyễn Việt Thành',
    'Nguyễn Toàn Thịnh',
    'Nguyễn Văn Công',
    'Nguyễn Tiến Hưng',
    'Phan Văn Mạnh',
    'Nguyễn Thị Minh Tâm',
    'Vi Ngọc Phương',
    'Nguyễn Hồng Thanh',
    'Đoàn Trung Kiên',
    'Lê Văn Đan',
    'Đào Xuân Tùng',
    'Nguyễn Hữu Hải',
  ],
  SHEETS: {
    MEMBERS: 'THANH_VIEN',
    BOOKINGS: 'CHAM_COM',
    AUDIT: 'NHAT_KY',
    CONFIG: 'CAU_HINH',
    CLOSED_DAYS: 'NGAY_NGHI',
  },
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Báo cơm trưa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Chạy 1 lần sau khi tạo Apps Script.
 * Tạo đủ sheet, cấu hình mặc định và trigger tự động.
 */
function setupApp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy gắn Apps Script với một Google Sheet trước khi chạy setupApp().');

  ensureSheet_(ss, APP.SHEETS.MEMBERS, ['ID', 'HO_TEN', 'DANG_HOAT_DONG', 'TU_DONG_BAO_COM']);
  ensureSheet_(ss, APP.SHEETS.BOOKINGS, ['NGAY', 'MEMBER_ID', 'HO_TEN', 'TRANG_THAI', 'CAP_NHAT_LUC']);
  ensureSheet_(ss, APP.SHEETS.AUDIT, ['THOI_GIAN', 'NGAY', 'MEMBER_ID', 'HO_TEN', 'HANH_DONG', 'NGUON', 'GHI_CHU']);
  ensureSheet_(ss, APP.SHEETS.CONFIG, ['KEY', 'VALUE']);
  ensureSheet_(ss, APP.SHEETS.CLOSED_DAYS, ['NGAY', 'TRANG_THAI', 'GHI_CHU', 'CAP_NHAT_BOI', 'CAP_NHAT_LUC']);

  const seeded = seedDefaultMembers_(ss);
  seedConfig_(ss);
  formatSheets_(ss);
  installAutomationTriggers_();

  return `Đã khởi tạo xong. Đã thêm ${seeded.added} thành viên mặc định. Deploy > New deployment > Web app để sử dụng.`;
}

/**
 * Chạy hàm này nếu ứng dụng đã được khởi tạo trước đó nhưng chưa có danh sách mặc định.
 * Chỉ thêm những tên còn thiếu, không thay đổi thành viên hiện có.
 */
function seedDefaultMembers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy gắn Apps Script với một Google Sheet trước khi chạy seedDefaultMembers().');

  ensureSheet_(ss, APP.SHEETS.MEMBERS, ['ID', 'HO_TEN', 'DANG_HOAT_DONG', 'TU_DONG_BAO_COM']);
  const seeded = seedDefaultMembers_(ss);
  formatSheets_(ss);
  return `Đã thêm ${seeded.added} thành viên. Hiện có ${seeded.total} thành viên trong danh sách.`;
}

/**
 * Có thể chạy hàm này để tự đánh ID cho những người đã nhập tên nhưng chưa có ID.
 */
function normalizeMembers() {
  const sh = getSheet_(APP.SHEETS.MEMBERS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 'Chưa có thành viên.';

  const rows = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  let changed = 0;

  rows.forEach((row, i) => {
    const name = String(row[1] || '').trim();
    if (!name) return;

    if (!row[0]) {
      row[0] = Utilities.getUuid().slice(0, 8);
      changed++;
    }

    if (row[2] === '' || row[2] === null) {
      row[2] = true;
      changed++;
    }

    if (row[3] === '' || row[3] === null) {
      row[3] = false;
      changed++;
    }

    rows[i] = row;
  });

  if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
  return `Đã chuẩn hóa danh sách. ${changed} ô được cập nhật.`;
}

function getInitialData() {
  const now = new Date();
  const dateKey = dateKey_(now);
  const members = getMembers_();
  const bookings = getBookingsForDate_(dateKey);
  const monthlySummary = getMonthlySummary_(dateKey.slice(0, 7));

  return {
    ok: true,
    today: dateDisplay_(now),
    dateKey,
    cutoffLabel: cutoffLabel_(),
    closedDay: getClosedDay_(dateKey),
    locked: isLocked_(now) || isClosedDay_(dateKey),
    members,
    autoBookMembers: members
      .filter(member => member.autoBook)
      .map(member => ({ memberId: member.id, name: member.name })),
    monthlySummary,
    booked: bookings.map(b => ({
      memberId: b.memberId,
      name: b.name,
      updatedAt: b.updatedAtDisplay,
    })),
    total: bookings.length,
  };
}

function getMonthlySummary_(monthKey) {
  const normalized = normalizeMonthKey_(monthKey);
  const members = getMembers_();
  const counts = {};
  members.forEach(member => { counts[member.id] = 0; });
  const states = getFinalBookingStateMap_(normalized);
  const closedDays = getClosedDayMap_(normalized);
  Object.keys(states).forEach(key => {
    const state = states[key];
    if (state.status === 'BOOKED' && !closedDays[state.dateKey] && state.memberId in counts) counts[state.memberId]++;
  });
  const rows = members.map(member => ({ memberId: member.id, name: member.name, total: counts[member.id] || 0 }))
    .sort((a, b) => b.total - a.total || memberDisplayOrder_(a, b));
  return { month: normalized, monthLabel: monthDisplay_(normalized), total: rows.reduce((sum, row) => sum + row.total, 0), rows };
}
function bookToday(memberId) {
  return changeBooking_(memberId, 'BOOK');
}

function cancelToday(memberId) {
  return changeBooking_(memberId, 'CANCEL');
}

/**
 * Lưu yêu cầu hủy cơm cho một ngày làm việc trong tương lai.
 * Bản ghi CANCELLED giúp tác vụ tự báo cơm bỏ qua đúng ngày này.
 */
function cancelFutureMeal(memberId, targetDateKey) {
  const dateKey = normalizeDateKey_(targetDateKey);
  const now = new Date();
  const todayKey = dateKey_(now);

  if (dateKey <= todayKey) {
    throw new Error('Chỉ có thể hủy cơm cho ngày trong tương lai.');
  }

  if (isWeekend_(dateFromKey_(dateKey))) {
    throw new Error('Ngày đã chọn là cuối tuần, hệ thống không tự báo cơm ngày này.');
  }

  if (isClosedDay_(dateKey)) {
    throw new Error('Ngày này đã được quản trị viên khóa là ngày nghỉ.');
  }

  const member = getMemberById_(memberId);
  if (!member) throw new Error('Không tìm thấy thành viên hoặc thành viên đã ngừng hoạt động.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_(APP.SHEETS.BOOKINGS);
    const existing = findBookingRow_(sh, dateKey, member.id);
    const row = [dateKey, member.id, member.name, 'CANCELLED', now];

    if (existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 5).setValues([row]);
    } else {
      sh.appendRow(row);
    }
    appendAudit_(dateKey, member, 'USER_CANCEL_FUTURE', 'USER', '');
  } finally {
    lock.releaseLock();
  }

  return getInitialData();
}

function getFutureCancellations(memberId) {
  const member = getMemberById_(memberId);
  if (!member) throw new Error('Không tìm thấy thành viên hoặc thành viên đã ngừng hoạt động.');
  const todayKey = dateKey_(new Date());
  const seen = {};
  getBookingRows_().forEach(row => {
    if (row.memberId !== member.id || row.dateKey <= todayKey || row.status !== 'CANCELLED') return;
    const previous = seen[row.dateKey];
    if (!previous || row.rowNumber >= previous.rowNumber) seen[row.dateKey] = row;
  });
  return { ok: true, member: member.name, days: Object.keys(seen).map(dateKey => ({ dateKey, dateLabel: dateDisplayFromKey_(dateKey) })).sort((a, b) => a.dateKey.localeCompare(b.dateKey)) };
}
function setAutoBooking(memberId, enabled) {
  const member = getMemberById_(memberId);
  if (!member) throw new Error('Không tìm thấy thành viên hoặc thành viên đã ngừng hoạt động.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = new Date();
    const autoBook = parseBool_(enabled);
    getSheet_(APP.SHEETS.MEMBERS).getRange(member.rowNumber, 4).setValue(autoBook);
    appendAudit_(dateKey_(now), member, autoBook ? 'AUTO_BOOK_ON' : 'AUTO_BOOK_OFF', 'USER', '');
  } finally {
    lock.releaseLock();
  }

  return getInitialData();
}

function changeBooking_(memberId, action) {
  const now = new Date();
  const todayKey = dateKey_(now);
  if (isClosedDay_(todayKey)) {
    throw new Error('Hôm nay không tổ chức ăn trưa.');
  }
  if (isLocked_(now)) {
    throw new Error(`Đã quá ${cutoffLabel_()}. Danh sách cơm hôm nay đã chốt.`);
  }

  const member = getMemberById_(memberId);
  if (!member) throw new Error('Không tìm thấy thành viên hoặc thành viên đã ngừng hoạt động.');

  const dateKey = dateKey_(now);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sh = getSheet_(APP.SHEETS.BOOKINGS);
    const existing = findBookingRow_(sh, dateKey, member.id);
    const status = action === 'BOOK' ? 'BOOKED' : 'CANCELLED';

    if (existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 5).setValues([[
        dateKey, member.id, member.name, status, now
      ]]);
    } else {
      sh.appendRow([dateKey, member.id, member.name, status, now]);
    }
    appendAudit_(dateKey, member, action === 'BOOK' ? 'USER_BOOK' : 'USER_CANCEL', 'USER', '');
  } finally {
    lock.releaseLock();
  }

  return getInitialData();
}

function getBookingRows_() {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, 5).getValues().map((row, index) => ({
    rowNumber: index + 2,
    dateKey: normalizeDateCell_(row[0]),
    memberId: String(row[1] || ''),
    name: String(row[2] || ''),
    status: String(row[3] || ''),
    updatedAt: row[4],
  }));
}

function getFinalBookingStateMap_(monthKey) {
  const normalized = normalizeMonthKey_(monthKey);
  const states = {};
  getBookingRows_().forEach(row => {
    if (!row.dateKey.startsWith(normalized + '-')) return;
    const key = `${row.dateKey}|${row.memberId}`;
    const previous = states[key];
    if (!previous || row.rowNumber >= previous.rowNumber) states[key] = row;
  });
  return states;
}

function getFinalBookingStateForDate_(dateKey) {
  const states = {};
  getBookingRows_().forEach(row => {
    if (row.dateKey !== dateKey) return;
    const previous = states[row.memberId];
    if (!previous || row.rowNumber >= previous.rowNumber) states[row.memberId] = row;
  });
  return states;
}

function appendAudit_(dateKey, member, action, source, note, at) {
  const sh = getSheet_(APP.SHEETS.AUDIT);
  sh.appendRow([
    at || new Date(),
    dateKey || '',
    member && member.id ? member.id : '',
    member && member.name ? member.name : '',
    action || '',
    source || '',
    note || '',
  ]);
}

function getClosedDay_(dateKey) {
  try {
    const sh = getSheet_(APP.SHEETS.CLOSED_DAYS);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { closed: false, status: 'OPEN', note: '', updatedBy: '', updatedAt: '' };
    const rows = sh.getRange(2, 1, lastRow - 1, 5).getValues();
    let latest = null;
    rows.forEach(row => {
      if (normalizeDateCell_(row[0]) === dateKey) latest = row;
    });
    if (!latest) return { closed: false, status: 'OPEN', note: '', updatedBy: '', updatedAt: '' };
    return {
      closed: String(latest[1] || '').toUpperCase() === 'CLOSED',
      status: String(latest[1] || 'OPEN').toUpperCase(),
      note: String(latest[2] || ''),
      updatedBy: String(latest[3] || ''),
      updatedAt: formatDateTime_(latest[4]),
    };
  } catch (error) {
    return { closed: false, status: 'OPEN', note: '', updatedBy: '', updatedAt: '' };
  }
}

function isClosedDay_(dateKey) {
  return getClosedDay_(dateKey).closed;
}
function getClosedDayMap_(monthKey) {
  const normalized = normalizeMonthKey_(monthKey);
  const result = {};
  try {
    const sh = getSheet_(APP.SHEETS.CLOSED_DAYS);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return result;
    sh.getRange(2, 1, lastRow - 1, 5).getValues().forEach(row => {
      const date = normalizeDateCell_(row[0]);
      if (!date.startsWith(normalized + '-')) return;
      result[date] = String(row[1] || '').toUpperCase() === 'CLOSED';
    });
  } catch (error) {
    return result;
  }
  return result;
}
function getMonthlyHistory(memberId, monthKey) {
  const member = getMemberById_(memberId);
  if (!member) throw new Error('Không tìm thấy thành viên.');
  const normalized = normalizeMonthKey_(monthKey);
  const states = getFinalBookingStateMap_(normalized);
  const days = Object.keys(states).map(key => states[key])
    .filter(row => row.memberId === member.id && row.status === 'BOOKED' && !isClosedDay_(row.dateKey))
    .map(row => ({ dateKey: row.dateKey, dateLabel: dateDisplayFromKey_(row.dateKey), updatedAt: formatDateTime_(row.updatedAt) }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return { ok: true, member: member.name, month: normalized, monthLabel: monthDisplay_(normalized), total: days.length, days };
}
/**
 * Trigger gọi định kỳ. Hàm tự kiểm tra thời điểm và chống gửi trùng.
 */
function automationTick() {
  const now = new Date();
  autoBookWeekdayIfNeeded_(now);
  const cutoff = getCutoff_();
  const hour = Number(Utilities.formatDate(now, APP.TZ, 'H'));
  const minute = Number(Utilities.formatDate(now, APP.TZ, 'm'));
  const day = Number(Utilities.formatDate(now, APP.TZ, 'd'));

  // Báo cáo ngày: sau giờ chốt trong CAU_HINH, chỉ gửi 1 lần/ngày.
  if (
    hour > cutoff.hour ||
    (hour === cutoff.hour && minute >= cutoff.minute)
  ) {
    sendDailySummaryIfNeeded_(now);
  }

  // Ngày 1 hàng tháng: gửi tổng kết tháng trước sau 08:05.
  if (day === 1 && (hour > 8 || (hour === 8 && minute >= 5))) {
    sendPreviousMonthSummaryIfNeeded_(now);
  }
}

function sendDailySummaryNow() {
  sendDailySummary_(new Date(), true);
}

function sendPreviousMonthSummaryNow() {
  sendMonthlySummary_(previousMonthKey_(new Date()), true);
}

function sendDailySummaryIfNeeded_(now) {
  const dateKey = dateKey_(now);
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DAILY_EMAIL_' + dateKey) || props.getProperty('DAILY_SENT_' + dateKey)) return;
  sendDailySummaryForDate_(dateKey, false);
}

function sendDailySummary_(now, manual) {
  return sendDailySummaryForDate_(dateKey_(now), manual);
}

function sendDailySummaryForDate_(dateKey, manual) {
  const closedDay = getClosedDay_(dateKey);
  const booked = closedDay.closed ? [] : getBookingsForDate_(dateKey);
  const totalMembers = getMembers_().length;
  const snapshot = dailySnapshotHash_(dateKey, booked, closedDay.closed);
  const props = PropertiesService.getScriptProperties();
  const previous = readDailyEmailRecord_(dateKey);
  const isUpdate = Boolean(previous && (!previous.hash || previous.hash !== snapshot));
  const dateLabel = dateDisplayFromKey_(dateKey);
  const subject = isUpdate ? `🍚 [CẬP NHẬT] Báo cơm ${dateLabel}: ${booked.length} suất` : `🍚 Báo cơm ${dateLabel}: ${booked.length} suất`;
  const body = closedDay.closed
    ? [`BÁO CƠM TRƯA — ${dateLabel}`, '', 'Hôm nay không tổ chức ăn trưa.', closedDay.note ? `Ghi chú: ${closedDay.note}` : '', '', manual ? '(Email được gửi thủ công từ Dashboard)' : `Hệ thống tự chốt lúc ${cutoffLabel_()}.`].join('\n')
    : [`BÁO CƠM TRƯA — ${dateLabel}`, '', `Tổng số suất: ${booked.length}`, `Số người trong danh sách: ${totalMembers}`, '', 'Danh sách đã báo cơm:', booked.map((b, i) => `${i + 1}. ${b.name}`).join('\n') || 'Không có người báo cơm.', '', manual ? '(Email được gửi thủ công từ Dashboard)' : `Hệ thống tự chốt lúc ${cutoffLabel_()}.`].join('\n');
  MailApp.sendEmail({ to: getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL), subject, body, htmlBody: buildDailyEmailHtml_(dateFromKey_(dateKey), booked, totalMembers, closedDay), name: 'Báo cơm trưa' });
  const record = { sentAt: new Date().toISOString(), hash: snapshot, total: booked.length, closed: closedDay.closed };
  props.setProperty('DAILY_EMAIL_' + dateKey, JSON.stringify(record));
  props.setProperty('DAILY_SENT_' + dateKey, record.sentAt);
  return record;
}

function readDailyEmailRecord_(dateKey) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('DAILY_EMAIL_' + dateKey);
  if (raw) {
    try { return JSON.parse(raw); } catch (error) { return null; }
  }
  const legacy = props.getProperty('DAILY_SENT_' + dateKey);
  return legacy ? { sentAt: legacy, hash: '', total: null } : null;
}
function getDailyEmailStatus_(dateKey) {
  const record = readDailyEmailRecord_(dateKey);
  if (!record) return { sent: false, dirty: false, sentAt: '', total: null };
  const closedDay = getClosedDay_(dateKey);
  const current = dailySnapshotHash_(dateKey, closedDay.closed ? [] : getBookingsForDate_(dateKey), closedDay.closed);
  return { sent: true, dirty: record.hash !== current, sentAt: record.sentAt || '', total: record.total };
}

function dailySnapshotHash_(dateKey, booked, closed) {
  const payload = JSON.stringify({ dateKey, closed: Boolean(closed), booked: booked.map(item => item.memberId).sort() });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, payload, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}
function sendPreviousMonthSummaryIfNeeded_(now) {
  const monthKey = previousMonthKey_(now);
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('MONTHLY_SENT_' + monthKey)) return;

  sendMonthlySummary_(monthKey, false);
  props.setProperty('MONTHLY_SENT_' + monthKey, new Date().toISOString());
}

function sendMonthlySummary_(monthKey, manual) {
  const normalizedMonth = normalizeMonthKey_(monthKey);
  const members = getMembers_(true);
  const counts = {};
  members.forEach(member => { counts[member.id] = 0; });
  const states = getFinalBookingStateMap_(normalizedMonth);
  const closedDays = getClosedDayMap_(normalizedMonth);
  Object.keys(states).forEach(key => {
    const state = states[key];
    if (state.status === 'BOOKED' && !closedDays[state.dateKey] && state.memberId in counts) counts[state.memberId]++;
  });
  const rows = members.map(member => ({ name: member.name, total: counts[member.id] || 0 })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'));
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const textRows = rows.map((row, i) => `${i + 1}. ${row.name}: ${row.total} suất`).join('\n');
  const subject = `📊 Tổng hợp suất ăn ${monthDisplay_(normalizedMonth)} — ${grandTotal} suất`;
  const body = [`TỔNG HỢP SUẤT ĂN ${monthDisplay_(normalizedMonth)}`, '', textRows || 'Chưa có dữ liệu.', '', `TỔNG CỘNG: ${grandTotal} suất`, manual ? '\n(Email được gửi thủ công từ Apps Script)' : ''].join('\n');
  MailApp.sendEmail({ to: getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL), subject, body, htmlBody: buildMonthlyEmailHtml_(normalizedMonth, rows, grandTotal), name: 'Báo cơm trưa' });
}
/* =========================
   Helpers
========================= */

function getMembers_(includeInactive) {
  const sh = getSheet_(APP.SHEETS.MEMBERS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const rows = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  return rows
    .map((r, idx) => ({
      id: String(r[0] || '').trim() || `ROW-${idx + 2}`,
      name: String(r[1] || '').trim(),
      active: parseBool_(r[2]),
      autoBook: parseBool_(r[3]),
      rowNumber: idx + 2,
    }))
    .filter(m => m.name)
    .filter(m => includeInactive || m.active)
    .sort(memberDisplayOrder_);
}

function getMemberById_(memberId) {
  return getMembers_().find(m => m.id === String(memberId || '')) || null;
}

function getBookingsForDate_(dateKey) {
  if (isClosedDay_(dateKey)) return [];
  const states = getFinalBookingStateForDate_(dateKey);
  return Object.keys(states).map(memberId => states[memberId])
    .filter(row => row.status === 'BOOKED')
    .map(row => ({ rowNumber: row.rowNumber, dateKey: row.dateKey, memberId: row.memberId, name: row.name, status: row.status, updatedAt: row.updatedAt, updatedAtDisplay: formatTime_(row.updatedAt) }))
    .sort((a, b) => (a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0) - (b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0));
}

function findBookingRow_(sh, dateKey, memberId) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { rowNumber: null };
  const values = sh.getRange(2, 1, lastRow - 1, 5).getValues();
  let latest = null;
  for (let i = 0; i < values.length; i++) {
    if (normalizeDateCell_(values[i][0]) === dateKey && String(values[i][1] || '') === String(memberId)) latest = { rowNumber: i + 2, values: values[i] };
  }
  return latest || { rowNumber: null };
}

/**
 * Mỗi ngày làm việc, ghi một suất cho các thành viên đã bật tự động.
 * Chỉ chạy một lần/ngày, trước giờ chốt và không ghi đè thao tác thủ công.
 */
function autoBookWeekdayIfNeeded_(now) {
  if (isWeekend_(now) || isLocked_(now)) return;

  const dateKey = dateKey_(now);
  if (isClosedDay_(dateKey)) return;
  const props = PropertiesService.getScriptProperties();
  const propertyKey = 'AUTO_BOOKED_' + dateKey;
  if (props.getProperty(propertyKey)) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (props.getProperty(propertyKey)) return;

    const members = getMembers_().filter(member => member.autoBook);
    // Chưa có ai bật thì để lượt tick tiếp theo xử lý, phòng trường hợp vừa bật trong ngày.
    if (!members.length) return;
    const bookings = getSheet_(APP.SHEETS.BOOKINGS);
    const existingMemberIds = new Set();
    const lastRow = bookings.getLastRow();
    if (lastRow >= 2) {
      bookings.getRange(2, 1, lastRow - 1, 5).getValues().forEach(row => {
        if (normalizeDateCell_(row[0]) === dateKey) existingMemberIds.add(String(row[1] || ''));
      });
    }

    const rowsToAdd = members
      .filter(member => !existingMemberIds.has(member.id))
      .map(member => [dateKey, member.id, member.name, 'BOOKED', now]);

    if (rowsToAdd.length) {
      bookings.getRange(bookings.getLastRow() + 1, 1, rowsToAdd.length, 5).setValues(rowsToAdd);
      rowsToAdd.forEach(row => appendAudit_(dateKey, { id: row[1], name: row[2] }, 'BOOK_AUTO', 'AUTO', '', now));
    }

    // Đánh dấu cả khi chưa có ai bật tự động để không chạy lại nhiều lần trong ngày.
    props.setProperty(propertyKey, new Date().toISOString());
  } finally {
    lock.releaseLock();
  }
}

function installAutomationTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'automationTick')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('automationTick')
    .timeBased()
    .everyMinutes(5)
    .create();
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sh.setFrozenRows(1);
  return sh;
}

function seedConfig_(ss) {
  const sh = ss.getSheetByName(APP.SHEETS.CONFIG);
  const existing = {};
  if (sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => {
      if (r[0]) existing[String(r[0])] = r[1];
    });
  }

  const defaults = [
    ['ADMIN_EMAIL', APP.ADMIN_EMAIL],
    ['CUTOFF', APP.DEFAULT_CUTOFF],
    ['APP_NAME', 'Báo cơm trưa'],
  ];

  defaults.forEach(([k, v]) => {
    if (!(k in existing)) sh.appendRow([k, v]);
  });
}

function seedDefaultMembers_(ss) {
  const sh = ss.getSheetByName(APP.SHEETS.MEMBERS);
  const lastRow = sh.getLastRow();
  const existing = new Set();

  if (lastRow >= 2) {
    sh.getRange(2, 2, lastRow - 1, 1).getValues()
      .forEach(row => existing.add(memberNameKey_(row[0])));
  }

  const rowsToAdd = APP.DEFAULT_MEMBER_NAMES
    .filter(name => !existing.has(memberNameKey_(name)))
    .map(name => [Utilities.getUuid().slice(0, 8), name, true, false]);

  if (rowsToAdd.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rowsToAdd.length, 4).setValues(rowsToAdd);
  }

  return {
    added: rowsToAdd.length,
    total: Math.max(0, sh.getLastRow() - 1),
  };
}

function formatSheets_(ss) {
  Object.values(APP.SHEETS).forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
      .setFontWeight('bold')
      .setBackground('#F3F4F6');
    sh.autoResizeColumns(1, Math.max(1, sh.getLastColumn()));
  });

  const booking = ss.getSheetByName(APP.SHEETS.BOOKINGS);
  if (booking) booking.getRange('E:E').setNumberFormat('dd/MM/yyyy HH:mm:ss');

  const audit = ss.getSheetByName(APP.SHEETS.AUDIT);
  if (audit) audit.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function getConfig_(key, fallback) {
  const sh = getSheet_(APP.SHEETS.CONFIG);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return fallback;
  const rows = sh.getRange(2, 1, lastRow - 1, 2).getValues();
  const hit = rows.find(r => String(r[0] || '') === key);
  if (!hit) return fallback;
  if (key === 'CUTOFF') return normalizeConfigTime_(hit[1], fallback);
  return String(hit[1] || fallback);
}

function normalizeConfigTime_(value, fallback) {
  if (value instanceof Date) return Utilities.formatDate(value, APP.TZ, 'HH:mm');
  if (typeof value === 'number' && isFinite(value)) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }
  return String(value || fallback);
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Thiếu sheet ${name}. Hãy chạy setupApp() trước.`);
  return sh;
}

function isLocked_(date) {
  const cutoff = getCutoff_();
  const h = Number(Utilities.formatDate(date, APP.TZ, 'H'));
  const m = Number(Utilities.formatDate(date, APP.TZ, 'm'));
  return h > cutoff.hour || (h === cutoff.hour && m >= cutoff.minute);
}

function cutoffLabel_() {
  const cutoff = getCutoff_();
  return `${String(cutoff.hour).padStart(2, '0')}:${String(cutoff.minute).padStart(2, '0')}`;
}

function getCutoff_() {
  const fallback = APP.DEFAULT_CUTOFF;
  let raw = fallback;

  try {
    raw = getConfig_('CUTOFF', fallback);
  } catch (error) {
    raw = fallback;
  }

  const match = String(raw).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: APP.CUTOFF_HOUR, minute: APP.CUTOFF_MINUTE };

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { hour: APP.CUTOFF_HOUR, minute: APP.CUTOFF_MINUTE };
  return { hour, minute };
}

function dateKey_(date) {
  return Utilities.formatDate(date, APP.TZ, 'yyyy-MM-dd');
}

function normalizeDateKey_(value) {
  const key = String(value || '').trim();
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Ngày không hợp lệ.');

  const date = dateFromKey_(key);
  if (dateKey_(date) !== key) throw new Error('Ngày không hợp lệ.');
  return key;
}

function dateFromKey_(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
}

function isWeekend_(date) {
  const [year, month, day] = dateKey_(date).split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function dateDisplay_(date) {
  return Utilities.formatDate(date, APP.TZ, 'dd/MM/yyyy');
}

function dateDisplayFromKey_(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

function monthDisplay_(key) {
  const [y, m] = key.split('-');
  return `tháng ${Number(m)}/${y}`;
}

function formatTime_(value) {
  if (!(value instanceof Date)) return '';
  return Utilities.formatDate(value, APP.TZ, 'HH:mm');
}

function formatDateTime_(value) {
  if (!(value instanceof Date)) return '';
  return Utilities.formatDate(value, APP.TZ, 'dd/MM/yyyy HH:mm');
}

function normalizeDateCell_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, APP.TZ, 'yyyy-MM-dd');
  return String(value || '').slice(0, 10);
}

function normalizeMonthKey_(value) {
  const s = String(value || '');
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM');
}

function previousMonthKey_(now) {
  const y = Number(Utilities.formatDate(now, APP.TZ, 'yyyy'));
  const m = Number(Utilities.formatDate(now, APP.TZ, 'M'));
  const d = new Date(y, m - 2, 1, 12, 0, 0);
  return Utilities.formatDate(d, APP.TZ, 'yyyy-MM');
}

function parseBool_(value) {
  if (value === true) return true;
  const s = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'có', 'co', 'x'].includes(s);
}

function memberNameKey_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function memberDisplayOrder_(a, b) {
  const priority = APP.PRIORITY_MEMBER_NAME;
  if (a.name === priority) return -1;
  if (b.name === priority) return 1;
  return a.name.localeCompare(b.name, 'vi');
}

function buildDailyEmailHtml_(now, booked, totalMembers, closedDay) {
  if (closedDay && closedDay.closed) {
    return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827"><h2>🍚 Báo cơm trưa — ${dateDisplay_(now)}</h2><div style="padding:16px;background:#fef3c7;border-radius:10px;font-weight:700">Hôm nay không tổ chức ăn trưa.</div>${closedDay.note ? `<p>Ghi chú: ${escapeHtmlServer_(closedDay.note)}</p>` : ''}</div>`;
  }
  const rows = booked.length ? booked.map((booking, index) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${index + 1}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(booking.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(booking.updatedAtDisplay)}</td></tr>`).join('') : `<tr><td colspan="3" style="padding:12px">Không có người báo cơm.</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827"><h2 style="margin-bottom:6px">🍚 Báo cơm trưa — ${dateDisplay_(now)}</h2><div style="font-size:30px;font-weight:700;margin:14px 0">${booked.length} suất</div><div style="color:#6B7280;margin-bottom:14px">Danh sách: ${booked.length}/${totalMembers} người</div><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">#</th><th align="left">Họ tên</th><th align="left">Báo lúc</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function buildMonthlyEmailHtml_(monthKey, rows, grandTotal) {
  const htmlRows = rows.map((r, i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(r.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${r.total}</td>
    </tr>`).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827">
    <h2>📊 Tổng hợp suất ăn ${monthDisplay_(monthKey)}</h2>
    <div style="font-size:28px;font-weight:700;margin:14px 0">${grandTotal} suất</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th align="left">#</th><th align="left">Họ tên</th><th align="right">Số suất</th></tr></thead>
      <tbody>${htmlRows}</tbody>
    </table>
  </div>`;
}

function escapeHtmlServer_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
