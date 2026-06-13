const http = require("http");

function post(path, body) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(body);
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    req.write(dataStr);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function run() {
  try {
    // 1. Login BM
    console.log("Logging in Branch Manager (ishwarrajput@gmail.com)...");
    const bmAuth = await post("/api/auth/login", { email: "ishwarrajput@gmail.com", password: "123456789" });
    if (bmAuth.status !== 200) {
      console.error("BM Login failed:", bmAuth);
      return;
    }
    const bmToken = bmAuth.body.token;
    console.log("BM Login successful.");

    // 2. Fetch Tasks for BM
    console.log("Fetching tasks for BM...");
    const bmTasksRes = await get("/api/tasks", bmToken);
    console.log("BM Tasks HTTP Status:", bmTasksRes.status);
    const bmTasks = bmTasksRes.body?.tasks || [];
    console.log(`Total tasks returned to BM: ${bmTasks.length}`);

    // Print count of daily & weekly tasks for BM
    const bmDaily = bmTasks.filter(t => t.schedule === "Daily");
    const bmWeekly = bmTasks.filter(t => t.schedule === "Weekly");
    console.log(`Daily tasks for BM: ${bmDaily.length}`);
    console.log(`Weekly tasks for BM: ${bmWeekly.length}`);

    // Filter Ambikapur tasks for BM
    const ambikapurTasksForBm = bmTasks.filter(t => t.branchId === "9baa0cbc-c8ff-4e8c-8da2-916da41a644e");
    const ambikapurDailyForBm = ambikapurTasksForBm.filter(t => t.schedule === "Daily");
    const ambikapurWeeklyForBm = ambikapurTasksForBm.filter(t => t.schedule === "Weekly");
    console.log(`\nAmbikapur tasks in BM's list:`);
    console.log(`- Total: ${ambikapurTasksForBm.length}`);
    console.log(`- Daily: ${ambikapurDailyForBm.length}`);
    console.log(`- Weekly: ${ambikapurWeeklyForBm.length}`);

    // 3. Login LC
    console.log("\nLogging in LC (shitaldevnath@gmail.com)...");
    const lcAuth = await post("/api/auth/login", { email: "shitaldevnath@gmail.com", password: "123456789" });
    if (lcAuth.status !== 200) {
      console.error("LC Login failed:", lcAuth);
      return;
    }
    const lcToken = lcAuth.body.token;
    console.log("LC Login successful.");

    // 4. Fetch Tasks for LC
    console.log("Fetching tasks for LC...");
    const lcTasksRes = await get("/api/tasks", lcToken);
    console.log("LC Tasks HTTP Status:", lcTasksRes.status);
    const lcTasks = lcTasksRes.body?.tasks || [];
    console.log(`Total tasks returned to LC: ${lcTasks.length}`);

    const lcDaily = lcTasks.filter(t => t.schedule === "Daily");
    const lcWeekly = lcTasks.filter(t => t.schedule === "Weekly");
    console.log(`Daily tasks for LC: ${lcDaily.length}`);
    console.log(`Weekly tasks for LC: ${lcWeekly.length}`);

    // Compare Ambikapur lists
    console.log("\n=== COMPARING BM vs LC TASKS FOR AMBIKAPUR ===");
    console.log(`BM has ${ambikapurTasksForBm.length} tasks for Ambikapur.`);
    console.log(`LC has ${lcTasks.length} tasks for Ambikapur.`);

    // Find any tasks BM has but LC doesn't
    const lcTaskIds = new Set(lcTasks.map(t => t.id));
    const bmOnlyTasks = ambikapurTasksForBm.filter(t => !lcTaskIds.has(t.id));
    console.log(`Tasks that BM sees but LC does NOT: ${bmOnlyTasks.length}`);
    if (bmOnlyTasks.length > 0) {
      console.log("Sample tasks only BM sees:", bmOnlyTasks.slice(0, 5).map(t => ({ id: t.id, title: t.title, schedule: t.schedule, assignedTo: t.assignedToId })));
    }

    // Find any tasks LC has but BM doesn't
    const bmTaskIds = new Set(ambikapurTasksForBm.map(t => t.id));
    const lcOnlyTasks = lcTasks.filter(t => !bmTaskIds.has(t.id));
    console.log(`Tasks that LC sees but BM does NOT: ${lcOnlyTasks.length}`);
    if (lcOnlyTasks.length > 0) {
      console.log("Sample tasks only LC sees:", lcOnlyTasks.slice(0, 5).map(t => ({ id: t.id, title: t.title, schedule: t.schedule, assignedTo: t.assignedToId })));
    }

  } catch (err) {
    console.error("Error running test:", err);
  }
}

run();
