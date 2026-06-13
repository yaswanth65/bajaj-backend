const BASE = "http://localhost:5000/api";

let pass = 0, fail = 0;
function test(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} — ${detail || ""}`); }
}
async function post(path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}
async function get(path, token) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}
async function put(path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}
async function del(path, token) {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, data: r.ok ? await r.json() : await r.text() };
}

async function main() {
  console.log("=== INTEGRATION TESTS ===\n");
  const ts = Date.now();

  // Cleanup leftover test users from previous runs
  console.log("── Cleanup ──");
  const cleanupLogin = await post("/auth/login", { email: "ravi@gmail.com", password: "ravi123" });
  let initialCount = 0;
  if (cleanupLogin.data?.token) {
    const all = await get("/users", cleanupLogin.data.token);
    const testUsers = (all.data || []).filter(u => u.name && u.name.startsWith("IntegTest"));
    for (const u of testUsers) {
      await del(`/users/${u.id}`, cleanupLogin.data.token).catch(() => {});
    }
    const leftover = testUsers.length;
    console.log(`  Cleaned ${leftover} leftover test user(s)`);
    initialCount = (all.data || []).length;
  } else {
    console.log("  (server may be down, skipping cleanup)");
  }

  // ── 1. LOGIN ALL ROLES ──
  console.log("── Login Flow ──");
  const rmLogin = await post("/auth/login", { email: "ravi@gmail.com", password: "ravi123" });
  test("RM login succeeds", rmLogin.status === 200, `Status ${rmLogin.status}`);
  test("RM token returned", !!rmLogin.data?.token, "No token");
  test("RM user has managerId field", "managerId" in (rmLogin.data?.user || {}), "Missing managerId");
  const rmToken = rmLogin.data?.token;

  const amLogin = await post("/auth/login", { email: "pachari@gmail.com", password: "am123" });
  test("AM login succeeds", amLogin.status === 200, `Status ${amLogin.status}`);
  const amToken = amLogin.data?.token;

  const aaLogin = await post("/auth/login", { email: "g.teja@gmail.com", password: "aa123" });
  test("AA login succeeds", aaLogin.status === 200, `Status ${aaLogin.status}`);
  const aaToken = aaLogin.data?.token;

  const lcLogin = await post("/auth/login", { email: "lc.addanki@gmail.com", password: "lc123" });
  test("LC login succeeds", lcLogin.status === 200, `Status ${lcLogin.status}`);
  const lcToken = lcLogin.data?.token;

  // Test wrong password
  const badLogin = await post("/auth/login", { email: "ravi@gmail.com", password: "wrong" });
  test("Wrong password returns 401", badLogin.status === 401, `Status ${badLogin.status}`);

  // ── 2. DASHBOARD ACCESS ──
  console.log("\n── Dashboard Access ──");
  const rmDash = await get("/rm/dashboard", rmToken);
  test("RM dashboard has 99 branches", rmDash.data?.branches?.length === 99, `Got ${rmDash.data?.branches?.length}`);

  const amDash = await get("/bm/dashboard", amToken);
  test("AM dashboard has 33 branches", amDash.data?.branches?.length === 33, `Got ${amDash.data?.branches?.length}`);

  const aaDash = await get("/bm/dashboard", aaToken);
  test("AA dashboard has 11 branches", aaDash.data?.branches?.length === 11, `Got ${aaDash.data?.branches?.length}`);

  const lcDash = await get("/lc/dashboard", lcToken);
  test("LC dashboard succeeds", lcDash.status === 200, `Status ${lcDash.status}`);

  // Wrong role dashboards
  const amOnRm = await get("/rm/dashboard", amToken);
  test("AM cannot access RM dashboard (403)", amOnRm.status === 403, `Status ${amOnRm.status}`);

  const aaOnBm = await get("/bm/dashboard", lcToken);
  test("LC cannot access BM dashboard (403)", aaOnBm.status === 403, `Status ${aaOnBm.status}`);

  // ── 3. USER MANAGEMENT HIERARCHY ──
  console.log("\n── User Management: Hierarchy ──");
  const h = await get("/users/hierarchy", rmToken);
  test("RM can fetch hierarchy", h.status === 200, `Status ${h.status}`);
  const root = Array.isArray(h.data) ? h.data[0] : h.data;
  test("Hierarchy root is RM", root?.role === "rm", `Got role=${root?.role}`);
  // Find a seeded AM (with branchCount > 0), skip newly created ones
  const seededAm = root?.children?.find(c => c.branchCount === 33);
  test("Hierarchy has 3 seeded AMs with 33 branches", root?.children?.filter(c => c.branchCount === 33).length === 3, `Got ${root?.children?.filter(c => c.branchCount === 33).length} seeded`);
  test("Seeded AM has branchScope array", Array.isArray(seededAm?.branchScope), `Type=${typeof seededAm?.branchScope}`);
  test("Seeded AM has children (AAs)", Array.isArray(seededAm?.children) && seededAm?.children?.length > 0, `Got ${seededAm?.children?.length} AAs`);

  // Check AA details in hierarchy
  const aa1 = seededAm?.children?.[0];
  test("AA has branchCount", aa1?.branchCount > 0, `Got ${aa1?.branchCount}`);
  test("AA has branches array", Array.isArray(aa1?.branches), `Type=${typeof aa1?.branches}`);
  if (aa1?.branches?.[0]) {
    test("Branch has LC info", "lc" in aa1.branches[0], `Has lc key`);
    test("Branch LC has name", !!aa1.branches[0].lc?.name, `lc=${aa1.branches[0].lc?.name}`);
  }

  // ── 4. ADD USER (RM) ──
  console.log("\n── User Management: Add User (RM) ──");
  const newAm = await post("/users", {
    name: `IntegTest AM ${ts}`,
    email: `integtest.am.${ts}@gmail.com`,
    phone: "9888888888",
    role: "branchManager",
    position: "Branch Admin Manager",
  }, rmToken);
  test("RM can create AM", newAm.status === 201, `Status ${newAm.status}`);
  const newAmId = newAm.data?.user?.id;

  if (newAmId) {
    const assign = await put(`/users/${newAmId}/assign-manager`, { managerId: root?.id }, rmToken);
    test("RM can assign AM to themselves", assign.status === 200, `Status ${assign.status}`);
  }

  const newAa = await post("/users", {
    name: `IntegTest AA ${ts}`,
    email: `integtest.aa.${ts}@gmail.com`,
    phone: "9888888889",
    role: "aa",
    position: "Admin Assistant",
  }, rmToken);
  test("RM can create AA", newAa.status === 201, `Status ${newAa.status}`);
  const newAaId = newAa.data?.user?.id;

  if (newAmId && newAaId) {
    const assign = await put(`/users/${newAaId}/assign-manager`, { managerId: newAmId }, rmToken);
    test("RM can assign AA to AM", assign.status === 200, `Status ${assign.status}`);
  }

  const newLc = await post("/users", {
    name: `IntegTest LC ${ts}`,
    email: `integtest.lc.${ts}@gmail.com`,
    phone: "9888888890",
    role: "lc",
    position: "Local Coordinator",
  }, rmToken);
  test("RM can create LC", newLc.status === 201, `Status ${newLc.status}`);
  const newLcId = newLc.data?.user?.id;

  // ── 5. BRANCH ASSIGNMENT ──
  console.log("\n── User Management: Branch Assignment ──");
  const avail = await get(`/users/available-branches/${newAmId}`, rmToken);
  test("Available branches endpoint works", avail.status === 200, `Status ${avail.status}`);
  const unassigned = await get("/users/unassigned-branches", rmToken);
  test("Unassigned branches endpoint works", unassigned.status === 200, `Status ${unassigned.status}`);

  // New AM has no branches in scope, so available should be empty
  if (newAmId) {
    const amBranches = await get(`/users/available-branches/${newAmId}`, rmToken);
    test("New AM has 0 available branches", Array.isArray(amBranches.data) && amBranches.data.length === 0, `Got ${amBranches.data?.length}`);
  }

  // ── 6. USER EDIT ──
  console.log("\n── User Management: Edit User ──");
  if (newLcId) {
    const edit = await put(`/users/${newLcId}`, { name: `IntegTest LC Updated ${ts}`, phone: "9999999999" }, rmToken);
    test("RM can edit LC", edit.status === 200, `Status ${edit.status}`);

    // Verify edit
    const users = await get("/users", rmToken);
    const updated = (users.data || []).find(u => u.id === newLcId);
    test("LC name was updated", updated?.name?.includes("Updated"), `name=${updated?.name}`);
  }

  // ── 7. DISABLE USER ──
  console.log("\n── User Management: Disable User ──");
  if (newLcId) {
    const disable = await put(`/users/${newLcId}`, { status: "Inactive" }, rmToken);
    test("RM can disable LC", disable.status === 200, `Status ${disable.status}`);

    const users = await get("/users", rmToken);
    const disabled = (users.data || []).find(u => u.id === newLcId);
    test("LC status is Inactive", disabled?.status === "Inactive", `status=${disabled?.status}`);
  }

  // ── 8. DELETE USER ──
  console.log("\n── User Management: Delete User ──");
  // Create a separate LC for deletion (not the one disabled above)
  const delLc = await post("/users", {
    name: `IntegTest Delete LC ${ts}`,
    email: `integtest.deletelc.${ts}@gmail.com`,
    phone: "9888888891",
    role: "lc",
    position: "Local Coordinator",
  }, rmToken);
  const delLcId = delLc.data?.user?.id;
  if (delLcId) {
    const delRes = await del(`/users/${delLcId}`, rmToken);
    test("RM can delete LC", delRes.status === 200, `Status ${delRes.status}`);
  }
  if (newAaId) {
    const delRes = await del(`/users/${newAaId}`, rmToken);
    test("RM can delete AA", delRes.status === 200, `Status ${delRes.status}`);
  }
  if (newAmId) {
    const delRes = await del(`/users/${newAmId}`, rmToken);
    test("RM can delete AM", delRes.status === 200, `Status ${delRes.status}`);
  }

  // Verify cleanup (created 4 users, deletes are soft so count increases by 4)
  const finalUsers = await get("/users", rmToken);
  const finalCount = (finalUsers.data || []).length;
  const expectedCount = initialCount + 4;
  test(`User count is ${expectedCount} (initial + 4 created)`, finalCount === expectedCount, `Got ${finalCount}, expected ${expectedCount}`);

  // ── 9. ROLE-BASED ACCESS CONTROL ──
  console.log("\n── Role-Based Access Control ──");
  // AM can create AA/LC, not RM/AM
  const amCreateRm = await post("/users", { name: "Test", email: `test.rm.${ts}@gmail.com`, role: "rm", position: "RM" }, amToken);
  test("AM cannot create RM (403)", amCreateRm.status === 403, `Status ${amCreateRm.status}`);

  const amCreateAm = await post("/users", { name: "Test", email: `test.am.${ts}@gmail.com`, role: "branchManager", position: "AM" }, amToken);
  test("AM cannot create AM (403)", amCreateAm.status === 403, `Status ${amCreateAm.status}`);

  // AA cannot create anyone
  const aaCreate = await post("/users", { name: "Test", email: `test.${ts}@gmail.com`, role: "lc", position: "LC" }, aaToken);
  test("AA cannot create users (403)", aaCreate.status === 403, `Status ${aaCreate.status}`);

  // LC cannot create anyone
  const lcCreate = await post("/users", { name: "Test", email: `test.lc.${ts}@gmail.com`, role: "lc", position: "LC" }, lcToken);
  test("LC cannot create users (403)", lcCreate.status === 403, `Status ${lcCreate.status}`);

  // ── 10. UNAUTHENTICATED ACCESS ──
  console.log("\n── Unauthenticated Access ──");
  const noAuthDash = await fetch(`${BASE}/rm/dashboard`).then(r => ({ status: r.status }));
  test("No-auth dashboard returns 401", noAuthDash.status === 401, `Status ${noAuthDash.status}`);

  const noAuthHierarchy = await fetch(`${BASE}/users/hierarchy`).then(r => ({ status: r.status }));
  test("No-auth hierarchy returns 401", noAuthHierarchy.status === 401, `Status ${noAuthHierarchy.status}`);

  // ── SUMMARY ──
  console.log(`\n========================================`);
  console.log(`INTEGRATION: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  console.log(`========================================`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(console.error);
