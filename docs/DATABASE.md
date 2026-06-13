# Database Schema

**Provider**: PostgreSQL (Neon serverless)
**ORM**: Prisma 5.x

## Enums

### RoleId
| Value | Description |
|-------|-------------|
| `lc` | Local Coordinator - branch-level operator |
| `branchManager` | Branch Admin Manager / Admin Assistant |
| `rm` | Regional Manager |

### Priority
| Value |
|-------|
| `Critical` |
| `High` |
| `Medium` |
| `Low` |

### TaskStatus
| Value |
|-------|
| `Pending` |
| `InProgress` |
| `Completed` |
| `Revoked` |

### ComplaintStatus
| Value |
|-------|
| `Pending` |
| `Escalated` |
| `Resolved` |

### ApprovalStatus
| Value |
|-------|
| `Pending` |
| `Approved` |
| `Rejected` |

### ApplianceStatus
| Value | Description |
|-------|-------------|
| `Operational` | Working normally |
| `AtRisk` | Needs attention |
| `Critical` | Requires immediate action |
| `Down` | Non-functional |

### VisitStatus
| Value |
|-------|
| `Scheduled` |
| `Escalated` |
| `Completed` |

### AttStatus
| Value |
|-------|
| `Present` |
| `Late` |
| `Absent` |

## Models

### User

Core user entity with role-based access control.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| name | String | - | Display name |
| email | String (unique) | - | Login email |
| password | String | - | bcrypt-hashed password |
| role | RoleId | - | User role |
| position | String | - | Job title |
| phone | String | "Pending" | Phone number |
| shift | String | "09:00 - 18:00" | Work shift |
| joinDate | DateTime | now() | Date of joining |
| status | String | "Present" | Current status |
| rating | Float | 4.0 | Performance rating |
| attendancePct | Float | 100.0 | Attendance percentage |
| tasksClosed | Int | 0 | Tasks completed count |
| proofRate | Float | 100.0 | Proof submission rate |
| escalations | Int | 0 | Escalation count |
| managerId | String? | null | FK to manager User |
| salary | Float | 0.0 | Monthly salary |
| lastCheckIn | String | "Not marked" | Last check-in time |
| skills | Json | [] | Array of skill strings |
| emergencyContact | String | "Pending" | Emergency contact |
| documents | Json | [] | Array of document names |
| deviceId | String | "" | Device identifier |
| expoPushToken | String? | null | Expo push notification token |
| branchId | String? | null | FK to assigned Branch |
| branchScope | String[] | [] | Branch UUIDs visible to manager |

**Relations**:
- `manager` → User (self-referencing, nullable)
- `subordinates` → User[] (inverse of manager)
- `branch` → Branch (nullable)
- `createdTasks` → Task[] (via assignedById)
- `assignedTasks` → Task[] (via assignedToId)
- `completedTasks` → Task[] (via completedById)
- `reportedComplaints` → Complaint[]
- `requestedApprovals` → Approval[]
- `scheduledVisits` → Visit[] (via managerId)
- `attendanceLogs` → AttendanceLog[]

**Indexes**: `role`

---

### Branch

Branch/office entity with operational metrics.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| code | String (unique) | - | Branch code (e.g. BR001) |
| name | String (unique) | - | Branch name |
| city | String | - | City location |
| address | Text | - | Full address |
| phone | String | "Pending" | Branch phone |
| email | String | "Pending" | Branch email |
| geoRadius | Float | 180.0 | Geo-fence radius in meters |
| shiftWindow | String | "07:00 - 15:00" | Operating shift |
| health | Float | 100.0 | Health score (0-100) |
| performance | Float | 100.0 | Performance score |
| todayAttendance | Float | 100.0 | Today's attendance % |
| staffCount | Int | 0 | Number of staff |
| workerCount | Int | 0 | Number of workers |
| monthlyBudget | Float | 50000.0 | Monthly operational budget |
| usedBudget | Float | 0.0 | Budget used so far |
| openIssues | Int | 0 | Open complaint count |
| criticalAlerts | Int | 0 | Critical alert count |
| applianceRisk | Int | 0 | At-risk appliance count |
| auditScore | Float | 100.0 | Audit compliance score |
| lastVisit | String | "Not visited" | Last manager visit date |
| nextVisit | String | "Pending" | Next scheduled visit |
| revenueIndex | Float | 1.0 | Revenue performance index |
| customerFootfall | Int | 0 | Daily customer count |
| sla | Float | 100.0 | Service level agreement % |

**Relations**:
- `users` → User[]
- `appliances` → Appliance[]
- `tasks` → Task[]
- `complaints` → Complaint[]
- `approvals` → Approval[]
- `visits` → Visit[]
- `notifications` → Notification[]

**Indexes**: `name`

---

### Appliance

Equipment/asset tracked per branch.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| branchId | String | - | FK to Branch |
| name | String | - | Appliance name |
| category | String | - | AC, UPS, Inverter |
| zone | String | "Branch premises" | Location within branch |
| brand | String | - | Manufacturer |
| model | String | "Pending" | Model number |
| serial | String (unique) | - | Serial number |
| healthScore | Int | 100 | Health score (0-100) |
| status | ApplianceStatus | Operational | Current status |
| purchaseDate | DateTime? | null | Date of purchase |
| lastService | DateTime? | null | Last service date |
| nextService | DateTime? | null | Next scheduled service |
| warranty | String | "Pending" | Warranty info |
| amcVendor | String | "To be assigned" | AMC service vendor |
| purchaseCost | Float | 0.0 | Purchase cost |
| approvalStatus | String | "Approved" | Approval status |
| pendingParts | String | "None" | Parts awaiting replacement |

**Relations**:
- `branch` → Branch
- `tasks` → Task[] (via applianceId)
- `complaints` → Complaint[] (via assetId)

**Indexes**: `branchId`, `category`

---

### Task

Work items assigned to users.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| title | String | - | Task title |
| branchId | String | - | FK to Branch |
| audience | RoleId | lc | Target role |
| schedule | String | "Daily" | Daily/Weekly/One-Time |
| priority | Priority | High | Priority level |
| zone | String | "Branch premises" | Location |
| deadline | DateTime | - | Due date/time |
| assignedToId | String? | null | FK to assignee User |
| assignedById | String | - | FK to creator User |
| status | TaskStatus | Pending | Current status |
| checklistDone | Int | 0 | Completed checklist items |
| checklistTotal | Int | 1 | Total checklist items |
| proofRequired | Boolean | false | Whether photo proof needed |
| proofLabel | String | "Photo proof" | Proof field label |
| proofUrl | String? | null | Cloudinary image URL |
| completedById | String? | null | FK to completing User |
| completedAt | DateTime? | null | Completion timestamp |
| notes | Text | - | Task notes/description |
| escalation | String | "None" | Escalation status |
| redoReason | Text? | null | Reason for revoke/redo |
| applianceId | String? | null | FK to Appliance (optional) |

**Relations**:
- `branch` → Branch
- `assignedTo` → User (nullable)
- `assignedBy` → User
- `completedBy` → User (nullable)
- `appliance` → Appliance (nullable)

**Indexes**: `branchId`, `assignedToId`, `status`

---

### AttendanceLog

Daily attendance records.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| userId | String | - | FK to User |
| date | String | - | YYYY-MM-DD |
| status | AttStatus | Present | Attendance status |
| checkIn | String | - | HH:MM check-in time |
| checkOut | String? | null | HH:MM check-out time |
| location | String | "Inside geo fence" | Check-in location |
| proof | String | "Geo + selfie verified" | Verification method |
| deviation | String | "No" | Schedule deviation |
| latitude | Float? | null | Check-in latitude |
| longitude | Float? | null | Check-in longitude |

**Relations**:
- `user` → User
- `weeklyTasks` → WeeklyTaskPlanItem[]

**Unique Constraint**: `[userId, date]` (one record per user per day)
**Indexes**: `userId`

---

### WeeklyTaskPlanItem

Task plan items embedded within attendance logs.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| attendanceId | String | - | FK to AttendanceLog |
| description | String | - | Task description |
| estimatedHours | Float | 0.0 | Estimated completion hours |

**Relations**:
- `attendance` → AttendanceLog

---

### Complaint

Issue/complaint tickets with escalation chain.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| title | String | - | Complaint title |
| branchId | String | - | FK to Branch |
| type | String | - | Appliance, Electrical, etc. |
| priority | Priority | Medium | Priority level |
| status | ComplaintStatus | Pending | Current status |
| reportedById | String | - | FK to reporting User |
| assignedVendor | String | "Not assigned" | Assigned vendor name |
| assetId | String? | null | FK to Appliance (if applicable) |
| estimatedCost | Float | 0.0 | Estimated repair cost |
| impact | String | "Operational impact" | Business impact |
| description | Text | - | Detailed description |
| escalationStage | String | "LC" | Current escalation level |
| timeline | Json | [] | Array of ISO timestamps |

**Escalation Chain**: LC → Branch Manager → RM

**Relations**:
- `branch` → Branch
- `reportedBy` → User
- `asset` → Appliance (nullable)

**Indexes**: `branchId`

---

### Approval

Financial/repair approval requests.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| title | String | - | Approval title |
| kind | String | - | Expense, Appliance Repair |
| branchId | String | - | FK to Branch |
| amount | Float | - | Requested amount |
| requestedById | String | - | FK to requesting User |
| status | ApprovalStatus | Pending | Current status |
| stage | String | "Branch Manager" | Current approval stage |
| priority | Priority | High | Auto-set: Critical if >25K |
| age | String | "Just now" | Time since creation |
| note | Text | - | Description/justification |

**Approval Flow**: If amount > 25,000, routes to RM instead of Branch Manager.

**Relations**:
- `branch` → Branch
- `requestedBy` → User

---

### Visit

Manager branch visit records.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| branchId | String | - | FK to Branch |
| managerId | String | - | FK to manager User |
| scheduledAt | DateTime | - | Scheduled visit time |
| purpose | String | - | Visit purpose |
| agenda | Text | - | Detailed agenda |
| status | VisitStatus | Scheduled | Current status |
| report | Text | "Pending" | Post-visit report |

**Relations**:
- `branch` → Branch
- `manager` → User

---

### Notification

In-app notifications with role-based visibility.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String (UUID) | auto | Primary key |
| title | String | - | Notification title |
| detail | String | - | Notification body |
| scope | RoleId[] | - | Visible-to roles array |
| branchId | String | - | FK to Branch |
| priority | Priority | Medium | Priority level |
| read | Boolean | false | Read/unread status |
| bookmarked | Boolean | false | Bookmark status |
| time | String | "Just now" | Relative time display |

**Relations**:
- `branch` → Branch

---

## Entity Relationship Diagram

```
User ──manager──▶ User (self-ref)
User ──branch──▶ Branch
User ◀──assignedTo── Task
User ◀──assignedBy── Task
User ◀──completedBy── Task
User ◀──reportedBy── Complaint
User ◀──requestedBy── Approval
User ◀──managerId── Visit
User ◀──userId── AttendanceLog ◀──attendanceId── WeeklyTaskPlanItem

Branch ◀──branchId── User
Branch ◀──branchId── Appliance
Branch ◀──branchId── Task
Branch ◀──branchId── Complaint
Branch ◀──branchId── Approval
Branch ◀──branchId── Visit
Branch ◀──branchId── Notification

Appliance ◀──applianceId── Task (optional)
Appliance ◀──assetId── Complaint (optional)
```

## Indexes Summary

| Table | Indexed Fields |
|-------|----------------|
| User | `role` |
| Branch | `name` |
| Appliance | `branchId`, `category` |
| Task | `branchId`, `assignedToId`, `status` |
| AttendanceLog | `userId`, unique on `[userId, date]` |
| Complaint | `branchId` |
