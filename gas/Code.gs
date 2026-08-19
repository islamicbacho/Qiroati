// ============================================
// ระบบกีรออาตี โรงเรียนบาเจาะ - Backend
// Google Apps Script Backend
// ============================================

const SS_ID = '1UlV6FlOdqH9SxcL5h1K1Z4cPuC6Fo9NquMamida24a0';
const DRIVE_FOLDER_ID = '_kclDx6Pcf5DBVwIKsA1IlHMVMJg9Yz';
const ADMIN_PASSWORD = 'Admin';

// ==================== WEB APP ====================

// รองรับทั้ง GET และ POST เพื่อหลีกเลี่ยงปัญหา CORS
function doGet(e) {
  try {
    // ถ้ามี parameter action ให้ประมวลผลเป็น API
    if (e.parameter && e.parameter.action) {
      const data = {};
      Object.keys(e.parameter).forEach(function(key) {
        if (key !== 'action') {
          try { data[key] = JSON.parse(e.parameter[key]); } catch(ex) { data[key] = e.parameter[key]; }
        }
      });
      return routeAction(e.parameter.action, data);
    }
    // ถ้าไม่มี parameter ให้แสดงหน้าเว็บ
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Qiroati | Bajo School')
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
      success: false, message: err.message, stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function routeAction(action, data) {
  var result;
  switch (action) {
    case 'login': result = handleLogin(data); break;
    case 'getStudents': result = getStudents(data); break;
    case 'addStudent': result = addStudent(data); break;
    case 'updateStudent': result = updateStudent(data); break;
    case 'deleteStudent': result = deleteStudent(data); break;
    case 'getStudentsByClass': result = getStudentsByClass(data); break;
    case 'getTeachers': result = getTeachers(data); break;
    case 'addTeacher': result = addTeacher(data); break;
    case 'updateTeacher': result = updateTeacher(data); break;
    case 'deleteTeacher': result = deleteTeacher(data); break;
    case 'getClasses': result = getClasses(data); break;
    case 'addClass': result = addClass(data); break;
    case 'updateClass': result = updateClass(data); break;
    case 'getAttendance': result = getAttendance(data); break;
    case 'saveAttendance': result = saveAttendance(data); break;
    case 'getWeeklyProgress': result = getWeeklyProgress(data); break;
    case 'saveWeeklyProgress': result = saveWeeklyProgress(data); break;
    case 'submitMonthlyReport': result = submitMonthlyReport(data); break;
    case 'getMonthlyReports': result = getMonthlyReports(data); break;
    case 'updateReportStatus': result = updateReportStatus(data); break;
    case 'getEvaluations': result = getEvaluations(data); break;
    case 'saveEvaluation': result = saveEvaluation(data); break;
    case 'getDashboardStats': result = getDashboardStats(data); break;
    case 'getTeacherStats': result = getTeacherStats(data); break;
    case 'getStudentStats': result = getStudentStats(data); break;
    case 'getNotifications': result = getNotifications(data); break;
    case 'sendNotification': result = sendNotification(data); break;
    case 'markNotificationRead': result = markNotificationRead(data); break;
    case 'generatePDF': result = generatePDF(data); break;
    case 'generateAllPDFs': result = generateAllPDFs(data); break;
    case 'initSheets': result = initAllSheets(); break;
    default: result = { success: false, message: 'Unknown action: ' + action };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== AUTH ====================

function handleLogin(data) {
  const { username, password } = data;
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'ระบบไม่พร้อมใช้งาน' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === username && rows[i][3] === password) {
      return {
        success: true,
        user: {
          id: rows[i][0],
          username: rows[i][1],
          name: rows[i][2],
          role: rows[i][4],
          classId: rows[i][5] || '',
          className: rows[i][6] || ''
        }
      };
    }
  }

  if (username === 'admin' && password === ADMIN_PASSWORD) {
    return {
      success: true,
      user: { id: 'admin', username: 'admin', name: 'ผู้ดูแลระบบ', role: 'admin', classId: '', className: '' }
    };
  }

  return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

// ==================== SHEETS INIT ====================

function initAllSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  const sheetsConfig = [
    {
      name: 'Users',
      headers: ['ID', 'Username', 'DisplayName', 'Password', 'Role', 'ClassID', 'ClassName']
    },
    {
      name: 'Students',
      headers: ['StudentID', 'FirstName', 'LastName', 'ClassID', 'ClassName', 'Phone', 'ParentName', 'RegisterDate', 'Status']
    },
    {
      name: 'Teachers',
      headers: ['TeacherID', 'DisplayName', 'Phone', 'Specialty', 'AssignedClasses', 'Status']
    },
    {
      name: 'Classes',
      headers: ['ClassID', 'ClassName', 'TeacherID', 'TeacherName', 'Schedule', 'Room', 'MaxStudents', 'Status']
    },
    {
      name: 'Attendance',
      headers: ['RecordID', 'Date', 'ClassID', 'ClassName', 'StudentID', 'StudentName', 'Status', 'TimeIn', 'Note', 'RecordedBy']
    },
    {
      name: 'WeeklyProgress',
      headers: ['RecordID', 'Year', 'Month', 'WeekNumber', 'WeekStart', 'WeekEnd', 'ClassID', 'ClassName', 'StudentID', 'StudentName', 'PagesRead', 'TotalPages', 'ReadingLevel', 'AttendanceCount', 'Note', 'SubmittedBy', 'SubmitDate']
    },
    {
      name: 'MonthlyReports',
      headers: ['ReportID', 'Year', 'Month', 'ClassID', 'ClassName', 'TeacherID', 'TeacherName', 'FileName', 'FileURL', 'FileID', 'Status', 'AdminNote', 'SubmitDate', 'ReviewDate']
    },
    {
      name: 'Evaluations',
      headers: ['EvalID', 'Year', 'Month', 'StudentID', 'StudentName', 'ClassID', 'ClassName', 'WeeksAttended', 'TotalWeeks', 'WeeksRead', 'TotalWeeksRead', 'ReadingScore', 'AttendanceScore', 'OverallScore', 'Result', 'Suggestions', 'EvaluatedBy', 'EvalDate']
    },
    {
      name: 'Notifications',
      headers: ['NotiID', 'From', 'To', 'Title', 'Message', 'Type', 'IsRead', 'CreatedAt']
    }
  ];

  sheetsConfig.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.getRange(1, 1, 1, config.headers.length)
        .setBackground('#0f5b4e').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  // Add default admin user if Users sheet is empty
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet.getLastRow() <= 1) {
    usersSheet.appendRow(['admin', 'admin', 'ผู้ดูแลระบบ', ADMIN_PASSWORD, 'admin', '', '']);
  }

  return { success: true, message: 'สร้างชีทสำเร็จทั้งหมด' };
}

// ==================== STUDENTS ====================

function getStudents(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Students' };

  const rows = sheet.getDataRange().getValues();
  const students = [];
  for (let i = 1; i < rows.length; i++) {
    const student = {
      id: rows[i][0], firstName: rows[i][1], lastName: rows[i][2],
      classId: rows[i][3], className: rows[i][4], phone: rows[i][5],
      parentName: rows[i][6], registerDate: rows[i][7], status: rows[i][8]
    };
    if (data && data.classId && student.classId !== data.classId) continue;
    if (data && data.status && student.status !== data.status) continue;
    students.push(student);
  }
  return { success: true, students };
}

function getStudentsByClass(data) {
  return getStudents({ classId: data.classId });
}

function addStudent(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Students' };

  const id = 'STU-' + new Date().getTime();
  const className = data.className || getClassNameById(data.classId);
  sheet.appendRow([
    id, data.firstName, data.lastName, data.classId, className,
    data.phone || '', data.parentName || '',
    Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'), 'active'
  ]);

  return { success: true, message: 'เพิ่มนักเรียนสำเร็จ', id };
}

function updateStudent(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Students' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      const row = i + 1;
      if (data.firstName !== undefined) sheet.getRange(row, 2).setValue(data.firstName);
      if (data.lastName !== undefined) sheet.getRange(row, 3).setValue(data.lastName);
      if (data.classId !== undefined) {
        sheet.getRange(row, 4).setValue(data.classId);
        sheet.getRange(row, 5).setValue(data.className || getClassNameById(data.classId));
      }
      if (data.phone !== undefined) sheet.getRange(row, 6).setValue(data.phone);
      if (data.parentName !== undefined) sheet.getRange(row, 7).setValue(data.parentName);
      if (data.status !== undefined) sheet.getRange(row, 9).setValue(data.status);
      return { success: true, message: 'อัปเดตนักเรียนสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบนักเรียน' };
}

function deleteStudent(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Students' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'ลบนักเรียนสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบนักเรียน' };
}

// ==================== TEACHERS ====================

function getTeachers(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Teachers');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Teachers' };

  const rows = sheet.getDataRange().getValues();
  const teachers = [];
  for (let i = 1; i < rows.length; i++) {
    teachers.push({
      id: rows[i][0], name: rows[i][1], phone: rows[i][2],
      specialty: rows[i][3], assignedClasses: rows[i][4], status: rows[i][5]
    });
  }
  return { success: true, teachers };
}

function addTeacher(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Teachers');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Teachers' };

  const id = 'TCH-' + new Date().getTime();
  sheet.appendRow([
    id, data.name, data.phone || '', data.specialty || '',
    data.assignedClasses || '', 'active'
  ]);
  return { success: true, message: 'เพิ่มครูสำเร็จ', id };
}

function updateTeacher(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Teachers');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Teachers' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      const row = i + 1;
      if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
      if (data.phone !== undefined) sheet.getRange(row, 3).setValue(data.phone);
      if (data.specialty !== undefined) sheet.getRange(row, 4).setValue(data.specialty);
      if (data.assignedClasses !== undefined) sheet.getRange(row, 5).setValue(data.assignedClasses);
      if (data.status !== undefined) sheet.getRange(row, 6).setValue(data.status);
      return { success: true, message: 'อัปเดตครูสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบครู' };
}

function deleteTeacher(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Teachers');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Teachers' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'ลบรครูสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบครู' };
}

// ==================== CLASSES ====================

function getClasses(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Classes');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Classes' };

  const rows = sheet.getDataRange().getValues();
  const classes = [];
  for (let i = 1; i < rows.length; i++) {
    const cls = {
      id: rows[i][0], name: rows[i][1], teacherId: rows[i][2],
      teacherName: rows[i][3], schedule: rows[i][4], room: rows[i][5],
      maxStudents: rows[i][6], status: rows[i][7]
    };
    if (data && data.teacherId && cls.teacherId !== data.teacherId) continue;
    if (data && data.status && cls.status !== data.status) continue;
    classes.push(cls);
  }
  return { success: true, classes };
}

function addClass(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Classes');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Classes' };

  const id = 'CLS-' + new Date().getTime();
  sheet.appendRow([
    id, data.name, data.teacherId || '', data.teacherName || '',
    data.schedule || 'วันศุกร์ 09:00-10:00', data.room || '',
    data.maxStudents || 30, 'active'
  ]);
  return { success: true, message: 'เพิ่มชั้นเรียนสำเร็จ', id };
}

function updateClass(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Classes');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Classes' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      const row = i + 1;
      if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
      if (data.teacherId !== undefined) sheet.getRange(row, 3).setValue(data.teacherId);
      if (data.teacherName !== undefined) sheet.getRange(row, 4).setValue(data.teacherName);
      if (data.schedule !== undefined) sheet.getRange(row, 5).setValue(data.schedule);
      if (data.room !== undefined) sheet.getRange(row, 6).setValue(data.room);
      if (data.maxStudents !== undefined) sheet.getRange(row, 7).setValue(data.maxStudents);
      if (data.status !== undefined) sheet.getRange(row, 8).setValue(data.status);
      return { success: true, message: 'อัปเดตชั้นเรียนสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบชั้นเรียน' };
}

// ==================== ATTENDANCE ====================

function getAttendance(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Attendance');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Attendance' };

  const rows = sheet.getDataRange().getValues();
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const rec = {
      id: rows[i][0], date: rows[i][1], classId: rows[i][2],
      className: rows[i][3], studentId: rows[i][4], studentName: rows[i][5],
      status: rows[i][6], timeIn: rows[i][7], note: rows[i][8], recordedBy: rows[i][9]
    };
    if (data && data.classId && rec.classId !== data.classId) continue;
    if (data && data.date && rec.date !== data.date) continue;
    if (data && data.studentId && rec.studentId !== data.studentId) continue;
    records.push(rec);
  }
  return { success: true, records };
}

function saveAttendance(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Attendance');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Attendance' };

  const { date, classId, className, records, recordedBy } = data;
  
  // Delete existing records for this date and class
  const existingRows = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = existingRows.length - 1; i >= 1; i--) {
    if (existingRows[i][1] === date && existingRows[i][2] === classId) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach(row => sheet.deleteRow(row));

  // Add new records
  records.forEach(rec => {
    const id = 'ATT-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 4);
    sheet.appendRow([
      id, date, classId, className, rec.studentId, rec.studentName,
      rec.status, rec.timeIn || '', rec.note || '', recordedBy || ''
    ]);
  });

  return { success: true, message: 'บันทึกการเข้าเรียนสำเร็จ' };
}

// ==================== WEEKLY PROGRESS ====================

function getWeeklyProgress(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('WeeklyProgress');
  if (!sheet) return { success: false, message: 'ไม่พบชีท WeeklyProgress' };

  const rows = sheet.getDataRange().getValues();
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const rec = {
      id: rows[i][0], year: rows[i][1], month: rows[i][2],
      weekNumber: rows[i][3], weekStart: rows[i][4], weekEnd: rows[i][5],
      classId: rows[i][6], className: rows[i][7], studentId: rows[i][8],
      studentName: rows[i][9], pagesRead: rows[i][10], totalPages: rows[i][11],
      readingLevel: rows[i][12], attendanceCount: rows[i][13],
      note: rows[i][14], submittedBy: rows[i][15], submitDate: rows[i][16]
    };
    if (data && data.classId && rec.classId !== data.classId) continue;
    if (data && data.year && rec.year != data.year) continue;
    if (data && data.month && rec.month != data.month) continue;
    if (data && data.weekNumber && rec.weekNumber != data.weekNumber) continue;
    records.push(rec);
  }
  return { success: true, records };
}

function saveWeeklyProgress(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('WeeklyProgress');
  if (!sheet) return { success: false, message: 'ไม่พบชีท WeeklyProgress' };

  const { year, month, weekNumber, weekStart, weekEnd, classId, className, records, submittedBy } = data;

  // Delete existing records for this week/class
  const existingRows = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = existingRows.length - 1; i >= 1; i--) {
    if (existingRows[i][1] == year && existingRows[i][2] == month &&
        existingRows[i][3] == weekNumber && existingRows[i][6] === classId) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach(row => sheet.deleteRow(row));

  // Add new records
  records.forEach(rec => {
    const id = 'WP-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 4);
    sheet.appendRow([
      id, year, month, weekNumber, weekStart, weekEnd,
      classId, className, rec.studentId, rec.studentName,
      rec.pagesRead || 0, rec.totalPages || 0, rec.readingLevel || '',
      rec.attendanceCount || 0, rec.note || '', submittedBy || '',
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm')
    ]);
  });

  return { success: true, message: 'บันทึกความคืบหน้าสำเร็จ' };
}

// ==================== MONTHLY REPORTS ====================

function getMonthlyReports(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('MonthlyReports');
  if (!sheet) return { success: false, message: 'ไม่พบชีท MonthlyReports' };

  const rows = sheet.getDataRange().getValues();
  const reports = [];
  for (let i = 1; i < rows.length; i++) {
    const report = {
      id: rows[i][0], year: rows[i][1], month: rows[i][2],
      classId: rows[i][3], className: rows[i][4], teacherId: rows[i][5],
      teacherName: rows[i][6], fileName: rows[i][7], fileURL: rows[i][8],
      fileId: rows[i][9], status: rows[i][10], adminNote: rows[i][11],
      submitDate: rows[i][12], reviewDate: rows[i][13]
    };
    if (data && data.classId && report.classId !== data.classId) continue;
    if (data && data.year && report.year != data.year) continue;
    if (data && data.month && report.month != data.month) continue;
    if (data && data.status && report.status !== data.status) continue;
    reports.push(report);
  }
  return { success: true, reports };
}

function submitMonthlyReport(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('MonthlyReports');
  if (!sheet) return { success: false, message: 'ไม่พบชีท MonthlyReports' };

  const reportId = data.reportId || 'RPT-' + new Date().getTime();
  
  // Check if report exists
  const rows = sheet.getDataRange().getValues();
  let exists = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === reportId) {
      exists = true;
      const row = i + 1;
      if (data.fileName) sheet.getRange(row, 8).setValue(data.fileName);
      if (data.fileURL) sheet.getRange(row, 9).setValue(data.fileURL);
      if (data.fileId) sheet.getRange(row, 10).setValue(data.fileId);
      sheet.getRange(row, 11).setValue('pending');
      sheet.getRange(row, 13).setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'));
      break;
    }
  }

  if (!exists) {
    sheet.appendRow([
      reportId, data.year, data.month, data.classId, data.className,
      data.teacherId || '', data.teacherName || '', data.fileName || '',
      data.fileURL || '', data.fileId || '', 'pending', '',
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), ''
    ]);
  }

  return { success: true, message: 'ส่งรายงานสำเร็จ', reportId };
}

function updateReportStatus(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('MonthlyReports');
  if (!sheet) return { success: false, message: 'ไม่พบชีท MonthlyReports' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.reportId) {
      const row = i + 1;
      sheet.getRange(row, 11).setValue(data.status);
      if (data.adminNote) sheet.getRange(row, 12).setValue(data.adminNote);
      sheet.getRange(row, 14).setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'));
      return { success: true, message: 'อัปเดตสถานะสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบรายงาน' };
}

// ==================== EVALUATIONS ====================

function getEvaluations(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Evaluations');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Evaluations' };

  const rows = sheet.getDataRange().getValues();
  const evaluations = [];
  for (let i = 1; i < rows.length; i++) {
    const ev = {
      id: rows[i][0], year: rows[i][1], month: rows[i][2],
      studentId: rows[i][3], studentName: rows[i][4], classId: rows[i][5],
      className: rows[i][6], weeksAttended: rows[i][7], totalWeeks: rows[i][8],
      weeksRead: rows[i][9], totalWeeksRead: rows[i][10],
      readingScore: rows[i][11], attendanceScore: rows[i][12],
      overallScore: rows[i][13], result: rows[i][14],
      suggestions: rows[i][15], evaluatedBy: rows[i][16], evalDate: rows[i][17]
    };
    if (data && data.classId && ev.classId !== data.classId) continue;
    if (data && data.year && ev.year != data.year) continue;
    if (data && data.month && ev.month != data.month) continue;
    if (data && data.studentId && ev.studentId !== data.studentId) continue;
    evaluations.push(ev);
  }
  return { success: true, evaluations };
}

function saveEvaluation(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Evaluations');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Evaluations' };

  const evalId = data.evalId || 'EVL-' + new Date().getTime();
  
  // Check criteria: must read 3/4 weeks, must attend 3/4 weeks
  const weeksAttended = parseInt(data.weeksAttended) || 0;
  const totalWeeks = parseInt(data.totalWeeks) || 4;
  const weeksRead = parseInt(data.weeksRead) || 0;
  
  const attendanceScore = Math.round((weeksAttended / totalWeeks) * 100);
  const readingScore = Math.round((weeksRead / totalWeeks) * 100);
  const overallScore = Math.round((attendanceScore + readingScore) / 2);
  const result = (weeksAttended >= 3 && weeksRead >= 3) ? 'pass' : 'fail';

  const rows = sheet.getDataRange().getValues();
  let exists = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === evalId) {
      exists = true;
      const row = i + 1;
      sheet.getRange(row, 7).setValue(weeksAttended);
      sheet.getRange(row, 8).setValue(totalWeeks);
      sheet.getRange(row, 9).setValue(weeksRead);
      sheet.getRange(row, 10).setValue(totalWeeks);
      sheet.getRange(row, 11).setValue(readingScore);
      sheet.getRange(row, 12).setValue(attendanceScore);
      sheet.getRange(row, 13).setValue(overallScore);
      sheet.getRange(row, 14).setValue(result);
      sheet.getRange(row, 15).setValue(data.suggestions || '');
      sheet.getRange(row, 16).setValue(data.evaluatedBy || '');
      sheet.getRange(row, 17).setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'));
      break;
    }
  }

  if (!exists) {
    sheet.appendRow([
      evalId, data.year, data.month, data.studentId, data.studentName,
      data.classId, data.className, weeksAttended, totalWeeks,
      weeksRead, totalWeeks, readingScore, attendanceScore,
      overallScore, result, data.suggestions || '',
      data.evaluatedBy || '', Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd')
    ]);
  }

  return { success: true, message: 'บันทึกผลประเมินสำเร็จ', evalId, result, overallScore };
}

// ==================== DASHBOARD ====================

function getDashboardStats(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  const studentsSheet = ss.getSheetByName('Students');
  const classesSheet = ss.getSheetByName('Classes');
  const teachersSheet = ss.getSheetByName('Teachers');
  const attendanceSheet = ss.getSheetByName('Attendance');
  const reportsSheet = ss.getSheetByName('MonthlyReports');
  const evalsSheet = ss.getSheetByName('Evaluations');

  const totalStudents = studentsSheet ? Math.max(0, studentsSheet.getLastRow() - 1) : 0;
  const totalClasses = classesSheet ? Math.max(0, classesSheet.getLastRow() - 1) : 0;
  const totalTeachers = teachersSheet ? Math.max(0, teachersSheet.getLastRow() - 1) : 0;

  // Today's attendance
  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  let todayPresent = 0, todayAbsent = 0;
  if (attendanceSheet && attendanceSheet.getLastRow() > 1) {
    const attRows = attendanceSheet.getDataRange().getValues();
    for (let i = 1; i < attRows.length; i++) {
      if (attRows[i][1] === today) {
        if (attRows[i][6] === 'present') todayPresent++;
        else if (attRows[i][6] === 'absent') todayAbsent++;
      }
    }
  }

  // Monthly reports status
  let pendingReports = 0, approvedReports = 0;
  if (reportsSheet && reportsSheet.getLastRow() > 1) {
    const repRows = reportsSheet.getDataRange().getValues();
    for (let i = 1; i < repRows.length; i++) {
      if (repRows[i][10] === 'pending') pendingReports++;
      else if (repRows[i][10] === 'approved') approvedReports++;
    }
  }

  // Evaluation results
  let passed = 0, needsImprovement = 0;
  if (evalsSheet && evalsSheet.getLastRow() > 1) {
    const evRows = evalsSheet.getDataRange().getValues();
    for (let i = 1; i < evRows.length; i++) {
      if (evRows[i][14] === 'pass') passed++;
      else if (evRows[i][14] === 'fail') needsImprovement++;
    }
  }

  return {
    success: true,
    stats: {
      totalStudents, totalClasses, totalTeachers,
      todayPresent, todayAbsent,
      pendingReports, approvedReports,
      passed, needsImprovement
    }
  };
}

function getTeacherStats(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const { teacherId, classId } = data;

  // Get teacher's classes
  const classesSheet = ss.getSheetByName('Classes');
  let className = '';
  if (classesSheet && classId) {
    const cRows = classesSheet.getDataRange().getValues();
    for (let i = 1; i < cRows.length; i++) {
      if (cRows[i][0] === classId) { className = cRows[i][1]; break; }
    }
  }

  // Get students in class
  const studentsSheet = ss.getSheetByName('Students');
  let studentCount = 0;
  if (studentsSheet) {
    const sRows = studentsSheet.getDataRange().getValues();
    for (let i = 1; i < sRows.length; i++) {
      if (sRows[i][3] === classId) studentCount++;
    }
  }

  // Get attendance for this class (this month)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const attSheet = ss.getSheetByName('Attendance');
  let monthPresent = 0, monthAbsent = 0, monthLate = 0;
  if (attSheet) {
    const aRows = attSheet.getDataRange().getValues();
    for (let i = 1; i < aRows.length; i++) {
      if (aRows[i][2] === classId) {
        const d = new Date(aRows[i][1]);
        if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
          if (aRows[i][6] === 'present') monthPresent++;
          else if (aRows[i][6] === 'absent') monthAbsent++;
          else if (aRows[i][6] === 'late') monthLate++;
        }
      }
    }
  }

  // Get weekly progress
  const wpSheet = ss.getSheetByName('WeeklyProgress');
  let totalPagesRead = 0;
  if (wpSheet) {
    const wpRows = wpSheet.getDataRange().getValues();
    for (let i = 1; i < wpRows.length; i++) {
      if (wpRows[i][6] === classId && wpRows[i][1] == currentYear && wpRows[i][2] == currentMonth) {
        totalPagesRead += parseInt(wpRows[i][10]) || 0;
      }
    }
  }

  return {
    success: true,
    stats: { className, studentCount, monthPresent, monthAbsent, monthLate, totalPagesRead }
  };
}

function getStudentStats(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const { studentId, classId } = data;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Attendance
  const attSheet = ss.getSheetByName('Attendance');
  let totalPresent = 0, totalAbsent = 0, totalLate = 0;
  if (attSheet) {
    const aRows = attSheet.getDataRange().getValues();
    for (let i = 1; i < aRows.length; i++) {
      if (aRows[i][4] === studentId) {
        const d = new Date(aRows[i][1]);
        if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
          if (aRows[i][6] === 'present') totalPresent++;
          else if (aRows[i][6] === 'absent') totalAbsent++;
          else if (aRows[i][6] === 'late') totalLate++;
        }
      }
    }
  }

  // Weekly progress
  const wpSheet = ss.getSheetByName('WeeklyProgress');
  let totalPages = 0, weeksActive = 0;
  if (wpSheet) {
    const wpRows = wpSheet.getDataRange().getValues();
    for (let i = 1; i < wpRows.length; i++) {
      if (wpRows[i][8] === studentId && wpRows[i][1] == currentYear && wpRows[i][2] == currentMonth) {
        totalPages += parseInt(wpRows[i][10]) || 0;
        weeksActive++;
      }
    }
  }

  // Evaluation
  const evSheet = ss.getSheetByName('Evaluations');
  let lastEval = null;
  if (evSheet) {
    const evRows = evSheet.getDataRange().getValues();
    for (let i = evRows.length - 1; i >= 1; i--) {
      if (evRows[i][3] === studentId) {
        lastEval = {
          result: evRows[i][14], overallScore: evRows[i][13],
          suggestions: evRows[i][15]
        };
        break;
      }
    }
  }

  return {
    success: true,
    stats: {
      totalPresent, totalAbsent, totalLate,
      totalPages, weeksActive, lastEval
    }
  };
}

// ==================== NOTIFICATIONS ====================

function getNotifications(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Notifications' };

  const rows = sheet.getDataRange().getValues();
  const notifications = [];
  for (let i = 1; i < rows.length; i++) {
    const noti = {
      id: rows[i][0], from: rows[i][1], to: rows[i][2],
      title: rows[i][3], message: rows[i][4], type: rows[i][5],
      isRead: rows[i][6], createdAt: rows[i][7]
    };
    if (data && data.to && noti.to !== data.to && noti.to !== 'all') continue;
    notifications.unshift(noti);
  }
  return { success: true, notifications: notifications.slice(0, 50) };
}

function sendNotification(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Notifications' };

  const id = 'NTF-' + new Date().getTime();
  sheet.appendRow([
    id, data.from || 'system', data.to || 'all',
    data.title, data.message, data.type || 'info', false,
    Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm')
  ]);
  return { success: true, message: 'ส่งการแจ้งเตือนสำเร็จ', id };
}

function markNotificationRead(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: false, message: 'ไม่พบชีท Notifications' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.notiId) {
      sheet.getRange(i + 1, 7).setValue(true);
      return { success: true, message: 'อัปเดตสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบการแจ้งเตือน' };
}

// ==================== PDF GENERATION ====================

function generatePDF(data) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const { year, month, classId, className, teacherName } = data;

    // Get weekly progress for this month/class
    const wpSheet = ss.getSheetByName('WeeklyProgress');
    const studentsSheet = ss.getSheetByName('Students');
    
    // Get students in class
    const students = [];
    if (studentsSheet) {
      const sRows = studentsSheet.getDataRange().getValues();
      for (let i = 1; i < sRows.length; i++) {
        if (sRows[i][3] === classId) {
          students.push({
            id: sRows[i][0], name: sRows[i][1] + ' ' + sRows[i][2]
          });
        }
      }
    }

    // Get weekly data
    const weeklyData = {};
    if (wpSheet) {
      const wpRows = wpSheet.getDataRange().getValues();
      for (let i = 1; i < wpRows.length; i++) {
        if (wpRows[i][6] === classId && wpRows[i][1] == year && wpRows[i][2] == month) {
          const week = wpRows[i][3];
          if (!weeklyData[week]) weeklyData[week] = {};
          weeklyData[week][wpRows[i][8]] = {
            pagesRead: wpRows[i][10], totalPages: wpRows[i][11],
            readingLevel: wpRows[i][12], attendanceCount: wpRows[i][13]
          };
        }
      }
    }

    // Get evaluations
    const evSheet = ss.getSheetByName('Evaluations');
    const evals = {};
    if (evSheet) {
      const evRows = evSheet.getDataRange().getValues();
      for (let i = 1; i < evRows.length; i++) {
        if (evRows[i][5] === classId && evRows[i][1] == year && evRows[i][2] == month) {
          evals[evRows[i][3]] = {
            result: evRows[i][14], score: evRows[i][13], suggestions: evRows[i][15]
          };
        }
      }
    }

    // Month names
    const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    // Build HTML for PDF
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { font-family: 'IBM Plex Sans Thai', 'Sarabun', sans-serif; padding: 40px; color: #163b38; }
      h1 { text-align: center; color: #0f5b4e; font-size: 20px; margin-bottom: 4px; }
      h2 { text-align: center; color: #55716c; font-size: 14px; font-weight: 400; margin-bottom: 6px; }
      h3 { text-align: center; color: #d8a94f; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
      th { background: #0f5b4e; color: white; padding: 8px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #dce8df; }
      tr:nth-child(even) { background: #f8fbf5; }
      .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #55716c; }
      .badge-pass { color: #1a7a2e; font-weight: bold; }
      .badge-fail { color: #b83c24; font-weight: bold; }
    </style></head><body>
    <h1>รายงานความคืบหน้าการอ่านอัลกุรอาน</h1>
    <h2>ชั้นเรียน: ${className || classId}</h2>
    <h3>เดือน${monthNames[parseInt(month)] || month} พ.ศ. ${parseInt(year) + 543} | ผู้สอน: ${teacherName || '-'}</h3>
    <table><thead><tr>
      <th>ลำดับ</th><th>ชื่อ-นามสกุล</th>
      <th>สัปดาห์ที่ 1</th><th>สัปดาห์ที่ 2</th><th>สัปดาห์ที่ 3</th><th>สัปดาห์ที่ 4</th>
      <th>รวมหน้า</th><th>ผลประเมิน</th>
    </tr></thead><tbody>`;

    students.forEach((stu, idx) => {
      const w1 = weeklyData[1]?.[stu.id];
      const w2 = weeklyData[2]?.[stu.id];
      const w3 = weeklyData[3]?.[stu.id];
      const w4 = weeklyData[4]?.[stu.id];
      const total = (w1?.pagesRead || 0) + (w2?.pagesRead || 0) + (w3?.pagesRead || 0) + (w4?.pagesRead || 0);
      const ev = evals[stu.id];
      const evClass = ev?.result === 'pass' ? 'badge-pass' : 'badge-fail';
      const evText = ev?.result === 'pass' ? 'ผ่าน' : ev?.result === 'fail' ? 'ปรับปรุง' : '-';

      html += `<tr>
        <td>${idx + 1}</td><td>${stu.name}</td>
        <td>${w1?.pagesRead || '-'}</td><td>${w2?.pagesRead || '-'}</td>
        <td>${w3?.pagesRead || '-'}</td><td>${w4?.pagesRead || '-'}</td>
        <td>${total}</td><td class="${evClass}">${evText}</td>
      </tr>`;
    });

    html += `</tbody></table>
    <div class="footer">ระบบกีรออาตี โรงเรียนบาเจาะ | รายงานอัตโนมัติ</div>
    </body></html>`;

    // Create PDF file
    const blob = Utilities.newHtml(html).getAs('application/pdf');
    const fileName = `รายงานกีรออาตี-${className || classId}-${monthNames[parseInt(month)] || month}-${year}.pdf`;
    
    // Get or create folder
    let folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const monthFolderName = `เดือนที่ ${month}`;
    let monthFolders = folder.getFoldersByName(monthFolderName);
    let monthFolder = monthFolders.hasNext() ? monthFolders.next() : folder.createFolder(monthFolderName);

    const file = monthFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';

    // Save to MonthlyReports
    submitMonthlyReport({
      year, month, classId, className,
      fileName, fileURL: fileUrl, fileId: file.getId(),
      teacherName
    });

    return { success: true, message: 'สร้าง PDF สำเร็จ', fileUrl, fileName };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  }
}

function generateAllPDFs(data) {
  const { year, month } = data;
  const ss = SpreadsheetApp.openById(SS_ID);
  const classesSheet = ss.getSheetByName('Classes');
  
  if (!classesSheet || classesSheet.getLastRow() <= 1) {
    return { success: false, message: 'ไม่พบชั้นเรียน' };
  }

  const results = [];
  const cRows = classesSheet.getDataRange().getValues();
  for (let i = 1; i < cRows.length; i++) {
    if (cRows[i][7] === 'active') {
      const result = generatePDF({
        year, month, classId: cRows[i][0], className: cRows[i][1], teacherName: cRows[i][3]
      });
      results.push({ className: cRows[i][1], ...result });
    }
  }

  return { success: true, results };
}

// ==================== HELPERS ====================

function getClassNameById(classId) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('Classes');
  if (!sheet) return '';
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === classId) return rows[i][1];
  }
  return '';
}

function generateId(prefix) {
  return prefix + '-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 4);
}
