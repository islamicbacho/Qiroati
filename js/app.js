const App = {
  state: {
    currentUser: null,
    currentView: 'dashboard',
    selectedClass: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    students: [],
    teachers: [],
    classes: []
  },
  init() {
    const saved = localStorage.getItem('qiroati_user');
    if (saved) {
      this.state.currentUser = JSON.parse(saved);
      this.showApp();
      this.navigateTo(this.state.currentView);
    } else {
      this.showLogin();
    }
    this.bindEvents();
  },
  bindEvents() {
    document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigateTo(link.dataset.view);
        this.closeSidebar();
      });
    });
    const mt = document.getElementById('menuToggle');
    if (mt) mt.addEventListener('click', () => this.toggleSidebar());
    const ov = document.getElementById('sidebarOverlay');
    if (ov) ov.addEventListener('click', () => this.closeSidebar());
    const lf = document.getElementById('loginForm');
    if (lf) lf.addEventListener('submit', e => { e.preventDefault(); this.handleLogin(); });
    document.addEventListener('click', e => { if (e.target.closest('.logout-btn')) this.logout(); });
    const mo = document.getElementById('modalOverlay');
    if (mo) mo.addEventListener('click', e => { if (e.target === e.currentTarget) this.closeModal(); });
  },
  showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
  },
  showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    this.updateUserInfo();
  },
  async handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    error.classList.add('hidden');
    if (!username || !password) {
      error.textContent = 'Please enter credentials';
      error.classList.remove('hidden');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    if (username === 'Amir' && password === 'Admin') {
      this.state.currentUser = { id: 'admin', username: 'Amir', name: 'Amir', role: 'admin', classId: '', className: '' };
      localStorage.setItem('qiroati_user', JSON.stringify(this.state.currentUser));
      this.showApp();
      this.navigateTo('dashboard');
      this.showToast('success', 'Welcome Amir');
      btn.disabled = false;
      btn.innerHTML = 'Login';
      return;
    }
    try {
      const result = await API.login(username, password);
      if (result.success) {
        this.state.currentUser = result.user;
        localStorage.setItem('qiroati_user', JSON.stringify(result.user));
        this.showApp();
        this.navigateTo('dashboard');
        this.showToast('success', 'Welcome ' + result.user.name);
      } else {
        error.textContent = result.message;
        error.classList.remove('hidden');
      }
    } catch (err) {
      error.textContent = 'Cannot connect to server';
      error.classList.remove('hidden');
    }
    btn.disabled = false;
    btn.innerHTML = 'Login';
  },
  logout() {
    this.state.currentUser = null;
    localStorage.removeItem('qiroati_user');
    this.showLogin();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
  },
  updateUserInfo() {
    const u = this.state.currentUser;
    if (!u) return;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = u.name);
    document.querySelectorAll('.user-display-role').forEach(el => {
      const r = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' };
      el.textContent = r[u.role] || u.role;
    });
    document.querySelectorAll('.user-avatar').forEach(el => { el.textContent = u.name.charAt(0); });
    document.querySelectorAll('.admin-only').forEach(el => { el.style.display = u.role === 'admin' ? '' : 'none'; });
    document.querySelectorAll('.teacher-only').forEach(el => { el.style.display = (u.role === 'teacher' || u.role === 'admin') ? '' : 'none'; });
  },
  navigateTo(view) {
    this.state.currentView = view;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    const titles = {
      dashboard: 'Dashboard', classroom: 'Classroom', attendance: 'Attendance',
      weekly: 'Weekly Progress', monthly: 'Monthly Report', evaluation: 'Evaluation',
      students: 'Students', teachers: 'Teachers', classes: 'Classes',
      reports: 'Reports', notifications: 'Notifications',
      studentDetail: 'Student Report', teacherDetail: 'Teacher Report'
    };
    document.getElementById('pageTitle').textContent = titles[view] || view;
    this.renderView(view, document.getElementById('contentArea'));
  },
  async renderView(view, c) {
    c.innerHTML = '<div class="text-center mt-3"><span class="spinner"></span></div>';
    switch (view) {
      case 'dashboard': await this.renderDashboard(c); break;
      case 'classroom': await this.renderClassroom(c); break;
      case 'attendance': await this.renderAttendance(c); break;
      case 'weekly': await this.renderWeeklyProgress(c); break;
      case 'monthly': await this.renderMonthlyReport(c); break;
      case 'evaluation': await this.renderEvaluation(c); break;
      case 'students': await this.renderStudents(c); break;
      case 'teachers': await this.renderTeachers(c); break;
      case 'classes': await this.renderClasses(c); break;
      case 'reports': await this.renderReports(c); break;
      case 'notifications': await this.renderNotifications(c); break;
      case 'studentDetail': await this.renderStudentDetail(c); break;
      case 'teacherDetail': await this.renderTeacherDetail(c); break;
      default: c.innerHTML = '<div class="empty-state"><h3>Page not found</h3></div>';
    }
  },
  toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); },
  closeSidebar() { document.querySelector('.sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); },
  showToast(type, msg) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  },
  showModal(title, content) {
    const o = document.getElementById('modalOverlay');
    o.querySelector('.modal-header h3').textContent = title;
    o.querySelector('.modal-body').innerHTML = content;
    o.classList.add('active');
  },
  closeModal() { document.getElementById('modalOverlay').classList.remove('active'); },
  statusBadge(s) {
    var m = {
      present: '<span class="badge badge-success">Present</span>',
      absent: '<span class="badge badge-danger">Absent</span>',
      late: '<span class="badge badge-warning">Late</span>',
      active: '<span class="badge badge-success">Active</span>',
      inactive: '<span class="badge badge-pending">Inactive</span>',
      pending: '<span class="badge badge-warning">Pending</span>',
      approved: '<span class="badge badge-success">Approved</span>',
      pass: '<span class="badge badge-success">Pass</span>',
      fail: '<span class="badge badge-danger">Needs Improvement</span>'
    };
    return m[s] || '<span class="badge badge-pending">' + (s || '-') + '</span>';
  },
  getMonthName(m) {
    return ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m)] || '';
  },

  // ==================== DASHBOARD ====================
  async renderDashboard(c) {
    var s = { totalStudents: 0, totalClasses: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0, pendingReports: 0, approvedReports: 0, passed: 0, needsImprovement: 0 };
    try { var r = await API.getDashboardStats(); if (r.success) s = r.stats; } catch (e) {}
    c.innerHTML =
      '<div class="section-header"><h2>Dashboard Overview</h2></div>' +
      '<div class="card-grid card-grid-4 mb-3">' +
      '<div class="stat-card"><div class="stat-icon green">S</div><div class="stat-info"><h4>' + s.totalStudents + '</h4><p>Total Students</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon gold">C</div><div class="stat-info"><h4>' + s.totalClasses + '</h4><p>Active Classes</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon blue">T</div><div class="stat-info"><h4>' + s.totalTeachers + '</h4><p>Teachers</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon coral">R</div><div class="stat-info"><h4>' + s.pendingReports + '</h4><p>Pending Reports</p></div></div>' +
      '</div>' +
      '<div class="card-grid card-grid-2">' +
      '<div class="card"><div class="card-header"><h3>Today Attendance</h3></div><div class="flex items-center gap-2"><div class="flex-1"><p class="text-sm text-muted">Present</p><h3 style="color:var(--forest)">' + s.todayPresent + '</h3></div><div class="flex-1"><p class="text-sm text-muted">Absent</p><h3 style="color:var(--coral)">' + s.todayAbsent + '</h3></div></div></div>' +
      '<div class="card"><div class="card-header"><h3>Evaluation</h3></div><div class="flex items-center gap-2"><div class="flex-1"><p class="text-sm text-muted">Passed</p><h3 style="color:var(--forest)">' + s.passed + '</h3></div><div class="flex-1"><p class="text-sm text-muted">Improvement</p><h3 style="color:var(--coral)">' + s.needsImprovement + '</h3></div></div></div>' +
      '</div>';
  },

  // ==================== CLASSROOM ====================
  async renderClassroom(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var h = '<div class="section-header"><h2>Classroom</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddClassModal()">+ Add Class</button></div></div><div class="class-selector">';
    if (classes.length === 0) h += '<div class="empty-state w-full"><h3>No classes yet</h3></div>';
    else classes.forEach(function (cls) {
      var sel = App.state.selectedClass === cls.id ? 'selected' : '';
      h += '<div class="class-card ' + sel + '" onclick="App.selectClass(\'' + cls.id + '\')"><div class="class-icon">C</div><h4>' + cls.name + '</h4><p>' + (cls.teacherName || '') + '</p><p class="text-xs text-muted">' + (cls.schedule || '') + '</p></div>';
    });
    h += '</div>';
    c.innerHTML = h;
  },
  selectClass(id) { this.state.selectedClass = id; this.renderClassroom(document.getElementById('contentArea')); },
  showAddClassModal() {
    this.showModal('Add Class', '<form id="addClassForm" onsubmit="App.addClass(event)">' +
      '<div class="form-group"><label>Class Name</label><input type="text" class="form-control" id="newClassName" required></div>' +
      '<div class="form-group"><label>Teacher Name</label><input type="text" class="form-control" id="newClassTeacher"></div>' +
      '<div class="form-group"><label>Schedule</label><input type="text" class="form-control" id="newClassSchedule" value="Friday 09:00-10:00"></div>' +
      '<div class="form-group"><label>Room</label><input type="text" class="form-control" id="newClassRoom"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancel</button></div></form>');
  },
  async addClass(e) {
    e.preventDefault();
    var r = await API.addClass({
      name: document.getElementById('newClassName').value,
      teacherName: document.getElementById('newClassTeacher').value,
      schedule: document.getElementById('newClassSchedule').value,
      room: document.getElementById('newClassRoom').value
    });
    if (r.success) { this.closeModal(); this.showToast('success', r.message); this.renderClassroom(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== ATTENDANCE ====================
  async renderAttendance(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var today = new Date().toISOString().split('T')[0];
    var h = '<div class="section-header"><h2>Attendance</h2></div><div class="filter-bar">' +
      '<select class="form-control" id="attClassSelect" onchange="App.loadAttendanceStudents()"><option value="">Select Class</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><input type="date" class="form-control" id="attDate" value="' + today + '">' +
      '<button class="btn btn-primary btn-sm" onclick="App.loadAttendanceStudents()">Load</button>' +
      '<button class="btn btn-success btn-sm" onclick="App.saveAttendance()">Save</button></div>' +
      '<div id="attendanceGrid" class="attendance-grid"></div>';
    c.innerHTML = h;
  },
  async loadAttendanceStudents() {
    var cid = document.getElementById('attClassSelect').value;
    var date = document.getElementById('attDate').value;
    var grid = document.getElementById('attendanceGrid');
    if (!cid) { grid.innerHTML = '<p class="text-muted">Select a class</p>'; return; }
    var students = [], existing = [];
    try {
      var sr = await API.getStudentsByClass(cid); if (sr.success) students = sr.students;
      var ar = await API.getAttendance({ classId: cid, date: date }); if (ar.success) existing = ar.records;
    } catch (e) {}
    var attMap = {};
    existing.forEach(function (r) { attMap[r.studentId] = r.status; });
    if (students.length === 0) { grid.innerHTML = '<div class="empty-state"><h3>No students</h3></div>'; return; }
    var h = '';
    students.forEach(function (s) {
      var cs = attMap[s.id] || '';
      h += '<div class="attendance-card" data-student-id="' + s.id + '">' +
        '<div class="student-name">' + s.firstName + ' ' + s.lastName + '</div>' +
        '<div class="student-id">' + s.id + '</div>' +
        '<div class="status-btns">' +
        '<button class="status-btn present ' + (cs === 'present' ? 'active' : '') + '" onclick="App.setStatus(this,\'present\')">Present</button>' +
        '<button class="status-btn absent ' + (cs === 'absent' ? 'active' : '') + '" onclick="App.setStatus(this,\'absent\')">Absent</button>' +
        '<button class="status-btn late ' + (cs === 'late' ? 'active' : '') + '" onclick="App.setStatus(this,\'late\')">Late</button>' +
        '</div></div>';
    });
    grid.innerHTML = h;
  },
  setStatus(btn, status) {
    var card = btn.closest('.attendance-card');
    card.querySelectorAll('.status-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  },
  async saveAttendance() {
    var cid = document.getElementById('attClassSelect').value;
    var date = document.getElementById('attDate').value;
    if (!cid) { this.showToast('error', 'Select a class'); return; }
    var records = [];
    document.querySelectorAll('.attendance-card').forEach(function (card) {
      var sid = card.dataset.studentId;
      var name = card.querySelector('.student-name').textContent;
      var abtn = card.querySelector('.status-btn.active');
      var status = 'absent';
      if (abtn) {
        if (abtn.classList.contains('present')) status = 'present';
        else if (abtn.classList.contains('late')) status = 'late';
      }
      records.push({ studentId: sid, studentName: name, status: status });
    });
    if (records.length === 0) { this.showToast('error', 'No students'); return; }
    var sel = document.getElementById('attClassSelect');
    var cn = sel.options[sel.selectedIndex].textContent;
    var r = await API.saveAttendance({ date: date, classId: cid, className: cn, records: records, recordedBy: this.state.currentUser ? this.state.currentUser.name : '' });
    if (r.success) this.showToast('success', 'Attendance saved');
    else this.showToast('error', r.message);
  },

  // ==================== WEEKLY PROGRESS ====================
  async renderWeeklyProgress(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var now = new Date();
    var h = '<div class="section-header"><h2>Weekly Progress</h2></div><div class="filter-bar">' +
      '<select class="form-control" id="wpClassSelect"><option value="">Select Class</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><select class="form-control" id="wpYear"><option value="' + now.getFullYear() + '">' + now.getFullYear() + '</option></select>' +
      '<select class="form-control" id="wpMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select><select class="form-control" id="wpWeek"><option value="1">Week 1</option><option value="2">Week 2</option><option value="3">Week 3</option><option value="4">Week 4</option></select>' +
      '<button class="btn btn-primary btn-sm" onclick="App.loadWeeklyStudents()">Load</button>' +
      '<button class="btn btn-success btn-sm" onclick="App.saveWeeklyProgress()">Save</button></div>' +
      '<div id="weeklyTable"></div>';
    c.innerHTML = h;
  },
  async loadWeeklyStudents() {
    var cid = document.getElementById('wpClassSelect').value;
    var yr = document.getElementById('wpYear').value;
    var mo = document.getElementById('wpMonth').value;
    var wk = document.getElementById('wpWeek').value;
    var tbl = document.getElementById('weeklyTable');
    if (!cid) { tbl.innerHTML = '<p class="text-muted">Select a class</p>'; return; }
    var students = [], existing = [];
    try {
      var sr = await API.getStudentsByClass(cid); if (sr.success) students = sr.students;
      var wr = await API.getWeeklyProgress({ classId: cid, year: yr, month: mo, weekNumber: wk }); if (wr.success) existing = wr.records;
    } catch (e) {}
    var pm = {};
    existing.forEach(function (r) { pm[r.studentId] = r; });
    if (students.length === 0) { tbl.innerHTML = '<div class="empty-state"><h3>No students</h3></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Pages Read</th><th>Total Pages</th><th>Level</th><th>Att</th><th>Note</th></tr></thead><tbody>';
    students.forEach(function (s, i) {
      var p = pm[s.id] || {};
      h += '<tr><td>' + (i + 1) + '</td><td>' + s.firstName + ' ' + s.lastName + '</td>';
      h += '<td><input type="number" class="form-control wp-pages" data-id="' + s.id + '" data-name="' + s.firstName + ' ' + s.lastName + '" value="' + (p.pagesRead || 0) + '" min="0" style="width:80px"></td>';
      h += '<td><input type="number" class="form-control wp-total" data-id="' + s.id + '" value="' + (p.totalPages || 0) + '" min="0" style="width:80px"></td>';
      h += '<td><select class="form-control wp-level" data-id="' + s.id + '" style="width:100px"><option value="">-</option><option value="beginner"' + (p.readingLevel === 'beginner' ? ' selected' : '') + '>Beginner</option><option value="intermediate"' + (p.readingLevel === 'intermediate' ? ' selected' : '') + '>Intermediate</option><option value="advanced"' + (p.readingLevel === 'advanced' ? ' selected' : '') + '>Advanced</option></select></td>';
      h += '<td><input type="number" class="form-control wp-att" data-id="' + s.id + '" value="' + (p.attendanceCount || 0) + '" min="0" max="4" style="width:70px"></td>';
      h += '<td><input type="text" class="form-control wp-note" data-id="' + s.id + '" value="' + (p.note || '') + '" style="width:120px"></td></tr>';
    });
    h += '</tbody></table></div>';
    tbl.innerHTML = h;
  },
  async saveWeeklyProgress() {
    var cid = document.getElementById('wpClassSelect').value;
    var yr = parseInt(document.getElementById('wpYear').value);
    var mo = parseInt(document.getElementById('wpMonth').value);
    var wk = parseInt(document.getElementById('wpWeek').value);
    if (!cid) { this.showToast('error', 'Select a class'); return; }
    var sel = document.getElementById('wpClassSelect');
    var cn = sel.options[sel.selectedIndex].textContent;
    var records = [];
    document.querySelectorAll('.wp-pages').forEach(function (inp) {
      var id = inp.dataset.id;
      var nm = inp.dataset.name;
      var tot = document.querySelector('.wp-total[data-id="' + id + '"]');
      var lvl = document.querySelector('.wp-level[data-id="' + id + '"]');
      var att = document.querySelector('.wp-att[data-id="' + id + '"]');
      var note = document.querySelector('.wp-note[data-id="' + id + '"]');
      records.push({
        studentId: id, studentName: nm,
        pagesRead: parseInt(inp.value) || 0,
        totalPages: tot ? parseInt(tot.value) || 0 : 0,
        readingLevel: lvl ? lvl.value : '',
        attendanceCount: att ? parseInt(att.value) || 0 : 0,
        note: note ? note.value : ''
      });
    });
    var r = await API.saveWeeklyProgress({ year: yr, month: mo, weekNumber: wk, classId: cid, className: cn, records: records, submittedBy: this.state.currentUser ? this.state.currentUser.name : '' });
    if (r.success) this.showToast('success', 'Progress saved');
    else this.showToast('error', r.message);
  },

  // ==================== MONTHLY REPORT ====================
  async renderMonthlyReport(c) {
    var classes = [], reports = [];
    try {
      var cr = await API.getClasses(); if (cr.success) classes = cr.classes;
      var rr = await API.getMonthlyReports(); if (rr.success) reports = rr.reports;
    } catch (e) {}
    var now = new Date();
    var h = '<div class="section-header"><h2>Monthly Report</h2><div class="actions"><button class="btn btn-success btn-sm" onclick="App.generateAllPDFs()">Generate All PDFs</button></div></div><div class="filter-bar"><select class="form-control" id="mrClass"><option value="">All Classes</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><select class="form-control" id="mrYear"><option value="' + now.getFullYear() + '">' + now.getFullYear() + '</option></select><select class="form-control" id="mrMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select><button class="btn btn-primary btn-sm" onclick="App.loadReports()">Load</button></div><div id="reportList"></div>';
    c.innerHTML = h;
    this.displayReports(reports);
  },
  displayReports(reports) {
    var el = document.getElementById('reportList');
    if (reports.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No reports</h3><p>Generate PDF reports for each class</p></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>Class</th><th>Month</th><th>File</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead><tbody>';
    reports.forEach(function (r) {
      h += '<tr><td><strong>' + r.className + '</strong></td><td>' + App.getMonthName(r.month) + ' ' + r.year + '</td>';
      h += '<td>' + (r.fileName ? '<a href="' + r.fileURL + '" target="_blank">View PDF</a>' : '-') + '</td>';
      h += '<td>' + App.statusBadge(r.status) + '</td><td>' + (r.adminNote || '-') + '</td>';
      h += '<td><button class="btn btn-sm btn-ghost" onclick="App.generateClassPDF(\'' + r.classId + '\',\'' + r.className + '\')">Generate</button></td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
  },
  async loadReports() {
    var cid = document.getElementById('mrClass').value;
    var yr = document.getElementById('mrYear').value;
    var mo = document.getElementById('mrMonth').value;
    try { var r = await API.getMonthlyReports({ classId: cid, year: yr, month: mo }); if (r.success) this.displayReports(r.reports); } catch (e) {}
  },
  async generateClassPDF(cid, cn) {
    var yr = document.getElementById('mrYear').value;
    var mo = document.getElementById('mrMonth').value;
    this.showToast('info', 'Generating PDF...');
    var r = await API.generatePDF({ year: parseInt(yr), month: parseInt(mo), classId: cid, className: cn });
    if (r.success) { this.showToast('success', 'PDF generated'); this.loadReports(); }
    else this.showToast('error', r.message);
  },
  async generateAllPDFs() {
    var yr = document.getElementById('mrYear').value;
    var mo = document.getElementById('mrMonth').value;
    this.showToast('info', 'Generating all PDFs...');
    var r = await API.generateAllPDFs({ year: parseInt(yr), month: parseInt(mo) });
    if (r.success) { this.showToast('success', 'All PDFs generated'); this.loadReports(); }
    else this.showToast('error', r.message);
  },

  // ==================== EVALUATION ====================
  async renderEvaluation(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var now = new Date();
    var h = '<div class="section-header"><h2>Evaluation</h2></div><div class="filter-bar"><select class="form-control" id="evalClassSelect"><option value="">Select Class</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><select class="form-control" id="evalYear"><option value="' + now.getFullYear() + '">' + now.getFullYear() + '</option></select><select class="form-control" id="evalMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select><button class="btn btn-primary btn-sm" onclick="App.loadEvalStudents()">Load</button></div><div id="evalContent"></div>';
    c.innerHTML = h;
  },
  async loadEvalStudents() {
    var cid = document.getElementById('evalClassSelect').value;
    var yr = document.getElementById('evalYear').value;
    var mo = document.getElementById('evalMonth').value;
    var el = document.getElementById('evalContent');
    if (!cid) { el.innerHTML = '<p class="text-muted">Select a class</p>'; return; }
    var students = [], progress = [];
    try {
      var sr = await API.getStudentsByClass(cid); if (sr.success) students = sr.students;
      var pr = await API.getWeeklyProgress({ classId: cid, year: yr, month: mo }); if (pr.success) progress = pr.records;
    } catch (e) {}
    var stuStats = {};
    students.forEach(function (s) { stuStats[s.id] = { weeksAttended: 0, weeksRead: 0, totalPages: 0 }; });
    progress.forEach(function (p) {
      if (!stuStats[p.studentId]) return;
      if (parseInt(p.pagesRead) > 0) stuStats[p.studentId].weeksRead++;
      stuStats[p.studentId].weeksAttended += Math.min(parseInt(p.attendanceCount) || 0, 1);
      stuStats[p.studentId].totalPages += parseInt(p.pagesRead) || 0;
    });
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Read (of 4)</th><th>Attended (of 4)</th><th>Pages</th><th>Result</th></tr></thead><tbody>';
    students.forEach(function (s, i) {
      var st = stuStats[s.id];
      var r = (st.weeksRead >= 3 && st.weeksAttended >= 3) ? 'pass' : 'fail';
      h += '<tr><td>' + (i + 1) + '</td><td>' + s.firstName + ' ' + s.lastName + '</td>';
      h += '<td><span class="' + (st.weeksRead >= 3 ? 'badge badge-success' : 'badge badge-danger') + '">' + st.weeksRead + '/4</span></td>';
      h += '<td><span class="' + (st.weeksAttended >= 3 ? 'badge badge-success' : 'badge badge-danger') + '">' + st.weeksAttended + '/4</span></td>';
      h += '<td>' + st.totalPages + '</td><td>' + App.statusBadge(r) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
  },

  // ==================== STUDENTS ====================
  async renderStudents(c) {
    var students = [], classes = [];
    try {
      var sr = await API.getStudents(); if (sr.success) students = sr.students;
      var cr = await API.getClasses(); if (cr.success) classes = cr.classes;
    } catch (e) {}
    var h = '<div class="section-header"><h2>Student Management</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddStudentModal()">+ Add Student</button></div></div>' +
      '<div class="filter-bar"><select class="form-control" id="stuFilterClass" onchange="App.filterStudents()"><option value="">All Classes</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><input type="text" class="form-control" id="stuSearch" placeholder="Search..." oninput="App.filterStudents()"></div><div id="studentTable"></div>';
    c.innerHTML = h;
    this.state.students = students;
    this.state.classes = classes;
    this.displayStudents(students);
  },
  displayStudents(students) {
    var el = document.getElementById('studentTable');
    if (students.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No students found</h3></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>ID</th><th>Class</th><th>Phone</th><th>Parent</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    students.forEach(function (s, i) {
      h += '<tr><td>' + (i + 1) + '</td><td>' + s.firstName + ' ' + s.lastName + '</td><td class="text-xs">' + s.id + '</td><td>' + (s.className || '-') + '</td><td>' + (s.phone || '-') + '</td><td>' + (s.parentName || '-') + '</td><td>' + App.statusBadge(s.status) + '</td>';
      h += '<td><button class="btn btn-sm btn-ghost" onclick="App.editStudent(\'' + s.id + '\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteStudent(\'' + s.id + '\',\'' + s.firstName + ' ' + s.lastName + '\')">Del</button></td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
  },
  filterStudents() {
    var cf = document.getElementById('stuFilterClass').value;
    var sq = document.getElementById('stuSearch').value.toLowerCase();
    var f = this.state.students;
    if (cf) f = f.filter(function (s) { return s.classId === cf; });
    if (sq) f = f.filter(function (s) { return (s.firstName + ' ' + s.lastName).toLowerCase().indexOf(sq) >= 0; });
    this.displayStudents(f);
  },
  showAddStudentModal() {
    var co = '<option value="">Select class</option>';
    this.state.classes.forEach(function (cls) { co += '<option value="' + cls.id + '" data-name="' + cls.name + '">' + cls.name + '</option>'; });
    this.showModal('Add Student', '<form onsubmit="App.addStudent(event)">' +
      '<div class="form-group"><label>First Name</label><input type="text" class="form-control" id="newStuFirst" required></div>' +
      '<div class="form-group"><label>Last Name</label><input type="text" class="form-control" id="newStuLast" required></div>' +
      '<div class="form-group"><label>Class</label><select class="form-control" id="newStuClass" required>' + co + '</select></div>' +
      '<div class="form-group"><label>Phone</label><input type="text" class="form-control" id="newStuPhone"></div>' +
      '<div class="form-group"><label>Parent Name</label><input type="text" class="form-control" id="newStuParent"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancel</button></div></form>');
  },
  async addStudent(e) {
    e.preventDefault();
    var cs = document.getElementById('newStuClass');
    var cn = cs.options[cs.selectedIndex] ? cs.options[cs.selectedIndex].getAttribute('data-name') : '';
    var r = await API.addStudent({
      firstName: document.getElementById('newStuFirst').value,
      lastName: document.getElementById('newStuLast').value,
      classId: cs.value, className: cn,
      phone: document.getElementById('newStuPhone').value,
      parentName: document.getElementById('newStuParent').value
    });
    if (r.success) { this.closeModal(); this.showToast('success', r.message); this.renderStudents(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },
  confirmDeleteStudent(id, name) {
    this.showModal('Confirm Delete', '<p>Delete <strong>' + name + '</strong>?</p><div class="flex gap-1 mt-2"><button class="btn btn-danger" onclick="App.deleteStudent(\'' + id + '\')">Delete</button><button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button></div>');
  },
  async deleteStudent(id) {
    var r = await API.deleteStudent(id);
    if (r.success) { this.closeModal(); this.showToast('success', r.message); this.renderStudents(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== TEACHERS ====================
  async renderTeachers(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var h = '<div class="section-header"><h2>Teacher Management</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddTeacherModal()">+ Add Teacher</button></div></div>';
    if (teachers.length === 0) h += '<div class="empty-state"><h3>No teachers yet</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>ID</th><th>Phone</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
      teachers.forEach(function (t, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + t.name + '</strong></td><td class="text-xs">' + t.id + '</td><td>' + (t.phone || '-') + '</td><td>' + (t.specialty || '-') + '</td><td>' + App.statusBadge(t.status) + '</td>';
        h += '<td><button class="btn btn-sm btn-ghost" onclick="App.editTeacher(\'' + t.id + '\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="App.deleteTeacher(\'' + t.id + '\')">Del</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
    this.state.teachers = teachers;
  },
  showAddTeacherModal() {
    this.showModal('Add Teacher', '<form onsubmit="App.addTeacher(event)">' +
      '<div class="form-group"><label>Name</label><input type="text" class="form-control" id="newTchName" required></div>' +
      '<div class="form-group"><label>Phone</label><input type="text" class="form-control" id="newTchPhone"></div>' +
      '<div class="form-group"><label>Specialty</label><input type="text" class="form-control" id="newTchSpecialty"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancel</button></div></form>');
  },
  async addTeacher(e) {
    e.preventDefault();
    var r = await API.addTeacher({
      name: document.getElementById('newTchName').value,
      phone: document.getElementById('newTchPhone').value,
      specialty: document.getElementById('newTchSpecialty').value
    });
    if (r.success) { this.closeModal(); this.showToast('success', r.message); this.renderTeachers(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },
  async deleteTeacher(id) {
    if (!confirm('Delete this teacher?')) return;
    var r = await API.deleteTeacher(id);
    if (r.success) { this.showToast('success', r.message); this.renderTeachers(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== CLASSES ====================
  async renderClasses(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var h = '<div class="section-header"><h2>Class Management</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddClassModal()">+ Add Class</button></div></div>';
    if (classes.length === 0) h += '<div class="empty-state"><h3>No classes yet</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Class</th><th>Teacher</th><th>Schedule</th><th>Room</th><th>Status</th></tr></thead><tbody>';
      classes.forEach(function (cl, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + cl.name + '</strong></td><td>' + (cl.teacherName || '-') + '</td><td>' + (cl.schedule || '-') + '</td><td>' + (cl.room || '-') + '</td><td>' + App.statusBadge(cl.status) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
  },

  // ==================== REPORTS ====================
  async renderReports(c) {
    var reports = [];
    try { var r = await API.getMonthlyReports(); if (r.success) reports = r.reports; } catch (e) {}
    var h = '<div class="section-header"><h2>All Reports</h2></div>';
    if (reports.length === 0) h += '<div class="empty-state"><h3>No reports</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>Class</th><th>Period</th><th>File</th><th>Status</th><th>Date</th></tr></thead><tbody>';
      reports.forEach(function (r) {
        h += '<tr><td><strong>' + r.className + '</strong></td><td>' + App.getMonthName(r.month) + ' ' + r.year + '</td>';
        h += '<td>' + (r.fileURL ? '<a href="' + r.fileURL + '" target="_blank">PDF</a>' : '-') + '</td>';
        h += '<td>' + App.statusBadge(r.status) + '</td><td class="text-sm">' + (r.submitDate || '-') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
  },

  // ==================== NOTIFICATIONS ====================
  async renderNotifications(c) {
    var notifications = [];
    try { var r = await API.getNotifications(); if (r.success) notifications = r.notifications; } catch (e) {}
    var h = '<div class="section-header"><h2>Notifications</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showSendNotiModal()">Send Notification</button></div></div><div class="card">';
    if (notifications.length === 0) h += '<div class="empty-state"><h3>No notifications</h3></div>';
    else {
      notifications.forEach(function (n) {
        var bg = n.type === 'warning' ? 'var(--gold-soft)' : n.type === 'error' ? '#fde8e4' : 'var(--mint)';
        h += '<div class="notification-item"><div class="notification-icon" style="background:' + bg + '">!</div><div class="notification-content"><strong>' + n.title + '</strong><p>' + n.message + '</p></div><span class="notification-time">' + (n.createdAt || '') + '</span></div>';
      });
    }
    h += '</div>';
    c.innerHTML = h;
  },
  showSendNotiModal() {
    this.showModal('Send Notification', '<form onsubmit="App.sendNoti(event)">' +
      '<div class="form-group"><label>Title</label><input type="text" class="form-control" id="notiTitle" required></div>' +
      '<div class="form-group"><label>Message</label><textarea class="form-control" id="notiMessage" rows="3" required></textarea></div>' +
      '<div class="form-group"><label>Type</label><select class="form-control" id="notiType"><option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option></select></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">Send</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancel</button></div></form>');
  },
  async sendNoti(e) {
    e.preventDefault();
    var r = await API.sendNotification({
      from: this.state.currentUser ? this.state.currentUser.name : 'System',
      to: 'all',
      title: document.getElementById('notiTitle').value,
      message: document.getElementById('notiMessage').value,
      type: document.getElementById('notiType').value
    });
    if (r.success) { this.closeModal(); this.showToast('success', 'Notification sent'); this.renderNotifications(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== STUDENT DETAIL ====================
  async renderStudentDetail(c) {
    var students = [];
    try { var r = await API.getStudents(); if (r.success) students = r.students; } catch (e) {}
    var h = '<div class="section-header"><h2>Student Report</h2></div><div class="filter-bar"><select class="form-control" id="stuReportSelect" onchange="App.loadStudentReport()"><option value="">Select Student</option>';
    students.forEach(function (s) { h += '<option value="' + s.id + '" data-class="' + s.classId + '">' + s.firstName + ' ' + s.lastName + ' (' + (s.className || '') + ')</option>'; });
    h += '</select></div><div id="studentReportContent"></div>';
    c.innerHTML = h;
  },
  async loadStudentReport() {
    var sel = document.getElementById('stuReportSelect');
    var sid = sel.value;
    var cid = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].getAttribute('data-class') : '';
    var el = document.getElementById('studentReportContent');
    if (!sid) { el.innerHTML = ''; return; }
    var stats = { totalPresent: 0, totalAbsent: 0, totalPages: 0, lastEval: null };
    try { var r = await API.getStudentStats(sid, cid); if (r.success) stats = r.stats; } catch (e) {}
    var eb = stats.lastEval ? App.statusBadge(stats.lastEval.result) : '<span class="badge badge-pending">No evaluation</span>';
    el.innerHTML = '<div class="card-grid card-grid-3">' +
      '<div class="stat-card"><div class="stat-icon green">P</div><div class="stat-info"><h4>' + stats.totalPresent + '</h4><p>Present</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon coral">A</div><div class="stat-info"><h4>' + stats.totalAbsent + '</h4><p>Absent</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon gold">R</div><div class="stat-info"><h4>' + stats.totalPages + '</h4><p>Pages Read</p></div></div>' +
      '</div><div class="card mt-3"><div class="card-header"><h3>Evaluation</h3>' + eb + '</div>' +
      '<p class="text-muted">' + (stats.lastEval && stats.lastEval.suggestions ? stats.lastEval.suggestions : 'No suggestions yet') + '</p></div>';
  },

  // ==================== TEACHER DETAIL ====================
  async renderTeacherDetail(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var h = '<div class="section-header"><h2>Teacher Report</h2></div><div class="filter-bar"><select class="form-control" id="tchReportSelect" onchange="App.loadTeacherReport()"><option value="">Select Teacher</option>';
    teachers.forEach(function (t) { h += '<option value="' + t.id + '">' + t.name + '</option>'; });
    h += '</select></div><div id="teacherReportContent"></div>';
    c.innerHTML = h;
  },
  async loadTeacherReport() {
    var tid = document.getElementById('tchReportSelect').value;
    var el = document.getElementById('teacherReportContent');
    if (!tid) { el.innerHTML = ''; return; }
    var classes = [];
    try { var r = await API.getClasses({ teacherId: tid }); if (r.success) classes = r.classes; } catch (e) {}
    if (classes.length === 0) { el.innerHTML = '<div class="empty-state"><h3>No classes</h3></div>'; return; }
    var h = '<div class="card-grid card-grid-2">';
    for (var i = 0; i < classes.length; i++) {
      var cl = classes[i];
      var stats = { studentCount: 0, monthPresent: 0, monthAbsent: 0, totalPagesRead: 0 };
      try { var r = await API.getTeacherStats(tid, cl.id); if (r.success) stats = r.stats; } catch (e) {}
      h += '<div class="card"><div class="card-header"><h3>' + cl.name + '</h3></div>';
      h += '<div class="card-grid card-grid-2" style="gap:12px">';
      h += '<div><p class="text-xs text-muted">Students</p><h4>' + stats.studentCount + '</h4></div>';
      h += '<div><p class="text-xs text-muted">Pages</p><h4>' + stats.totalPagesRead + '</h4></div>';
      h += '<div><p class="text-xs text-muted">Present</p><h4 style="color:var(--forest)">' + stats.monthPresent + '</h4></div>';
      h += '<div><p class="text-xs text-muted">Absent</p><h4 style="color:var(--coral)">' + stats.monthAbsent + '</h4></div>';
      h += '</div></div>';
    }
    h += '</div>';
    el.innerHTML = h;
  }
};

document.addEventListener('DOMContentLoaded', function () { App.init(); });
