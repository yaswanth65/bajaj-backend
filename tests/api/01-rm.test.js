const { login, get, post, put, test, summary } = require("./helpers");

async function main() {
  console.log("=== RM Tests ===\n");

  // Login
  const rm = await login("ravi@gmail.com", "ravi123");
  test("Login as RM", rm.user.role === "rm", `Got role=${rm.user.role}`);
  test("Login includes managerId", "managerId" in rm.user, `managerId=${rm.user.managerId}`);
  const t = rm.token;

  // Hierarchy (returns array of RM roots)
  const h = await get("/users/hierarchy", t);
  test("GET /users/hierarchy returns 200", h.status === 200, `Status ${h.status}`);
  const root = Array.isArray(h.data) ? h.data[0] : h.data;
  test("Hierarchy root is RM", root?.role === "rm", `Root role=${root?.role}`);
  test("Hierarchy has 3 AM children", root?.children?.length === 3, `Got ${root?.children?.length} AMs`);

  // AM children data
  const ams = root?.children || [];
  for (const am of ams) {
    test(`AM ${am.name} has 33 branches`, am.branchCount === 33, `${am.name} has ${am.branchCount}`);
    test(`AM ${am.name} has branchScope set`, Array.isArray(am.branchScope) && am.branchScope.length === 33, `${am.branchScope?.length} items`);
    test(`AM ${am.name} has AA children`, Array.isArray(am.children) && am.children.length > 0, `${am.children?.length} AAs`);
    for (const aa of am.children || []) {
      test(`AA ${aa.name} has branches`, Array.isArray(aa.branches) && aa.branches.length > 0, `${aa.branches?.length} branches`);
    }
  }

  // All users
  const users = await get("/users", t);
  test("GET /users returns 200", users.status === 200, `Status ${users.status}`);
  const userList = users.data?.users || users.data || [];
  test("Total users = 113", userList.length === 113, `Got ${userList.length}`);

  // RM dashboard
  const dash = await get("/rm/dashboard", t);
  test("GET /rm/dashboard returns 200", dash.status === 200, `Status ${dash.status}`);
  test("Dashboard has 99 branches", dash.data?.branches?.length === 99, `Got ${dash.data?.branches?.length}`);

  // Unassigned branches
  const unassigned = await get("/users/unassigned-branches", t);
  test("GET /users/unassigned-branches returns 200", unassigned.status === 200, `Status ${unassigned.status}`);
  test("No unassigned branches (all have LCs)", Array.isArray(unassigned.data) && unassigned.data.length === 0, `Got ${unassigned.data?.length}`);

  // Available branches for an AM
  const firstAmId = ams[0]?.id;
  if (firstAmId) {
    const avail = await get(`/users/available-branches/${firstAmId}`, t);
    test("GET /users/available-branches/:amId returns 200", avail.status === 200, `Status ${avail.status}`);
    test("AM has 33 available branches", Array.isArray(avail.data) && avail.data.length === 33, `Got ${avail.data?.length}`);
  }

  // Role counts
  const rms = userList.filter(u => u.role === "rm").length;
  const amsCount = userList.filter(u => u.role === "branchManager").length;
  const aas = userList.filter(u => u.role === "aa").length;
  const lcs = userList.filter(u => u.role === "lc").length;
  test("1 RM user", rms === 1, `Got ${rms}`);
  test("3 AM users", amsCount === 3, `Got ${amsCount}`);
  test("10 AA users", aas === 10, `Got ${aas}`);
  test("99 LC users", lcs === 99, `Got ${lcs}`);
  test("Total = 1+3+10+99", rms + amsCount + aas + lcs === 113, `${rms}+${amsCount}+${aas}+${lcs}=${rms + amsCount + aas + lcs}`);

  summary();
}

main().catch(console.error);
