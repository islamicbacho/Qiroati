// ============================================
// ระบบกีรออาตี โรงเรียนบาเจาะ - Backend
// Google Apps Script Backend
// ============================================

const SS_ID = '1UlV6FlOdqH9SxcL5h1K1Z4cPuC6Fo9NquMamida24a0';
const DRIVE_FOLDER_ID = '_kclDx6Pcf5DBVwIKsA1IlHMVMJg9Yz';
const STUDENT_SHEET = 'รายชื่อ';
const USERS_SHEET = 'Users';
const DATA_START_ROW = 8;

function doGet(e) {
  try {
    if (e.parameter && e.parameter.action) {
      var data = {};
      Object.keys(e.parameter).forEach(function(key) {
        if (key !== 'action') {
          try { data[key] = JSON.parse(e.parameter[key]); } catch(ex) { data[key] = e.parameter[key]; }
        }
      });
      return routeAction(e.parameter.action, data);
    }
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('กีรออาตี | โรงเรียนบาเจาะ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    return routeAction(data.action, data);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function routeAction(action, data) {
  var result;
  switch (action) {
    case 'login': result = handleLogin(data); break;
    case 'getStudents': result = getStudents(data); break;
    case 'getStudentsByClass': result = getStudentsByClass(data); break;
    case 'getTeachers': result = getTeachers(data); break;
    case 'getClasses': result = getClasses(data); break;
    case 'getAttendance': result = getAttendance(data); break;
    case 'saveAttendance': result = saveAttendance(data); break;
    case 'getWeeklyProgress': result = getWeeklyProgress(data); break;
    case 'saveWeeklyProgress': result = saveWeeklyProgress(data); break;
    case 'getMonthlyReports': result = getMonthlyReports(data); break;
    case 'getDashboardStats': result = getDashboardStats(data); break;
    case 'getStudentStats': result = getStudentStats(data); break;
    case 'getNotifications': result = getNotifications(data); break;
    case 'sendNotification': result = sendNotification(data); break;
    case 'getUsers': result = getUsers(data); break;
    case 'createUser': result = createUser(data); break;
    case 'resetPassword': result = resetPassword(data); break;
    default: result = { success: false, message: 'ไม่รู้จัก action: ' + action };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== USERS SHEET ====================

function getUsersSheet() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET);
    sheet.appendRow(['TeacherID', 'Password', 'Name', 'Phone', 'Status']);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
    sheet.setColumnWidths(1, 5, 150);
  }
  return sheet;
}

function getUsers(data) {
  var sheet = getUsersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, users: [] };
  var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var users = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    users.push({
      teacherId: String(r[0] || '').trim(),
      password: String(r[1] || '').trim(),
      name: String(r[2] || '').trim(),
      phone: String(r[3] || '').trim(),
      status: String(r[4] || 'active').trim()
    });
  }
  return { success: true, users: users };
}

function generateTeacherId() {
  var sheet = getUsersSheet();
  var lastRow = sheet.getLastRow();
  var maxNum = 0;
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0] || '').trim();
      var match = id.match(/^TCR(\d+)$/);
      if (match) {
        var num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return 'TCR' + String(maxNum + 1).padStart(3, '0');
}

function createUser(data) {
  var sheet = getUsersSheet();
  var teacherId = generateTeacherId();
  var password = data.password || teacherId;
  sheet.appendRow([
    teacherId,
    password,
    data.name || '',
    data.phone || '',
    'active'
  ]);
  return { success: true, teacherId: teacherId, password: password, message: 'สร้างบัญชี ' + teacherId + ' สำเร็จ' };
}

function resetPassword(data) {
  var sheet = getUsersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: 'ไม่พบผู้ใช้' };
  var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === data.teacherId) {
      var newPass = data.newPassword || String(rows[i][0]).trim();
      sheet.getRange(i + 2, 2).setValue(newPass);
      return { success: true, message: 'รีเซ็ตรหัสผ่าน ' + data.teacherId + ' สำเร็จ รหัสใหม่: ' + newPass };
    }
  }
  return { success: false, message: 'ไม่พบผู้ใช้: ' + data.teacherId };
}

function syncTeachersToUsers() {
  var students = getStudentSheetData();
  var teacherMap = {};
  students.forEach(function(s) {
    if (s.teacherName && !teacherMap[s.teacherName]) {
      teacherMap[s.teacherName] = true;
    }
  });
  var existing = getUsers({});
  var existingNames = {};
  existing.users.forEach(function(u) { existingNames[u.name] = u.teacherId; });
  var sheet = getUsersSheet();
  var added = 0;
  Object.keys(teacherMap).forEach(function(name) {
    if (!existingNames[name]) {
      var teacherId = generateTeacherId();
      sheet.appendRow([teacherId, teacherId, name, '', 'active']);
      added++;
    }
  });
  return { success: true, added: added, message: 'เพิ่มครูใหม่ ' + added + ' คน' };
}

// ==================== AUTH ====================

function handleLogin(data) {
  var teacherId = String(data.teacherId || '').trim();
  var password = String(data.password || '').trim();
  if (!teacherId || !password) {
    return { success: false, message: 'กรุณากรอกรหัสครูและรหัสผ่าน' };
  }
  var sheet = getUsersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: 'ยังไม่มีผู้ใช้ในระบบ กรุณาเพิ่มครูก่อน' };
  var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < rows.length; i++) {
    var uId = String(rows[i][0] || '').trim();
    var uPass = String(rows[i][1] || '').trim();
    var uName = String(rows[i][2] || '').trim();
    var uStatus = String(rows[i][4] || 'active').trim();
    if (uId === teacherId && uPass === password) {
      if (uStatus !== 'active') {
        return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' };
      }
      return {
        success: true,
        user: {
          id: uId, teacherId: uId, username: uId,
          name: uName, role: 'teacher',
          classId: '', className: ''
        }
      };
    }
  }
  return { success: false, message: 'รหัสครูหรือรหัสผ่านไม่ถูกต้อง' };
}

// ==================== STUDENT DATA ====================

function getStudentSheetData() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(STUDENT_SHEET);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];
  var range = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 6);
  var rows = range.getValues();
  var students = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row[1] || '').trim();
    var lastname = String(row[2] || '').trim();
    if (!name) continue;
    students.push({
      id: String(row[0] || '').trim() || ('STU' + (10000 + i)),
      firstName: name,
      lastName: lastname,
      grade: String(row[3] || '').trim(),
      className: String(row[4] || '').trim(),
      teacherName: String(row[5] || '').trim(),
      status: 'active'
    });
  }
  return students;
}

// ==================== STUDENTS ====================

function getStudents(data) {
  var students = getStudentSheetData();
  if (data && data.classId) {
    students = students.filter(function(s) { return s.className === data.classId; });
  }
  if (data && data.status) {
    students = students.filter(function(s) { return s.status === data.status; });
  }
  return { success: true, students: students };
}

function getStudentsByClass(data) {
  var students = getStudentSheetData();
  var className = data.classId || '';
  var result = students.filter(function(s) { return s.className === className; });
  return { success: true, students: result };
}

// ==================== TEACHERS ====================

function getTeachers(data) {
  var students = getStudentSheetData();
  var users = getUsers({});
  var userMap = {};
  users.users.forEach(function(u) { userMap[u.name] = u; });

  var teacherMap = {};
  students.forEach(function(s) {
    if (!s.teacherName) return;
    if (!teacherMap[s.teacherName]) {
      var user = userMap[s.teacherName];
      teacherMap[s.teacherName] = {
        id: s.teacherName,
        teacherId: user ? user.teacherId : '',
        name: s.teacherName,
        phone: user ? user.phone : '',
        specialty: '',
        assignedClasses: [],
        status: user ? user.status : 'active'
      };
    }
    if (s.className && teacherMap[s.teacherName].assignedClasses.indexOf(s.className) === -1) {
      teacherMap[s.teacherName].assignedClasses.push(s.className);
    }
  });
  var teachers = [];
  Object.keys(teacherMap).forEach(function(k) {
    teachers.push(teacherMap[k]);
  });
  return { success: true, teachers: teachers };
}

// ==================== CLASSES ====================

function getClasses(data) {
  var students = getStudentSheetData();
  var classMap = {};
  students.forEach(function(s) {
    if (!s.className) return;
    if (!classMap[s.className]) {
      classMap[s.className] = {
        id: s.className,
        name: s.className,
        teacherName: s.teacherName || '',
        schedule: '',
        room: '',
        studentCount: 0,
        status: 'active'
      };
    }
    classMap[s.className].studentCount++;
  });
  var classes = [];
  Object.keys(classMap).forEach(function(k) {
    classes.push(classMap[k]);
  });
  return { success: true, classes: classes };
}

// ==================== ATTENDANCE ====================

function getAttendance(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Attendance');
  if (!sheet) return { success: true, records: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, records: [] };
  var rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (data.classId && String(r[2]) !== data.classId) continue;
    if (data.date && String(r[1]) !== data.date) continue;
    result.push({
      recordId: r[0], date: r[1], classId: r[2], className: r[3],
      studentId: r[4], studentName: r[5], status: r[6],
      timeIn: r[7], note: r[8], recordedBy: r[9]
    });
  }
  return { success: true, records: result };
}

function saveAttendance(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Attendance');
  if (!sheet) {
    sheet = ss.insertSheet('Attendance');
    sheet.appendRow(['RecordID', 'Date', 'ClassID', 'ClassName', 'StudentID', 'StudentName', 'Status', 'TimeIn', 'Note', 'RecordedBy']);
  }
  var records = data.records || [];
  var date = data.date || new Date().toISOString().split('T')[0];
  var now = new Date();
  records.forEach(function(rec) {
    var rid = 'ATT-' + now.getFullYear() + (now.getMonth()+1) + now.getDate() + '-' + rec.studentId;
    sheet.appendRow([
      rid, date, data.classId, data.className,
      rec.studentId, rec.studentName, rec.status,
      now.toTimeString().split(' ')[0], '', data.recordedBy || ''
    ]);
  });
  return { success: true, message: 'บันทึกเวลาเข้าเรียน ' + records.length + ' คนแล้ว' };
}

// ==================== WEEKLY PROGRESS ====================

function getWeeklyProgress(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('WeeklyProgress');
  if (!sheet) return { success: true, records: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, records: [] };
  var rows = sheet.getRange(2, 1, lastRow - 1, 17).getValues();
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (data.classId && String(r[6]) !== data.classId) continue;
    if (data.year && String(r[1]) !== String(data.year)) continue;
    if (data.month && String(r[2]) !== String(data.month)) continue;
    if (data.weekNumber && String(r[3]) !== String(data.weekNumber)) continue;
    result.push({
      recordId: r[0], year: r[1], month: r[2], weekNumber: r[3],
      weekStart: r[4], weekEnd: r[5], classId: r[6], className: r[7],
      studentId: r[8], studentName: r[9], pagesRead: r[10], totalPages: r[11],
      readingLevel: r[12], attendanceCount: r[13], note: r[14],
      submittedBy: r[15], submitDate: r[16]
    });
  }
  return { success: true, records: result };
}

function saveWeeklyProgress(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('WeeklyProgress');
  if (!sheet) {
    sheet = ss.insertSheet('WeeklyProgress');
    sheet.appendRow(['RecordID','Year','Month','WeekNumber','WeekStart','WeekEnd','ClassID','ClassName','StudentID','StudentName','PagesRead','TotalPages','ReadingLevel','AttendanceCount','Note','SubmittedBy','SubmitDate']);
  }
  var records = data.records || [];
  var now = new Date();
  records.forEach(function(rec) {
    var rid = 'WP-' + data.year + '-' + data.month + '-W' + data.weekNumber + '-' + rec.studentId;
    sheet.appendRow([
      rid, data.year, data.month, data.weekNumber, '', '',
      data.classId, data.className, rec.studentId, rec.studentName,
      rec.pagesRead, rec.totalPages, rec.readingLevel, rec.attendanceCount,
      rec.note, data.submittedBy || '', now.toISOString().split('T')[0]
    ]);
  });
  return { success: true, message: 'บันทึกความคืบหน้า ' + records.length + ' คนแล้ว' };
}

// ==================== MONTHLY REPORTS ====================

function getMonthlyReports(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('MonthlyReports');
  if (!sheet) return { success: true, reports: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, reports: [] };
  var rows = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    result.push({
      reportId: r[0], year: r[1], month: r[2], classId: r[3], className: r[4],
      teacherId: r[5], teacherName: r[6], fileName: r[7], fileURL: r[8],
      fileId: r[9], status: r[10], adminNote: r[11],
      submitDate: r[12], reviewDate: r[13]
    });
  }
  return { success: true, reports: result };
}

// ==================== DASHBOARD ====================

function getDashboardStats(data) {
  var students = getStudentSheetData();
  var totalStudents = students.length;
  var classNames = {};
  var teacherNames = {};
  students.forEach(function(s) {
    if (s.className) classNames[s.className] = true;
    if (s.teacherName) teacherNames[s.teacherName] = true;
  });
  var totalClasses = Object.keys(classNames).length;
  var totalTeachers = Object.keys(teacherNames).length;

  var todayPresent = 0, todayAbsent = 0;
  var today = new Date().toISOString().split('T')[0];
  try {
    var attResult = getAttendance({ date: today });
    attResult.records.forEach(function(r) {
      if (r.status === 'present') todayPresent++;
      else if (r.status === 'absent') todayAbsent++;
    });
  } catch(e) {}

  return {
    success: true,
    stats: {
      totalStudents: totalStudents,
      totalClasses: totalClasses,
      totalTeachers: totalTeachers,
      todayPresent: todayPresent,
      todayAbsent: todayAbsent,
      pendingReports: 0,
      approvedReports: 0,
      passed: 0,
      needsImprovement: 0
    }
  };
}

// ==================== STUDENT STATS ====================

function getStudentStats(data) {
  var studentId = data.studentId || '';
  var classId = data.classId || '';
  var totalPresent = 0, totalAbsent = 0, totalPages = 0;
  try {
    var attResult = getAttendance({ classId: classId });
    attResult.records.forEach(function(r) {
      if (r.studentId === studentId) {
        if (r.status === 'present') totalPresent++;
        else totalAbsent++;
      }
    });
    var wpResult = getWeeklyProgress({ classId: classId });
    wpResult.records.forEach(function(r) {
      if (r.studentId === studentId) {
        totalPages += parseInt(r.pagesRead) || 0;
      }
    });
  } catch(e) {}
  return {
    success: true,
    stats: { totalPresent: totalPresent, totalAbsent: totalAbsent, totalPages: totalPages, lastEval: null }
  };
}

// ==================== NOTIFICATIONS ====================

function getNotifications(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: true, notifications: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, notifications: [] };
  var rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    result.push({
      notiId: r[0], from: r[1], to: r[2], title: r[3],
      message: r[4], type: r[5], isRead: r[6], createdAt: r[7]
    });
  }
  return { success: true, notifications: result };
}

function sendNotification(data) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('Notifications');
  if (!sheet) {
    sheet = ss.insertSheet('Notifications');
    sheet.appendRow(['NotiID','From','To','Title','Message','Type','IsRead','CreatedAt']);
  }
  var now = new Date();
  var nid = 'NOTI-' + now.getTime();
  sheet.appendRow([
    nid, data.from || 'ระบบ', data.to || 'all',
    data.title || '', data.message || '', data.type || 'info',
    false, now.toISOString()
  ]);
  return { success: true, message: 'ส่งแจ้งเตือนแล้ว' };
}
