const APP = {
  TZ: 'Asia/Ho_Chi_Minh',
  SPREADSHEET_ID: '1G0rdpqR7BVVUUlhpkz97f3vRehCg1GYwc7MbP9UXAJs',
  BUILD_ID: '2026.09.04.1',
  ADMIN_EMAIL: 'vingocphuong.92@gmail.com',
  ADMIN_EMAILS: ['vingocphuong.92@gmail.com', 'anmphongandn@gmail.com'],
  CUTOFF_HOUR: 8,
  CUTOFF_MINUTE: 0,
  DEFAULT_CUTOFF: '08:00',
  PRIORITY_MEMBER_NAME: 'Đỗ Đức Cường',
  MEAL_TYPES: {
    LUNCH: 'LUNCH',
    DINNER: 'DINNER',
  },
  MEAL_STATES: {
    BOOKED: 'BOOKED',
    CANCELLED: 'CANCELLED',
    CLEARED: 'CLEARED',
  },
  RECONCILIATION_STATES: {
    OPEN: 'OPEN',
    RECONCILED: 'RECONCILED',
    NEEDS_REVIEW: 'NEEDS_REVIEW',
  },
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
    RECONCILIATION: 'DOI_SOAT',
    DAILY_SETTLEMENT: 'QUYET_TOAN_NGAY',
    MONTHLY_SETTLEMENT: 'QUYET_TOAN_THANG',
  },
  HEADERS: {
    MEMBERS: ['ID', 'HO_TEN', 'DANG_HOAT_DONG', 'TU_DONG_BAO_COM'],
    BOOKINGS: ['NGAY', 'MEMBER_ID', 'HO_TEN', 'LOAI_BUA', 'TRANG_THAI', 'CAP_NHAT_LUC'],
    AUDIT: ['THOI_GIAN', 'NGAY', 'MEMBER_ID', 'HO_TEN', 'LOAI_BUA', 'HANH_DONG', 'NGUON', 'GHI_CHU'],
    CONFIG: ['KEY', 'VALUE'],
    CLOSED_DAYS: ['NGAY', 'TRANG_THAI', 'GHI_CHU', 'CAP_NHAT_BOI', 'CAP_NHAT_LUC'],
    RECONCILIATION: ['NGAY', 'TRANG_THAI', 'DOI_SOAT_BOI', 'DOI_SOAT_LUC', 'GHI_CHU', 'SNAPSHOT_HASH'],
    DAILY_SETTLEMENT: ['NGAY', 'LUNCH_ACTUAL', 'DINNER_NOTE_COUNT', 'DINNER_NOTE', 'SOURCE', 'TRANG_THAI', 'GHI_CHU', 'CAP_NHAT_BOI', 'CAP_NHAT_LUC', 'ATTRIBUTED_LUNCH_COUNT', 'UNATTRIBUTED_LUNCH_COUNT'],
    MONTHLY_SETTLEMENT: ['THANG', 'TRANG_THAI', 'TONG_PHAN_MEM', 'TONG_QUYET_TOAN', 'CHENH_LECH', 'GHI_CHU_TOI', 'KHOA_LUC', 'KHOA_BOI', 'GHI_CHU'],
  },
  SETTLEMENT_STATES: {
    DRAFT: 'DRAFT',
    RECONCILED: 'RECONCILED',
    LOCKED: 'LOCKED',
  },
  MONTH_STATES: {
    OPEN: 'OPEN',
    RECONCILING: 'RECONCILING',
    LOCKED: 'LOCKED',
  },
};

function doGet(e) {
  const pathInfo = String((e && e.pathInfo) || '').split('/').filter(Boolean).join('/');
  const isAdminParam = String((e && e.parameter && e.parameter.admin) || '') === '1';
  const isAdmin = pathInfo === 'admin' || isAdminParam;

  if (isAdmin) {
    try {
      assertAdmin_();
      return renderAdminWebApp_();
    } catch (err) {
      return renderUnauthorizedAdminPage_();
    }
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Báo cơm trưa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderAdminWebApp_() {
  const template = HtmlService.createTemplateFromFile('AdminDashboard');
  template.isWebApp = true;
  const title = (typeof ADMIN_DASHBOARD !== 'undefined' && ADMIN_DASHBOARD.TITLE) ? ADMIN_DASHBOARD.TITLE : 'Quản trị suất ăn';
  return template
    .evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderUnauthorizedAdminPage_() {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<title>Truy cập bị từ chối</title>' +
    '<style>' +
    'body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f9fafb; color: #1f2937; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }' +
    '.card { max-width: 480px; width: 100%; background: #ffffff; border: 1px solid #fee2e2; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }' +
    '.icon { font-size: 48px; margin-bottom: 16px; }' +
    'h2 { margin: 0 0 10px; font-size: 20px; color: #991b1b; font-weight: 700; }' +
    'p { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4b5563; }' +
    '.sub { font-size: 13px; color: #6b7280; margin-top: 16px; border-top: 1px solid #f3f4f6; padding-top: 16px; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="icon">🚫</div>' +
    '<h2>Truy cập bị từ chối</h2>' +
    '<p>Tài khoản Google hiện tại không có quyền truy cập trang quản trị này.</p>' +
    '<p class="sub">Vui lòng đăng nhập đúng tài khoản quản trị được phân quyền để tiếp tục.</p>' +
    '</div></body></html>'
  ).setTitle('Truy cập bị từ chối')
   .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Chạy 1 lần sau khi tạo Apps Script hoặc khi nâng cấp hệ thống.
 * Đảm bảo đủ sheet, migrate dữ liệu cũ sang LOAI_BUA = LUNCH, và cài trigger tự động.
 */
function setupApp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy gắn Apps Script với một Google Sheet trước khi chạy setupApp().');

  const boundId = ss.getId();
  if (APP.SPREADSHEET_ID && boundId !== APP.SPREADSHEET_ID) {
    throw new Error(`Google Sheet đang mở (${boundId}) không khớp với Canonical ID (${APP.SPREADSHEET_ID}).`);
  }
  try {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', boundId);
  } catch (err) {
    // Không chặn setup nếu PropertiesService không khả dụng trong mock
  }

  ensureSheet_(ss, APP.SHEETS.MEMBERS, APP.HEADERS.MEMBERS);
  migrateBookingsSheet_(ss);
  migrateAuditSheet_(ss);
  ensureSheet_(ss, APP.SHEETS.CONFIG, APP.HEADERS.CONFIG);
  ensureSheet_(ss, APP.SHEETS.CLOSED_DAYS, APP.HEADERS.CLOSED_DAYS);
  ensureSheet_(ss, APP.SHEETS.RECONCILIATION, APP.HEADERS.RECONCILIATION);
  ensureSheet_(ss, APP.SHEETS.DAILY_SETTLEMENT, APP.HEADERS.DAILY_SETTLEMENT);
  ensureSheet_(ss, APP.SHEETS.MONTHLY_SETTLEMENT, APP.HEADERS.MONTHLY_SETTLEMENT);

  const seeded = seedDefaultMembers_(ss);
  seedConfig_(ss);
  formatSheets_(ss);
  installAutomationTriggers_();

  return `Đã khởi tạo xong. Đã thêm ${seeded.added} thành viên mặc định. Hệ thống đã nâng cấp lớp Quyết toán thực tế.`;
}

/**
 * Migrate sheet CHAM_COM sang schema 6 cột:
 * NGAY, MEMBER_ID, HO_TEN, LOAI_BUA, TRANG_THAI, CAP_NHAT_LUC.
 * Dữ liệu cũ thiếu LOAI_BUA được tự động điền 'LUNCH'.
 */
function migrateBookingsSheet_(ss) {
  let sh = ss.getSheetByName(APP.SHEETS.BOOKINGS);
  if (!sh) sh = ss.insertSheet(APP.SHEETS.BOOKINGS);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow === 0) {
    sh.getRange(1, 1, 1, APP.HEADERS.BOOKINGS.length).setValues([APP.HEADERS.BOOKINGS]);
    sh.setFrozenRows(1);
    return;
  }

  // Kiểm tra ô mẫu dòng 2 cột 4 (nếu có dữ liệu) để xác định xem cột 4 có phải là TRANG_THAI cũ không
  const sampleRow2Col4 = lastRow >= 2 ? String(sh.getRange(2, 4).getValue() || '').trim().toUpperCase() : '';
  const currentHeaders = sh.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0].map(h => String(h || '').trim().toUpperCase());
  const mealTypeHeaderIndex = currentHeaders.indexOf('LOAI_BUA');

  const needsInsert = (mealTypeHeaderIndex === -1) || ['BOOKED', 'CANCELLED', 'CLEARED'].includes(sampleRow2Col4);

  if (needsInsert) {
    // Schema cũ: NGAY (1), MEMBER_ID (2), HO_TEN (3), TRANG_THAI (4), CAP_NHAT_LUC (5)
    // Chèn cột LOAI_BUA vào sau cột HO_TEN (vị trí cột 4)
    sh.insertColumnAfter(3);
    sh.getRange(1, 4).setValue('LOAI_BUA');
    if (lastRow >= 2) {
      const colValues = [];
      for (let i = 2; i <= lastRow; i++) {
        colValues.push(['LUNCH']);
      }
      sh.getRange(2, 4, colValues.length, 1).setValues(colValues);
    }
  } else {
    // Cột đã tồn tại, kiểm tra và điền 'LUNCH' cho các ô trống
    if (lastRow >= 2) {
      const colNum = (mealTypeHeaderIndex !== -1 ? mealTypeHeaderIndex : 3) + 1;
      const values = sh.getRange(2, colNum, lastRow - 1, 1).getValues();
      let changed = false;
      for (let i = 0; i < values.length; i++) {
        const val = String(values[i][0] || '').trim();
        if (!val) {
          values[i][0] = 'LUNCH';
          changed = true;
        }
      }
      if (changed) {
        sh.getRange(2, colNum, values.length, 1).setValues(values);
      }
    }
  }

  sh.getRange(1, 1, 1, APP.HEADERS.BOOKINGS.length).setValues([APP.HEADERS.BOOKINGS]);
  sh.setFrozenRows(1);
}

/**
 * Migrate sheet NHAT_KY sang schema 8 cột có LOAI_BUA.
 */
function migrateAuditSheet_(ss) {
  let sh = ss.getSheetByName(APP.SHEETS.AUDIT);
  if (!sh) sh = ss.insertSheet(APP.SHEETS.AUDIT);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow === 0) {
    sh.getRange(1, 1, 1, APP.HEADERS.AUDIT.length).setValues([APP.HEADERS.AUDIT]);
    sh.setFrozenRows(1);
    return;
  }

  const sampleRow2Col5 = lastRow >= 2 ? String(sh.getRange(2, 5).getValue() || '').trim().toUpperCase() : '';
  const currentHeaders = sh.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0].map(h => String(h || '').trim().toUpperCase());
  const mealTypeHeaderIndex = currentHeaders.indexOf('LOAI_BUA');

  const isOldAction = sampleRow2Col5.startsWith('USER_') || sampleRow2Col5.startsWith('ADMIN_') || sampleRow2Col5.startsWith('BOOK_');
  const needsInsert = (mealTypeHeaderIndex === -1) || isOldAction;

  if (needsInsert) {
    // Chèn LOAI_BUA sau HO_TEN (vị trí cột 5)
    sh.insertColumnAfter(4);
    sh.getRange(1, 5).setValue('LOAI_BUA');
    if (lastRow >= 2) {
      const colValues = [];
      for (let i = 2; i <= lastRow; i++) {
        colValues.push(['LUNCH']);
      }
      sh.getRange(2, 5, colValues.length, 1).setValues(colValues);
    }
  } else {
    if (lastRow >= 2) {
      const colNum = (mealTypeHeaderIndex !== -1 ? mealTypeHeaderIndex : 4) + 1;
      const values = sh.getRange(2, colNum, lastRow - 1, 1).getValues();
      let changed = false;
      for (let i = 0; i < values.length; i++) {
        const val = String(values[i][0] || '').trim();
        if (!val) {
          values[i][0] = 'LUNCH';
          changed = true;
        }
      }
      if (changed) {
        sh.getRange(2, colNum, values.length, 1).setValues(values);
      }
    }
  }

  sh.getRange(1, 1, 1, APP.HEADERS.AUDIT.length).setValues([APP.HEADERS.AUDIT]);
  sh.setFrozenRows(1);
}

/**
 * Thêm những tên còn thiếu vào THANH_VIEN, không sửa hoặc xóa thành viên hiện có.
 */
function seedDefaultMembers() {
  const ss = getAppSpreadsheet_();
  if (!ss) throw new Error('Hãy gắn Apps Script với một Google Sheet trước khi chạy seedDefaultMembers().');

  ensureSheet_(ss, APP.SHEETS.MEMBERS, APP.HEADERS.MEMBERS);
  const seeded = seedDefaultMembers_(ss);
  formatSheets_(ss);
  return `Đã thêm ${seeded.added} thành viên. Hiện có ${seeded.total} thành viên trong danh sách.`;
}

/**
 * Tự sinh ID cho những thành viên chưa có ID.
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

/**
 * Dữ liệu khởi tạo cho Web App người dùng (chỉ quan tâm Cơm Trưa).
 */
function getInitialData() {
  const now = new Date();
  const dateKey = dateKey_(now);
  const members = getMembers_();
  const bookings = getBookingsForDate_(dateKey, APP.MEAL_TYPES.LUNCH);
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

/**
 * Thống kê tháng: phân tách Cơm Trưa (lunch), Cơm Tối (dinner) và Tổng (total).
 * Quy tắc đếm: tối đa 1 suất/người/ngày/bữa.
 */
function getMonthlySummary_(monthKey) {
  const normalized = normalizeMonthKey_(monthKey);
  const members = getMembers_(true);
  const lunchCounts = {};
  const dinnerCounts = {};
  members.forEach(member => {
    lunchCounts[member.id] = 0;
    dinnerCounts[member.id] = 0;
  });

  const states = getFinalBookingStateMap_(normalized);
  const closedDays = getClosedDayMap_(normalized);
  const dailySoftwareLunch = {};

  Object.keys(states).forEach(key => {
    const state = states[key];
    if (state.status === APP.MEAL_STATES.BOOKED && !closedDays[state.dateKey]) {
      if (state.mealType === APP.MEAL_TYPES.LUNCH) {
        if (state.memberId in lunchCounts) lunchCounts[state.memberId]++;
        dailySoftwareLunch[state.dateKey] = (dailySoftwareLunch[state.dateKey] || 0) + 1;
      } else if (state.mealType === APP.MEAL_TYPES.DINNER) {
        if (state.memberId in dinnerCounts) dinnerCounts[state.memberId]++;
      }
    }
  });

  const rows = members.map(member => {
    const lunch = lunchCounts[member.id] || 0;
    const dinner = dinnerCounts[member.id] || 0;
    return {
      memberId: member.id,
      name: member.name,
      active: member.active,
      lunch,
      dinner,
      total: lunch, // CƠM TRƯA LÀ PHẦN DUY NHẤT DÙNG ĐỂ QUYẾT TOÁN TIỀN
    };
  }).sort((a, b) => b.total - a.total || memberDisplayOrder_(a, b));

  const settlements = getMonthlySettlementMap_(normalized);
  const allDates = new Set(Object.keys(dailySoftwareLunch).concat(Object.keys(settlements)));
  let totalSoftwareLunch = 0;
  let totalOfficialLunch = 0;
  let totalDinnerNotes = 0;

  allDates.forEach(dKey => {
    const sw = dailySoftwareLunch[dKey] || 0;
    const st = settlements[dKey];
    const act = (st && st.lunchActual !== null && st.lunchActual !== '' && !isNaN(st.lunchActual))
      ? Number(st.lunchActual)
      : sw;
    totalSoftwareLunch += sw;
    totalOfficialLunch += act;
    totalDinnerNotes += (st && st.dinnerNoteCount) ? Number(st.dinnerNoteCount) : 0;
  });

  const totalDiff = totalOfficialLunch - totalSoftwareLunch;
  const monthStatus = getMonthSettlementStatus_(normalized);

  return {
    month: normalized,
    monthKey: normalized,
    monthLabel: monthDisplay_(normalized),
    totalSoftwareLunch,
    totalOfficialLunch,
    totalPayable: totalOfficialLunch, // CƠM TRƯA LÀ PHẦN DUY NHẤT DÙNG ĐỂ QUYẾT TOÁN TIỀN
    totalLunch: totalSoftwareLunch,   // Giữ tương thích
    totalDinner: totalDinnerNotes,    // Chỉ mang tính chất ghi chú tham khảo
    total: totalOfficialLunch,        // Tổng quyết toán chính thức
    diff: totalDiff,
    dinnerNotes: totalDinnerNotes,
    monthStatus: monthStatus.status || APP.MONTH_STATES.OPEN,
    rows,
  };
}

/**
 * Lấy dữ liệu quyết toán của một ngày từ QUYET_TOAN_NGAY.
 */
function getDailySettlement_(dateKey) {
  try {
    const sh = getSheet_(APP.SHEETS.DAILY_SETTLEMENT);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return null;

    const numCols = Math.max(11, sh.getLastColumn());
    const values = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
    let hit = null;
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rDate = normalizeDateCell_(row[0]);
      if (rDate === dateKey) {
        hit = {
          rowNumber: i + 2,
          dateKey: rDate,
          lunchActual: (row[1] !== '' && row[1] !== null && !isNaN(row[1])) ? Number(row[1]) : null,
          dinnerNoteCount: (row[2] !== '' && row[2] !== null && !isNaN(row[2])) ? Number(row[2]) : 0,
          dinnerNote: String(row[3] || '').trim(),
          source: String(row[4] || '').trim(),
          status: String(row[5] || '').trim().toUpperCase() || APP.SETTLEMENT_STATES.DRAFT,
          note: String(row[6] || '').trim(),
          updatedBy: String(row[7] || '').trim(),
          updatedAt: row[8],
          attributedLunchCount: (row[9] !== '' && row[9] !== null && row[9] !== undefined && !isNaN(row[9])) ? Number(row[9]) : null,
          unattributedLunchCount: (row[10] !== '' && row[10] !== null && row[10] !== undefined && !isNaN(row[10])) ? Number(row[10]) : null,
        };
      }
    }
    return hit;
  } catch (err) {
    return null;
  }
}

/**
 * Lấy map quyết toán theo ngày cho cả tháng từ QUYET_TOAN_NGAY.
 */
function getMonthlySettlementMap_(monthKey) {
  const map = {};
  try {
    const sh = getSheet_(APP.SHEETS.DAILY_SETTLEMENT);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return map;

    const numCols = Math.max(11, sh.getLastColumn());
    const values = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rDate = normalizeDateCell_(row[0]);
      if (rDate && (!monthKey || rDate.startsWith(monthKey))) {
        map[rDate] = {
          rowNumber: i + 2,
          dateKey: rDate,
          lunchActual: (row[1] !== '' && row[1] !== null && !isNaN(row[1])) ? Number(row[1]) : null,
          dinnerNoteCount: (row[2] !== '' && row[2] !== null && !isNaN(row[2])) ? Number(row[2]) : 0,
          dinnerNote: String(row[3] || '').trim(),
          source: String(row[4] || '').trim(),
          status: String(row[5] || '').trim().toUpperCase() || APP.SETTLEMENT_STATES.DRAFT,
          note: String(row[6] || '').trim(),
          updatedBy: String(row[7] || '').trim(),
          updatedAt: row[8],
          attributedLunchCount: (row[9] !== '' && row[9] !== null && row[9] !== undefined && !isNaN(row[9])) ? Number(row[9]) : null,
          unattributedLunchCount: (row[10] !== '' && row[10] !== null && row[10] !== undefined && !isNaN(row[10])) ? Number(row[10]) : null,
        };
      }
    }
  } catch (err) {}
  return map;
}

/**
 * Cập nhật hoặc thêm mới dòng quyết toán ngày trong QUYET_TOAN_NGAY.
 */
function upsertDailySettlement_(dateKey, data, userEmail) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getAppSpreadsheet_();
    if (ss) ensureSheet_(ss, APP.SHEETS.DAILY_SETTLEMENT, APP.HEADERS.DAILY_SETTLEMENT);
    const sh = getSheet_(APP.SHEETS.DAILY_SETTLEMENT);
    const existing = getDailySettlement_(dateKey);
    const now = new Date();

    const lunchActual = (data.lunchActual !== null && data.lunchActual !== '' && !isNaN(data.lunchActual))
      ? Number(data.lunchActual)
      : '';
    const dinnerNoteCount = (data.dinnerNoteCount !== null && data.dinnerNoteCount !== '' && !isNaN(data.dinnerNoteCount))
      ? Number(data.dinnerNoteCount)
      : 0;
    const dinnerNote = data.dinnerNote !== undefined ? String(data.dinnerNote).trim() : (existing ? existing.dinnerNote : '');
    const source = data.source || (existing ? existing.source : 'ADMIN');
    const status = (data.status || (existing ? existing.status : APP.SETTLEMENT_STATES.DRAFT)).toUpperCase();
    const note = data.note !== undefined ? String(data.note).trim() : (existing ? existing.note : '');
    const updatedBy = userEmail || String(Session.getActiveUser().getEmail() || 'ADMIN');

    const attributedLunchCount = (data.attributedLunchCount !== undefined && data.attributedLunchCount !== null && data.attributedLunchCount !== '' && !isNaN(data.attributedLunchCount))
      ? Number(data.attributedLunchCount)
      : (existing && existing.attributedLunchCount !== null ? existing.attributedLunchCount : '');
    const unattributedLunchCount = (data.unattributedLunchCount !== undefined && data.unattributedLunchCount !== null && data.unattributedLunchCount !== '' && !isNaN(data.unattributedLunchCount))
      ? Number(data.unattributedLunchCount)
      : (existing && existing.unattributedLunchCount !== null ? existing.unattributedLunchCount : '');

    const row = [dateKey, lunchActual, dinnerNoteCount, dinnerNote, source, status, note, updatedBy, now, attributedLunchCount, unattributedLunchCount];

    if (existing && existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 11).setValues([row]);
    } else {
      sh.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lấy trạng thái chốt sổ của tháng từ QUYET_TOAN_THANG.
 */
function getMonthSettlementStatus_(monthKey) {
  try {
    const sh = getSheet_(APP.SHEETS.MONTHLY_SETTLEMENT);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { status: APP.MONTH_STATES.OPEN, note: '', lockedBy: '', lockedAt: '' };

    const values = sh.getRange(2, 1, lastRow - 1, 9).getValues();
    let hit = null;
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (String(row[0] || '').trim() === monthKey) {
        hit = {
          rowNumber: i + 2,
          monthKey,
          status: String(row[1] || '').trim().toUpperCase() || APP.MONTH_STATES.OPEN,
          totalSoftware: Number(row[2] || 0),
          totalOfficial: Number(row[3] || 0),
          diff: Number(row[4] || 0),
          dinnerNotes: Number(row[5] || 0),
          lockedAt: row[6],
          lockedBy: String(row[7] || '').trim(),
          note: String(row[8] || '').trim(),
        };
      }
    }
    return hit || { status: APP.MONTH_STATES.OPEN, note: '', lockedBy: '', lockedAt: '' };
  } catch (err) {
    return { status: APP.MONTH_STATES.OPEN, note: '', lockedBy: '', lockedAt: '' };
  }
}

/**
 * Cập nhật trạng thái chốt sổ của tháng trong QUYET_TOAN_THANG.
 */
function setMonthSettlementStatus_(monthKey, status, note, userEmail, stats) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getAppSpreadsheet_();
    if (ss) ensureSheet_(ss, APP.SHEETS.MONTHLY_SETTLEMENT, APP.HEADERS.MONTHLY_SETTLEMENT);
    const sh = getSheet_(APP.SHEETS.MONTHLY_SETTLEMENT);
    const existing = getMonthSettlementStatus_(monthKey);
    const now = new Date();
    const by = userEmail || String(Session.getActiveUser().getEmail() || 'ADMIN');
    const s = (status || APP.MONTH_STATES.OPEN).toUpperCase();

    const row = [
      monthKey,
      s,
      stats ? stats.totalSoftware : (existing ? existing.totalSoftware : 0),
      stats ? stats.totalOfficial : (existing ? existing.totalOfficial : 0),
      stats ? stats.diff : (existing ? existing.diff : 0),
      stats ? stats.dinnerNotes : (existing ? existing.dinnerNotes : 0),
      s === APP.MONTH_STATES.LOCKED ? now : (existing ? existing.lockedAt : ''),
      by,
      note !== undefined ? note : (existing ? existing.note : ''),
    ];

    if (existing && existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 9).setValues([row]);
    } else {
      sh.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Xác định một ngày có tổ chức dịch vụ ăn trưa hay không.
 * Ngày thường: mặc định có (trừ khi đóng là ngày nghỉ).
 * Cuối tuần: chỉ có khi Admin chủ động bật SERVICE_DAY.
 */
function isMealServiceDay_(date) {
  const dKey = dateKey_(date);
  if (isClosedDay_(dKey)) return false;
  if (!isWeekend_(date)) return true;
  return getConfig_('SERVICE_DAY_' + dKey, '0') === '1';
}

/**
 * Thành viên tự đối soát trừ suất cơm trưa cuối tháng.
 * Chỉ thực hiện được khi tháng chưa bị KHÓA (LOCKED).
 */
function userSelfRemoveLunch(dateKey, memberId) {
  const normDate = normalizeDateKey_(dateKey);
  const monthKey = normDate.slice(0, 7);
  const monthStatus = getMonthSettlementStatus_(monthKey);
  if (monthStatus && monthStatus.status === APP.MONTH_STATES.LOCKED) {
    throw new Error(`Tháng ${monthKey} đã được chốt sổ (LOCKED), không thể tự trừ suất.`);
  }

  const member = getMemberById_(memberId, true);
  if (!member) throw new Error('Không tìm thấy thành viên.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_(APP.SHEETS.BOOKINGS);
    const existing = findBookingRow_(sh, normDate, member.id, APP.MEAL_TYPES.LUNCH);
    if (!existing.rowNumber) {
      throw new Error('Bạn không có suất cơm trưa để trừ trong ngày này.');
    }

    const currentRows = getBookingRows_().filter(r => r.dateKey === normDate && r.memberId === member.id && r.mealType === APP.MEAL_TYPES.LUNCH);
    const latestState = currentRows.length ? currentRows[currentRows.length - 1] : null;
    if (!latestState || latestState.status !== APP.MEAL_STATES.BOOKED) {
      throw new Error('Bạn không có suất cơm trưa hợp lệ để trừ trong ngày này.');
    }

    const now = new Date();
    const row = [normDate, member.id, member.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.CANCELLED, now];
    sh.appendRow(row);
    appendAudit_(normDate, member, APP.MEAL_TYPES.LUNCH, 'USER_SELF_REMOVE_LUNCH', 'USER', 'Thành viên tự đối soát trừ suất cuối tháng', now);
  } finally {
    lock.releaseLock();
  }

  return { ok: true, message: `Đã trừ suất cơm ngày ${dateDisplayFromKey_(normDate)} thành công.` };
}

/**
 * Danh sách số liệu thực tế tháng 8/2026 đối soát theo sổ tay của hội cơm.
 * BẮT BUỘC: tổng suất trưa = 181, tổng ghi chú tối = 8, số ngày = 19.
 */
const AUGUST_2026_ACTUAL_LUNCH = [
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

/**
 * Nạp số liệu quyết toán thực tế tháng 8/2026 vào QUYET_TOAN_NGAY an toàn & idempotent.
 */
function seedAugust2026ActualSettlement() {
  const ss = getAppSpreadsheet_();
  if (!ss) throw new Error('Không tìm thấy Google Sheet đang hoạt động.');

  const totalLunch = AUGUST_2026_ACTUAL_LUNCH.reduce((sum, item) => sum + item.lunch, 0);
  const totalDinner = AUGUST_2026_ACTUAL_LUNCH.reduce((sum, item) => sum + item.dinner, 0);
  if (totalLunch !== 181) {
    throw new Error(`ASSERTION FAILED: Tổng suất trưa phải là 181, thực tế tính được ${totalLunch}. DỪNG LẠI!`);
  }
  if (totalDinner !== 8) {
    throw new Error(`ASSERTION FAILED: Tổng ghi chú tối phải là 8, thực tế tính được ${totalDinner}. DỪNG LẠI!`);
  }
  if (AUGUST_2026_ACTUAL_LUNCH.length !== 19) {
    throw new Error(`ASSERTION FAILED: Số ngày phải là 19, thực tế ${AUGUST_2026_ACTUAL_LUNCH.length}. DỪNG LẠI!`);
  }

  ensureSheet_(ss, APP.SHEETS.DAILY_SETTLEMENT, APP.HEADERS.DAILY_SETTLEMENT);
  const sh = getSheet_(APP.SHEETS.DAILY_SETTLEMENT);

  const existingMap = getMonthlySettlementMap_('2026-08');
  const now = new Date();
  const noteDesc = 'Đối soát lịch sử tháng 8/2026 theo sổ thực tế của hội cơm.';

  // Kiểm tra xung đột dữ liệu thủ công
  AUGUST_2026_ACTUAL_LUNCH.forEach(item => {
    const ex = existingMap[item.date];
    if (ex && ex.lunchActual !== null) {
      if (ex.lunchActual !== item.lunch && !ex.source.startsWith('OWNER_NOTEBOOK')) {
        throw new Error(`Xung đột dữ liệu ngày ${item.date}: Sheet có ${ex.lunchActual} suất (Source: ${ex.source}), dữ liệu nạp là ${item.lunch}. Dừng lại!`);
      }
    }
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    AUGUST_2026_ACTUAL_LUNCH.forEach(item => {
      const ex = existingMap[item.date];
      const row = [
        item.date,
        item.lunch,
        item.dinner,
        item.dinnerNote,
        item.source,
        APP.SETTLEMENT_STATES.RECONCILED,
        noteDesc,
        'SEED_AUGUST',
        now,
      ];
      if (ex && ex.rowNumber) {
        sh.getRange(ex.rowNumber, 1, 1, 9).setValues([row]);
      } else {
        sh.appendRow(row);
      }
    });

    const augStats = {
      totalSoftware: 165,
      totalOfficial: 181,
      diff: 16,
      dinnerNotes: 8,
    };
    setMonthSettlementStatus_('2026-08', APP.MONTH_STATES.RECONCILING, noteDesc, 'SEED_AUGUST', augStats);
  } finally {
    lock.releaseLock();
  }

  return {
    month: '2026-08',
    lunchActual: totalLunch,
    dinnerNoteCount: totalDinner,
    daysReconciled: AUGUST_2026_ACTUAL_LUNCH.length,
  };
}

/**
 * Khôi phục danh sách người ăn trưa cấp thành viên cho 3 ngày tháng 8/2026 có bằng chứng Zalo
 * (22/08/2026, 23/08/2026, 31/08/2026) mà không bịa người và không thay đổi tổng số quyết toán.
 */
function reconcilePersonLevelAugustDates_() {
  const ss = getAppSpreadsheet_();
  if (!ss) throw new Error('Không tìm thấy Spreadsheet.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const shBookings = getSheet_(APP.SHEETS.BOOKINGS);
    const now = new Date();

    const CONFIRMED_MEMBERS = {
      HIEP: { id: '2a4c7a46', name: 'Nguyễn Hoàng Hiệp' },
      HUNG: { id: 'df3ff56c', name: 'Phạm Việt Hùng' },
      THINH: { id: '4791e1e0', name: 'Nguyễn Toàn Thịnh' },
      CONG: { id: 'e25e94de', name: 'Nguyễn Văn Công' },
      NAM: { id: '193ddfb8', name: 'Bùi Hiếu Nam' },
    };

    // 1. 2026-08-23 (Chủ nhật): Bằng chứng Zalo "trưa được Phạm Hùng, Thịnh" -> LUNCH_ACTUAL = 2
    const date23 = '2026-08-23';
    const target23 = [CONFIRMED_MEMBERS.HUNG, CONFIRMED_MEMBERS.THINH];
    const states23 = getFinalBookingStateMap_('2026-08');
    target23.forEach(m => {
      const cur = states23[`${date23}|${m.id}|${APP.MEAL_TYPES.LUNCH}`];
      if (!cur || cur.status !== APP.MEAL_STATES.BOOKED) {
        shBookings.appendRow([date23, m.id, m.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.BOOKED, now]);
        appendAudit_(date23, m, APP.MEAL_TYPES.LUNCH, 'OWNER_ZALO_RECONCILIATION', 'ADMIN', 'Khôi phục theo Zalo ngày 23/08/2026.', now);
      }
    });
    upsertDailySettlement_(date23, {
      lunchActual: 2,
      dinnerNoteCount: 2,
      dinnerNote: 'Zalo: trưa Phạm Hùng, Thịnh; chiều Phạm Hùng, Thịnh. Lunch quyết toán = 2.',
      source: 'OWNER_NOTEBOOK_ZALO',
      status: APP.SETTLEMENT_STATES.RECONCILED,
      note: 'Khôi phục theo Zalo ngày 23/08/2026.',
      attributedLunchCount: 2,
      unattributedLunchCount: 0,
    });

    // 2. 2026-08-22 (Thứ bảy): Bằng chứng Zalo "Hiệp, Hùng, Thịnh, Công, Nam" -> LUNCH_ACTUAL = 6
    const date22 = '2026-08-22';
    const target22 = [
      CONFIRMED_MEMBERS.HIEP,
      CONFIRMED_MEMBERS.HUNG,
      CONFIRMED_MEMBERS.THINH,
      CONFIRMED_MEMBERS.CONG,
      CONFIRMED_MEMBERS.NAM,
    ];
    const states22 = getFinalBookingStateMap_('2026-08');
    target22.forEach(m => {
      const cur = states22[`${date22}|${m.id}|${APP.MEAL_TYPES.LUNCH}`];
      if (!cur || cur.status !== APP.MEAL_STATES.BOOKED) {
        shBookings.appendRow([date22, m.id, m.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.BOOKED, now]);
        appendAudit_(date22, m, APP.MEAL_TYPES.LUNCH, 'OWNER_ZALO_RECONCILIATION', 'ADMIN', 'Khôi phục theo Zalo ngày 22/08/2026 (5 người xác nhận).', now);
      }
    });
    upsertDailySettlement_(date22, {
      lunchActual: 6,
      dinnerNoteCount: 0,
      dinnerNote: '',
      source: 'OWNER_NOTEBOOK_ZALO',
      status: APP.SETTLEMENT_STATES.RECONCILED,
      note: 'Khôi phục theo Zalo ngày 22/08/2026 (xác nhận 5 người: Hiệp, Hùng, Thịnh, Công, Nam; 1 suất chưa xác định người).',
      attributedLunchCount: 5,
      unattributedLunchCount: 1,
    });

    // 3. 2026-08-31 (Thứ hai): Bằng chứng Zalo "Trưa 31/8: Hiệp - Thành - Công - Nam" -> LUNCH_ACTUAL = 4
    const date31 = '2026-08-31';
    const proven31Ids = new Set([
      CONFIRMED_MEMBERS.HIEP.id,
      CONFIRMED_MEMBERS.CONG.id,
      CONFIRMED_MEMBERS.NAM.id,
    ]);
    const states31 = getFinalBookingStateMap_('2026-08');

    // Ensure proven 3 are BOOKED
    [CONFIRMED_MEMBERS.HIEP, CONFIRMED_MEMBERS.CONG, CONFIRMED_MEMBERS.NAM].forEach(m => {
      const cur = states31[`${date31}|${m.id}|${APP.MEAL_TYPES.LUNCH}`];
      if (!cur || cur.status !== APP.MEAL_STATES.BOOKED) {
        shBookings.appendRow([date31, m.id, m.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.BOOKED, now]);
        appendAudit_(date31, m, APP.MEAL_TYPES.LUNCH, 'OWNER_ZALO_RECONCILIATION', 'ADMIN', 'Khôi phục theo Zalo ngày 31/08/2026.', now);
      }
    });

    // For any other member currently BOOKED for Lunch on 31/08 due to legacy auto-book, cancel them audit-safely
    const allMembers = getMembers_(true);
    allMembers.forEach(m => {
      if (!proven31Ids.has(m.id)) {
        const cur = states31[`${date31}|${m.id}|${APP.MEAL_TYPES.LUNCH}`];
        if (cur && cur.status === APP.MEAL_STATES.BOOKED) {
          shBookings.appendRow([date31, m.id, m.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.CANCELLED, now]);
          appendAudit_(date31, m, APP.MEAL_TYPES.LUNCH, 'OWNER_ZALO_RECONCILIATION', 'ADMIN', 'Điều chỉnh theo Zalo ngày 31/08/2026 (chỉ xác nhận Hiệp, Công, Nam; không xác định Thành cụ thể).', now);
        }
      }
    });

    upsertDailySettlement_(date31, {
      lunchActual: 4,
      dinnerNoteCount: 4,
      dinnerNote: 'Zalo: Trưa Hiệp, Thành, Cường, Nam; chiều Hiệp, Thành, Nam, Thịnh. Lunch quyết toán = 4.',
      source: 'OWNER_NOTEBOOK_ZALO',
      status: APP.SETTLEMENT_STATES.RECONCILED,
      note: 'Khôi phục theo Zalo ngày 31/08/2026 (xác nhận Hiệp, Công, Nam; Thành chưa xác định cụ thể; 1 suất chưa xác định người).',
      attributedLunchCount: 3,
      unattributedLunchCount: 1,
    });

    return {
      ok: true,
      restored: {
        '2026-08-22': { actual: 6, attributed: 5, unattributed: 1 },
        '2026-08-23': { actual: 2, attributed: 2, unattributed: 0 },
        '2026-08-31': { actual: 4, attributed: 3, unattributed: 1 },
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function bookToday(memberId) {
  return changeBooking_(memberId, 'BOOK');
}

function cancelToday(memberId) {
  return changeBooking_(memberId, 'CANCEL');
}

/**
 * Lưu yêu cầu hủy cơm trưa cho một ngày làm việc trong tương lai.
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
    const existing = findBookingRow_(sh, dateKey, member.id, APP.MEAL_TYPES.LUNCH);
    const row = [dateKey, member.id, member.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.CANCELLED, now];

    if (existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 6).setValues([row]);
    } else {
      sh.appendRow(row);
    }
    appendAudit_(dateKey, member, APP.MEAL_TYPES.LUNCH, 'USER_CANCEL_FUTURE', 'USER', '');
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
    if (row.memberId !== member.id || row.dateKey <= todayKey || row.mealType !== APP.MEAL_TYPES.LUNCH || row.status !== APP.MEAL_STATES.CANCELLED) return;
    const previous = seen[row.dateKey];
    if (!previous || row.rowNumber >= previous.rowNumber) seen[row.dateKey] = row;
  });
  return {
    ok: true,
    member: member.name,
    days: Object.keys(seen)
      .map(dateKey => ({ dateKey, dateLabel: dateDisplayFromKey_(dateKey) }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
  };
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
    appendAudit_(dateKey_(now), member, APP.MEAL_TYPES.LUNCH, autoBook ? 'AUTO_BOOK_ON' : 'AUTO_BOOK_OFF', 'USER', '');
  } finally {
    lock.releaseLock();
  }

  return getInitialData();
}

/**
 * Người dùng báo/hủy cơm trưa hôm nay (luôn là LUNCH).
 */
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
    const existing = findBookingRow_(sh, dateKey, member.id, APP.MEAL_TYPES.LUNCH);
    const status = action === 'BOOK' ? APP.MEAL_STATES.BOOKED : APP.MEAL_STATES.CANCELLED;
    const row = [dateKey, member.id, member.name, APP.MEAL_TYPES.LUNCH, status, now];

    if (existing.rowNumber) {
      sh.getRange(existing.rowNumber, 1, 1, 6).setValues([row]);
    } else {
      sh.appendRow(row);
    }
    appendAudit_(dateKey, member, APP.MEAL_TYPES.LUNCH, action === 'BOOK' ? 'USER_BOOK' : 'USER_CANCEL', 'USER', '');
  } finally {
    lock.releaseLock();
  }

  return getInitialData();
}

/**
 * Đọc tất cả dòng từ CHAM_COM, hỗ trợ cả sheet 6 cột và sheet 5 cột (legacy).
 */
function getBookingRows_() {
  const sh = getSheet_(APP.SHEETS.BOOKINGS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const maxCol = Math.max(sh.getLastColumn(), 6);
  const rawValues = sh.getRange(2, 1, lastRow - 1, maxCol).getValues();

  return rawValues.map((row, index) => {
    const col3 = String(row[3] || '').trim().toUpperCase();
    const col4 = String(row[4] || '').trim().toUpperCase();

    let mealType = APP.MEAL_TYPES.LUNCH;
    let status = '';
    let updatedAt = row[4];

    // Xác định thông minh theo giá trị thực tế của từng dòng để tương thích 100% cả sheet 5 cột và 6 cột:
    if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col3)) {
      // Dòng 5 cột chuẩn: cột D (index 3) là TRANG_THAI, cột E (index 4) là CAP_NHAT_LUC
      mealType = APP.MEAL_TYPES.LUNCH;
      status = col3;
      updatedAt = row[4];
    } else if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col4)) {
      // Dòng 6 cột: cột D (index 3) là LOAI_BUA, cột E (index 4) là TRANG_THAI, cột F (index 5) là CAP_NHAT_LUC
      mealType = normalizeMealType_(col3);
      status = col4;
      updatedAt = row[5];
    } else if (['DINNER', 'TOI', 'COM_TOI', 'TỐI'].includes(col3)) {
      mealType = APP.MEAL_TYPES.DINNER;
      status = col4;
      updatedAt = row[5];
    } else {
      // Fallback an toàn: nếu col3 có giá trị thì là status 5 cột, nếu không lấy col4
      mealType = APP.MEAL_TYPES.LUNCH;
      status = col3 || col4;
      updatedAt = row[4];
    }

    return {
      rowNumber: index + 2,
      dateKey: normalizeDateCell_(row[0]),
      memberId: String(row[1] || '').trim(),
      name: String(row[2] || '').trim(),
      mealType,
      status,
      updatedAt,
    };
  });
}

function normalizeMealType_(value) {
  const s = String(value || '').trim().toUpperCase();
  if (s === 'DINNER' || s === 'TOI' || s === 'COM_TOI' || s === 'TỐI') {
    return APP.MEAL_TYPES.DINNER;
  }
  return APP.MEAL_TYPES.LUNCH;
}

/**
 * Reducer lấy trạng thái cuối cùng cho từng (dateKey, memberId, mealType) trong tháng.
 */
function getFinalBookingStateMap_(monthKey) {
  const normalized = normalizeMonthKey_(monthKey);
  const states = {};
  getBookingRows_().forEach(row => {
    if (!row.dateKey.startsWith(normalized + '-')) return;
    const key = `${row.dateKey}|${row.memberId}|${row.mealType}`;
    const previous = states[key];
    if (!previous || row.rowNumber >= previous.rowNumber) states[key] = row;
  });
  return states;
}

/**
 * Reducer lấy trạng thái cuối cùng cho từng (memberId, mealType) trong 1 ngày cụ thể.
 */
function getFinalBookingStateForDate_(dateKey) {
  const states = {};
  getBookingRows_().forEach(row => {
    if (row.dateKey !== dateKey) return;
    const key = `${row.memberId}|${row.mealType}`;
    const previous = states[key];
    if (!previous || row.rowNumber >= previous.rowNumber) states[key] = row;
  });
  return states;
}

function appendAudit_(dateKey, member, mealType, action, source, note, at) {
  const sh = getSheet_(APP.SHEETS.AUDIT);
  sh.appendRow([
    at || new Date(),
    dateKey || '',
    member && member.id ? member.id : '',
    member && member.name ? member.name : '',
    mealType || APP.MEAL_TYPES.LUNCH,
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

/**
 * Lịch sử theo dõi suất ăn của thành viên trong tháng (cho người dùng thường).
 * Phân tách rõ Trưa và Tối.
 */
function getMonthlyHistory(memberId, monthKey) {
  const member = getMemberById_(memberId, true);
  if (!member) throw new Error('Không tìm thấy thành viên.');
  const normalized = normalizeMonthKey_(monthKey);
  const states = getFinalBookingStateMap_(normalized);
  const closedDays = getClosedDayMap_(normalized);
  const monthStatus = getMonthSettlementStatus_(normalized);
  const isLocked = Boolean(monthStatus && monthStatus.status === APP.MONTH_STATES.LOCKED);

  const days = Object.keys(states)
    .map(key => states[key])
    .filter(row => row.memberId === member.id && row.status === APP.MEAL_STATES.BOOKED && !closedDays[row.dateKey])
    .map(row => ({
      dateKey: row.dateKey,
      dateLabel: dateDisplayFromKey_(row.dateKey),
      mealType: row.mealType,
      mealLabel: row.mealType === APP.MEAL_TYPES.DINNER ? 'Cơm tối' : 'Cơm trưa',
      updatedAt: formatDateTime_(row.updatedAt),
      canSelfRemove: row.mealType === APP.MEAL_TYPES.LUNCH && !isLocked,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || (a.mealType === APP.MEAL_TYPES.LUNCH ? -1 : 1));

  const lunchCount = days.filter(d => d.mealType === APP.MEAL_TYPES.LUNCH).length;
  const dinnerCount = days.filter(d => d.mealType === APP.MEAL_TYPES.DINNER).length;

  const reconciliationNotice = (normalized === '2026-08')
    ? 'Tháng 8/2026 được đối soát từ sổ thực tế. Một số suất lịch sử chưa xác định được người cụ thể.'
    : '';

  return {
    ok: true,
    member: member.name,
    month: normalized,
    monthLabel: monthDisplay_(normalized),
    lunchCount,
    dinnerCount,
    total: lunchCount, // Cơm trưa là phần duy nhất dùng để quyết toán
    isLocked,
    monthStatus: monthStatus.status || APP.MONTH_STATES.OPEN,
    reconciliationNotice,
    days,
  };
}

/**
 * Trigger định kỳ: Tự báo cơm trưa ngày làm việc và gửi báo cáo khi tới giờ chốt.
 */
function automationTick() {
  const now = new Date();
  autoBookWeekdayIfNeeded_(now);
  const cutoff = getCutoff_();
  const hour = Number(Utilities.formatDate(now, APP.TZ, 'H'));
  const minute = Number(Utilities.formatDate(now, APP.TZ, 'm'));
  const day = Number(Utilities.formatDate(now, APP.TZ, 'd'));

  // Báo cáo ngày: chỉ báo cơm trưa, sau giờ chốt trong CAU_HINH, chỉ gửi 1 lần/ngày.
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
  return sendDailySummary_(new Date(), true);
}

function sendPreviousMonthSummaryNow() {
  return sendMonthlySummary_(previousMonthKey_(new Date()), true);
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

/**
 * Gửi email báo cáo cơm trưa hằng ngày.
 * Email chỉ tổng hợp LUNCH. Snapshot hash chỉ phụ thuộc LUNCH.
 */
function sendDailySummaryForDate_(dateKey, manual) {
  const closedDay = getClosedDay_(dateKey);
  const booked = closedDay.closed ? [] : getBookingsForDate_(dateKey, APP.MEAL_TYPES.LUNCH);
  const totalMembers = getMembers_().length;
  const snapshot = dailySnapshotHash_(dateKey, booked, closedDay.closed);
  const props = PropertiesService.getScriptProperties();
  const previous = readDailyEmailRecord_(dateKey);
  const isUpdate = Boolean(previous && (!previous.hash || previous.hash !== snapshot));
  const dateLabel = dateDisplayFromKey_(dateKey);
  const subject = isUpdate
    ? `🍚 [CẬP NHẬT] Báo cơm trưa ${dateLabel}: ${booked.length} suất`
    : `🍚 Báo cơm trưa ${dateLabel}: ${booked.length} suất`;
  const body = closedDay.closed
    ? [
        `BÁO CƠM TRƯA — ${dateLabel}`,
        '',
        'Hôm nay không tổ chức ăn trưa.',
        closedDay.note ? `Ghi chú: ${closedDay.note}` : '',
        '',
        manual ? '(Email được gửi thủ công từ Dashboard)' : `Hệ thống tự chốt lúc ${cutoffLabel_()}.`,
      ].join('\n')
    : [
        `BÁO CƠM TRƯA — ${dateLabel}`,
        '',
        `Tổng số suất trưa: ${booked.length}`,
        `Số người trong danh sách: ${totalMembers}`,
        '',
        'Danh sách đã báo cơm trưa:',
        booked.map((b, i) => `${i + 1}. ${b.name}`).join('\n') || 'Không có người báo cơm trưa.',
        '',
        manual ? '(Email được gửi thủ công từ Dashboard)' : `Hệ thống tự chốt lúc ${cutoffLabel_()}.`,
      ].join('\n');

  MailApp.sendEmail({
    to: getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL),
    subject,
    body,
    htmlBody: buildDailyEmailHtml_(dateFromKey_(dateKey), booked, totalMembers, closedDay),
    name: 'Báo cơm trưa',
  });

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
  const currentLunch = closedDay.closed ? [] : getBookingsForDate_(dateKey, APP.MEAL_TYPES.LUNCH);
  const currentHash = dailySnapshotHash_(dateKey, currentLunch, closedDay.closed);
  return {
    sent: true,
    dirty: record.hash !== currentHash,
    sentAt: record.sentAt || '',
    total: record.total,
  };
}

/**
 * Hash chỉ dựa trên ngày, trạng thái ngày nghỉ và danh sách ID thành viên đặt LUNCH.
 * Sửa DINNER tuyệt đối không làm đổi hash này.
 */
function dailySnapshotHash_(dateKey, bookedLunch, closed) {
  const payload = JSON.stringify({
    dateKey,
    closed: Boolean(closed),
    booked: (bookedLunch || []).map(item => item.memberId).sort(),
  });
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

/**
 * Gửi email tổng kết tháng: Tách rõ Trưa, Tối, Tổng.
 */
function sendMonthlySummary_(monthKey, manual) {
  const summary = getMonthlySummary_(monthKey);
  const subject = `📊 Tổng hợp quyết toán cơm trưa ${summary.monthLabel} — ${summary.totalOfficialLunch ?? summary.total} suất`;
  const diffStr = (summary.diff >= 0 ? `+${summary.diff}` : `${summary.diff}`);
  const textRows = summary.rows.map((row, i) =>
    `${i + 1}. ${row.name}: ${row.lunch} suất trưa`
  ).join('\n');
  const body = [
    `TỔNG HỢP QUYẾT TOÁN CƠM TRƯA ${summary.monthLabel.toUpperCase()}`,
    '',
    `Tổng phần mềm: ${summary.totalSoftwareLunch ?? summary.totalLunch} suất`,
    `Điều chỉnh thực tế: ${diffStr} suất`,
    `TỔNG QUYẾT TOÁN CHÍNH THỨC: ${summary.totalOfficialLunch ?? summary.total} suất`,
    summary.dinnerNotes > 0 ? `(Ghi chú: ${summary.dinnerNotes} suất cơm tối ghi nhận tham khảo, không tính tiền)` : '',
    '',
    'Chi tiết phần mềm ghi nhận:',
    textRows || 'Chưa có dữ liệu.',
    manual ? '\n(Email được gửi thủ công từ Apps Script)' : '',
  ].filter(Boolean).join('\n');

  MailApp.sendEmail({
    to: getConfig_('ADMIN_EMAIL', APP.ADMIN_EMAIL),
    subject,
    body,
    htmlBody: buildMonthlyEmailHtml_(summary),
    name: 'Báo cơm trưa',
  });
}

/**
 * Hash toàn bộ suất ăn của ngày (cả Trưa và Tối) dùng để đối soát.
 */
function dailyReconciliationHash_(dateKey) {
  const states = getFinalBookingStateForDate_(dateKey);
  const closed = isClosedDay_(dateKey);
  const bookedItems = Object.keys(states)
    .sort()
    .filter(k => states[k].status === APP.MEAL_STATES.BOOKED)
    .map(k => `${states[k].memberId}:${states[k].mealType}`);

  const payload = JSON.stringify({
    dateKey,
    closed,
    booked: bookedItems,
  });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, payload, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function getDailyReconciliation_(dateKey) {
  try {
    const sh = getSheet_(APP.SHEETS.RECONCILIATION);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { status: APP.RECONCILIATION_STATES.OPEN, reconciledBy: '', reconciledAt: '', note: '' };

    const rows = sh.getRange(2, 1, lastRow - 1, 6).getValues();
    let latest = null;
    for (let i = 0; i < rows.length; i++) {
      if (normalizeDateCell_(rows[i][0]) === dateKey) {
        latest = rows[i];
      }
    }
    if (!latest) return { status: APP.RECONCILIATION_STATES.OPEN, reconciledBy: '', reconciledAt: '', note: '' };

    const status = String(latest[1] || APP.RECONCILIATION_STATES.OPEN).toUpperCase();
    const reconciledBy = String(latest[2] || '');
    const reconciledAt = formatDateTime_(latest[3]);
    const note = String(latest[4] || '');
    const storedHash = String(latest[5] || '');

    if (status === APP.RECONCILIATION_STATES.RECONCILED) {
      const currentHash = dailyReconciliationHash_(dateKey);
      if (storedHash && storedHash !== currentHash) {
        return {
          status: APP.RECONCILIATION_STATES.NEEDS_REVIEW,
          reconciledBy,
          reconciledAt,
          note,
          changed: true,
        };
      }
    }

    return {
      status,
      reconciledBy,
      reconciledAt,
      note,
      changed: false,
    };
  } catch (error) {
    return { status: APP.RECONCILIATION_STATES.OPEN, reconciledBy: '', reconciledAt: '', note: '' };
  }
}

function adminReconcileDay_(dateKey, note) {
  const sh = getSheet_(APP.SHEETS.RECONCILIATION);
  const now = new Date();
  const hash = dailyReconciliationHash_(dateKey);
  const email = getAdminEmail_();
  sh.appendRow([dateKey, APP.RECONCILIATION_STATES.RECONCILED, email, now, String(note || '').trim(), hash]);
  appendAudit_(dateKey, { id: '', name: '' }, '', 'ADMIN_RECONCILE_DAY', 'ADMIN', note || '', now);
}

function adminReopenReconciliation_(dateKey) {
  const sh = getSheet_(APP.SHEETS.RECONCILIATION);
  const now = new Date();
  const email = getAdminEmail_();
  sh.appendRow([dateKey, APP.RECONCILIATION_STATES.OPEN, email, now, '', '']);
  appendAudit_(dateKey, { id: '', name: '' }, '', 'ADMIN_REOPEN_RECONCILIATION', 'ADMIN', '', now);
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

function getMemberById_(memberId, includeInactive) {
  return getMembers_(Boolean(includeInactive)).find(m => m.id === String(memberId || '')) || null;
}

function getBookingsForDate_(dateKey, mealType) {
  const targetMeal = normalizeMealType_(mealType || APP.MEAL_TYPES.LUNCH);
  if (isClosedDay_(dateKey)) return [];
  const states = getFinalBookingStateForDate_(dateKey);
  return Object.keys(states)
    .map(key => states[key])
    .filter(row => row.mealType === targetMeal && row.status === APP.MEAL_STATES.BOOKED)
    .map(row => ({
      rowNumber: row.rowNumber,
      dateKey: row.dateKey,
      memberId: row.memberId,
      name: row.name,
      mealType: row.mealType,
      status: row.status,
      updatedAt: row.updatedAt,
      updatedAtDisplay: formatTime_(row.updatedAt),
    }))
    .sort((a, b) => (a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0) - (b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0));
}

function findBookingRow_(sh, dateKey, memberId, mealType) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { rowNumber: null };
  const targetMeal = normalizeMealType_(mealType);
  const maxCol = Math.max(sh.getLastColumn(), 6);
  const values = sh.getRange(2, 1, lastRow - 1, maxCol).getValues();
  let latest = null;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowDate = normalizeDateCell_(row[0]);
    const rowMemberId = String(row[1] || '').trim();

    const col3 = String(row[3] || '').trim().toUpperCase();
    const col4 = String(row[4] || '').trim().toUpperCase();

    let rowMeal = APP.MEAL_TYPES.LUNCH;
    if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col3)) {
      rowMeal = APP.MEAL_TYPES.LUNCH;
    } else if (['BOOKED', 'CANCELLED', 'CLEARED'].includes(col4)) {
      rowMeal = normalizeMealType_(col3);
    } else if (['DINNER', 'TOI', 'COM_TOI', 'TỐI'].includes(col3)) {
      rowMeal = APP.MEAL_TYPES.DINNER;
    } else {
      rowMeal = APP.MEAL_TYPES.LUNCH;
    }

    if (rowDate === dateKey && rowMemberId === String(memberId) && rowMeal === targetMeal) {
      latest = { rowNumber: i + 2, values: row };
    }
  }
  return latest || { rowNumber: null };
}

/**
 * Tự động báo cơm trưa ngày làm việc cho thành viên bật tự động.
 * QUY TẮC QUAN TRỌNG:
 * - Chỉ tạo suất LUNCH.
 * - Nếu thành viên đã có trạng thái DINNER trong ngày nhưng CHƯA có trạng thái LUNCH,
 *   thì hệ thống VẪN TỰ ĐỘNG BÁO LUNCH bình thường.
 */
function autoBookWeekdayIfNeeded_(now) {
  if (!isMealServiceDay_(now) || isLocked_(now)) return;

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
    if (!members.length) return;

    const existingLunchMemberIds = new Set();
    getBookingRows_().forEach(row => {
      if (row.dateKey === dateKey && row.mealType === APP.MEAL_TYPES.LUNCH) {
        existingLunchMemberIds.add(row.memberId);
      }
    });

    const rowsToAdd = members
      .filter(member => !existingLunchMemberIds.has(member.id))
      .map(member => [dateKey, member.id, member.name, APP.MEAL_TYPES.LUNCH, APP.MEAL_STATES.BOOKED, now]);

    if (rowsToAdd.length) {
      const bookings = getSheet_(APP.SHEETS.BOOKINGS);
      bookings.getRange(bookings.getLastRow() + 1, 1, rowsToAdd.length, 6).setValues(rowsToAdd);
      rowsToAdd.forEach(row => appendAudit_(dateKey, { id: row[1], name: row[2] }, APP.MEAL_TYPES.LUNCH, 'BOOK_AUTO', 'AUTO', '', now));
    }

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
    ['ADMIN_EMAILS', APP.ADMIN_EMAILS.join(', ')],
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
  if (booking) booking.getRange('F:F').setNumberFormat('dd/MM/yyyy HH:mm:ss');

  const audit = ss.getSheetByName(APP.SHEETS.AUDIT);
  if (audit) audit.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');

  const reconciliation = ss.getSheetByName(APP.SHEETS.RECONCILIATION);
  if (reconciliation) reconciliation.getRange('D:D').setNumberFormat('dd/MM/yyyy HH:mm:ss');
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

let _cachedAppSpreadsheet = null;

/**
 * Lấy Google Spreadsheet canonical của ứng dụng.
 * Không dựa vào getActiveSpreadsheet() trong runtime Web App để tránh lỗi standalone/permissions.
 *
 * Ưu tiên:
 * 1. ScriptProperties SPREADSHEET_ID (được seed từ setupApp())
 * 2. Cấu hình APP.SPREADSHEET_ID ('1G0rdpqR7BVVUUlhpkz97f3vRehCg1GYwc7MbP9UXAJs')
 * 3. SpreadsheetApp.openById(id)
 *
 * Báo lỗi rõ ràng và có hành động cụ thể nếu:
 * - Thiếu SPREADSHEET_ID
 * - Admin truy cập chưa được chia sẻ quyền trên Sheet
 * - Gắn sai spreadsheet (không khớp ID canonical)
 */
function getAppSpreadsheet_() {
  if (_cachedAppSpreadsheet) {
    return _cachedAppSpreadsheet;
  }

  let id = '';
  try {
    id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  } catch (err) {
    // Không chặn nếu PropertiesService chưa khả dụng trong mock test
  }

  if (!id) {
    id = APP.SPREADSHEET_ID;
  }

  if (!id) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID. Hãy cấu hình ScriptProperties hoặc chạy setupApp() từ Google Sheet.');
  }

  if (APP.SPREADSHEET_ID && id !== APP.SPREADSHEET_ID) {
    throw new Error(`Google Sheet không đúng: ID (${id}) không khớp với canonical spreadsheet (${APP.SPREADSHEET_ID}).`);
  }

  try {
    const ss = SpreadsheetApp.openById(id);
    if (!ss) {
      throw new Error(`Không thể mở Google Sheet với ID: ${id}`);
    }
    _cachedAppSpreadsheet = ss;
    return ss;
  } catch (err) {
    const rawMsg = (err && err.message) ? err.message : String(err);
    if (rawMsg.includes('không khớp') || rawMsg.includes('Chưa cấu hình')) {
      throw err;
    }
    throw new Error(
      `Tài khoản Google hiện tại đã được nhận diện là Admin nhưng chưa có quyền truy cập Google Sheet HỘI CƠM TRƯA (ID: ${id}). ` +
      `Vui lòng liên hệ chủ sở hữu (anmphongandn@gmail.com) để được cấp quyền Chỉnh sửa (Editor). Chi tiết: ${rawMsg}`
    );
  }
}

function getSheet_(name) {
  const ss = getAppSpreadsheet_();
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
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, APP.TZ, 'yyyy-MM-dd');
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
  const rows = booked.length
    ? booked.map((booking, index) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${index + 1}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(booking.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(booking.updatedAtDisplay)}</td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:12px">Không có người báo cơm trưa.</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827"><h2 style="margin-bottom:6px">🍚 Báo cơm trưa — ${dateDisplay_(now)}</h2><div style="font-size:30px;font-weight:700;margin:14px 0">${booked.length} suất</div><div style="color:#6B7280;margin-bottom:14px">Danh sách trưa: ${booked.length}/${totalMembers} người</div><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">#</th><th align="left">Họ tên</th><th align="left">Báo lúc</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function buildMonthlyEmailHtml_(summary) {
  const htmlRows = summary.rows.map((r, i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtmlServer_(r.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${r.lunch}</td>
    </tr>`).join('');

  const diffStr = summary.diff >= 0 ? `+${summary.diff}` : `${summary.diff}`;
  const dinnerNoteHtml = summary.dinnerNotes > 0
    ? `<div style="margin-top:14px;padding:12px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;">
        <strong>Ghi chú cơm tối:</strong> Có ${summary.dinnerNotes} lượt cơm tối được ghi nhận tham khảo, <em>không tính vào tiền quyết toán cơm trưa</em>.
       </div>`
    : '';

  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827">
    <h2>📊 Tổng hợp quyết toán cơm trưa — ${summary.monthLabel}</h2>
    <div style="background:#f3f4f6;padding:16px;border-radius:10px;margin:14px 0;">
      <div style="font-size:14px;color:#4b5563;">Tổng phần mềm: <strong>${summary.totalSoftwareLunch ?? summary.totalLunch}</strong> suất</div>
      <div style="font-size:14px;color:#4b5563;">Điều chỉnh thực tế: <strong>${diffStr}</strong> suất</div>
      <div style="font-size:26px;font-weight:700;color:#166534;margin-top:6px;">TỔNG QUYẾT TOÁN: ${summary.totalOfficialLunch ?? summary.total} suất</div>
    </div>
    ${dinnerNoteHtml}
    <h3 style="margin-top:20px;font-size:15px;">Chi tiết cá nhân (Phần mềm ghi nhận)</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th align="left">#</th><th align="left">Họ tên</th><th align="right">Suất trưa</th></tr></thead>
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
