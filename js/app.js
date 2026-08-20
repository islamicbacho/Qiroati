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
      try {
        var user = JSON.parse(saved);
        if (!user || (!user.teacherId && !user.id) || (user.role !== 'teacher' && user.role !== 'admin')) {
          localStorage.removeItem('qiroati_user');
          this.showLogin();
        } else {
          this.state.currentUser = user;
          this.showApp();
          this.navigateTo(this.state.currentView);
        }
      } catch (e) {
        localStorage.removeItem('qiroati_user');
        this.showLogin();
      }
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
    const teacherId = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    error.classList.add('hidden');
    if (!teacherId || !password) {
      error.textContent = 'กรุณากรอกรหัสครูและรหัสผ่าน';
      error.classList.remove('hidden');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const result = await API.login(teacherId, password);
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
      error.textContent = 'รหัสไม่ถูกต้อง';
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
      const r = { admin: 'ผู้ดูแลระบบ', teacher: 'ครูผู้สอน' };
      el.textContent = r[u.role] || u.role;
    });
    document.querySelectorAll('.user-avatar').forEach(el => { el.textContent = u.name.charAt(0); });
    document.querySelectorAll('.admin-only').forEach(el => { el.style.display = u.role === 'admin' ? '' : 'none'; });
    document.querySelectorAll('.teacher-only').forEach(el => { el.style.display = ''; });
  },
  navigateTo(view) {
    this.state.currentView = view;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    const titles = {
      dashboard: 'แดชบอร์ด', classroom: 'ห้องเรียน', attendance: 'ลงเวลาเข้าเรียน',
      weekly: 'ความคืบหน้ารายสัปดาห์', monthly: 'รายงานรายเดือน', evaluation: 'การประเมิน',
      students: 'นักเรียน', teachers: 'ครู', classes: 'ห้องเรียน',
      notifications: 'แจ้งเตือน',
      studentDetail: 'รายงานนักเรียน'
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
      case 'notifications': await this.renderNotifications(c); break;
      case 'studentDetail': await this.renderStudentDetail(c); break;
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
  evalRating(attPct, readPct) {
    var avg = (attPct + readPct) / 2;
    if (attPct >= 80 && readPct >= 80) return { label: 'ดีมาก', color: 'badge-success', icon: 'A' };
    if (attPct >= 70 && readPct >= 70) return { label: 'ดี', color: 'badge-info', icon: 'B' };
    if (avg >= 50) return { label: 'ปานกลาง', color: 'badge-warning', icon: 'C' };
    return { label: 'ปรับปรุง', color: 'badge-danger', icon: 'D' };
  },
  async loadEvaluation() {
    var teacherId = document.getElementById('evalTeacher').value;
    var yr = document.getElementById('evalYear').value;
    var mo = document.getElementById('evalMonth').value;
    var moName = this.getMonthName(parseInt(mo));
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
      stuStats[s.id] = { name: s.firstName + ' ' + s.lastName, grade: s.grade, className: s.className, totalPages: 0, weeksPresent: 0, weeklyAtt: [0, 0, 0, 0], weeklyPages: [0, 0, 0, 0] };
    });
    weeks.forEach(function (wk, wi) {
      wk.forEach(function (p) {
        if (!stuStats[p.studentId]) return;
        var pg = parseInt(p.pagesRead) || 0;
        stuStats[p.studentId].totalPages += pg;
        stuStats[p.studentId].weeklyPages[wi] = pg;
        var att = parseInt(p.attendanceCount) || 0;
        if (att > 0) { stuStats[p.studentId].weeksPresent++; stuStats[p.studentId].weeklyAtt[wi] = 1; }
      });
    });
    var hasData = false;
    Object.keys(stuStats).forEach(function(k) { if (stuStats[k].totalPages > 0 || stuStats[k].weeksPresent > 0) hasData = true; });
    if (!hasData) { el.innerHTML = '<div class="empty-state"><h3>ยังไม่มีข้อมูลในเดือนนี้</h3><p>กรุณาบันทึกข้อมูลรายสัปดาห์ก่อน</p></div>'; return; }
    var summary = { veryGood: 0, good: 0, moderate: 0, improve: 0 };
    var h = '<button class="btn btn-success btn-sm" onclick="App.printEvalPDF()" style="margin-bottom:1rem">พิมพ์ PDF</button>';
    h += '<div id="evalPrintArea"><div style="margin-bottom:1rem"><strong>ครูผู้สอน:</strong> ' + teacherId + ' &nbsp;&nbsp; <strong>เดือน:</strong> ' + moName + ' ' + yr + '</div>';
    h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อนักเรียน</th><th>ชั้น</th>' +
      '<th>เข้า สป.1</th><th>เข้า สป.2</th><th>เข้า สป.3</th><th>เข้า สป.4</th><th>%</th>' +
      '<th>อ่าน สป.1</th><th>อ่าน สป.2</th><th>อ่าน สป.3</th><th>อ่าน สป.4</th><th>หน้ารวม</th><th>%</th>' +
      '<th>ผลลัพธ์</th></tr></thead><tbody>';
    var i = 1;
    Object.keys(stuStats).forEach(function (k) {
      var st = stuStats[k];
      var attPct = Math.round((st.weeksPresent / 4) * 100);
      var readPct = Math.round((st.totalPages / 44) * 100);
      if (readPct > 100) readPct = 100;
      var rating = App.evalRating(attPct, readPct);
      if (rating.label === 'ดีมาก') summary.veryGood++;
      else if (rating.label === 'ดี') summary.good++;
      else if (rating.label === 'ปานกลาง') summary.moderate++;
      else summary.improve++;
      h += '<tr><td>' + i + '</td><td><strong>' + st.name + '</strong></td><td>' + (st.grade || '-') + '</td>';
      for (var wi = 0; wi < 4; wi++) {
        h += '<td>' + (st.weeklyAtt[wi] ? '<span class="badge badge-success">เข้า</span>' : '<span class="badge badge-danger">-</span>') + '</td>';
      }
      var attColor = attPct >= 80 ? 'color:#22c55e' : attPct >= 50 ? 'color:#f59e0b' : 'color:#ef4444';
      h += '<td style="' + attColor + ';font-weight:700">' + attPct + '%</td>';
      for (var wi = 0; wi < 4; wi++) {
        var pg = st.weeklyPages[wi];
        h += '<td>' + (pg > 0 ? pg : '<span class="text-muted">-</span>') + '</td>';
      }
      var readColor = readPct >= 80 ? 'color:#22c55e' : readPct >= 50 ? 'color:#f59e0b' : 'color:#ef4444';
      h += '<td>' + st.totalPages + '</td><td style="' + readColor + ';font-weight:700">' + readPct + '%</td>';
      h += '<td><span class="badge ' + rating.color + '">' + rating.icon + ' ' + rating.label + '</span></td></tr>';
      i++;
    });
    h += '</tbody></table></div>';
    h += '<div class="eval-summary" style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap">' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon green" style="margin:0 auto">A</div><div class="stat-info"><h4>' + summary.veryGood + ' คน</h4><p style="color:#22c55e;font-weight:600">ดีมาก (≥80%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon blue" style="margin:0 auto">B</div><div class="stat-info"><h4>' + summary.good + ' คน</h4><p style="color:#3b82f6;font-weight:600">ดี (≥70%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon gold" style="margin:0 auto">C</div><div class="stat-info"><h4>' + summary.moderate + ' คน</h4><p style="color:#f59e0b;font-weight:600">ปานกลาง (≥50%)</p></div></div>' +
      '<div class="stat-card" style="flex:1;min-width:120px;text-align:center"><div class="stat-icon red" style="margin:0 auto">D</div><div class="stat-info"><h4>' + summary.improve + ' คน</h4><p style="color:#ef4444;font-weight:600">ปรับปรุง (<50%)</p></div></div>' +
      '</div></div>';
    el.innerHTML = h;
  },
  printEvalPDF() {
    var area = document.getElementById('evalPrintArea');
    if (!area) return;
    var teacherId = document.getElementById('evalTeacher').value;
    var yr = document.getElementById('evalYear').value;
    var mo = document.getElementById('evalMonth').value;
    var moName = this.getMonthName(parseInt(mo));
    var w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>รายงานประเมินนักเรียน</title>');
    w.document.write('<style>body{font-family:sans-serif;padding:2rem;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{border:1px solid #333;padding:6px 8px;text-align:center;font-size:12px}th{background:#1e3a5f;color:#fff;font-weight:600}.badge-success{background:#22c55e;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}.badge-info{background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}.badge-warning{background:#f59e0b;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}.badge-danger{background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#666;margin-bottom:1rem}.summary{display:flex;gap:1rem;margin-top:1.5rem}.summary-card{flex:1;text-align:center;padding:0.8rem;border:1px solid #ccc;border-radius:8px}.summary-card h3{margin:0;font-size:22px}.summary-card p{margin:4px 0 0;font-size:12px;font-weight:600}</style>');
    w.document.write('</head><body>');
    w.document.write('<h1>รายงานประเมินแนวโน้มนักเรียน</h1>');
    w.document.write('<h2>ครูผู้สอน: ' + teacherId + ' | เดือน ' + moName + ' ' + yr + '</h2>');
    w.document.write(area.innerHTML);
    w.document.write('<div class="summary">');
    var sc = area.querySelectorAll('.stat-card');
    for (var i = 0; i < sc.length; i++) { w.document.write(sc[i].outerHTML); }
    w.document.write('</div>');
    w.document.write('<div style="margin-top:3rem;display:flex;gap:4rem"><div>ลงชื่อ _____________________<br>ครูผู้สอน</div><div>ลงชื่อ _____________________<br>ผู้อำนวยการ</div></div>');
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(function() { w.print(); }, 500);
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
    var teachers = [], users = [];
    try {
      var r = await API.getTeachers(); if (r.success) teachers = r.teachers;
      var ur = await API.getUsers(); if (ur.success) users = ur.users;
    } catch (e) {}
    var userMap = {};
    users.forEach(function(u) { userMap[u.name] = u; });
    var h = '<div class="section-header"><h2>จัดการครู</h2><div class="actions">' +
      '<button class="btn btn-primary btn-sm" onclick="App.showAddTeacherModal()">+ เพิ่มครู</button> ' +
      '<button class="btn btn-ghost btn-sm" onclick="App.syncTeachers()">ซิงค์ครูอัตโนมัติ</button>' +
      '</div></div>';
    if (teachers.length === 0) h += '<div class="empty-state"><h3>ยังไม่มีครู</h3></div>';
    else {
      h += '<div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อ</th><th>รหัสครู</th><th>รหัสผ่าน</th><th>ห้องเรียน</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody>';
      teachers.forEach(function (t, i) {
        var u = userMap[t.name];
        var tid = u ? u.teacherId : '<span style="color:#ef4444">ไม่มีบัญชี</span>';
        var pass = u ? u.password : '-';
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + t.name + '</strong></td>';
        h += '<td class="text-xs" style="font-weight:600;color:#3b82f6">' + tid + '</td>';
        h += '<td class="text-xs">' + pass + '</td>';
        h += '<td>' + (t.assignedClasses || []).join(', ') + '</td>';
        h += '<td>' + App.statusBadge(u ? u.status : 'active') + '</td>';
        if (u) {
          h += '<td><button class="btn btn-sm btn-ghost" onclick="App.resetTeacherPass(\'' + u.teacherId + '\')">รีเซ็ตรหัสผ่าน</button></td>';
        } else {
          h += '<td><button class="btn btn-sm btn-primary" onclick="App.createTeacherAccount(\'' + t.name + '\')">สร้างบัญชี</button></td>';
        }
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
    c.innerHTML = h;
    this.state.teachers = teachers;
  },
  showAddTeacherModal() {
    this.showModal('เพิ่มครู', '<form onsubmit="App.addTeacher(event)">' +
      '<div class="form-group"><label>ชื่อ-นามสกุล</label><input type="text" class="form-control" id="newTchName" required></div>' +
      '<div class="form-group"><label>รหัสผ่าน</label><input type="text" class="form-control" id="newTchPass" placeholder="เว้นว่างเพื่อใช้รหัสครูเป็นรหัสผ่าน"></div>' +
      '<div class="flex gap-1 mt-2"><button type="submit" class="btn btn-primary">บันทึก</button><button type="button" class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button></div></form>');
  },
  async addTeacher(e) {
    e.preventDefault();
    var name = document.getElementById('newTchName').value.trim();
    var pass = document.getElementById('newTchPass').value.trim();
    var r = await API.createUser({ name: name, password: pass || undefined });
    if (r.success) {
      this.closeModal();
      this.showToast('success', 'สร้างบัญชี ' + r.teacherId + ' สำเร็จ | รหัสผ่าน: ' + r.password);
      this.renderTeachers(document.getElementById('contentArea'));
    } else {
      this.showToast('error', r.message);
    }
  },
  async createTeacherAccount(name) {
    var r = await API.createUser({ name: name });
    if (r.success) {
      this.showToast('success', 'สร้างบัญชี ' + r.teacherId + ' สำเร็จ | รหัสผ่าน: ' + r.password);
      this.renderTeachers(document.getElementById('contentArea'));
    } else {
      this.showToast('error', r.message);
    }
  },
  async syncTeachers() {
    var r = await API.syncTeachersToUsers();
    if (r.success) {
      this.showToast('success', r.message);
      this.renderTeachers(document.getElementById('contentArea'));
    } else {
      this.showToast('error', r.message);
    }
  },

  async resetTeacherPass(teacherId) {
    if (!confirm('ต้องการรีเซ็ตรหัสผ่านของ ' + teacherId + ' ใช่หรือไม่? รหัสผ่านใหม่จะเป็นรหัสครูเดียวกัน')) return;
    var r = await API.resetPassword({ teacherId: teacherId, newPassword: teacherId });
    if (r.success) {
      this.showToast('success', r.message);
      this.renderTeachers(document.getElementById('contentArea'));
    } else {
      this.showToast('error', r.message);
    }
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
    students.forEach(function (s) { h += '<option value="' + s.id + '">' + s.firstName + ' ' + s.lastName + ' (' + (s.className || '') + ')</option>'; });
    h += '</select></div><div id="studentReportContent"></div>';
    c.innerHTML = h;
  },
  loadStudentProfileImg(studentId) {
    return localStorage.getItem('profile_' + studentId) || '';
  },
  saveStudentProfileImg(studentId, dataUrl) {
    localStorage.setItem('profile_' + studentId, dataUrl);
  },
  uploadStudentProfile(studentId) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var size = 200;
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var min = Math.min(img.width, img.height);
          var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          App.saveStudentProfileImg(studentId, dataUrl);
          var el = document.getElementById('profileImg');
          if (el) el.src = dataUrl;
          App.showToast('success', 'บันทึกรูปโปรไฟล์แล้ว');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  },
  async loadStudentReport() {
    var sid = document.getElementById('stuReportSelect').value;
    var el = document.getElementById('studentReportContent');
    if (!sid) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="text-center mt-3"><span class="spinner"></span></div>';
    var students = [], attendance = [], progress = [];
    try {
      var sr = await API.getStudents(); if (sr.success) students = sr.students;
      var ar = await API.getAttendance({}); if (ar.success) attendance = ar.records;
      var pr = await API.getWeeklyProgress({}); if (pr.success) progress = pr.records;
    } catch (e) {}
    var stu = null;
    students.forEach(function(s) { if (s.id === sid) stu = s; });
    if (!stu) { el.innerHTML = '<p class="text-muted">ไม่พบนักเรียน</p>'; return; }
    var stuAtt = attendance.filter(function(r) { return r.studentId === sid; });
    var stuWP = progress.filter(function(r) { return r.studentId === sid; });
    var present = 0, absent = 0, late = 0;
    stuAtt.forEach(function(r) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
    });
    var totalDays = present + absent + late;
    var attPct = totalDays > 0 ? Math.round((present + late) / totalDays * 100) : 0;
    var totalPages = 0, weeksWithReading = 0;
    stuWP.forEach(function(p) {
      totalPages += parseInt(p.pagesRead) || 0;
      if (parseInt(p.pagesRead) > 0) weeksWithReading++;
    });
    var readPct = Math.round((totalPages / 44) * 100);
    if (readPct > 100) readPct = 100;
    var attRating = attPct >= 80 ? 'ดีมาก' : attPct >= 70 ? 'ดี' : attPct >= 50 ? 'ปานกลาง' : 'ปรับปรุง';
    var attColor = attPct >= 80 ? '#22c55e' : attPct >= 70 ? '#3b82f6' : attPct >= 50 ? '#f59e0b' : '#ef4444';
    var readRating = readPct >= 80 ? 'ดีมาก' : readPct >= 70 ? 'ดี' : readPct >= 50 ? 'ปานกลาง' : 'ปรับปรุง';
    var readColor = readPct >= 80 ? '#22c55e' : readPct >= 70 ? '#3b82f6' : readPct >= 50 ? '#f59e0b' : '#ef4444';
    var profileSrc = this.loadStudentProfileImg(sid);
    var h = '<div style="max-width:800px;margin:0 auto">';
    h += '<div style="background:linear-gradient(135deg,#1e3a5f,#2d5a87);border-radius:16px;padding:2rem;color:#fff;display:flex;align-items:center;gap:2rem;flex-wrap:wrap">';
    h += '<div style="position:relative;cursor:pointer" onclick="App.uploadStudentProfile(\'' + sid + '\')" title="คลิกเพื่อเปลี่ยนรูป">';
    h += '<img id="profileImg" src="' + (profileSrc || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="%23376591" width="120" height="120" rx="60"/><text x="60" y="68" text-anchor="middle" fill="%23fff" font-size="40" font-family="sans-serif">' + stu.firstName.charAt(0) + '</text></svg>') + '" style="width:120px;height:120px;border-radius:50%;border:4px solid rgba(255,255,255,0.3);object-fit:cover">';
    h += '<div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.6);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px">&#128247;</div>';
    h += '</div>';
    h += '<div><h2 style="margin:0;font-size:1.5rem">' + stu.firstName + ' ' + stu.lastName + '</h2>';
    h += '<p style="margin:4px 0;opacity:0.8">ชั้น ' + (stu.grade || '-') + ' | ห้อง ' + (stu.className || '-') + ' | ครู ' + (stu.teacherName || '-') + '</p>';
    h += '<p style="margin:4px 0;opacity:0.6;font-size:0.85rem">รหัส: ' + stu.id + '</p></div></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-top:1.5rem">';
    h += '<div class="stat-card"><div class="stat-info"><h4 style="color:' + attColor + '">' + attPct + '%</h4><p>อัตราเข้าเรียน</p><p style="font-size:0.75rem;color:' + attColor + '">' + attRating + '</p></div></div>';
    h += '<div class="stat-card"><div class="stat-info"><h4>' + totalPages + ' หน้า</h4><p>อ่านรวมทั้งหมด</p><p style="font-size:0.75rem;color:' + readColor + '">' + readRating + '</p></div></div>';
    h += '<div class="stat-card"><div class="stat-info"><h4>' + present + '</h4><p>มาเรียน</p></div></div>';
    h += '<div class="stat-card"><div class="stat-info"><h4>' + absent + '</h4><p>ไม่มา</p></div></div>';
    h += '<div class="stat-card"><div class="stat-info"><h4>' + late + '</h4><p>สาย</p></div></div>';
    h += '</div>';
    h += '<div class="card mt-3"><div class="card-header"><h3>ประวัติเข้าเรียน</h3></div>';
    if (stuAtt.length === 0) {
      h += '<p class="text-muted">ยังไม่มีประวัติเข้าเรียน</p>';
    } else {
      h += '<div class="table-wrap"><table><thead><tr><th>วันที่</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>';
      stuAtt.sort(function(a,b) { return String(b.date).localeCompare(String(a.date)); });
      stuAtt.forEach(function(r) {
        var statusLabel = r.status === 'present' ? 'มา' : r.status === 'absent' ? 'ไม่มา' : 'สาย';
        var statusColor = r.status === 'present' ? '#22c55e' : r.status === 'absent' ? '#ef4444' : '#f59e0b';
        h += '<tr><td>' + (r.date || '-') + '</td><td style="color:' + statusColor + ';font-weight:600">' + statusLabel + '</td><td>' + (r.note || '-') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    h += '<div class="card mt-3"><div class="card-header"><h3>ประวัติการอ่าน</h3></div>';
    if (stuWP.length === 0) {
      h += '<p class="text-muted">ยังไม่มีประวัติการอ่าน</p>';
    } else {
      h += '<div class="table-wrap"><table><thead><tr><th>เดือน</th><th>สัปดาห์</th><th>หน้าที่อ่าน</th><th>ระดับ</th><th>หมายเหตุ</th></tr></thead><tbody>';
      stuWP.sort(function(a,b) { return (String(a.year)+String(a.month)+String(a.weekNumber)).localeCompare(String(b.year)+String(b.month)+String(b.weekNumber)); });
      stuWP.forEach(function(p) {
        var lvl = p.readingLevel === 'advanced' ? 'ขั้นสูง' : p.readingLevel === 'intermediate' ? 'ปานกลาง' : p.readingLevel === 'beginner' ? 'เริ่มต้น' : '-';
        h += '<tr><td>' + App.getMonthName(parseInt(p.month)) + ' ' + p.year + '</td><td>สัปดาห์ที่ ' + p.weekNumber + '</td><td><strong>' + (p.pagesRead || 0) + '</strong> / 44 หน้า</td><td>' + lvl + '</td><td>' + (p.note || '-') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    el.innerHTML = h;
  },

};

document.addEventListener('DOMContentLoaded', function () { App.init(); });
