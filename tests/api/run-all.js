async function main() {
  const BASE = "http://localhost:5000/api";
  
  // Clean up any leftover test users from previous runs
  const rmLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ravi@gmail.com", password: "ravi123" }),
  }).then(r => r.json()).catch(() => null);
  
  if (rmLogin?.token) {
    const users = await fetch(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${rmLogin.token}` },
    }).then(r => r.json()).catch(() => ({}));
    const userList = users.users || [];
    const testUsers = userList.filter(u => u.name.startsWith("Test ") && u.role !== "rm");
    for (const u of testUsers) {
      await fetch(`${BASE}/users/${u.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${rmLogin.token}` },
      }).catch(() => {});
    }
    if (testUsers.length > 0) console.log(`Cleaned ${testUsers.length} leftover test users`);
  }

  const files = ["01-rm.test.js", "02-am.test.js", "03-aa.test.js", "04-lc.test.js"];
  let totalPass = 0, totalFail = 0;
  for (const f of files) {
    try {
      const result = require("child_process").execSync(`node tests/api/${f}`, {
        cwd: __dirname + "/../..",
        encoding: "utf-8",
        timeout: 30000,
      });
      const match = result.match(/Results: (\d+) passed, (\d+) failed/);
      if (match) { totalPass += parseInt(match[1]); totalFail += parseInt(match[2]); }
      console.log(result);
    } catch (e) {
      const out = e.stdout || "";
      const match = out.match(/Results: (\d+) passed, (\d+) failed/);
      if (match) { totalPass += parseInt(match[1]); totalFail += parseInt(match[2]); }
      console.log(out || e.message);
    }
  }
  console.log(`\n========================================`);
  console.log(`ALL TESTS: ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} total`);
  console.log(`========================================`);
  process.exit(totalFail > 0 ? 1 : 0);
}
main().catch(console.error);
