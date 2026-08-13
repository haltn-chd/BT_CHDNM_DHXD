// ═══════════════════════════════════════════════════════════════════
//  Code_GAS_v4.js  –  Google Apps Script
//  Nhận kết quả bài làm từ Cloudflare Worker → ghi vào Google Sheet
//  Mỗi lớp → 1 tab riêng (tên tab = classId)
//  Deploy: Ứng dụng web → Thực thi: Tôi → Truy cập: Mọi người
// ═══════════════════════════════════════════════════════════════════

const SHEET_ID     = "1oel56WfOFMfxMOGYNZHRq8WbLFLfKfjUf8aDKB8mP5A";   // ← giữ nguyên
const SECRET_TOKEN = "Bon180316soc250921#";        // ← giữ nguyên

// ── Danh sách lớp hợp lệ (classId trong config.js phải khớp) ──────
// Thêm/xoá lớp ở đây và trong config.js là xong — không cần sửa gì khác
const ALLOWED_CLASSES = new Set([
  "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10",
  "BDS1","BDS2",
  "QD1","QD2",
  "KTE",
  "CDQ1","CDQ2",
  "NV01","NV02","NV03"
]);

// ── Header hàng đầu (tự tạo nếu tab chưa có) ──────────────────────
const HEADERS = [
  "Thời gian", "Họ tên", "MSSV", "STT_sinh", "Lớp",
  "Chương", "Điểm", "Tổng câu", "Đúng", "Thời gian làm (s)",
  "IP (qua Worker)"
];

// ── doPost: nhận JSON từ Cloudflare Worker ─────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Xác thực token bí mật
    if (data.token !== SECRET_TOKEN) {
      return jsonResp({ ok: false, error: "Unauthorized" }, 403);
    }

    // Lấy đúng tab theo classId của sinh viên
    const sheet = getOrCreateSheet(sanitize(data.classId));

    // Ghi 1 hàng vào tab của lớp đó
    sheet.appendRow([
      new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      sanitize(data.name),
      sanitize(data.mssv),
      Number(data.stt)       || 0,
      sanitize(data.classId),
      sanitize(data.chapterId),
      Number(data.score)     || 0,
      Number(data.total)     || 0,
      Number(data.correct)   || 0,
      Number(data.duration)  || 0,
      sanitize(data.ip)
    ]);

    return jsonResp({ ok: true });

  } catch (err) {
    return jsonResp({ ok: false, error: err.message }, 500);
  }
}

// ── doGet: health-check ────────────────────────────────────────────
function doGet(e) {
  return jsonResp({ ok: true, service: "CHD-Results-v4" });
}

// ── Lấy tab theo classId, tự tạo nếu chưa có ──────────────────────
function getOrCreateSheet(classId) {
  // Từ chối lớp không có trong danh sách
  if (!ALLOWED_CLASSES.has(classId)) {
    throw new Error("Lớp không hợp lệ: " + classId);
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Tìm tab tên = classId (ví dụ "KT1", "BDS2"...)
  let sheet = ss.getSheetByName(classId);

  // Nếu chưa có → tự tạo tab mới + header
  if (!sheet) {
    sheet = ss.insertSheet(classId);
    sheet.appendRow(HEADERS);
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setFontWeight("bold");
    hRange.setBackground("#1565c0");
    hRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// ── Helpers ────────────────────────────────────────────────────────
function sanitize(val) {
  if (val === undefined || val === null) return "";
  return String(val).substring(0, 200).replace(/[\r\n\t]/g, " ");
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
