const { login, get, post, put, test, summary } = require("./helpers");

async function main() {
  console.log("=== AA Tests ===\n");

  // Login as AA
  const aa = await login("g.teja@gmail.com", "aa123");
  test("Login as AA", aa.user.role === "aa", `Got role=${aa.user.role}`);
  test("AA name is G Teja", aa.user.name === "G Teja", `Got ${aa.user.name}`);
  test("AA has managerId (AM)", !!aa.user.managerId, `managerId=${aa.user.managerId}`);
  const t = aa.token;
  const aaId = aa.user.id;

  // AA should use /bm/dashboard (same as AM)
  const dash = await get("/bm/dashboard", t);
  test("AA GET /bm/dashboard returns 200", dash.status === 200, `Status ${dash.status}`);
  test("AA sees 11 branches (his scope)", dash.data?.branches?.length === 11, `Got ${dash.data?.branches?.length}`);

  // AA cannot access RM dashboard
  const rmDash = await get("/rm/dashboard", t);
  test("AA cannot access /rm/dashboard (403)", rmDash.status === 403, `Status ${rmDash.status}`);

  // AA cannot access hierarchy (RM-only)
  const hierarchy = await get("/users/hierarchy", t);
  test("AA cannot access hierarchy (403)", hierarchy.status === 403, `Status ${hierarchy.status}`);

  // AA cannot access available-branches (RM-only in controller)
  const avail = await get(`/users/available-branches/${aa.user.managerId}`, t);
  test("AA cannot access available-branches (403)", avail.status === 403, `Status ${avail.status}`);

  // AA cannot access unassigned-branches (RM-only in controller)
  const unassigned = await get("/users/unassigned-branches", t);
  test("AA GET unassigned-branches returns 403", unassigned.status === 403, `Status ${unassigned.status}`);

  // AA cannot create users
  const newUser = await post("/users", { name: "Test User", email: "test.aa.user@gmail.com", phone: "9999999999", role: "lc", position: "LC" }, t);
  test("AA cannot create users (403)", newUser.status === 403, `Status ${newUser.status}`);

  // AA can update their own profile
  const updateSelf = await put(`/users/${aaId}`, { phone: "9199999999" }, t);
  test("AA can update own profile", updateSelf.status === 200, `Status ${updateSelf.status}`);

  summary();
}

main().catch(console.error);
