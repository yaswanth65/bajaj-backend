// flow-test.mjs  —  Bajaj Operations Backend: Cross-Role Flow Test (v3)
// Routes and structures updated for user-specific API structure:
//   Auth       : POST /api/auth/login
//   LC Dashboard  : GET  /api/lc/dashboard
//   BM Dashboard  : GET  /api/bm/dashboard
//   RM Dashboard  : GET  /api/rm/dashboard
//   LC Attendance : POST /api/lc/attendance
//   BM Attendance : GET  /api/bm/attendance
//   RM Attendance : GET  /api/rm/attendance
//   BM Approvals  : GET  /api/bm/approvals
//   RM Finance    : GET  /api/rm/finance
//   Approvals Create: POST /api/approvals

const BASE_URL = 'http://192.168.29.113:5000/api';

// ─── Test harness ────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;

function pass(label, detail = '') {
  passed++;
  console.log(`✅ PASS  ${label}${detail ? '  →  ' + detail : ''}`);
}
function fail(label, reason = '') {
  failed++;
  console.log(`❌ FAIL  ${label}${reason ? '  →  ' + reason : ''}`);
}
function skip(label, reason = '') {
  skipped++;
  console.log(`⏭️  SKIP  ${label}${reason ? '  →  ' + reason : ''}`);
}
function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 52 - title.length))}`);
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE_URL}${path}`, opts);
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await r.json() : await r.text();
  return { status: r.status, data };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Bajaj Operations — Cross-Role Flow Test (v3)');
  console.log(`  Target : ${BASE_URL}`);
  console.log(`  Time   : ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════');

  // ── Connectivity ─────────────────────────────────────────────────────────
  section('Connectivity');
  let reachable = false;
  try {
    const r = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(6000),
    });
    reachable = true; // got a response
    pass('Server reachable', `HTTP ${r.status} from /auth/login`);
  } catch (e) {
    skip('Server reachable', `Cannot reach ${BASE_URL} — ${e.message}`);
    printSummary();
    return;
  }

  let lcToken = null, bmToken = null, rmToken = null;
  let lcUserId = null, bmUserId = null;
  let lcBranchId = null, bmBranchScope = [];
  let newApprovalId = null;
  const APPROVAL_TITLE = 'Flow test repair';

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 1 — Auth: login as LC, BM, RM
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 1 — Auth Flow (3 logins)');

  // 1a. LC
  try {
    const { status, data } = await req('POST', '/auth/login', {
      body: { email: 'shitaldevnath@gmail.com', password: '123456789' },
    });
    if (status === 200 && data.token) {
      lcToken   = data.token;
      lcUserId  = data.user?.id || data.user?._id || data.id || data._id || null;
      lcBranchId= data.user?.branchId || null;
      pass('LC login (shitaldevnath@gmail.com)', `userId=${lcUserId} branchId=${lcBranchId}`);
    } else {
      fail('LC login', `status=${status} body=${JSON.stringify(data).slice(0,120)}`);
    }
  } catch (e) { fail('LC login', e.message); }

  // 1b. BM
  try {
    const { status, data } = await req('POST', '/auth/login', {
      body: { email: 'ishwarrajput@gmail.com', password: '123456789' },
    });
    if (status === 200 && data.token) {
      bmToken      = data.token;
      bmUserId     = data.user?.id || data.user?._id || null;
      bmBranchScope= data.user?.branchScope || [];
      pass('BM login (ishwarrajput@gmail.com)', `branchScope=[${bmBranchScope.slice(0,2).join(',')}${bmBranchScope.length>2?'…':''}]`);
    } else {
      fail('BM login', `status=${status} body=${JSON.stringify(data).slice(0,120)}`);
    }
  } catch (e) { fail('BM login', e.message); }

  // 1c. RM
  try {
    const { status, data } = await req('POST', '/auth/login', {
      body: { email: 'ravinemalikanti@gmail.com', password: '123456789' },
    });
    if (status === 200 && data.token) {
      rmToken = data.token;
      pass('RM login (ravinemalikanti@gmail.com)');
    } else {
      fail('RM login', `status=${status} body=${JSON.stringify(data).slice(0,120)}`);
    }
  } catch (e) { fail('RM login', e.message); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 2 — LC Dashboard  →  GET /api/lc/dashboard
  //  Expected shape: { branch, tasks, complaints, appliances, todayAttendance }
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 2 — LC Dashboard (GET /api/lc/dashboard)');
  if (!lcToken) { skip('LC dashboard', 'No LC token'); }
  else {
    try {
      const { status, data } = await req('GET', '/lc/dashboard', { token: lcToken });
      if (status !== 200) {
        fail('LC dashboard status', `expected 200, got ${status} — ${JSON.stringify(data).slice(0,150)}`);
      } else {
        const required = ['branch', 'tasks', 'complaints', 'appliances'];
        const missing  = required.filter(k => !(k in data));
        if (missing.length) {
          fail('LC dashboard fields', `missing: ${missing.join(', ')}`);
        } else {
          const typeErrors = [];
          if (typeof data.branch !== 'object' || !data.branch) typeErrors.push('branch not object');
          if (!Array.isArray(data.appliances)) typeErrors.push('appliances not array');
          if (!Array.isArray(data.tasks)) typeErrors.push('tasks not array');
          if (typeErrors.length) fail('LC dashboard field types', typeErrors.join('; '));
          else pass('LC dashboard', `branch="${data.branch?.name}" appliances=${data.appliances?.length} tasks=${data.tasks?.length}`);
        }
      }
    } catch (e) { fail('LC dashboard', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 3 — BM Dashboard  →  GET /api/bm/dashboard
  //  Expected shape: { branches, approvals, visits, notifications }
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 3 — BM Dashboard (GET /api/bm/dashboard)');
  if (!bmToken) { skip('BM dashboard', 'No BM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/bm/dashboard', { token: bmToken });
      if (status !== 200) {
        fail('BM dashboard status', `expected 200, got ${status} — ${JSON.stringify(data).slice(0,150)}`);
      } else {
        const required = ['branches', 'approvals', 'visits', 'notifications'];
        const missing  = required.filter(k => !(k in data));
        if (missing.length) {
          fail('BM dashboard fields', `missing: ${missing.join(', ')}`);
        } else {
          const typeErrors = [];
          if (!Array.isArray(data.branches))        typeErrors.push('branches not array');
          if (!Array.isArray(data.approvals))       typeErrors.push('approvals not array');
          if (!Array.isArray(data.visits))          typeErrors.push('visits not array');
          if (!Array.isArray(data.notifications))   typeErrors.push('notifications not array');
          if (typeErrors.length) fail('BM dashboard field types', typeErrors.join('; '));
          else pass('BM dashboard', `branches=${data.branches?.length} approvals=${data.approvals?.length} visits=${data.visits?.length}`);
        }
      }
    } catch (e) { fail('BM dashboard', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 4 — RM Dashboard  →  GET /api/rm/dashboard
  //  Expected shape: { branches, complaints, approvals, notifications }
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 4 — RM Dashboard (GET /api/rm/dashboard)');
  if (!rmToken) { skip('RM dashboard', 'No RM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/rm/dashboard', { token: rmToken });
      if (status !== 200) {
        fail('RM dashboard status', `expected 200, got ${status} — ${JSON.stringify(data).slice(0,150)}`);
      } else {
        const required = ['branches', 'complaints', 'approvals', 'notifications'];
        const missing  = required.filter(k => !(k in data));
        if (missing.length) {
          fail('RM dashboard fields', `missing: ${missing.join(', ')}`);
        } else {
          const typeErrors = [];
          if (!Array.isArray(data.branches))     typeErrors.push('branches not array');
          if (!Array.isArray(data.complaints))   typeErrors.push('complaints not array');
          if (!Array.isArray(data.approvals))    typeErrors.push('approvals not array');
          if (!Array.isArray(data.notifications))typeErrors.push('notifications not array');
          if (typeErrors.length) fail('RM dashboard field types', typeErrors.join('; '));
          else pass('RM dashboard', `branches=${data.branches?.length} complaints=${data.complaints?.length} approvals=${data.approvals?.length}`);
        }
      }
    } catch (e) { fail('RM dashboard', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 5 — LC marks attendance  →  POST /api/lc/attendance
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 5 — LC marks attendance (POST /api/lc/attendance)');
  if (!lcToken) { skip('LC marks attendance', 'No LC token'); }
  else {
    try {
      const { status, data } = await req('POST', '/lc/attendance', {
        token: lcToken,
        body: {
          checkIn: '09:00',
          weeklyTasks: [{ description: 'Test flow task', estimatedHours: 1 }],
        },
      });
      if (status === 200 || status === 201) {
        pass('LC marks attendance', `status=${status} attendanceId=${data.attendance?.id}`);
      } else {
        fail('LC marks attendance', `status=${status} body=${JSON.stringify(data).slice(0,200)}`);
      }
    } catch (e) { fail('LC marks attendance', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 6 — BM sees LC's attendance  →  GET /api/bm/attendance
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 6 — BM sees LC attendance (GET /api/bm/attendance)');
  if (!bmToken) { skip('BM sees LC attendance', 'No BM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/bm/attendance', { token: bmToken });
      if (status !== 200) {
        fail('BM sees LC attendance (status)', `expected 200, got ${status}`);
      } else {
        const records = Array.isArray(data.attendance) ? data.attendance : [];
        const lcRecord = records.find(r => {
          const uid    = r.userId || r.user?.id;
          const tasks  = Array.isArray(r.weeklyTasks) ? r.weeklyTasks : [];
          const hasTask= tasks.some(t => (t.description || '').includes('Test flow task'));
          const uidMatch = lcUserId && String(uid) === String(lcUserId);
          return uidMatch || hasTask;
        });
        if (lcRecord) {
          const tasks   = Array.isArray(lcRecord.weeklyTasks) ? lcRecord.weeklyTasks : [];
          const hasTask = tasks.some(t => (t.description || '').includes('Test flow task'));
          pass('BM sees LC attendance', `found record userId=${lcRecord.userId} weeklyTasks=${tasks.length} hasTask=${hasTask}`);
        } else {
          fail('BM sees LC attendance', `LC record not found among ${records.length} records`);
        }
      }
    } catch (e) { fail('BM sees LC attendance', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 7 — RM sees attendance too  →  GET /api/rm/attendance
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 7 — RM sees LC attendance (GET /api/rm/attendance)');
  if (!rmToken) { skip('RM sees LC attendance', 'No RM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/rm/attendance', { token: rmToken });
      if (status !== 200) {
        fail('RM sees LC attendance (status)', `expected 200, got ${status}`);
      } else {
        const records = Array.isArray(data.attendance) ? data.attendance : [];
        const found = records.some(r => {
          const uid     = r.userId || r.user?.id;
          const tasks   = Array.isArray(r.weeklyTasks) ? r.weeklyTasks : [];
          const hasTask = tasks.some(t => (t.description || '').includes('Test flow task'));
          const uidMatch= lcUserId && String(uid) === String(lcUserId);
          return uidMatch || hasTask;
        });
        if (found) {
          pass('RM sees LC attendance', `Found in ${records.length} total records`);
        } else {
          fail('RM sees LC attendance', `LC record not found among ${records.length} records`);
        }
      }
    } catch (e) { fail('RM sees LC attendance', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 8 — BM creates approval  →  POST /api/approvals
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 8 — BM creates approval (POST /api/approvals)');
  const approvalBranchId = (() => {
    if (!bmBranchScope.length) return null;
    if (lcBranchId && bmBranchScope.includes(lcBranchId)) return lcBranchId;
    return bmBranchScope[0];
  })();

  if (!bmToken) { skip('BM creates approval', 'No BM token'); }
  else if (!approvalBranchId) { skip('BM creates approval', 'No branchScope on BM — cannot determine branchId'); }
  else {
    try {
      const { status, data } = await req('POST', '/approvals', {
        token: bmToken,
        body: { title: APPROVAL_TITLE, kind: 'Expense', amount: 5000, note: 'test', branchId: approvalBranchId },
      });
      if (status === 201 || status === 200) {
        newApprovalId = data.approval?.id || data.approval?._id || data.id || data._id || null;
        pass('BM creates approval', `status=${status} id=${newApprovalId} branchId=${approvalBranchId}`);
      } else {
        fail('BM creates approval', `status=${status} body=${JSON.stringify(data).slice(0,200)}`);
      }
    } catch (e) { fail('BM creates approval', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 9 — RM sees new approval  →  GET /api/rm/finance
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 9 — RM sees new approval (GET /api/rm/finance)');
  if (!rmToken) { skip('RM sees new approval', 'No RM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/rm/finance', { token: rmToken });
      if (status !== 200) {
        fail('RM sees new approval (status)', `expected 200, got ${status}`);
      } else {
        const approvals = Array.isArray(data.approvals) ? data.approvals : [];
        const found = approvals.some(a => {
          const idMatch    = newApprovalId && String(a.id || a._id) === String(newApprovalId);
          const titleMatch = (a.title || '').includes(APPROVAL_TITLE);
          return idMatch || titleMatch;
        });
        if (found) {
          pass('RM sees new approval', `Found "${APPROVAL_TITLE}" among ${approvals.length} approvals`);
        } else {
          fail('RM sees new approval', `Not found among ${approvals.length} approvals (id=${newApprovalId})`);
        }
      }
    } catch (e) { fail('RM sees new approval', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 10 — BM dashboard has pending approval  →  GET /api/bm/dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 10 — BM dashboard approvals reflects new approval');
  if (!bmToken) { skip('BM dashboard has approval', 'No BM token'); }
  else {
    try {
      const { status, data } = await req('GET', '/bm/dashboard', { token: bmToken });
      if (status !== 200) {
        fail('BM dashboard approval check (status)', `expected 200, got ${status}`);
      } else {
        const approvals = Array.isArray(data.approvals) ? data.approvals : [];
        const found = approvals.some(a => {
          const idMatch    = newApprovalId && String(a.id || a._id) === String(newApprovalId);
          const titleMatch = (a.title || '').includes(APPROVAL_TITLE);
          return idMatch || titleMatch;
        });
        if (found) {
          pass('BM dashboard has approval', `Found "${APPROVAL_TITLE}" in approvals`);
        } else if (!newApprovalId) {
          skip('BM dashboard has approval', 'Approval was not created in test 8 — skipping check');
        } else {
          fail('BM dashboard has approval', `Not found in approvals. count=${approvals.length}`);
        }
      }
    } catch (e) { fail('BM dashboard has approval', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 11 — Role isolation: LC cannot access BM Dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 11 — Role isolation: LC cannot access BM dashboard (GET /api/bm/dashboard)');
  if (!lcToken) {
    skip('Role isolation: LC cannot access BM dashboard', 'No LC token');
  } else {
    try {
      const { status, data } = await req('GET', '/bm/dashboard', { token: lcToken });
      if (status === 403) {
        pass('Role isolation: LC cannot access BM dashboard', `Got 403 — "${data?.message}"`);
      } else {
        fail('Role isolation: LC cannot access BM dashboard', `expected 403, got ${status}`);
      }
    } catch (e) { fail('Role isolation: LC cannot access BM dashboard', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEST 12 — Role isolation: BM cannot access LC Dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  section('Test 12 — Role isolation: BM cannot access LC dashboard (GET /api/lc/dashboard)');
  if (!bmToken) {
    skip('Role isolation: BM cannot access LC dashboard', 'No BM token');
  } else {
    try {
      const { status, data } = await req('GET', '/lc/dashboard', { token: bmToken });
      if (status === 403) {
        pass('Role isolation: BM cannot access LC dashboard', `Got 403 — "${data?.message}"`);
      } else {
        fail('Role isolation: BM cannot access LC dashboard', `expected 403, got ${status}`);
      }
    } catch (e) { fail('Role isolation: BM cannot access LC dashboard', e.message); }
  }

  printSummary();
}

function printSummary() {
  const total = passed + failed + skipped;
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  ✅ Passed  : ${passed}`);
  console.log(`  ❌ Failed  : ${failed}`);
  console.log(`  ⏭️  Skipped : ${skipped}`);
  console.log(`  Total    : ${passed + failed + skipped}`);
  console.log(`\n  Result   : ${passed}/${total} tests passed`);
  console.log('══════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
