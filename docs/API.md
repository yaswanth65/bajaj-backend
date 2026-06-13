# API Reference

Base URL: `http://localhost:5000/api`

Authentication: `Authorization: Bearer <token>` header (required for all endpoints except `/auth/login` and `/health`).

---

## Health

### GET /health

Health check endpoint (not under `/api`).

**Response** `200`
```json
{
  "status": "healthy",
  "timestamp": "2026-06-08T00:00:00.000Z"
}
```

---

## Authentication

### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "123456789"
}
```

**Response** `200`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "lc",
    "position": "Local Coordinator",
    "branchId": "uuid",
    "branchScope": ["uuid"],
    "deviceId": "",
    "phone": "1234567890",
    "shift": "09:00 - 18:00",
    "status": "Present"
  }
}
```

**Error** `401`
```json
{ "message": "Invalid email or password" }
```

---

## Attendance

### POST /api/attendance (or POST /api/lc/attendance)

Mark daily attendance. Also auto-generates pending tasks from the LC's weekly plan.

**Request Body**
```json
{
  "checkIn": "09:00",
  "weeklyTasks": [
    { "description": "Check AC units", "estimatedHours": 1.5 }
  ]
}
```

**Response** `200` / `201`
```json
{
  "message": "Attendance marked successfully",
  "attendance": { "...attendance record..." }
}
```

### GET /api/attendance/my-calendar (or GET /api/lc/attendance/calendar)

Get the authenticated user's attendance calendar with weekly tasks.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `month` | number | Month (1-12), defaults to current |
| `year` | number | Year, defaults to current |

**Response** `200`
```json
{
  "calendar": [
    {
      "date": "2026-06-08",
      "status": "Present",
      "checkIn": "09:00",
      "checkOut": "18:00",
      "weeklyTasks": [
        { "id": "uuid", "description": "Check AC units", "estimatedHours": 1.5 }
      ]
    }
  ]
}
```

### PUT /api/lc/attendance/:id/checkout

Register check-out time for the LC's own attendance record.

**Request Body**
```json
{
  "checkOut": "18:00"
}
```

**Response** `200`
```json
{
  "attendance": { "id": "uuid", "checkIn": "09:00", "checkOut": "18:00" }
}
```

---

## Tasks

### POST /api/tasks

Create a new task.

**Request Body**
```json
{
  "title": "Verify AC temperature",
  "branchId": "uuid",
  "audience": "lc",
  "schedule": "Weekly",
  "priority": "High",
  "zone": "Branch premises",
  "deadline": "2026-06-10T00:00:00.000Z",
  "assignedToId": "uuid",
  "proofRequired": true,
  "proofLabel": "Photo proof",
  "notes": "Check temperature settings",
  "applianceId": "uuid"
}
```

**Response** `201`
```json
{
  "message": "Task created successfully",
  "task": { "...task object..." }
}
```

### POST /api/tasks/:id/complete

Mark a task as completed (no proof upload).

**Response** `200`
```json
{
  "message": "Task completed successfully",
  "task": { "...updated task..." }
}
```

### POST /api/tasks/:id/submit-proof

Submit a task with photo proof. `multipart/form-data`.

**Form Data**
| Field | Type | Description |
|-------|------|-------------|
| `image` | file | Image file (max 5MB). Use when uploading a local file. |
| `imageUrl` | string | Public URL of the proof image. Use as alternative when a local file is not available. |
| `notes` | string | Optional text remarks appended to task notes. |

**Response** `200`
```json
{
  "message": "Proof submitted successfully",
  "task": { "...updated task with proofUrl..." }
}
```

### POST /api/tasks/:id/revoke

Revoke or reopen a task.

**Request Body**
```json
{
  "reason": "Photo not clear, please retake"
}
```

**Response** `200`
```json
{
  "message": "Task revoked",
  "task": { "...updated task..." }
}
```

### PUT /api/bm/tasks/:id

Edit a task (BM only).

**Response** `200`
```json
{
  "task": { "...updated task..." }
}
```

### PATCH /api/bm/tasks/:id/archive

Soft-archive a task (BM only).

**Response** `200`
```json
{
  "task": { "...archived task..." }
}
```

---

## Users

### GET /api/users

List users. Branch Manager sees users in `branchScope`, RM sees all.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `role` | string | Filter by role (lc/branchManager/rm) |
| `branchId` | string | Filter by branch |

**Response** `200`
```json
{
  "users": [ "...user objects..." ]
}
```

### POST /api/users

Create a new user (managers only).

**Request Body**
```json
{
  "name": "New User",
  "role": "lc",
  "position": "Local Coordinator",
  "branchId": "uuid",
  "phone": "1234567890",
  "shift": "09:00 - 18:00",
  "skills": ["AC repair", "Electrical"]
}
```

**Response** `201`
```json
{
  "message": "User created successfully",
  "user": { "id": "uuid", "name": "New User", "email": "...", "role": "lc", "position": "..." }
}
```

### PUT /api/users/:id

Update a user's profile.

**Request Body** (partial)
```json
{
  "name": "Updated Name",
  "phone": "9999999999",
  "shift": "10:00 - 19:00",
  "expoPushToken": "ExponentPushToken[xxxx]",
  "status": "Absent"
}
```

**Response** `200`
```json
{
  "message": "Profile updated successfully",
  "user": { "...updated user..." }
}
```

---

## Branches

### GET /api/branches

List branches. Role-scoped.

**Response** `200`
```json
{
  "branches": [
    {
      "id": "uuid",
      "code": "BR001",
      "name": "Branch Name",
      "city": "City",
      "address": "Full address",
      "health": 85.5,
      "performance": 90,
      "todayAttendance": 92,
      "staffCount": 10,
      "openIssues": 2,
      "criticalAlerts": 0,
      "applianceRisk": 1,
      "auditScore": 95,
      "nextVisit": "2026-06-15"
    }
  ]
}
```

### GET /api/branches/:id

Get branch details with users and appliances.

**Response** `200`
```json
{
  "branch": {
    "...branch object...",
    "users": [ "...users in branch..." ],
    "appliances": [ "...appliances at branch..." ]
  }
}
```

---

## Appliances

### GET /api/appliances

List appliances. Role-scoped.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `branchId` | string | Filter by branch |
| `category` | string | Filter by category (AC/UPS/Inverter) |
| `status` | string | Filter by status (Operational/AtRisk/Critical/Down) |

**Response** `200`
```json
{
  "appliances": [ "...appliance objects..." ]
}
```

### POST /api/appliances

Register a new appliance.

**Request Body**
```json
{
  "branchId": "uuid",
  "name": "AC Unit 2",
  "category": "AC",
  "zone": "Server room",
  "brand": "LG",
  "serial": "SN67890",
  "purchaseDate": "2026-06-01T00:00:00.000Z",
  "warranty": "3 years",
  "amcVendor": "LG Service",
  "purchaseCost": 65000
}
```

**Response** `201`
```json
{
  "message": "Appliance registered successfully",
  "appliance": { "...appliance object..." }
}
```

### PUT /api/appliances/:id

Update appliance details.

**Request Body** (partial)
```json
{
  "healthScore": 70,
  "status": "AtRisk",
  "lastService": "2026-06-08T00:00:00.000Z",
  "nextService": "2026-09-08T00:00:00.000Z",
  "pendingParts": "Compressor"
}
```

**Response** `200`
```json
{
  "message": "Appliance updated successfully",
  "appliance": { "...updated appliance..." }
}
```

### PATCH /api/appliances/:id/decommission

Soft-decommission an appliance (BM/RM only).

**Response** `200`
```json
{
  "message": "Appliance decommissioned",
  "appliance": { "...updated appliance..." }
}
```

---

## Complaints

### GET /api/complaints

List complaints. Role-scoped.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `branchId` | string | Filter by branch |
| `status` | string | Filter by status (Pending/Escalated/Resolved) |
| `priority` | string | Filter by priority |

**Response** `200`
```json
{
  "complaints": [ "...complaint objects..." ]
}
```

### POST /api/complaints

Create a new complaint.

**Request Body**
```json
{
  "title": "AC not cooling",
  "branchId": "uuid",
  "type": "Appliance",
  "priority": "High",
  "description": "AC unit in main hall not cooling properly",
  "assetId": "uuid",
  "estimatedCost": 15000,
  "impact": "Customer discomfort"
}
```

**Response** `201`
```json
{
  "message": "Complaint registered successfully",
  "complaint": { "...complaint object..." }
}
```

### POST /api/complaints/:id/resolve

Mark a complaint as resolved.

**Response** `200`
```json
{
  "message": "Complaint resolved successfully",
  "complaint": { "...updated complaint..." }
}
```

### POST /api/complaints/:id/escalate

Escalate a complaint. Chain: LC → Branch Manager → RM.

**Response** `200`
```json
{
  "message": "Complaint escalated successfully",
  "complaint": { "...updated complaint..." }
}
```

### POST /api/complaints/:id/assign-vendor

Assign a vendor to a complaint (Branch Manager).

**Request Body**
```json
{
  "vendor": "AC Repair Services Ltd"
}
```

**Response** `200`
```json
{
  "message": "Vendor assigned successfully",
  "complaint": { "...updated complaint..." }
}
```

### POST /api/complaints/:id/approve-high-cost

Approve high-cost complaint repairs (RM only).

**Response** `200`
```json
{
  "message": "High cost decision approved successfully",
  "complaint": { "...updated complaint..." }
}
```

### POST /api/bm/complaints/:id/reject

Reject a complaint (BM only).

**Response** `200`
```json
{
  "complaint": { "...updated complaint..." }
}
```

### PUT /api/lc/complaints/:id

Edit own complaint before vendor assignment (LC only).

**Response** `200`
```json
{
  "complaint": { "...updated complaint..." }
}
```

---

## Approvals

### POST /api/approvals

Create an approval request.

**Request Body**
```json
{
  "title": "AC repair cost",
  "kind": "Appliance Repair",
  "branchId": "uuid",
  "amount": 25000,
  "note": "Compressor replacement needed"
}
```

**Response** `201`
```json
{
  "message": "Approval request created successfully",
  "approval": { "...approval object..." }
}
```

### POST /api/approvals/:id/approve

Approve a request. Auto-routes to RM if amount > 25,000.

**Response** `200`
```json
{
  "message": "Request approved successfully",
  "approval": { "...updated approval..." }
}
```

### POST /api/approvals/:id/reject

Reject a request.

**Response** `200`
```json
{
  "message": "Request rejected successfully",
  "approval": { "...updated approval..." }
}
```

---

## Visits

### GET /api/visits

List branch visits. Role-scoped.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `branchId` | string | Filter by branch |
| `status` | string | Filter by status (Scheduled/Escalated/Completed) |

**Response** `200`
```json
{
  "visits": [ "...visit objects..." ]
}
```

### POST /api/visits

Schedule a new branch visit (managers only).

**Request Body**
```json
{
  "branchId": "uuid",
  "scheduledAt": "2026-06-15T10:00:00.000Z",
  "purpose": "Quarterly audit",
  "agenda": "Review branch operations and appliance health"
}
```

**Response** `201`
```json
{
  "message": "Visit scheduled successfully",
  "visit": { "...visit object..." }
}
```

### POST /api/visits/:id/report

Submit a visit report.

**Request Body**
```json
{
  "report": "Branch operations satisfactory. AC units need servicing."
}
```

**Response** `200`
```json
{
  "message": "Visit report submitted successfully",
  "visit": { "...updated visit..." }
}
```

### PUT /api/bm/visits/:id

Reschedule a visit (BM only).

**Response** `200`
```json
{
  "visit": { "...updated visit..." }
}
```

### PATCH /api/bm/visits/:id/cancel

Cancel a visit (BM only).

**Response** `200`
```json
{
  "visit": { "...updated visit..." }
}
```

---

## Notifications

### GET /api/notifications

List notifications. Filtered by user role and branch scope.

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `branchId` | string | Filter by branch |
| `read` | boolean | Filter by read status |
| `bookmarked` | boolean | Filter by bookmark status |
| `priority` | string | Filter by priority |

**Response** `200`
```json
{
  "notifications": [ "...notification objects..." ]
}
```

### POST /api/notifications/:id/read

Toggle read/unread status.

**Response** `200`
```json
{
  "message": "Read status toggled",
  "notification": { "...updated notification..." }
}
```

### POST /api/notifications/:id/bookmark

Toggle bookmark status.

**Response** `200`
```json
{
  "message": "Bookmark toggled",
  "notification": { "...updated notification..." }
}
```

### POST /api/notifications/:id/acknowledge

Acknowledge an alert. Decrements branch `criticalAlerts` count for high-priority alerts.

**Response** `200`
```json
{
  "message": "Alert acknowledged successfully",
  "notification": { "...updated notification..." }
}
```

### POST /api/notifications/:id/escalate

Escalate an alert. Adds RM scope and increments branch `criticalAlerts`.

**Response** `200`
```json
{
  "message": "Alert escalated to RM successfully",
  "notification": { "...updated notification..." }
}
```

---

## Cron (Automated)

### POST /api/cron/generate-appliance-tasks

Generate weekly appliance verification tasks for all LCs. Iterates all appliances and creates verification tasks. Avoids duplicate generation for the same week. Updates branch `applianceRisk` counts.

**Response** `200`
```json
{
  "message": "Weekly appliance tasks generated successfully",
  "tasksCreated": 15,
  "totalAppliancesProcessed": 20
}
```

---

## Role-Specific Endpoints

These endpoints replace the old generic GET list endpoints (`/api/attendance`, `/api/tasks`, `/api/approvals`, `/api/dashboard/metrics`).

### Location Coordinator (LC)

#### GET /api/lc/dashboard
Returns branch KPIs, tasks, complaints, appliances, and today's attendance in a single call.

#### GET /api/lc/tasks?status=
Tasks visible to this LC (their branch, assigned to them or audience=lc).

#### GET /api/lc/attendance/calendar?month=&year=
LC's personal attendance calendar + completed tasks.

#### POST /api/lc/attendance
Mark attendance + submit daily task plan (same as POST /api/attendance).

#### PUT /api/lc/attendance/:id/checkout
Register check-out time.

#### PUT /api/lc/complaints/:id
Edit own complaint before vendor assignment.

### Branch Manager (BM)

#### GET /api/bm/dashboard
Branches + approvals + visits + notifications in a single call.

#### GET /api/bm/attendance
Scoped attendance roster + staff users + today's tasks.

#### GET /api/bm/tasks
Tasks for branches in BM scope.

#### GET /api/bm/approvals
Approvals for branches in BM scope.

#### GET /api/bm/branches
Scoped branches + appliances + users.

#### GET /api/bm/complaints
Complaints for branches in BM scope.

#### GET /api/bm/visits
Visits for branches in BM scope.

#### POST /api/bm/complaints/:id/reject
Reject a complaint.

#### PUT /api/bm/tasks/:id
Edit task details.

#### PATCH /api/bm/tasks/:id/archive
Soft-archive a task.

#### PUT /api/bm/visits/:id
Reschedule a visit.

#### PATCH /api/bm/visits/:id/cancel
Cancel a visit.

### Regional Manager (RM)

#### GET /api/rm/dashboard
Branches + complaints + approvals + notifications in a single call.

#### GET /api/rm/attendance
All attendance + all users + tasks.

#### GET /api/rm/finance
Approvals financial data + branch budget summary.

#### GET /api/rm/users
All users + branches for user management.

#### GET /api/rm/analytics
Per-branch KPI aggregates.

#### GET /api/rm/tasks
All tasks (RM scope) with lean fields.

#### GET /api/rm/finance/export
Download finance CSV export.

#### PATCH /api/rm/users/:id/status
Lock or unlock a user account.

---

## Error Responses

- 400: Bad request (missing or invalid fields)
- 401: Missing or invalid authentication token
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 409: Conflict (already exists, already processed)
- 429: Too many requests (rate limited)
- 500: Server error (logged, generic message returned)
