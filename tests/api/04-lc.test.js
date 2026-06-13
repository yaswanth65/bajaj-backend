const { login, get, post, put, test, summary } = require("./helpers");

async function main() {
  console.log("=== LC Tests ===\n");

  // Login as LC
  const lc = await login("lc.addanki@gmail.com", "lc123");
  test("Login as LC", lc.user.role === "lc", `Got role=${lc.user.role}`);
  test("LC name is LC Addanki", lc.user.name === "LC Addanki", `Got ${lc.user.name}`);
  test("LC has managerId (AA)", !!lc.user.managerId, `managerId=${lc.user.managerId}`);
  const t = lc.token;
  const lcId = lc.user.id;

  // LC has a branch assigned
  test("LC has a branch assigned", !!lc.user.branchId, `branchId=${lc.user.branchId}`);

  // LC should use /lc/dashboard
  const dash = await get("/lc/dashboard", t);
  test("LC GET /lc/dashboard returns 200", dash.status === 200, `Status ${dash.status}`);

  // LC cannot access BM dashboard
  const bmDash = await get("/bm/dashboard", t);
  test("LC cannot access /bm/dashboard (403)", bmDash.status === 403, `Status ${bmDash.status}`);

  // LC cannot access hierarchy
  const hierarchy = await get("/users/hierarchy", t);
  test("LC cannot access hierarchy (403)", hierarchy.status === 403, `Status ${hierarchy.status}`);

  // LC can update their own profile
  const updateSelf = await put(`/users/${lcId}`, { phone: "9299999999" }, t);
  test("LC can update own profile", updateSelf.status === 200, `Status ${updateSelf.status}`);

  // LC cannot update other users
  const updateOther = await put("/users/some-other-id", { phone: "0000000000" }, t);
  test("LC cannot update other users (403)", updateOther.status === 403, `Status ${updateOther.status}`);

  // LC cannot create users
  const newUser = await post("/users", { name: "Test", email: "test.lc@gmail.com", phone: "9999999999", role: "lc", position: "LC" }, t);
  test("LC cannot create users (403)", newUser.status === 403, `Status ${newUser.status}`);

  summary();
}

main().catch(console.error);
