const { login, get, post, put, test, summary } = require("./helpers");

async function main() {
  console.log("=== AM (BranchManager) Tests ===\n");

  // Login as AM
  const am = await login("pachari@gmail.com", "am123");
  test("Login as AM", am.user.role === "branchManager", `Got role=${am.user.role}`);
  test("AM name is Pachari Teja", am.user.name === "Pachari Teja", `Got ${am.user.name}`);
  test("AM has managerId (RM)", !!am.user.managerId, `managerId=${am.user.managerId}`);
  const t = am.token;
  const amId = am.user.id;

  // AM should use /bm/dashboard (not /rm/dashboard)
  const dash = await get("/bm/dashboard", t);
  test("GET /bm/dashboard returns 200", dash.status === 200, `Status ${dash.status}`);
  test("AM sees 33 branches (his scope)", dash.data?.branches?.length === 33, `Got ${dash.data?.branches?.length}`);

  // AM cannot access RM dashboard
  const rmDash = await get("/rm/dashboard", t);
  test("AM cannot access /rm/dashboard (403)", rmDash.status === 403, `Status ${rmDash.status}`);

  // AM cannot access hierarchy (RM-only)
  const hierarchy = await get("/users/hierarchy", t);
  test("AM cannot access hierarchy (403)", hierarchy.status === 403, `Status ${hierarchy.status}`);

  // AM can get their own available branches
  const avail = await get(`/users/available-branches/${amId}`, t);
  test("GET /users/available-branches/:amId returns 200", avail.status === 200, `Status ${avail.status}`);
  test("AM sees 33 branches in available", Array.isArray(avail.data) && avail.data.length === 33, `Got ${avail.data?.length}`);

  // AM can get unassigned branches
  const unassigned = await get("/users/unassigned-branches", t);
  test("AM GET /users/unassigned-branches returns 200", unassigned.status === 200, `Status ${unassigned.status}`);

  // AM can create AA
  const ts = Date.now();
  const newAa = await post("/users", { name: "Test AA from AM", email: `test.aa.am.${ts}@gmail.com`, phone: "9999999999", role: "aa", position: "Admin Assistant" }, t);
  test("AM can create AA (201)", newAa.status === 201, `Status ${newAa.status}`);
  const newAaId = newAa.data?.user?.id;

  // Assign manager for the new AA
  if (newAaId) {
    const assign = await put(`/users/${newAaId}/assign-manager`, { managerId: amId }, t);
    test("AM can assign himself as AA's manager", assign.status === 200, `Status ${assign.status}`);

    // Assign some branches to the AA (these may already be assigned to other AAs)
    const branchesToAssign = (avail.data || []).filter(b => !b.assigned).slice(0, 3).map(b => b.id);
    if (branchesToAssign.length > 0) {
      const assignBr = await put(`/users/${newAaId}/assign-branches`, { branchIds: branchesToAssign }, t);
      test("AM can assign unassigned branches to AA", assignBr.status === 200, `Status ${assignBr.status}`);
    } else {
      // All branches are already assigned — verify conflict detection works
      const anyBranch = (avail.data || [])[0]?.id;
      if (anyBranch) {
        const assignBr = await put(`/users/${newAaId}/assign-branches`, { branchIds: [anyBranch] }, t);
        test("AM gets 409 when assigning already-owned branches", assignBr.status === 409, `Status ${assignBr.status}`);
      }
    }

    // Cleanup: delete the test AA
    await fetch(`http://localhost:5000/api/users/${newAaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    }).catch(() => {});
  }

  // AM cannot create RM (should fail)
  const newRm = await post("/users", { name: "Test RM", email: "test.rm.am@gmail.com", phone: "9999999999", role: "rm", position: "RM" }, t);
  test("AM cannot create RM (403)", newRm.status === 403, `Status ${newRm.status}`);

  // AM cannot create another AM (should fail)
  const newAm = await post("/users", { name: "Test AM", email: "test.am.am@gmail.com", phone: "9999999999", role: "branchManager", position: "BAM" }, t);
  test("AM cannot create another AM (403)", newAm.status === 403, `Status ${newAm.status}`);

  // AM can create LC
  const newLc = await post("/users", { name: "Test LC from AM", email: `test.lc.am.${Date.now()}@gmail.com`, phone: "9999999999", role: "lc", position: "LC" }, t);
  test("AM can create LC (201)", newLc.status === 201, `Status ${newLc.status}`);
  if (newLc.data?.user?.id) {
    await fetch(`http://localhost:5000/api/users/${newLc.data.user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    }).catch(() => {});
  }

  summary();
}

main().catch(console.error);
