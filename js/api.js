// ============================================
// Qiroati System - API Client
// ============================================

const API = {
  // UPDATE THIS URL after deploying Google Apps Script as Web App
  // Format: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzDgMBljJSn_NzV2AhSVkKTIydD3hsZUac_p6hrgga7sN-uHZDYmSCV0RWduUdB5N_-eQ/exec',

  async call(action, data) {
    var payload = { action: action };
    if (data) { Object.keys(data).forEach(function(k) { payload[k] = data[k]; }); }
    
    var controller = null;
    var timeoutId = null;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(function() { controller.abort(); }, 5000);
      var response = await fetch(this.GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        var controller2 = new AbortController();
        var timeoutId2 = setTimeout(function() { controller2.abort(); }, 5000);
        var params = new URLSearchParams();
        params.append('action', action);
        if (data) { Object.keys(data).forEach(function(k) { params.append(k, typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k])); }); }
        var url = this.GAS_URL + '?' + params.toString();
        var response2 = await fetch(url, { method: 'GET', signal: controller2.signal });
        clearTimeout(timeoutId2);
        return await response2.json();
      } catch (e2) {
        return { success: false, message: 'offline' };
      }
    }
  },

  // === Auth ===
  login: (teacherId, password) => API.call('login', { teacherId, password, username: teacherId }),

  // === Students ===
  getStudents: (filters) => API.call('getStudents', filters || {}),
  getStudentsByClass: (classId) => API.call('getStudentsByClass', { classId }),
  addStudent: (data) => API.call('addStudent', data),
  updateStudent: (data) => API.call('updateStudent', data),
  deleteStudent: (id) => API.call('deleteStudent', { id }),

  // === Teachers ===
  getTeachers: (filters) => API.call('getTeachers', filters || {}),
  addTeacher: (data) => API.call('addTeacher', data),
  updateTeacher: (data) => API.call('updateTeacher', data),
  deleteTeacher: (id) => API.call('deleteTeacher', { id }),

  // === Classes ===
  getClasses: (filters) => API.call('getClasses', filters || {}),
  addClass: (data) => API.call('addClass', data),
  updateClass: (data) => API.call('updateClass', data),

  // === Attendance ===
  getAttendance: (filters) => API.call('getAttendance', filters || {}),
  saveAttendance: (data) => API.call('saveAttendance', data),

  // === Weekly Progress ===
  getWeeklyProgress: (filters) => API.call('getWeeklyProgress', filters || {}),
  saveWeeklyProgress: (data) => API.call('saveWeeklyProgress', data),

  // === Monthly Reports ===
  getMonthlyReports: (filters) => API.call('getMonthlyReports', filters || {}),
  submitMonthlyReport: (data) => API.call('submitMonthlyReport', data),
  updateReportStatus: (data) => API.call('updateReportStatus', data),

  // === Evaluations ===
  getEvaluations: (filters) => API.call('getEvaluations', filters || {}),
  saveEvaluation: (data) => API.call('saveEvaluation', data),

  // === Dashboard ===
  getDashboardStats: () => API.call('getDashboardStats'),
  getTeacherStats: (teacherId, classId) => API.call('getTeacherStats', { teacherId, classId }),
  getStudentStats: (studentId, classId) => API.call('getStudentStats', { studentId, classId }),

  // === Notifications ===
  getNotifications: (filters) => API.call('getNotifications', filters || {}),
  sendNotification: (data) => API.call('sendNotification', data),
  markNotificationRead: (notiId) => API.call('markNotificationRead', { notiId }),

  // === PDF ===
  generatePDF: (data) => API.call('generatePDF', data),
  generateAllPDFs: (data) => API.call('generateAllPDFs', data),

  // === Users ===
  getUsers: () => API.call('getUsers'),
  createUser: (data) => API.call('createUser', data),
  resetPassword: (data) => API.call('resetPassword', data),

  // === Init ===
  syncTeachersToUsers: () => API.call('syncTeachersToUsers'),
};
