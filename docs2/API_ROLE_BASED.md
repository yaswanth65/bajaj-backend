# API Reference: Role-Based Endpoints

Base URL: `http://<host>:5000/api`

All endpoints under the `/lc`, `/bm`, and `/rm` sub-paths require a valid JSON Web Token (JWT) in the `Authorization: Bearer <token>` header and enforce role checks.

---

## 🔑 Authentication Context (JWT Payload)

The JWT token contains the following decoded user properties used for server-side security scoping:
```json
{
  "id": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
  "email": "shitaldevnath@gmail.com",
  "role": "lc",
  "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
  "branchScope": ["cffe0d26-e1fa-4daf-afa3-9dfa278ea038"],
  "name": "Shital Devnath"
}
```

---

## 📍 Location Coordinator (LC) Endpoints

Role restriction: `role === "lc"`

### 1. GET /lc/dashboard
Returns all metrics and resources needed for the LC home dashboard in a single round-trip.

- **URL**: `/api/lc/dashboard`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "branch": {
    "id": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
    "name": "Ambikapur",
    "code": "BR-AMB",
    "city": "Ambikapur",
    "health": 92.5,
    "sla": 98,
    "criticalAlerts": 1,
    "openIssues": 2,
    "monthlyBudget": 45000,
    "usedBudget": 12000,
    "staffCount": 4,
    "todayAttendance": 100,
    "applianceRisk": 0,
    "nextVisit": "2026-06-12T00:00:00.000Z",
    "auditScore": 94
  },
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Clean AC Filter",
      "status": "Pending",
      "schedule": "Daily",
      "zone": "Server Room",
      "deadline": "2026-06-10T12:00:00.000Z",
      "assignedTo": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "assignedBy": "ishwarrajput@gmail.com",
      "audience": "lc",
      "applianceId": "ac-001",
      "priority": "High",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "checklistTotal": 1,
      "notes": "Verify airflow after cleaning",
      "proofRequired": true
    }
  ],
  "complaints": [
    {
      "id": "761665a3-db19-4824-b586-7a718cbb1f6c",
      "title": "Water leakage in cafeteria",
      "type": "Plumbing",
      "impact": "Medium",
      "priority": "Medium",
      "status": "Pending",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "estimatedCost": 3500,
      "description": "Pipe leaking behind coffee dispenser",
      "createdAt": "2026-06-10T02:15:00.000Z"
    }
  ],
  "appliances": [
    {
      "id": "ac-001",
      "name": "Voltas Split AC",
      "category": "AC",
      "brand": "Voltas",
      "zone": "Server Room",
      "status": "Operational",
      "healthScore": 95,
      "approvalStatus": "Approved",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "amcVendor": "CoolCare Services",
      "nextService": "2026-08-15T00:00:00.000Z",
      "pendingParts": "None"
    }
  ],
  "todayAttendance": {
    "id": "921e07ef-54a9-4169-9200-c77dadd16e0c",
    "userId": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
    "date": "2026-06-10",
    "status": "Present",
    "checkIn": "09:00",
    "checkOut": null,
    "location": "Within geofence limits",
    "proof": "Selfie verified",
    "deviation": false,
    "weeklyTasks": [
      {
        "id": "task-plan-01",
        "description": "Clean AC Filter",
        "estimatedHours": 1
      }
    ]
  }
}
```

### 2. GET /lc/tasks
Returns tasks scoped to the LC's assigned branch.

- **URL**: `/api/lc/tasks`
- **Method**: `GET`
- **Query Params**:
  - `status` (string, optional): filter by task status (`Pending`, `InProgress`, `Completed`, `Revoked`).
- **Response**: `200 OK`
- **Payload**:
```json
{
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Clean AC Filter",
      "status": "Pending",
      "schedule": "Daily",
      "zone": "Server Room",
      "deadline": "2026-06-10T12:00:00.000Z",
      "assignedTo": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "assignedBy": "ishwarrajput@gmail.com",
      "audience": "lc",
      "applianceId": "ac-001",
      "priority": "High",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "checklistTotal": 1,
      "notes": "Verify airflow after cleaning",
      "proofRequired": true,
      "completedBy": null,
      "completedAt": null
    }
  ]
}
```

### 3. GET /lc/attendance/calendar
Returns personal attendance log entries for the LC. Used to render calendar grid.

- **URL**: `/api/lc/attendance/calendar`
- **Method**: `GET`
- **Query Params**:
  - `month` (number, optional): Defaults to current.
  - `year` (number, optional): Defaults to current.
- **Response**: `200 OK`
- **Payload**:
```json
[
  {
    "id": "921e07ef-54a9-4169-9200-c77dadd16e0c",
    "userId": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
    "date": "2026-06-10",
    "status": "Present",
    "checkIn": "09:00",
    "checkOut": null,
    "location": "Within geofence limits",
    "proof": "Selfie verified",
    "deviation": false,
    "weeklyTasks": [
      {
        "id": "task-plan-01",
        "description": "Clean AC Filter",
        "estimatedHours": 1
      }
    ]
  }
]
```

### 4. POST /lc/attendance
Submit check-in for the day and enter daily task plan.

- **URL**: `/api/lc/attendance`
- **Method**: `POST`
- **Request Body**:
```json
{
  "checkIn": "09:00",
  "weeklyTasks": [
    {
      "description": "Clean AC Filter",
      "estimatedHours": 1
    }
  ]
}
```
- **Response**: `200 OK` or `201 Created`
- **Payload**:
```json
{
  "message": "Attendance marked successfully",
  "attendance": {
    "id": "921e07ef-54a9-4169-9200-c77dadd16e0c",
    "userId": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
    "date": "2026-06-10",
    "status": "Present",
    "checkIn": "09:00",
    "checkOut": null,
    "location": "Within geofence limits",
    "proof": "Selfie verified",
    "deviation": false
  }
}
```

---

## 🏢 Branch Manager (BM) Endpoints

Role restriction: `role === "branchManager"`

### 1. GET /bm/dashboard
Returns high-level statistics, branches, approvals, and visits inside the BM's scope.

- **URL**: `/api/bm/dashboard`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "branches": [
    {
      "id": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "name": "Ambikapur",
      "code": "BR-AMB",
      "city": "Ambikapur",
      "staffCount": 4,
      "criticalAlerts": 1,
      "sla": 98,
      "todayAttendance": 100,
      "openIssues": 2,
      "monthlyBudget": 45000,
      "usedBudget": 12000,
      "health": 92.5,
      "nextVisit": "2026-06-12T00:00:00.000Z",
      "auditScore": 94,
      "applianceRisk": 0
    }
  ],
  "approvals": [
    {
      "id": "6940726e-91da-41ce-a8bc-c1004811028f",
      "title": "Flow test repair",
      "kind": "Expense",
      "amount": 5000,
      "status": "Pending",
      "priority": "Medium",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "requestedBy": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "stage": "Branch Manager",
      "note": "test",
      "updatedAt": "2026-06-10T04:17:58.000Z"
    }
  ],
  "visits": [],
  "notifications": [
    {
      "id": "notif-01",
      "title": "Escalation: Water Leakage",
      "detail": "Complaint was escalated to BM at Ambikapur.",
      "priority": "High",
      "scope": ["branchManager"],
      "read": false,
      "createdAt": "2026-06-10T04:10:00.000Z"
    }
  ]
}
```

### 2. GET /bm/attendance
Returns scoped attendance logs (limited to last 500), users lists, and tasks in scope.

- **URL**: `/api/bm/attendance`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "attendance": [
    {
      "id": "921e07ef-54a9-4169-9200-c77dadd16e0c",
      "userId": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "date": "2026-06-10",
      "status": "Present",
      "checkIn": "09:00",
      "checkOut": null,
      "location": "Within geofence limits",
      "proof": "Selfie verified",
      "deviation": false,
      "weeklyTasks": [
        {
          "id": "task-plan-01",
          "description": "Clean AC Filter",
          "estimatedHours": 1
        }
      ]
    }
  ],
  "users": [
    {
      "id": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "name": "Shital Devnath",
      "role": "lc",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "status": "Present",
      "attendancePct": 94
    }
  ],
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Clean AC Filter",
      "status": "Pending",
      "assignedTo": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "schedule": "Daily"
    }
  ]
}
```

### 3. GET /bm/tasks
Returns tasks for branches in the BM's scope.

- **URL**: `/api/bm/tasks`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Clean AC Filter",
      "status": "Pending",
      "schedule": "Daily",
      "zone": "Server Room",
      "deadline": "2026-06-10T12:00:00.000Z",
      "assignedTo": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "assignedBy": "ishwarrajput@gmail.com",
      "audience": "lc",
      "applianceId": "ac-001",
      "priority": "High",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "checklistTotal": 1,
      "notes": "Verify airflow after cleaning",
      "proofRequired": true,
      "completedBy": null,
      "completedAt": null
    }
  ]
}
```

### 4. GET /bm/approvals
Returns approval requests submitted for branches in the BM's scope.

- **URL**: `/api/bm/approvals`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
[
  {
    "id": "6940726e-91da-41ce-a8bc-c1004811028f",
    "title": "Flow test repair",
    "kind": "Expense",
    "amount": 5000,
    "status": "Pending",
    "priority": "Medium",
    "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
    "requestedBy": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
    "stage": "Branch Manager",
    "note": "test",
    "updatedAt": "2026-06-10T04:17:58.000Z"
  }
]
```

### 5. GET /bm/branches
Returns scoped branches, appliances list, and staff details.

- **URL**: `/api/bm/branches`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "branches": [...],
  "appliances": [...],
  "users": [...]
}
```

### 6. GET /bm/complaints
Returns complaints recorded for scoped branches.

- **URL**: `/api/bm/complaints`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
[
  {
    "id": "761665a3-db19-4824-b586-7a718cbb1f6c",
    "title": "Water leakage in cafeteria",
    "type": "Plumbing",
    "impact": "Medium",
    "priority": "Medium",
    "status": "Pending",
    "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
    "estimatedCost": 3500,
    "description": "Pipe leaking behind coffee dispenser",
    "timeline": [],
    "reportedBy": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
    "createdAt": "2026-06-10T02:15:00.000Z",
    "updatedAt": "2026-06-10T02:15:00.000Z"
  }
]
```

### 7. GET /bm/visits
Returns visit schedules inside the BM's scope.

- **URL**: `/api/bm/visits`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
[]
```

---

## 🗺️ Regional Manager (RM) Endpoints

Role restriction: `role === "rm"`

### 1. GET /rm/dashboard
Returns regional summaries, complaints, approvals, and system notifications.

- **URL**: `/api/rm/dashboard`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "branches": [
    {
      "id": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "name": "Ambikapur",
      "code": "BR-AMB",
      "city": "Ambikapur",
      "health": 92.5,
      "sla": 98,
      "criticalAlerts": 1,
      "todayAttendance": 100,
      "openIssues": 2,
      "monthlyBudget": 45000,
      "usedBudget": 12000,
      "staffCount": 4,
      "nextVisit": "2026-06-12T00:00:00.000Z",
      "applianceRisk": 0,
      "auditScore": 94
    }
  ],
  "complaints": [...],
  "approvals": [...],
  "notifications": [...]
}
```

### 2. GET /rm/attendance
Returns all system attendance records (up to last 1000) and users list.

- **URL**: `/api/rm/attendance`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "attendance": [...],
  "users": [...],
  "tasks": [...]
}
```

### 3. GET /rm/finance
Returns overall branch budgets and approval details for Capex monitoring.

- **URL**: `/api/rm/finance`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "approvals": [
    {
      "id": "6940726e-91da-41ce-a8bc-c1004811028f",
      "title": "Flow test repair",
      "kind": "Expense",
      "amount": 5000,
      "status": "Pending",
      "priority": "Medium",
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "requestedBy": "899ae2d0-bfd4-412a-987a-0aff0d57957e",
      "stage": "Branch Manager",
      "note": "test",
      "updatedAt": "2026-06-10T04:17:58.000Z"
    }
  ],
  "branches": [
    {
      "id": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "name": "Ambikapur",
      "monthlyBudget": 45000,
      "usedBudget": 12000,
      "city": "Ambikapur",
      "code": "BR-AMB"
    }
  ]
}
```

### 4. GET /rm/users
Returns all users and branches list for user management.

- **URL**: `/api/rm/users`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "users": [...],
  "branches": [...]
}
```

### 5. GET /rm/analytics
Computes KPI metrics and aggregation metrics on the server and returns the summary.

- **URL**: `/api/rm/analytics`
- **Method**: `GET`
- **Response**: `200 OK`
- **Payload**:
```json
{
  "analytics": [
    {
      "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
      "branchName": "Ambikapur",
      "branchCode": "BR-AMB",
      "city": "Ambikapur",
      "health": 92.5,
      "sla": 98,
      "criticalAlerts": 1,
      "todayAttendance": 100,
      "staffCount": 4,
      "monthlyBudget": 45000,
      "usedBudget": 12000,
      "budgetBurnPct": 27,
      "taskCompletionRate": 85,
      "totalTasks": 20,
      "completedTasks": 17,
      "openComplaints": 2,
      "resolvedComplaints": 5,
      "approvedCapex": 0,
      "applianceRisk": 0,
      "auditScore": 94
    }
  ]
}
```

### 6. GET /rm/tasks
Returns all tasks.

- **URL**: `/api/rm/tasks`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "tasks": [...]
}
```

---

## ✍️ Cross-Role Action Mutations

These endpoints process mutations (creation or status changes) across roles.

### 1. POST /approvals
Create a new expense or repair approval request.

- **URL**: `/api/approvals`
- **Method**: `POST`
- **Request Body**:
```json
{
  "title": "AC repair cost",
  "kind": "Appliance Repair",
  "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
  "amount": 5000,
  "note": "Compressor diagnostic charge"
}
```
- **Response**: `201 Created`
- **Payload**:
```json
{
  "message": "Approval request created",
  "approval": {
    "id": "approval-uuid",
    "title": "AC repair cost",
    "kind": "Appliance Repair",
    "branchId": "cffe0d26-e1fa-4daf-afa3-9dfa278ea038",
    "amount": 5000,
    "status": "Pending",
    "stage": "Branch Manager",
    "note": "Compressor diagnostic charge"
  }
}
```

### 2. POST /approvals/:id/approve
Approve a request. LCs cannot call this (returns `403`). If `amount > 25000`, the status remains `Pending` but `stage` moves to `Regional Manager`.

- **URL**: `/api/approvals/:id/approve`
- **Method**: `POST`
- **Response**: `200 OK`

### 3. POST /approvals/:id/reject
Reject a request. LCs cannot call this (returns `403`).

- **URL**: `/api/approvals/:id/reject`
- **Method**: `POST`
- **Response**: `200 OK`
