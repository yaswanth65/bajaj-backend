# Data Modeling & Auth Scoping

This document explains the security architecture, role models, and relationship scopes used to filter data on the backend.

---

## 👥 Role Matrix and Scoping Properties

The backend uses three main roles defined in the Prisma database (`RoleId` enum):

| Role ID (`RoleId`) | Human Readable Name | Scoping Rules | Access Details |
| :--- | :--- | :--- | :--- |
| `lc` | Location Coordinator | Scoped to a single `branchId`. | Can only read/write records matching their own branch or user ID. |
| `branchManager` | Branch Manager | Scoped to an array of branch IDs stored in `branchScope`. | Can read/write records for any branch whose ID is contained in their `branchScope`. |
| `rm` | Regional Manager | System-wide scope. | Has global access to all branches, users, tasks, complaints, and financial data. |

---

## 🗄️ Database Schema & Scoping Relationships

The following entity relations are defined in the schema and enforced during queries:

### 1. User & Scopes
- A `User` can optionally be linked to a single `Branch` via `branchId` (mandatory for LCs).
- A `User` has a `branchScope` field (an array of strings) containing branch IDs (used primarily for Branch Managers).

```prisma
model User {
  id             String          @id @default(uuid())
  email          String          @unique
  name           String
  role           RoleId
  branchId       String?
  branch         Branch?         @relation(fields: [branchId], references: [id])
  branchScope    String[]        // Array of Branch IDs this user oversees
  attendanceLogs AttendanceLog[]
  tasksAssigned  Task[]          @relation("AssignedTasks")
  tasksCompleted Task[]          @relation("CompletedTasks")
}
```

### 2. AttendanceLog & Daily Tasks Plan
- Each `AttendanceLog` represents a user's clock-in event for a specific date.
- LCs submit daily tasks in their check-in flow. These are stored in `WeeklyTaskPlanItem` with a relation to the corresponding `AttendanceLog`.
- Scoping rule:
  - **BM**: Can retrieve attendance logs where the user's `branchId` is inside the BM's `branchScope`.
  - **RM**: Can query all logs.
  - **LC**: Can query only their own logs (`userId === currentUserId`).

```prisma
model AttendanceLog {
  id           String               @id @default(uuid())
  userId       String
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  date         String               // YYYY-MM-DD
  status       AttendanceStatus     // Present, Late, Absent
  checkIn      String               // HH:MM
  checkOut     String?
  location     String
  proof        String
  deviation    String               @default("No")
  weeklyTasks  WeeklyTaskPlanItem[] // Scoped task items submitted daily
}

model WeeklyTaskPlanItem {
  id              String        @id @default(uuid())
  attendanceId String
  attendance   AttendanceLog @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
  description     String
  estimatedHours  Float
}
```

### 3. Approvals (Capex & Expenses)
- Approvals represent requests for financial budgets or repair expenditures.
- Scoping rule:
  - **BM**: Can view and approve/reject requests where the request's `branchId` matches their `branchScope`. LCs cannot approve. BMs can approve requests up to ₹25,000.
  - **RM**: Can view all requests. Approvals exceeding ₹25,000 are automatically escalated to `stage: "Regional Manager"`, requiring RM approval.

```prisma
model Approval {
  id            String         @id @default(uuid())
  title         String
  kind          String         // Expense, Capex, etc.
  branchId      String
  branch        Branch         @relation(fields: [branchId], references: [id], onDelete: Cascade)
  amount        Float
  requestedById String
  requestedBy   User           @relation(fields: [requestedById], references: [id])
  status        ApprovalStatus @default(Pending) // Pending, Approved, Rejected
  stage         String         @default("Branch Manager") // Escalation stage
  note          String?
  updatedAt     DateTime       @updatedAt
}
```

---

## 🔒 Security Enforcement Architecture

Every role-based controller performs request scoping directly inside the database query via Prisma.

### Example: Branch Manager Attendance Query
Instead of querying all logs and filtering in JS:
```typescript
const scopedBranchIds = user.branchScope || [];

const attendanceLogs = await prisma.attendanceLog.findMany({
  where: {
    user: {
      branchId: { in: scopedBranchIds }
    }
  },
  select: {
    id: true,
    userId: true,
    date: true,
    status: true,
    checkIn: true,
    checkOut: true,
    location: true,
    proof: true,
    deviation: true,
    weeklyTasks: { select: { id: true, description: true, estimatedHours: true } }
  }
});
```

### Example: Role Guarding
Endpoints in the router apply immediate gating:
```typescript
if (user.role !== RoleId.branchManager) {
  return res.status(403).json({ message: "Forbidden: BM only" });
}
```
This guarantees robust protection against privilege escalation.
