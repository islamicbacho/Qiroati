// ============================================
// Qiroati System - API Client
// ============================================

const API = {
  // UPDATE THIS URL after deploying Google Apps Script as Web App
  // Format: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzDgMBljJSn_NzV2AhSVkKTIydD3hsZUac_p6hrgga7sN-uHZDYmSCV0RWduUdB5N_-eQ/exec',

  async call(action, data) {
    const payload = { action, ...(data || {}) };
    
    try {
      // Try direct fetch first (works when CORS is configured)
      const response = await fetch(this.GAS_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' }
      });
      return await response.json();
    } catch (corsError) {
      // Fallback: no-cors mode (can't read response, so use redirect trick)
      try {
        const response = await fetch(this.GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        // no-cors returns opaque response, try URL parameter approach
        return await this.callViaGet(action, data);
      } catch (e2) {
        console.error('API Error:', e2);
        return { success: false, message: 'Cannot connect to server: ' + e2.message };
      }
    }
  },

  // Fallback: use GET parameters (avoids CORS entirely)
  async callViaGet(action, data) {
    const params = new URLSearchParams({ action, ...(data || {}) });
    const url = this.GAS_URL + '?' + params.toString();
    try {
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      return await response.json();
    } catch (e) {
      return { success: false, message: 'GET fallback failed: ' + e.message };
    }
  },

  // === Auth ===
  login: (teacherId, password) => API.call('login', { teacherId, password }),

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
