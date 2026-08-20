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
      error.textContent = 'กรุณากรอกข้อมูลให้ครบ';
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
      this.showToast('success', 'ยินดีต้อนรับ Amir');
      btn.disabled = false;
      btn.innerHTML = 'เข้าสู่ระบบ';
      return;
    }
    try {
      const result = await API.login(username, password);
      if (result.success) {
        this.state.currentUser = result.user;
        localStorage.setItem('qiroati_user', JSON.stringify(result.user));
        this.showApp();
        this.navigateTo('dashboard');
        this.showToast('success', 'ยินดีต้อนรับ ' + result.user.name);
      } else {
        error.textContent = result.message;
        error.classList.remove('hidden');
      }
    } catch (err) {
      error.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
      error.classList.remove('hidden');
    }
    btn.disabled = false;
    btn.innerHTML = 'เข้าสู่ระบบ';
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
      const r = { admin: 'ผู้ดูแลระบบ', teacher: 'ครู', student: 'นักเรียน' };
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
      dashboard: 'แดชบอร์ด', classroom: 'ห้องเรียน', attendance: 'ลงเวลาเข้าเรียน',
      weekly: 'ความคืบหน้ารายสัปดาห์', monthly: 'รายงานรายเดือน', evaluation: 'การประเมิน',
      students: 'นักเรียน', teachers: 'ครู', classes: 'ห้องเรียน',
      reports: 'รายงานทั้งหมด', notifications: 'แจ้งเตือน',
      studentDetail: 'รายงานนักเรียน', teacherDetail: 'รายงานครู'
    };
    document.getElementById('pageTitle').textContent = titles[view] || view;
    this.renderView(view, document.getElementById('contentArea'));
  },
  async renderView(view, c) {
    c.innerHTML = '<div class="text-center mt-3"><span class="spinner"></span></div>';
    switch (view) {
      case 'dashboard': await this.renderDashboard(c); break;
      case 'classroom': await this.renderClassroom(c); break;
      case 'monthly': await this.renderMonthlyReport(c); break;
      case 'evaluation': await this.renderEvaluation(c); break;
      case 'students': await this.renderStudents(c); break;
      case 'teachers': await this.renderTeachers(c); break;
      case 'classes': await this.renderClasses(c); break;
      case 'reports': await this.renderReports(c); break;
      case 'notifications': await this.renderNotifications(c); break;
      case 'studentDetail': await this.renderStudentDetail(c); break;
      case 'teacherDetail': await this.renderTeacherDetail(c); break;
      default: c.innerHTML = '<div class="empty-state"><h3>ไม่พบหน้าที่ต้องการ</h3></div>';
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
      present: '<span class="badge badge-success">มาเรียน</span>',
      absent: '<span class="badge badge-danger">ไม่มา</span>',
      late: '<span class="badge badge-warning">สาย</span>',
      active: '<span class="badge badge-success">ใช้งาน</span>',
      inactive: '<span class="badge badge-pending">ไม่ใช้งาน</span>',
      pending: '<span class="badge badge-warning">รอดำเนินการ</span>',
      approved: '<span class="badge badge-success">อนุมัติแล้ว</span>',
      pass: '<span class="badge badge-success">ผ่าน</span>',
      fail: '<span class="badge badge-danger">ต้องปรับปรุง</span>'
    };
    return m[s] || '<span class="badge badge-pending">' + (s || '-') + '</span>';
  },
  getMonthName(m) {
    return ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][parseInt(m)] || '';
  },

  // ==================== แดชบอร์ด ====================
  async renderDashboard(c) {
    var s = { totalStudents: 0, totalClasses: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0, pendingReports: 0, approvedReports: 0, passed: 0, needsImprovement: 0 };
    try { var r = await API.getDashboardStats(); if (r.success) s = r.stats; } catch (e) {}
    c.innerHTML =
      '<div class="section-header"><h2>ภาพรวมระบบ</h2></div>' +
      '<div class="card-grid card-grid-4 mb-3">' +
      '<div class="stat-card"><div class="stat-icon green">น</div><div class="stat-info"><h4>' + s.totalStudents + '</h4><p>นักเรียนทั้งหมด</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon gold">ห</div><div class="stat-info"><h4>' + s.totalClasses + '</h4><p>ห้องเรียน</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon blue">ค</div><div class="stat-info"><h4>' + s.totalTeachers + '</h4><p>ครูผู้สอน</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon coral">ร</div><div class="stat-info"><h4>' + s.pendingReports + '</h4><p>รายงานรอดำเนินการ</p></div></div>' +
      '</div>' +
      '<div class="card-grid card-grid-2">' +
      '<div class="card"><div class="card-header"><h3>สรุปเข้าเรียนวันนี้</h3></div><div class="flex items-center gap-2"><div class="flex-1"><p class="text-sm text-muted">มาเรียน</p><h3 style="color:var(--forest)">' + s.todayPresent + '</h3></div><div class="flex-1"><p class="text-sm text-muted">ไม่มา</p><h3 style="color:var(--coral)">' + s.todayAbsent + '</h3></div></div></div>' +
      '<div class="card"><div class="card-header"><h3>ผลประเมิน</h3></div><div class="flex items-center gap-2"><div class="flex-1"><p class="text-sm text-muted">ผ่าน</p><h3 style="color:var(--forest)">' + s.passed + '</h3></div><div class="flex-1"><p class="text-sm text-muted">ต้องปรับปรุง</p><h3 style="color:var(--coral)">' + s.needsImprovement + '</h3></div></div></div>' +
      '</div>';
  },

  // ==================== ห้องเรียน (แบบรวม) ====================
  async renderClassroom(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var h = '<div class="section-header"><h2>ห้องเรียน</h2></div>';
    if (teachers.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีครูผู้สอน</h3></div>';
    else {
      h += '<div class="class-selector">';
      teachers.forEach(function (t) {
        var cnt = t.assignedClasses ? t.assignedClasses.length : 0;
        h += '<div class="class-card" onclick="App.openTeacherClassroom(\'' + t.id + '\')">' +
          '<div class="class-icon">' + t.name.charAt(0) + '</div>' +
          '<h4>' + t.name + '</h4>' +
          '<p class="text-xs text-muted">' + (t.assignedClasses || []).join(', ') + ' (' + cnt + ' ห้อง)</p>' +
          '</div>';
      });
      h += '</div>';
    }
    c.innerHTML = h;
  },
  async openTeacherClassroom(teacherId) {
    var c = document.getElementById('contentArea');
    c.innerHTML = '<div class="text-center mt-3"><span class="spinner"></span></div>';
    var students = [];
    try { var r = await API.getStudents(); if (r.success) students = r.students.filter(function(s) { return s.teacherName === teacherId; }); } catch (e) {}
    var now = new Date();
    var today = now.toISOString().split('T')[0];
    var h = '<div class="section-header"><h2>' + teacherId + '</h2>' +
      '<div class="actions"><button class="btn btn-ghost btn-sm" onclick="App.renderClassroom(document.getElementById(\'contentArea\'))">← กลับ</button></div></div>';
    h += '<div class="filter-bar">' +
      '<input type="date" class="form-control" id="attDate" value="' + today + '" style="max-width:160px">' +
      '<select class="form-control" id="wpMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select>' +
      '<select class="form-control" id="wpWeek"><option value="1">สัปดาห์ที่ 1</option><option value="2">สัปดาห์ที่ 2</option><option value="3">สัปดาห์ที่ 3</option><option value="4">สัปดาห์ที่ 4</option></select>' +
      '<button class="btn btn-success btn-sm" onclick="App.saveAllTeacherData(\'' + teacherId + '\')">บันทึกทั้งหมด</button></div>';
    if (students.length === 0) {
      h += '<div class="empty-state"><h3>ยังไม่มีนักเรียนในสังกัด</h3></div>';
    } else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อนักเรียน</th><th>ชั้น</th><th>ห้อง</th>' +
        '<th>เข้าเรียน</th><th>หน้าอ่าน</th><th>หน้าทั้งหมด</th><th>ระดับ</th><th>หมายเหตุ</th></tr></thead><tbody>';
      students.forEach(function (s, i) {
        h += '<tr><td>' + (i + 1) + '</td>' +
          '<td><strong>' + s.firstName + '</strong> ' + s.lastName + '</td>' +
          '<td>' + (s.grade || '-') + '</td>' +
          '<td>' + (s.className || '-') + '</td>' +
          '<td><select class="form-control att-status" data-id="' + s.id + '" data-name="' + s.firstName + ' ' + s.lastName + '" data-class="' + s.className + '" style="width:90px">' +
          '<option value="">-</option>' +
          '<option value="present">มา</option>' +
          '<option value="absent">ไม่มา</option>' +
          '<option value="late">สาย</option>' +
          '</select></td>' +
          '<td><input type="number" class="form-control wp-pages" data-id="' + s.id + '" data-name="' + s.firstName + ' ' + s.lastName + '" value="0" min="0" style="width:70px"></td>' +
          '<td><input type="number" class="form-control" value="44" readonly style="width:70px;background:#f0f0f0;cursor:not-allowed"></td>' +
          '<td><select class="form-control wp-level" data-id="' + s.id + '" style="width:90px">' +
          '<option value="">-</option>' +
          '<option value="beginner">เริ่มต้น</option>' +
          '<option value="intermediate">ปานกลาง</option>' +
          '<option value="advanced">ขั้นสูง</option>' +
          '</select></td>' +
          '<td><input type="text" class="form-control wp-note" data-id="' + s.id + '" value="" style="width:100px"></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
  },
  async saveAllTeacherData(teacherId) {
    var now = new Date();
    var date = document.getElementById('attDate').value;
    var mo = parseInt(document.getElementById('wpMonth').value);
    var wk = parseInt(document.getElementById('wpWeek').value);
    var yr = now.getFullYear();
    var attRecords = [];
    var wpRecords = [];
    document.querySelectorAll('.att-status').forEach(function(sel) {
      var sid = sel.dataset.id;
      var nm = sel.dataset.name;
      var cls = sel.dataset.class;
      var status = sel.value;
      if (status) attRecords.push({ studentId: sid, studentName: nm, status: status });
    });
    document.querySelectorAll('.wp-pages').forEach(function(inp) {
      var id = inp.dataset.id;
      var nm = inp.dataset.name;
      var lvl = document.querySelector('.wp-level[data-id="' + id + '"]');
      var note = document.querySelector('.wp-note[data-id="' + id + '"]');
      wpRecords.push({
        studentId: id, studentName: nm,
        pagesRead: parseInt(inp.value) || 0,
        totalPages: 44,
        readingLevel: lvl ? lvl.value : '',
        attendanceCount: 1,
        note: note ? note.value : ''
      });
    });
    var saved = 0;
    if (attRecords.length > 0) {
      var firstClass = attRecords[0] ? document.querySelector('.att-status[data-id="' + attRecords[0].studentId + '"]').dataset.class : '';
      var ar = await API.saveAttendance({ date: date, classId: teacherId, className: firstClass, records: attRecords, recordedBy: this.state.currentUser ? this.state.currentUser.name : '' });
      if (ar.success) saved++;
    }
    if (wpRecords.length > 0) {
      var wr = await API.saveWeeklyProgress({ year: yr, month: mo, weekNumber: wk, classId: teacherId, className: teacherId, records: wpRecords, submittedBy: this.state.currentUser ? this.state.currentUser.name : '' });
      if (wr.success) saved++;
    }
    if (saved > 0) this.showToast('success', 'บันทึกข้อมูลสำเร็จ');
    else this.showToast('info', 'ไม่มีข้อมูลที่ต้องบันทึก');
  },

  // ==================== รายงานรายเดือน ====================
  async renderMonthlyReport(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var now = new Date();
    var h = '<div class="section-header"><h2>รายงานรายเดือน</h2></div>' +
      '<div class="filter-bar">' +
      '<select class="form-control" id="mrTeacher"><option value="">เลือกครูผู้สอน</option>';
    teachers.forEach(function (t) { h += '<option value="' + t.id + '">' + t.name + '</option>'; });
    h += '</select><select class="form-control" id="mrYear"><option value="' + now.getFullYear() + '">' + now.getFullYear() + '</option></select>' +
      '<select class="form-control" id="mrMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select><button class="btn btn-primary btn-sm" onclick="App.loadMonthlyReport()">โหลดข้อมูล</button></div>' +
      '<div id="monthlyReportContent"></div>';
    c.innerHTML = h;
  },
  async loadMonthlyReport() {
    var teacherId = document.getElementById('mrTeacher').value;
    var yr = document.getElementById('mrYear').value;
    var mo = document.getElementById('mrMonth').value;
    var el = document.getElementById('monthlyReportContent');
    if (!teacherId) { el.innerHTML = '<p class="text-muted">กรุณาเลือกครูผู้สอน</p>'; return; }
    var students = [], week1 = [], week2 = [], week3 = [], week4 = [];
    try {
      var sr = await API.getStudents(); if (sr.success) students = sr.students.filter(function(s) { return s.teacherName === teacherId; });
      var r1 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 1 }); if (r1.success) week1 = r1.records;
      var r2 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 2 }); if (r2.success) week2 = r2.records;
      var r3 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 3 }); if (r3.success) week3 = r3.records;
      var r4 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 4 }); if (r4.success) week4 = r4.records;
    } catch (e) {}
    var weeks = [week1, week2, week3, week4];
    var stuStats = {};
    students.forEach(function (s) {
      stuStats[s.id] = { name: s.firstName + ' ' + s.lastName, grade: s.grade, className: s.className, totalPages: 0, weeksPresent: 0, weekPages: [0, 0, 0, 0] };
    });
    weeks.forEach(function (wk, wi) {
      wk.forEach(function (p) {
        if (!stuStats[p.studentId]) return;
        var pg = parseInt(p.pagesRead) || 0;
        stuStats[p.studentId].totalPages += pg;
        stuStats[p.studentId].weekPages[wi] = pg;
        var att = parseInt(p.attendanceCount) || 0;
        if (att > 0) stuStats[p.studentId].weeksPresent++;
      });
    });
    var hasData = false;
    Object.keys(stuStats).forEach(function(k) { if (stuStats[k].totalPages > 0 || stuStats[k].weeksPresent > 0) hasData = true; });
    if (!hasData) { el.innerHTML = '<div class="empty-state"><h3>ยังไม่มีข้อมูลบันทึกรายสัปดาห์</h3><p>กรุณาบันทึกข้อมูลรายสัปดาห์ก่อนอย่างน้อย 1 สัปดาห์</p></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อนักเรียน</th><th>ชั้น</th><th>ห้อง</th>' +
      '<th>สัปดาห์ 1</th><th>สัปดาห์ 2</th><th>สัปดาห์ 3</th><th>สัปดาห์ 4</th>' +
      '<th>หน้ารวม</th><th>เข้าเรียน (สัปดาห์)</th></tr></thead><tbody>';
    var i = 1;
    Object.keys(stuStats).forEach(function (k) {
      var st = stuStats[k];
      h += '<tr><td>' + i + '</td><td><strong>' + st.name + '</strong></td><td>' + (st.grade || '-') + '</td><td>' + (st.className || '-') + '</td>';
      for (var wi = 0; wi < 4; wi++) {
        var pg = st.weekPages[wi];
        h += '<td>' + (pg > 0 ? pg + ' หน้า' : '<span class="text-muted">-</span>') + '</td>';
      }
      h += '<td><strong>' + st.totalPages + '</strong></td>';
      var attPct = Math.round((st.weeksPresent / 4) * 100);
      var attColor = attPct >= 80 ? 'badge-success' : attPct >= 50 ? 'badge-warning' : 'badge-danger';
      h += '<td><span class="badge ' + attColor + '">' + st.weeksPresent + '/4 สัปดาห์ (' + attPct + '%)</span></td></tr>';
      i++;
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
  },

  // ==================== การประเมิน ====================
  async renderEvaluation(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var now = new Date();
    var h = '<div class="section-header"><h2>การประเมินแนวโน้มนักเรียน</h2></div>' +
      '<div class="filter-bar">' +
      '<select class="form-control" id="evalTeacher"><option value="">เลือกครูผู้สอน</option>';
    teachers.forEach(function (t) { h += '<option value="' + t.id + '">' + t.name + '</option>'; });
    h += '</select><select class="form-control" id="evalYear"><option value="' + now.getFullYear() + '">' + now.getFullYear() + '</option></select>' +
      '<select class="form-control" id="evalMonth">';
    for (var m = 1; m <= 12; m++) h += '<option value="' + m + '"' + (m === this.state.currentMonth ? ' selected' : '') + '>' + this.getMonthName(m) + '</option>';
    h += '</select><button class="btn btn-primary btn-sm" onclick="App.loadEvaluation()">ประเมิน</button></div>' +
      '<div id="evalContent"></div>';
    c.innerHTML = h;
  },
  evalRating(pct) {
    if (pct >= 80) return { label: 'ดีมาก', color: 'badge-success', icon: 'A' };
    if (pct >= 70) return { label: 'ดี', color: 'badge-info', icon: 'B' };
    if (pct >= 50) return { label: 'ปานกลาง', color: 'badge-warning', icon: 'C' };
    return { label: 'ปรับปรุง', color: 'badge-danger', icon: 'D' };
  },
  async loadEvaluation() {
    var teacherId = document.getElementById('evalTeacher').value;
    var yr = document.getElementById('evalYear').value;
    var mo = document.getElementById('evalMonth').value;
    var el = document.getElementById('evalContent');
    if (!teacherId) { el.innerHTML = '<p class="text-muted">กรุณาเลือกครูผู้สอน</p>'; return; }
    var students = [], week1 = [], week2 = [], week3 = [], week4 = [];
    try {
      var sr = await API.getStudents(); if (sr.success) students = sr.students.filter(function(s) { return s.teacherName === teacherId; });
      var r1 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 1 }); if (r1.success) week1 = r1.records;
      var r2 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 2 }); if (r2.success) week2 = r2.records;
      var r3 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 3 }); if (r3.success) week3 = r3.records;
      var r4 = await API.getWeeklyProgress({ classId: teacherId, year: yr, month: mo, weekNumber: 4 }); if (r4.success) week4 = r4.records;
    } catch (e) {}
    var weeks = [week1, week2, week3, week4];
    var stuStats = {};
    students.forEach(function (s) {
      stuStats[s.id] = { name: s.firstName + ' ' + s.lastName, grade: s.grade, className: s.className, totalPages: 0, weeksPresent: 0, weeklyAtt: [0, 0, 0, 0] };
    });
    weeks.forEach(function (wk, wi) {
      wk.forEach(function (p) {
        if (!stuStats[p.studentId]) return;
        stuStats[p.studentId].totalPages += parseInt(p.pagesRead) || 0;
        var att = parseInt(p.attendanceCount) || 0;
        if (att > 0) { stuStats[p.studentId].weeksPresent++; stuStats[p.studentId].weeklyAtt[wi] = 1; }
      });
    });
    var hasData = false;
    Object.keys(stuStats).forEach(function(k) { if (stuStats[k].totalPages > 0 || stuStats[k].weeksPresent > 0) hasData = true; });
    if (!hasData) { el.innerHTML = '<div class="empty-state"><h3>ยังไม่มีข้อมูลในเดือนนี้</h3><p>กรุณาบันทึกข้อมูลรายสัปดาห์ก่อน</p></div>'; return; }
    var summary = { veryGood: 0, good: 0, moderate: 0, improve: 0 };
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อนักเรียน</th><th>ชั้น</th><th>ห้อง</th>' +
      '<th>สัปดาห์ 1</th><th>สัปดาห์ 2</th><th>สัปดาห์ 3</th><th>สัปดาห์ 4</th>' +
      '<th>อัตราเข้าเรียน</th><th>หน้ารวม</th><th>ระดับ</th></tr></thead><tbody>';
    var i = 1;
    Object.keys(stuStats).forEach(function (k) {
      var st = stuStats[k];
      var attPct = Math.round((st.weeksPresent / 4) * 100);
      var rating = App.evalRating(attPct);
      if (rating.label === 'ดีมาก') summary.veryGood++;
      else if (rating.label === 'ดี') summary.good++;
      else if (rating.label === 'ปานกลาง') summary.moderate++;
      else summary.improve++;
      h += '<tr><td>' + i + '</td><td><strong>' + st.name + '</strong></td><td>' + (st.grade || '-') + '</td><td>' + (st.className || '-') + '</td>';
      for (var wi = 0; wi < 4; wi++) {
        var att = st.weeklyAtt[wi];
        h += '<td>' + (att ? '<span class="badge badge-success">เข้า</span>' : '<span class="badge badge-danger">ไม่เข้า</span>') + '</td>';
      }
      h += '<td><strong>' + attPct + '%</strong></td>';
      h += '<td>' + st.totalPages + '</td>';
      h += '<td><span class="badge ' + rating.color + '">' + rating.icon + ' ' + rating.label + '</span></td></tr>';
      i++;
    });
    h += '</tbody></table></div>';
    h += '<div class="eval-summary" style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap">' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon green" style="margin:0 auto">A</div><div class="stat-info"><h4>' + summary.veryGood + ' คน</h4><p style="color:#22c55e;font-weight:600">ดีมาก (≥80%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon blue" style="margin:0 auto">B</div><div class="stat-info"><h4>' + summary.good + ' คน</h4><p style="color:#3b82f6;font-weight:600">ดี (≥70%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon gold" style="margin:0 auto">C</div><div class="stat-info"><h4>' + summary.moderate + ' คน</h4><p style="color:#f59e0b;font-weight:600">ปานกลาง (≥50%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon red" style="margin:0 auto">D</div><div class="stat-info"><h4>' + summary.improve + ' คน</h4><p style="color:#ef4444;font-weight:600">ปรับปรุง (<50%)</p></div></div>' +
      '</div>';
    el.innerHTML = h;
  },

  // ==================== จัดการนักเรียน ====================
  async renderStudents(c) {
    var students = [], classes = [];
    try {
      var sr = await API.getStudents(); if (sr.success) students = sr.students;
      var cr = await API.getClasses(); if (cr.success) classes = cr.classes;
    } catch (e) {}
    var h = '<div class="section-header"><h2>จัดการนักเรียน</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddStudentModal()">+ เพิ่มนักเรียน</button></div></div>' +
      '<div class="filter-bar"><select class="form-control" id="stuFilterClass" onchange="App.filterStudents()"><option value="">ทุกห้องเรียน</option>';
    classes.forEach(function (cls) { h += '<option value="' + cls.id + '">' + cls.name + '</option>'; });
    h += '</select><input type="text" class="form-control" id="stuSearch" placeholder="ค้นหา..." oninput="App.filterStudents()"></div><div id="studentTable"></div>';
    c.innerHTML = h;
    this.state.students = students;
    this.state.classes = classes;
    this.displayStudents(students);
  },
  displayStudents(students) {
    var el = document.getElementById('studentTable');
    if (students.length === 0) { el.innerHTML = '<div class="empty-state"><h3>ไม่พบนักเรียน</h3></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อ</th><th>ชั้น</th><th>ห้อง</th><th>ครูผู้สอน</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody>';
    students.forEach(function (s, i) {
      h += '<tr><td>' + (i + 1) + '</td><td>' + s.firstName + ' ' + s.lastName + '</td><td>' + (s.grade || '-') + '</td><td>' + (s.className || '-') + '</td><td>' + (s.teacherName || '-') + '</td><td>' + App.statusBadge(s.status) + '</td>';
      h += '<td><button class="btn btn-sm btn-ghost" onclick="App.editStudent(\'' + s.id + '\')">แก้ไข</button> <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteStudent(\'' + s.id + '\',\'' + s.firstName + ' ' + s.lastName + '\')">ลบ</button></td></tr>';
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
    var co = '<option value="">เลือกห้องเรียน</option>';
    this.state.classes.forEach(function (cls) { co += '<option value="' + cls.id + '" data-name="' + cls.name + '">' + cls.name + '</option>'; });
    this.showModal('เพิ่มนักเรียน', '<form onsubmit="App.addStudent(event)">' +
      '<div class="form-group"><label>ชื่อ</label><input type="text" class="form-control" id="newStuFirst" required></div>' +
      '<div class="form-group"><label>นามสกุล</label><input type="text" class="form-control" id="newStuLast" required></div>' +
      '<div class="form-group"><label>ห้องเรียน</label><select class="form-control" id="newStuClass" required>' + co + '</select></div>' +
      '<div class="form-group"><label>โทรศัพท์</label><input type="text" class="form-control" id="newStuPhone"></div>' +
      '<div class="form-group"><label>ชื่อผู้ปกครอง</label><input type="text" class="form-control" id="newStuParent"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">บันทึก</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button></div></form>');
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
    this.showModal('ยืนยันการลบ', '<p>ลบ <strong>' + name + '</strong> ใช่หรือไม่?</p><div class="flex gap-1 mt-2"><button class="btn btn-danger" onclick="App.deleteStudent(\'' + id + '\')">ลบ</button><button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button></div>');
  },
  async deleteStudent(id) {
    var r = await API.deleteStudent(id);
    if (r.success) { this.closeModal(); this.showToast('success', r.message); this.renderStudents(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== จัดการครู ====================
  async renderTeachers(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var h = '<div class="section-header"><h2>จัดการครู</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddTeacherModal()">+ เพิ่มครู</button></div></div>';
    if (teachers.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีครู</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อ</th><th>รหัส</th><th>โทรศัพท์</th><th>ความเชี่ยวชาญ</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody>';
      teachers.forEach(function (t, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + t.name + '</strong></td><td class="text-xs">' + t.id + '</td><td>' + (t.phone || '-') + '</td><td>' + (t.specialty || '-') + '</td><td>' + App.statusBadge(t.status) + '</td>';
        h += '<td><button class="btn btn-sm btn-ghost" onclick="App.editTeacher(\'' + t.id + '\')">แก้ไข</button> <button class="btn btn-sm btn-danger" onclick="App.deleteTeacher(\'' + t.id + '\')">ลบ</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
    this.state.teachers = teachers;
  },
  showAddTeacherModal() {
    this.showModal('เพิ่มครู', '<form onsubmit="App.addTeacher(event)">' +
      '<div class="form-group"><label>ชื่อ-นามสกุล</label><input type="text" class="form-control" id="newTchName" required></div>' +
      '<div class="form-group"><label>โทรศัพท์</label><input type="text" class="form-control" id="newTchPhone"></div>' +
      '<div class="form-group"><label>ความเชี่ยวชาญ</label><input type="text" class="form-control" id="newTchSpecialty"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">บันทึก</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button></div></form>');
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
    if (!confirm('ต้องการลบครูคนนี้ใช่หรือไม่?')) return;
    var r = await API.deleteTeacher(id);
    if (r.success) { this.showToast('success', r.message); this.renderTeachers(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== จัดการห้องเรียน ====================
  async renderClasses(c) {
    var classes = [];
    try { var r = await API.getClasses(); if (r.success) classes = r.classes; } catch (e) {}
    var h = '<div class="section-header"><h2>จัดการห้องเรียน</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showAddClassModal()">+ เพิ่มห้องเรียน</button></div></div>';
    if (classes.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีห้องเรียน</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>ห้องเรียน</th><th>ครูผู้สอน</th><th>ตารางเรียน</th><th>ห้อง</th><th>สถานะ</th></tr></thead><tbody>';
      classes.forEach(function (cl, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + cl.name + '</strong></td><td>' + (cl.teacherName || '-') + '</td><td>' + (cl.schedule || '-') + '</td><td>' + (cl.room || '-') + '</td><td>' + App.statusBadge(cl.status) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
  },

  // ==================== รายงานทั้งหมด ====================
  async renderReports(c) {
    var reports = [];
    try { var r = await API.getMonthlyReports(); if (r.success) reports = r.reports; } catch (e) {}
    var h = '<div class="section-header"><h2>รายงานทั้งหมด</h2></div>';
    if (reports.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีรายงาน</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>ห้องเรียน</th><th>ช่วงเวลา</th><th>ไฟล์</th><th>สถานะ</th><th>วันที่</th></tr></thead><tbody>';
      reports.forEach(function (r) {
        h += '<tr><td><strong>' + r.className + '</strong></td><td>' + App.getMonthName(r.month) + ' ' + r.year + '</td>';
        h += '<td>' + (r.fileURL ? '<a href="' + r.fileURL + '" target="_blank">PDF</a>' : '-') + '</td>';
        h += '<td>' + App.statusBadge(r.status) + '</td><td class="text-sm">' + (r.submitDate || '-') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
  },

  // ==================== แจ้งเตือน ====================
  async renderNotifications(c) {
    var notifications = [];
    try { var r = await API.getNotifications(); if (r.success) notifications = r.notifications; } catch (e) {}
    var h = '<div class="section-header"><h2>แจ้งเตือน</h2><div class="actions"><button class="btn btn-primary btn-sm" onclick="App.showSendNotiModal()">ส่งแจ้งเตือน</button></div></div><div class="card">';
    if (notifications.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีแจ้งเตือน</h3></div>';
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
    this.showModal('ส่งแจ้งเตือน', '<form onsubmit="App.sendNoti(event)">' +
      '<div class="form-group"><label>หัวข้อ</label><input type="text" class="form-control" id="notiTitle" required></div>' +
      '<div class="form-group"><label>ข้อความ</label><textarea class="form-control" id="notiMessage" rows="3" required></textarea></div>' +
      '<div class="form-group"><label>ประเภท</label><select class="form-control" id="notiType"><option value="info">ข้อมูล</option><option value="warning">แจ้งเตือน</option><option value="error">ข้อผิดพลาด</option></select></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">ส่ง</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button></div></form>');
  },
  async sendNoti(e) {
    e.preventDefault();
    var r = await API.sendNotification({
      from: this.state.currentUser ? this.state.currentUser.name : 'ระบบ',
      to: 'all',
      title: document.getElementById('notiTitle').value,
      message: document.getElementById('notiMessage').value,
      type: document.getElementById('notiType').value
    });
    if (r.success) { this.closeModal(); this.showToast('success', 'ส่งแจ้งเตือนแล้ว'); this.renderNotifications(document.getElementById('contentArea')); }
    else this.showToast('error', r.message);
  },

  // ==================== รายงานนักเรียน ====================
  async renderStudentDetail(c) {
    var students = [];
    try { var r = await API.getStudents(); if (r.success) students = r.students; } catch (e) {}
    var h = '<div class="section-header"><h2>รายงานนักเรียน</h2></div><div class="filter-bar"><select class="form-control" id="stuReportSelect" onchange="App.loadStudentReport()"><option value="">เลือกนักเรียน</option>';
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
    var eb = stats.lastEval ? App.statusBadge(stats.lastEval.result) : '<span class="badge badge-pending">ยังไม่ได้ประเมิน</span>';
    el.innerHTML = '<div class="card-grid card-grid-3">' +
      '<div class="stat-card"><div class="stat-icon green">ม</div><div class="stat-info"><h4>' + stats.totalPresent + '</h4><p>มาเรียน</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon coral">อ</div><div class="stat-info"><h4>' + stats.totalAbsent + '</h4><p>ไม่มา</p></div></div>' +
      '<div class="stat-card"><div class="stat-icon gold">อ</div><div class="stat-info"><h4>' + stats.totalPages + '</h4><p>หน้าที่อ่าน</p></div></div>' +
      '</div><div class="card mt-3"><div class="card-header"><h3>ผลประเมิน</h3>' + eb + '</div>' +
      '<p class="text-muted">' + (stats.lastEval && stats.lastEval.suggestions ? stats.lastEval.suggestions : 'ยังไม่มีข้อเสนอแนะ') + '</p></div>';
  },

  // ==================== รายงานครู ====================
  async renderTeacherDetail(c) {
    var teachers = [];
    try { var r = await API.getTeachers(); if (r.success) teachers = r.teachers; } catch (e) {}
    var h = '<div class="section-header"><h2>รายงานครู</h2></div><div class="filter-bar"><select class="form-control" id="tchReportSelect" onchange="App.loadTeacherReport()"><option value="">เลือกครู</option>';
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
    if (classes.length === 0) { el.innerHTML = '<div class="empty-state"><h3>ยังไม่มีห้องเรียน</h3></div>'; return; }
    var h = '<div class="card-grid card-grid-2">';
    for (var i = 0; i < classes.length; i++) {
      var cl = classes[i];
      var stats = { studentCount: 0, monthPresent: 0, monthAbsent: 0, totalPagesRead: 0 };
      try { var r = await API.getTeacherStats(tid, cl.id); if (r.success) stats = r.stats; } catch (e) {}
      h += '<div class="card"><div class="card-header"><h3>' + cl.name + '</h3></div>';
      h += '<div class="card-grid card-grid-2" style="gap:12px">';
      h += '<div><p class="text-xs text-muted">นักเรียน</p><h4>' + stats.studentCount + '</h4></div>';
      h += '<div><p class="text-xs text-muted">หน้าที่อ่าน</p><h4>' + stats.totalPagesRead + '</h4></div>';
      h += '<div><p class="text-xs text-muted">มาเรียน</p><h4 style="color:var(--forest)">' + stats.monthPresent + '</h4></div>';
      h += '<div><p class="text-xs text-muted">ไม่มา</p><h4 style="color:var(--coral)">' + stats.monthAbsent + '</h4></div>';
      h += '</div></div>';
    }
    h += '</div>';
    el.innerHTML = h;
  }
};

document.addEventListener('DOMContentLoaded', function () { App.init(); });
