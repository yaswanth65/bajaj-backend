# Code Review: Issues, Inconsistencies & Recommendations

> Based on thorough analysis of all 25 source files (controllers, routes, middleware, services, seed).
> Each finding is categorized by severity and includes the specific file+line and reasoning.

---

## Severity Key

| Label | Meaning |
|-------|---------|
| 🔴 **Critical** | Bug, security issue, or data corruption risk |
| 🟠 **High** | Logical flaw or design problem affecting correctness |
| 🟡 **Medium** | Inconsistency, fragility, or maintainability concern |
| 🔵 **Low** | Style, naming, or minor improvement |

---

## 🔴 Critical Issues

### C1. Auth Fallback Check is Dead/Broken Logic

**File**: `src/controllers/auth.controller.ts:24-30`

```typescript
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
  if (password !== "123456789" || user.password !== "123456789") {
    return res.status(401).json({ message: "Invalid email or password" });
  }
}
```

**Problem**: The fallback attempts to allow plain-text "123456789" in case bcrypt hashing fails during seeding. But the database stores a **bcrypt hash** of "123456789", not the literal string. So `user.password !== "123456789"` is **always true** (a hash never equals the literal), making the entire fallback condition **dead code** that never executes. Conversely, if a bug ever caused the raw password to be stored unhashed, then ANYONE typing "123456789" would be authenticated regardless of the actual user's password, because `user.password` would literally be `"123456789"` making both sides of the `||` false, skipping the 401.

**Fix**: Remove the fallback entirely. If seeding or dev environments need plain-text bypass, handle it at the Prisma level (e.g., a pre-save hook that always hashes).

---

### C2. Task Completion Blindly Decrements `openIssues`

**File**: `src/controllers/task.controller.ts:114-117`

```typescript
await prisma.branch.update({
  where: { id: task.branchId },
  data: { openIssues: { decrement: 1 } }
}).catch(() => {});
```

**Problem**: Every completed task decrements `openIssues`. But `openIssues` counts **unresolved complaints**, not tasks. "Verify AC temperature" is not an "issue." If 50 tasks are completed but there are only 2 open complaints, this drives `openIssues` to **-48**, corrupting the branch metric. The `.catch(() => {})` silently prevents anyone from noticing.

**Fix**: Remove this decrement from `markComplete`. Only `resolveComplaint` should manage `openIssues`.

---

### C3. Proof Submission Blindly Resets Appliance to `Operational` / 100 Health

**File**: `src/controllers/task.controller.ts:168-177`

```typescript
if (task.applianceId) {
  await prisma.appliance.update({
    where: { id: task.applianceId },
    data: {
      status: ApplianceStatus.Operational,
      healthScore: 100,
      lastService: new Date(),
    }
  }).catch(() => {});
}
```

**Problem**: Submitting a photo for a weekly verification task (e.g., "Upload photo showing AC is working") resets the appliance to `Operational` with 100 health score — every single week. This means:
1. A genuinely broken appliance gets "healed" just because an LC uploaded a photo.
2. `healthScore` is permanently stuck at 100, making it a meaningless metric.
3. `lastService` is overwritten weekly despite no actual service being performed.

**Fix**: Remove automatic status/health reset here. If the task indicates a problem, the LC should create a complaint (which handles the status). A verification pass should only confirm it's not worse, not reset everything.

---

### C4. JWT Secret Hardcoded Fallback Exposed in Source

**Files**: `src/controllers/auth.controller.ts:32` and `src/middlewares/auth.middleware.ts:24`

```typescript
const secret = process.env.JWT_SECRET || "bajaj_operations_super_secret_jwt_key";
```

**Problem**: If `JWT_SECRET` is not set in environment, the fallback is a publicly known string in source code. Anyone can forge JWTs and impersonate any user. This is a critical security vulnerability.

**Fix**: Make `JWT_SECRET` strictly required — crash on startup if missing. Remove fallback.

---

### C5. Hardcoded Absolute Windows Path in Seed

**File**: `src/seed.ts:91`

```typescript
const mobileAppDir = "C:\\temporary projects\\testing serverCompontnets apk\\bajaj operations project\\mobile-app";
```

**Problem**: This path only exists on the developer's machine. The seed script will crash on any other machine (CI, staging, production, other developers). The seed is a critical workflow tool that must work anywhere.

**Fix**: Use a relative path from the project root, or pass the path as a CLI argument / environment variable.

---

### C6. Seed Creates Tasks with `createdAt` That Gets Ignored

**File**: `src/seed.ts:577-591`

```typescript
generatedTasksList.push({
  ...
  createdAt: logDate  // ← This is silently ignored
});
```

**Problem**: The `createdAt` field is `@default(now())` in the Prisma schema and is not in the writeable fields list for `createMany`. All 3 months of "historical" tasks get `now()` as their creation timestamp, defeating the purpose of generating historical data.

**Fix**: Use individual `prisma.task.create()` calls (in chunks) and specify `createdAt`, or use `$executeRawUnsafe` to insert with custom timestamps.

---

## 🟠 High Severity Issues

### H1. Approval Stage Routing is Incomplete

**Files**: `src/controllers/approval.controller.ts:80-81` (creation) vs `:138-200` (approval)

```typescript
// Creation sets stage correctly:
const stage = userContext.role === RoleId.rm ? "RM" : "Branch Manager";

// But approveRequest never checks stage before finalizing:
data: {
  status: ApprovalStatus.Approved,
  stage: "Closed"  // Always closed, regardless of who approved
}
```

**Problem**: The intent is that amounts >25K go to RM for approval after Branch Manager. But `approveRequest` immediately closes the approval **regardless of who approves**. A Branch Manager can approve a ₹50,000 request without RM oversight — the stage routing is cosmetic only.

**Fix**: In `approveRequest`, check if `approval.stage === "Branch Manager"` and the amount > 25000. If so, route to RM stage instead of closing. Only close when the correct authority approves.

---

### H2. All Controllers Instantiate Their Own PrismaClient

**Every controller file**:
```typescript
const prisma = new PrismaClient();
```

**Problem**: Each controller file creates a separate PrismaClient instance (14 in total: auth, attendance, task, dashboard, user, branch, appliance, complaint, approval, visit, notification, cron, notification service, seed). Prisma recommends a single shared instance for connection pooling. Multiple instances can exhaust database connections.

**Fix**: Create a single `prisma.ts` file in `src/` that exports a shared PrismaClient instance, and import it everywhere.

---

### H3. `catch (() => {})` Silently Swallows All Errors

**Used 15+ times across the codebase**:
```typescript
.catch(() => {});
```

**Problem**: Critical operations (budget updates, notification creation, branch metric updates) silently fail. The application continues as if the operation succeeded, but data becomes inconsistent. Examples:
- `approval.controller.ts:176` — budget deduction failure is silently ignored (money could be spent but not tracked)
- `task.controller.ts:117` — openIssues decrement failure is silently ignored

**Fix**: At minimum log the error. Better: propagate non-critical failures, but never use empty `.catch()` for state-mutating operations.

---

### H4. Notification Priority Uses String Literal Instead of Enum

**File**: `src/controllers/visit.controller.ts:122,189`

```typescript
priority: "Medium"   // should be Priority.Medium
priority: "Low"      // should be Priority.Low
```

**Problem**: Every other controller uses the Prisma enum (`Priority.Medium`, `Priority.High`). Here, plain strings are used. TypeScript should catch this if schema-generated types are strict. In practice, this may silently pass or cause runtime errors depending on how Prisma serializes enums.

**Fix**: Use `Priority.Medium` and `Priority.Low` respectively, consistent with all other controllers.

---

### H5. No Rate Limiting on Auth Endpoint

**File**: `src/routes/auth.routes.ts`

**Problem**: `POST /api/auth/login` has no rate limiting or brute-force protection. An attacker can try unlimited password combinations.

**Fix**: Use `express-rate-limit` to limit login attempts (e.g., 5 attempts per IP per 15 minutes).

---

### H6. Missing `InProgress` Task Status Transition

**All task-related controller code**

**Problem**: The schema defines `TaskStatus.InProgress`, but no code ever sets a task to `InProgress`. Tasks go directly from `Pending` → `Completed` (or `Revoked`). The `InProgress` status is dead code in the schema.

**Fix**: Either remove `InProgress` from the schema, or add an endpoint/logic to transition tasks to `InProgress` (e.g., when an LC starts working on it).

---

## 🟡 Medium Severity Issues

### M1. Inconsistent Response Envelopes

Some endpoints return data directly as arrays, others wrap in objects:

| Returns bare array | Returns wrapped object |
|---|---|
| `GET /branches` | `GET /tasks → { tasks, pagination }` |
| `GET /appliances` | `GET /dashboard/metrics → { role, stats, ... }` |
| `GET /complaints` | `GET /auth/login → { token, user }` |
| `GET /approvals` | |
| `GET /visits` | |
| `GET /notifications` | |

**Problem**: Mobile clients must handle two different response formats depending on the endpoint, making a generic API client harder to write.

**Fix**: Adopt a standard envelope like `{ data: ..., pagination?: ... }` or `{ success: true, result: ... }` across all endpoints.

---

### M2. Inconsistent RBAC Pattern — Repeated Code Duplication

Every `getX` controller repeats the same 20-line RBAC filter-building:

```typescript
if (userContext.role === RoleId.lc) {
  filters.branchId = userContext.branchId || "";
} else if (userContext.role === RoleId.branchManager) {
  if (branchId) {
    if (userContext.branchScope.includes(String(branchId))) {
      filters.branchId = String(branchId);
    } else {
      return res.status(403).json({ message: "Forbidden: branch out of scope" });
    }
  } else {
    filters.branchId = { in: userContext.branchScope };
  }
} else if (userContext.role === RoleId.rm) {
  if (branchId) {
    filters.branchId = String(branchId);
  }
}
```

Duplicated verbatim in: attendance, task, user, branch, appliance, complaint, approval, visit, notification controllers.

**Fix**: Extract a shared `buildScopeFilter(user, queryBranchId): { branchId filter }` helper function.

---

### M3. `getMyCalendar` Calls Function Before Declaration

**File**: `src/controllers/attendance.controller.ts:162`

```typescript
return res.status(500).json(calendarDataError(error.message));
// ...
function calendarDataError(msg: string) {  // line 213
```
And the error message template leaks `error.message` with the variable name — but this works via hoisting. Still, it relies on an unusual pattern and is the **only** controller using a helper function for error messages instead of inline objects.

**Fix**: Inline the error response like every other controller does, or move the helper to the top of the file.

---

### M4. `/attendance` Returns 200 Instead of 201 for New Records

**File**: `src/controllers/attendance.controller.ts:104`

```typescript
return res.status(200).json({
```
Uses `200 OK` even when creating a new attendance record (the upsert creates a new row). The convention is `201 Created` for resource creation.

**Fix**: Check whether the upsert created or updated, and return `201` vs `200` accordingly.

---

### M5. Seed Step Numbering is Duplicated

**File**: `src/seed.ts`

```
Line 403: // 8. Generate some mock metadata...
Line 495: // 8. Seed 3 months of historical attendance logs...
Line 444: // 9. Generate weekly verification tasks...
Line 445: // 9. Generate weekly verification tasks...
```

**Problem**: Two "8." and two implied "9." sections. This suggests the script was heavily iterated without cleanup and makes it harder to follow.

**Fix**: Re-number sections sequentially (1-10).

---

### M6. Cron Controller Relies on `GET` for Side-Effect Operation

**File**: `src/routes/cron.routes.ts`

```typescript
router.get("/generate-appliance-tasks", generateWeeklyApplianceTasks);
```

**Problem**: A `GET` request should be idempotent and safe. Generating tasks is a mutation. If a crawler or pre-fetcher hits this URL, it triggers unintended task generation. Also, the route has **no authentication**.

**Fix**: Change to `POST`, add authentication, and ideally use a cron scheduler (node-cron, AWS EventBridge) instead of an HTTP-triggered endpoint.

---

## 🔵 Low Severity Issues

### L1. `cron.controller.ts` Only Assigns Tasks to First LC in Branch

```typescript
const lc = app.branch.users[0];
```

If a branch has multiple LCs, only one gets all verification tasks. Should either distribute evenly or create tasks for all LCs.

---

### L2. User Controller Creates Email From Name Without Validation

```typescript
const email = name.toLowerCase().replace(/\s+/g, "") + "@gmail.com";
```

Auto-generating emails from names can create duplicates (two users named "John Smith" → both get `johnsmith@gmail.com`). The unique constraint will throw a 500 error instead of a meaningful message.

---

### L3. No Input Validation Library

No Zod, Joi, express-validator, or class-validator. All validation is manual `if (!x)` checks, leading to:
- Inconsistent validation coverage
- Verbose controller code
- Missing edge cases (e.g., invalid UUID format is only caught by Prisma as a 500, not a 400)

---

### L4. Cloudinary Config Loaded at Module Import Time

```typescript
dotenv.config();  // at module scope
cloudinary.config({...});
```

If this module is imported before `dotenv.config()` runs in `index.ts`, Cloudinary will have `undefined` config values but won't throw until an upload is attempted. Should be lazy-initialized or explicitly configured in the app entry point.

---

### L5. Seed Script Uses `create` Instead of `upsert` for Users

Running the seed twice will crash on unique email constraint for User, Visit, Approval, and Complaint tables. The script only clears data at the top level — if the clear fails partway, a re-run is impossible without manual cleanup.

---

### L6. `escalationStage` Stored as Plain String Instead of Enum

```typescript
escalationStage: "LC"  // plain string
```

The schema defines `escalationStage` as `String`, but it maps to a fixed set of values ("LC", "Branch Manager", "RM", "Closed"). Should use an enum for type safety.

---

### L7. No Pagination on List Endpoints (Except Tasks)

`GET /users`, `GET /branches`, `GET /appliances`, `GET /complaints` all return unbounded results. With thousands of records, this will cause memory pressure and slow responses.

---

## Summary of Recommendations (Priority Order)

| # | Action | Impact |
|---|--------|--------|
| 1 | Fix auth fallback logic (C1) | 🛡 Security + correctness |
| 2 | Remove openIssues decrement from task complete (C2) | 📊 Data integrity |
| 3 | Stop resetting appliance health on proof submit (C3) | 📊 Data integrity |
| 4 | Make JWT_SECRET required at startup (C4) | 🛡 Security |
| 5 | Make seed path configurable (C5) | 🚧 Dev workflow |
| 6 | Fix seed historical createdAt timestamps (C6) | 🧪 Test data quality |
| 7 | Fix approval stage routing (H1) | ⚙️ Business logic |
| 8 | Single shared PrismaClient instance (H2) | 🚀 Performance |
| 9 | Remove all empty `.catch(() => {})` (H3) | 🔍 Observability |
| 10 | Use enum for visit notification priority (H4) | ✅ Type safety |
| 11 | Add rate limiting to auth (H5) | 🛡 Security |
| 12 | Extract shared RBAC filter helper (M2) | 🧹 Maintainability |
| 13 | Standardize response envelopes (M1) | 📱 Client DX |
| 14 | Implement pagination on all list endpoints (L7) | 🚀 Performance |
| 15 | Change cron route to POST + add auth (M6) | ⚙️ Correctness |

---

## 🔴 Critical (Additional Findings)

### C7. `JSON.stringify` / `JSON.parse` Mismatch on Prisma `Json` Fields

**File**: `src/controllers/complaint.controller.ts` (lines 100, 168, 177, 241, 250, 323, 331, 358, 365)

```typescript
// WRITING: double-serializes the array
timeline: JSON.stringify([timeLog])        // line 100: stringifies array → string

// READING: parses what might already be a parsed array
const currentTimeline = JSON.parse(complaint.timeline as string || "[]");  // line 168
```

**Problem**: The `timeline` field in Prisma schema is `Json @default("[]")`. With PostgreSQL JSONB, Prisma automatically serializes/deserializes JavaScript objects. By manually calling `JSON.stringify()` on write, the code **double-encodes** the data:
- Write path: `["10:00 - LC submitted"]` → `JSON.stringify` → `'["10:00 - LC submitted"]'` (a JSON string) → Prisma serializes again → `'"[\"10:00 - LC submitted\"]"'"` stored as a JSON string literal
- Read path: Prisma deserializes → returns the string `'["10:00 - LC submitted"]'` → `JSON.parse` works by coincidence because the string is valid JSON

If Prisma ever changes its Json serialization behavior or if a different driver is used, the timeline breaks. The correct approach is to pass raw arrays/objects to Prisma Json fields, not stringified versions:
```typescript
// Correct:
timeline: [timeLog]
// On read, timeline is already a parsed array
currentTimeline = complaint.timeline as string[] || [];
```

**Same issue in seed.ts**: line 117, 146, 166, 254, 423 — `JSON.stringify` used on `skills` (Json field) which causes the same double-encoding pattern.

---

### C8. Seed Generates Invalid Time Strings (`"07:79"`)

**File**: `src/seed.ts:528-530`

```typescript
const minute = 35 + Math.floor(Math.random() * 45); // range: 35 to 79
checkIn = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
```

**Problem**: `Math.random() * 45` ranges from 0 to 44.999. `Math.floor` gives 0–44. So `35 + 44 = 79`. This produces impossible times like `"07:79"`, `"07:80"`, ..., `"07:79"`. While this is seed data, invalid times cascade into tests, frontend parsing failures, and datetime validation errors in the mobile app.

**Fix**: Cap at 59: `const minute = Math.min(59, 35 + Math.floor(Math.random() * 45))` or use `35 + Math.floor(Math.random() * 25)`.

---

### C9. No Input Validation — `Number()` Accepts NaN for Monetary Fields

**File**: `src/controllers/approval.controller.ts:79-80`

```typescript
const numericAmount = Number(amount);
const priority = numericAmount > 25000 ? Priority.Critical : Priority.High;
```

**Problem**: If the client sends `amount: "abc"`, `Number("abc")` returns `NaN`. `NaN > 25000` evaluates to `false` (all comparisons with NaN are false), so priority defaults to `High`. Then `prisma.approval.create` is called with `amount: NaN`. Prisma will either:
- Store `NaN` in a Float column (PostgreSQL allows NaN in float8)
- Throw a validation error (500 Internal Server Error)

Either way, the system silently accepts invalid data. The same pattern exists in `complaint.controller.ts:96` (`estimatedCost`) and `appliance.controller.ts:84` (`purchaseCost`).

---

### C10. Approval `approveRequest` Has No RM Escalation Check + Budget Double-Count Bug

**File**: `src/controllers/approval.controller.ts:163-176`

```typescript
data: {
  status: ApprovalStatus.Approved,
  stage: "Closed"       // ← Always closes, never routes to RM
}

// Budget deducted even if approval should have gone to RM next:
await prisma.branch.update({
  data: { usedBudget: { increment: approval.amount } }
}).catch(() => {});
```

**Problem**: If a Branch Manager approves a ₹50,000 request (which should first go to RM), the system:
1. Immediately closes the approval — RM never sees it
2. Deducts the full ₹50,000 from the branch budget
3. If the approval stage routing is fixed later, the budget would be double-counted (once on BM approve, once on RM approve)

This creates two data integrity bugs: bypassed authority limits and potential budget corruption.

---

### C11. No `DELETE` Endpoints — Data Accumulates Forever

**Every controller file**: Zero DELETE routes.

**Problem**: There is no way to delete any resource via the API:
- No way to remove a user who left
- No way to delete an appliance that was removed
- No way to cancel a visit
- No way to delete complaints, approvals, notifications
- No way to remove branches

Over time, the database accumulates orphaned/obsolete records. The only cleanup mechanism is the seed script which wipes everything. This is a fundamental data lifecycle gap.

---

### C12. `cron.controller.ts` Task Generation Fails Silently When No LC Exists

**File**: `src/controllers/cron.controller.ts:55-67`

```typescript
const lc = app.branch.users[0];
const lcId = lc ? lc.id : null;

tasksToCreate.push({
  ...
  assignedToId: lcId,
  assignedById: lcId || fallbackCreatorId,  // fallbackCreatorId can be ""
  ...
});
```

**Problem**: If a branch has no LC (e.g., during initial setup), `lcId` is `null`. If no RM exists either, `fallbackCreatorId` is `""` (empty string). Then `assignedById: null || ""` resolves to `""`. The Prisma schema has `assignedById String` (required, no default). An empty string `""` violates the FK constraint to User table, causing the entire `createMany` batch to fail. Not a single task is created for any branch, and the error is swallowed by the catch block — the operator gets a generic 500 with no indication that task generation failed.

---

## 🟠 High Severity (Additional Findings)

### H7. `dashboard.controller.ts` Fetches ALL Data In-Memory Instead of Using Aggregates

**File**: `src/controllers/dashboard.controller.ts:205-207`

```typescript
const branches = await prisma.branch.findMany();           // All branches
const approvals = await prisma.approval.findMany({ ... });  // All approvals
const complaints = await prisma.complaint.findMany();       // All complaints
```

**Problem**: The RM dashboard fetches **every row** from three tables into application memory, then filters/aggregates in JavaScript. With 200 branches, 5,000 complaints, and 2,000 approvals, this single request loads ~7,000+ records just to show 4 decision feed items. This is:
- **Memory inefficient**: The entire dataset is loaded into V8 heap
- **Slow**: Three full table scans with no limit/offset
- **Not scalable**: As data grows, this endpoint degrades linearly

The same anti-pattern exists in the LC dashboard (line 31: fetches ALL tasks for branch) and Branch Manager dashboard (line 113: fetches ALL visits).

**Fix**: Use Prisma aggregation (`count`, `aggregate`, `groupBy`) and `take`/`orderBy` for the decision feed instead of loading everything.

---

### H8. `catch(() => {})` — 19 Silent Failures Across the Codebase

**Files**: All controllers (19 occurrences)

Every occurrence silently discards errors from state-mutating operations:

| Location | Operation | Consequence of Silent Failure |
|----------|-----------|-------------------------------|
| `task.controller.ts:117` | Decrement `openIssues` | openIssues stuck too high |
| `task.controller.ts:176` | Update appliance status | Appliance stays in wrong state |
| `task.controller.ts:250` | Create notification | User never sees notification |
| `complaint.controller.ts:112` | Increment `openIssues` | Complaint created but issue count doesn't reflect it |
| `complaint.controller.ts:185` | Decrement `openIssues` | Complaints resolved but count frozen |
| `complaint.controller.ts:203` | Create notification | No resolution notification |
| `complaint.controller.ts:273` | Increment `criticalAlerts` | Critical alert invisible to RM |
| `complaint.controller.ts:285` | Create notification | Escalation invisible |
| `approval.controller.ts:176` | Increment `usedBudget` | **Money spent is untracked** |
| `approval.controller.ts:194` | Create notification | Approval invisible |
| `approval.controller.ts:254` | Create notification | Rejection invisible |
| `appliance.controller.ts:99,151` | Update `applianceRisk` | Risk count desynchronized |
| `visit.controller.ts:98` | Update `nextVisit` | Branch shows wrong next visit |
| `visit.controller.ts:124` | Create notification | LCs not notified of visit |
| `visit.controller.ts:180` | Update `lastVisit`/`nextVisit` | Branch shows stale visit dates |
| `visit.controller.ts:191` | Create notification | Visit report invisible |
| `notification.controller.ts:133` | Decrement `criticalAlerts` | Alert count stuck |
| `notification.controller.ts:188` | Increment `criticalAlerts` | Alert count stuck low |

The `.catch(() => {})` pattern turns expected DB failures into silent data corruption.

---

### H9. No Transaction Wrapping — Partial Failures Corrupt Data

**No `prisma.$transaction()` usage anywhere in the codebase.**

Many operations logically require atomicity but have none:

1. **`complaint.controller.ts:createComplaint`** (lines 87-123): Creates complaint → updates branch openIssues → creates notification → sends push. If notification creation fails (step 3), the complaint is already saved and openIssues is already incremented. The branch shows an open issue that doesn't exist.

2. **`appliance.controller.ts:createAppliance`** (lines 75-99): Creates appliance → counts risk → updates branch. If the count/update fails, the branch's `applianceRisk` is wrong.

3. **`task.controller.ts:markComplete`** (lines 96-117): Updates task → increments user tasksClosed → decrements branch openIssues. If step 2 or 3 fails, the task shows completed but user stats and branch stats are wrong.

4. **`attendance.controller.ts:markAttendance`** (lines 36-101): Upserts attendance → deletes old plan items → creates new plan items → creates tasks. If tasks fail to create after plan items are inserted, the attendance record points to deleted plan items.

---

### H10. Dashboard Uses Pre-Stored Aggregates That Are Never Updated

The `Branch` model has 7 computed fields that are set during seeding but never kept in sync:

| Field | Set During Seed | Updated When |
|-------|----------------|--------------|
| `staffCount` | ✓ | **Never** — user create/delete doesn't update it |
| `workerCount` | ✓ | **Never** — never set after seed |
| `todayAttendance` | ✓ | **Never** — attendance marking doesn't update it |
| `health` | ✓ | **Never** — no code recalculates branch health |
| `performance` | ✓ | **Never** — no code recalculates performance |
| `auditScore` | ✓ | **Never** — never updated |
| `revenueIndex` | ✓ | **Never** — never updated |
| `sla` | ✓ | **Never** — never recalculated |

The Branch Manager dashboard reads `b.staffCount` for `totalStaff`, but this value is frozen at seeding time. If an LC is added a month later, the dashboard still shows the old count.

---

### H11. Missing Scope Checks on Notification Actions (IDOR)

**File**: `src/controllers/notification.controller.ts`

```typescript
toggleRead, toggleBookmark, acknowledgeAlert, escalateAlert
```

**Problem**: All four notification actions accept a notification `:id` and operate on it **without verifying that the user has access to that notification's branch**. An LC from Branch A can:
- Acknowledge/alerts from Branch B by guessing its notification UUID
- Escalate notifications from branches they don't belong to
- Toggle read/bookmark on any notification

Since UUIDs are hard to guess, this is low-risk in practice, but it's a missing authorization layer.

---

### H12. `revokeTask` Updates DB Then Fails on Push — Orphaned State Change

**File**: `src/controllers/task.controller.ts:306-324`

```typescript
const updatedTask = await prisma.task.update({ ... status: Revoked ... });  // DB already changed
// ... push notification ...
await sendPushNotification(...);  // If this throws, the 500 response hides the successful DB update
```

**Problem**: The DB is updated before the push notification. If the push fails, the controller returns a 500 error to the client. But the task IS actually revoked in the database. The client sees an error, retries, and gets "Task not found" (because it was already revoked) or "Task already revoked". This is an **asymmetric failure** — the client believes the operation failed, but the data changed.

All controllers that send push notifications after DB writes have this bug: `createTask`, `revokeTask`, `createComplaint`, `createVisit`, `approveRequest`.

---

## 🟡 Medium Severity (Additional Findings)

### M8. Deadline Calculation Bug — Tasks Due "Today" When Created on Sunday

**Files**: `src/controllers/attendance.controller.ts:80-81`, `src/controllers/cron.controller.ts:26`, `src/seed.ts:459`

```typescript
const nextSunday = new Date();
nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
```

**Math on Sunday** (`getDay() === 0`): `(7 - 0) % 7 === 0`. So `nextSunday = today`. Weekly tasks created on Sunday are due immediately (today at 23:59:59), giving the LC zero time to complete them. The LC starts the week with overdue tasks.

**Fix**: 
```typescript
const daysUntilSunday = (7 - nextSunday.getDay()) % 7;
nextSunday.setDate(nextSunday.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
```

---

### M9. Secret Leak in Error Responses

**File**: `src/controllers/auth.controller.ts:64`

```typescript
return res.status(500).json({ message: "Server error during login", error: error.message });
```

Every controller includes `error: error.message` in its 500 response. This leaks internal details:
- Database constraint names (`Unique constraint failed on the fields: (email)`)
- File paths (if Cloudinary throws)
- Stack traces and query details

An attacker can probe for valid emails, learn database structure, and discover infrastructure details through error message variations.

---

### M10. No Password Change / Reset Flow

**No endpoint exists for password management.**

Users cannot:
- Change their password (no `PUT /auth/password` or similar)
- Reset a forgotten password (no email-based reset flow)
- Invalidate compromised tokens

The default password `123456789` is never changeable through the API. The only way to update it is direct DB manipulation.

---

### M11. `notification.service.ts` Uses String Literals Instead of `RoleId` Enum

**File**: `src/services/notification.service.ts:79,102`

```typescript
where: { role: "branchManager" }   // should be RoleId.branchManager
where: { role: "rm" }              // should be RoleId.rm
```

**Problem**: Every other file in the codebase uses the Prisma enum `RoleId.branchManager` / `RoleId.rm`. These two queries use raw strings. If the enum values change (e.g., from "branchManager" to "branch_manager"), these queries silently return zero results instead of type errors. Since TypeScript compiles anyway (strings are valid), this is a runtime correctness bug waiting to happen.

---

### M12. No Unauthorized Access Logging

**No endpoint logs authentication failures, forbidden access attempts, or suspicious activity.**

- Brute-force login attempts are invisible (no logging of failed attempts)
- 403 forbidden access is invisible (no logging of out-of-scope access attempts)
- Token validation failures are invisible

Security incidents cannot be investigated post-hoc.

---

### M13. `seed.ts` Clears Data in Wrong Order (Cascade Issues)

**File**: `src/seed.ts:76-85`

```typescript
await prisma.weeklyTaskPlanItem.deleteMany();
await prisma.attendanceLog.deleteMany();
await prisma.notification.deleteMany();
await prisma.visit.deleteMany();
await prisma.approval.deleteMany();
await prisma.complaint.deleteMany();
await prisma.task.deleteMany();
await prisma.appliance.deleteMany();
await prisma.user.deleteMany();
await prisma.branch.deleteMany();
```

**Problem**: While this order respects FK constraints (children before parents), running this serially on large datasets is extremely slow. Each `deleteMany` generates a separate DELETE SQL statement. A `prisma.$executeRawUnsafe('TRUNCATE TABLE ... CASCADE')` would be orders of magnitude faster.

Additionally, if any delete fails (e.g., a new model is added but not listed here), the seed crashes with a constraint violation, leaving the DB in a partially-cleared state with no rollback.

---

### M14. Missing `helmet` and Security Headers

**File**: `src/index.ts`

The Express app uses `cors()` with open access but has no security middleware:
- No `helmet` for security headers (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
- No request body size limiter (JSON parser accepts unlimited payloads)
- No HTTP parameter pollution protection

---

### M15. `submitProof` Has No File Type Validation

**File**: `src/controllers/task.controller.ts`

The multer configuration accepts any file type (`upload.single("image")` doesn't filter by MIME type). An attacker could upload:
- HTML/JS files (potential XSS if served back)
- Extremely large files (within the 5MB limit but could be crafted to exploit parsing)
- Non-image binary files that waste Cloudinary storage and processing

---

### M16. `branchScope` in JWT Causes Oversized Tokens

**File**: `src/controllers/auth.controller.ts:39`

```typescript
branchScope: user.branchScope,  // Array of UUID strings
```

**Problem**: A Branch Manager managing 50 branches has 50 UUIDs (~36 chars each = ~1,800 bytes) in the JWT payload. With standard Base64 encoding, this adds ~2.4KB to the token. Every request carries this overhead. For managers with many branches, the JWT can exceed:
- HTTP header size limits (16KB default on most servers — unlikely but possible)
- Network overhead (unnecessary bandwidth)
- URL length limits (if tokens are passed in query params)

**Fix**: Remove `branchScope` from the JWT and fetch it from the DB when needed (it's already in `req.user` after middleware extracts it from the token). Or reference it via a key.

---

### M17. No Graceful Shutdown / SIGTERM Handling

**File**: `src/index.ts`

The server has no process signal handlers:

```typescript
// Missing:
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close();
});
```

On deployment platforms (Heroku, Railway, Kubernetes), SIGTERM is the standard shutdown signal. Without handling it:
- In-flight requests are aborted mid-execution
- Prisma connections leak until the process is killed
- Database connection pool remains open on Neon

---

### M18. Boolean Query Params Parsed as Strings

**File**: `src/controllers/notification.controller.ts:41-45`

```typescript
if (read !== undefined) {
  filters.read = read === "true";
}
```

Express query params are always strings. `read === "true"` is correct for `?read=true`. But:
- `?read=false` → `read === "true"` is `false` → `filters.read = false` ✅
- `?read=0` → `read === "true"` is `false` → `filters.read = false` ⚠️ (unexpected)
- `?read=1` → `read === "true"` is `false` → `filters.read = false` ⚠️ (unexpected)
- `?read=true` → `read === "true"` is `true` → `filters.read = true` ✅

Any truthy value other than literal `"true"` is treated as false. This is brittle but common.

---

## 🔵 Low Severity (Additional Findings)

### L8. `login` Response Omits Fields That Mobile App Likely Needs

**File**: `src/controllers/auth.controller.ts:47-60`

The login response returns 10 fields. The User model has 25+ fields. Missing from response:
- `joinDate` — needed to show "member since" in profile
- `attendancePct` — needed for dashboard badge
- `tasksClosed` — needed for performance display
- `rating` — needed for employee rating display
- `proofRate` — needed for quality metrics
- `escalations` — needed for warning indicators

The mobile app either lacks these features or makes additional API calls to get them.

---

### L9. `createUser` Auto-Generates Email Without Uniqueness Guarantee

**File**: `src/controllers/user.controller.ts:90`

```typescript
const email = name.toLowerCase().replace(/\s+/g, "") + "@gmail.com";
```

Two issues:
1. Two users named "Ravi Kumar" both get `ravikumar@gmail.com` — second `create` call crashes with unique constraint violation
2. All emails are `@gmail.com` — doesn't match the organization's actual domain

---

### L10. `WeeklyTaskPlanItem` Model is an Under-utilized Join Table

The `WeeklyTaskPlanItem` model requires an `AttendanceLog` parent to exist. It's only used to store plan descriptions for the calendar view. But tasks are also auto-generated from it (in `markAttendance`). This means the same plan item exists in two places: as a `WeeklyTaskPlanItem` (in the attendance log) and as a `Task` (on the task board). There's no FK linking them, so they can drift apart — a task can be completed, but the plan item remains pending-looking.

---

### L11. No `updatedAt` Propagation on Related Data Changes

When a `Task` status changes, the `Branch.health` is not recalculated. When a `Complaint` is resolved, the `Branch.sla` is not updated. These denormalized fields on Branch become permanently stale.

---

### L12. `Branch.health` and `Branch.sla` Are Never Computed

Despite being central to the dashboard (displayed as key metrics), neither field has any code that calculates it. They're set to `100.0` at seed time and never change. The entire "branch health" feature is cosmetic.

---

### L13. `cron.controller.ts` Uses `not` Operator With String Instead of Enum

**File**: `src/controllers/cron.controller.ts:88`

```typescript
where: { status: { not: "Operational" } }   // String literal
```

Should be:
```typescript
where: { status: { not: ApplianceStatus.Operational } }
```

Works at runtime because Prisma accepts strings for enum fields, but inconsistent with the rest of the codebase.

---

## Systemic Issues Summary

| Category | Count | Key Example |
|----------|-------|-------------|
| 🛡 Security | 6 | JWT fallback, no rate limit, error leaks, IDOR, no helmet, no auth logging |
| 💥 Data Integrity | 8 | Silent catch(), no transactions, NaN amounts, double-encoded JSON, stale aggregates |
| 🐛 Logic Bugs | 7 | Auth fallback dead code, openIssues corruption, Sunday deadline, invalid times, approval bypass |
| ⚡ Performance | 4 | 14 PrismaClients, in-memory filtering, unbounded queries, oversized JWT |
| 🧪 Seed/Test Data | 5 | Hardcoded path, invalid times, ignored createdAt, duplicate section numbers |
| 📐 Design | 8 | No delete endpoints, no password reset, no pagination, mixed response envelopes, stale denormalized fields |

## Top 10 Most Impactful Fixes

| Rank | Issue | Effort | Impact |
|------|-------|--------|--------|
| 1 | Shared PrismaClient singleton | 1 file, 10 mins | Performance + connection stability |
| 2 | Remove empty `.catch(() => {})` — at minimum log errors | 19 locations, 30 mins | Data integrity |
| 3 | Fix auth fallback / require JWT_SECRET | 2 files, 5 mins | Security |
| 4 | Wrap multi-step operations in `$transaction` | 6 controllers, 1 hour | Atomicity |
| 5 | Fix complaint timeline JSON (remove manual stringify/parse) | 1 controller, 15 mins | Data correctness |
| 6 | Remove openIssues decrement from task complete | 1 line, 2 mins | Metric accuracy |
| 7 | Remove appliance auto-heal on proof submit | 6 lines, 5 mins | Metric accuracy |
| 8 | Add input validation (Zod/Joi) for all request bodies | All controllers, 2-3 hours | Robustness |
| 9 | Add rate limiting to auth endpoint | 1 file, 10 mins | Security |
| 10 | Fix seed hardcoded path + invalid times | 2 locations, 10 mins | Dev workflow |

---

*Generated from systematic audit of 25 TypeScript source files totaling ~3,600 lines.*
