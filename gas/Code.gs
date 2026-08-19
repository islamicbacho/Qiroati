// ============================================
// ระบบกีรออาตี โรงเรียนบาเจาะ - Backend
// Google Apps Script Backend
// ============================================

const SS_ID = '1UlV6FlOdqH9SxcL5h1K1Z4cPuC6Fo9NquMamida24a0';
const DRIVE_FOLDER_ID = '_kclDx6Pcf5DBVwIKsA1IlHMVMJg9Yz';
const STUDENT_SHEET = 'รายชื่อ';
const DATA_START_ROW = 8;

function doGet(e) {
  try {
    if (e.parameter && e.parameter.action) {
      const data = {};
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
    const data = JSON.parse(e.postData.contents);
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
    case 'generatePDF': result = generatePDF(data); break;
    case 'generateAllPDFs': result = generateAllPDFs(data); break;
    case 'getDashboardStats': result = getDashboardStats(data); break;
    case 'getStudentStats': result = getStudentStats(data); break;
    case 'getNotifications': result = getNotifications(data); break;
    case 'sendNotification': result = sendNotification(data); break;
    default: result = { success: false, message: 'ไม่รู้จัก action: ' + action };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== ดึงข้อมูลนักเรียนจากชีท ====================

function getStudentSheetData() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(STUDENT_SHEET);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];
  const range = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 6);
  const rows = range.getValues();
  var students = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row[1] || '').trim();
    var lastname = String(row[2] || '').trim();
    if (!name) continue;
    var teacherName = String(row[5] || '').trim();
    var className = String(row[4] || '').trim();
    var grade = String(row[3] || '').trim();
    students.push({
      id: String(row[0] || '').trim() || ('STU' + (10000 + i)),
      firstName: name,
      lastName: lastname,
      grade: grade,
      className: className,
      teacherName: teacherName,
      status: 'active'
    });
  }
  return students;
}

// ==================== AUTH ====================

function handleLogin(data) {
  const { username, password } = data;
  if (username === 'Amir' && password === 'Admin') {
    return {
      success: true,
      user: { id: 'admin', username: 'Amir', name: 'Amir', role: 'admin', classId: '', className: '' }
    };
  }
  var students = getStudentSheetData();
  for (var i = 0; i < students.length; i++) {
    if (students[i].firstName === username || students[i].id === username) {
      return {
        success: true,
        user: {
          id: students[i].id, username: students[i].id,
          name: students[i].firstName + ' ' + students[i].lastName,
          role: 'student', classId: students[i].className, className: students[i].className
        }
      };
    }
  }
  return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
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
  var teacherMap = {};
  students.forEach(function(s) {
    if (!s.teacherName) return;
    if (!teacherMap[s.teacherName]) {
      teacherMap[s.teacherName] = {
        id: s.teacherName,
        name: s.teacherName,
        phone: '',
        specialty: '',
        assignedClasses: [],
        status: 'active'
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
  const ss = SpreadsheetApp.openById(SS_ID);
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
  const ss = SpreadsheetApp.openById(SS_ID);
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
  const ss = SpreadsheetApp.openById(SS_ID);
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
  const ss = SpreadsheetApp.openById(SS_ID);
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
  const ss = SpreadsheetApp.openById(SS_ID);
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

  var pendingReports = 0, approvedReports = 0;
  try {
    var rpResult = getMonthlyReports();
    rpResult.reports.forEach(function(r) {
      if (r.status === 'pending') pendingReports++;
      if (r.status === 'approved') approvedReports++;
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
      pendingReports: pendingReports,
      approvedReports: approvedReports,
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
  var lastEval = null;
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
    stats: {
      totalPresent: totalPresent,
      totalAbsent: totalAbsent,
      totalPages: totalPages,
      lastEval: lastEval
    }
  };
}

// ==================== NOTIFICATIONS ====================

function getNotifications(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
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
  const ss = SpreadsheetApp.openById(SS_ID);
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

// ==================== PDF ====================

function generatePDF(data) {
  return { success: true, message: 'สร้าง PDF สำเร็จ (ฟีเจอร์นี้จะพัฒนาต่อ)' };
}

function generateAllPDFs(data) {
  return { success: true, message: 'สร้าง PDF ทั้งหมดสำเร็จ (ฟีเจอร์นี้จะพัฒนาต่อ)' };
}
