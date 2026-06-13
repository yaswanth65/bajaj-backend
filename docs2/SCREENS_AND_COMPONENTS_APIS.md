# Screen-by-Screen API Requirement & CRUD Expansion Audit (MVP Scope)

This document provides a screen-by-screen audit of all user roles inside the `mobile-app/src/roles` directory. It incorporates feedback to prioritize **MVP targets** and enforces a **soft-deletion/archival architecture** (avoiding raw `DELETE` queries where possible).

---

## 📐 Overall MVP Guidelines
1. **Soft-Deletions**: Do not implement raw database row deletions. Instead, perform `PATCH` or `PUT` calls to update the state of the entity to a terminal/inactive state (e.g. `Cancelled`, `Archived`, `Inactive`, `Decommissioned`).
2. **Scope Controls**: Regional Managers (RM) retain ownership of global configuration mutations (like staff shifts and budget caps). Branch Managers (BM) oversee operational task schedules, audits, and approvals.

---

## 👷 Part 1: Location Coordinator (LC) Screens

Path: `/mobile-app/src/roles/lc/*`

### 1. `LcAttendanceScreen.tsx`
- **Role**: Daily clock-in and calendar logs.
- **MVP Approved APIs**:
  - **Punch-Out (`PUT`)**:
    - **Endpoint**: `PUT /api/lc/attendance/:id/checkout`
    - **Description**: Registers the check-out timestamp and calculates total active hours for the day.
- **MVP Excluded / Deferred**:
  - `PATCH /attendance/:id/tasks` (Daily plan edit) — *Daily plan must not be editable after clock-in.*
  - `DELETE /attendance/:id` (Delete log) — *Administrative database operations only; not exposed to UI.*

### 2. `LcComplaintsScreen.tsx`
- **Role**: Raise complaints for plumbing, electrical, and appliance issues.
- **MVP Approved APIs**:
  - **Edit Complaint (`PUT` - Conditional)**:
    - **Endpoint**: `PUT /api/complaints/:id`
    - **Rule**: Allowed *only* before the complaint is assigned to a vendor.
- **MVP Excluded / Deferred**:
  - `DELETE /api/complaints/:id` — *Soft-canceled by status change to `Cancelled` rather than raw delete.*

### 3. `LcTasksScreen.tsx` & `LcHomeScreen.tsx`
- **Role**: View daily checklists and execute task submissions.
- **MVP Excluded / Deferred**:
  - `POST /tasks/:id/delegate` (Task delegation) — *Out of scope for MVP.*
  - `PATCH /tasks/:id/defer` (Task deadline snooze) — *Out of scope for MVP.*
  - `PATCH /branches/:id/kpi` (Branch updates) — *Dashboard is read-only for LCs.*

---

## 🏢 Part 2: Branch Manager (BM) Screens

Path: `/mobile-app/src/roles/branchManager/*`

### 1. `BranchManagerIssuesScreen.tsx` (Complaints Hub)
- **Role**: Oversees local issues, assigns vendors, and resolves complaints.
- **MVP Approved APIs**:
  - **Reject Complaint (`POST`)**:
    - **Endpoint**: `POST /api/complaints/:id/reject`
    - **Description**: Rejects incorrect or duplicate complaints. Sets status to `Rejected`.
- **MVP Excluded / Deferred**:
  - `PUT /complaints/:id/vendor` — *Assign vendor endpoint is sufficient.*

### 2. `BranchManagerMonitoringScreen.tsx` (Task Manager)
- **Role**: Schedules checks and monitors staff checklist completions.
- **MVP Approved APIs**:
  - **Edit Task (`PUT`)**:
    - **Endpoint**: `PUT /api/tasks/:id`
    - **Description**: Allows editing of task details, checklist metrics, or assignee.
  - **Archive Task (`PATCH` - Status Change)**:
    - **Endpoint**: `PATCH /api/tasks/:id/archive`
    - **Description**: Sets task status to `Archived` instead of deleting.

### 3. `BranchManagerVisitsScreen.tsx`
- **Role**: Registers branch audit schedules and logs audit notes.
- **MVP Approved APIs**:
  - **Reschedule Visit (`PUT`)**:
    - **Endpoint**: `PUT /api/visits/:id`
    - **Description**: Updates schedule dates and agenda notes.
  - **Cancel Visit (`PATCH` - Status Change)**:
    - **Endpoint**: `PATCH /api/visits/:id/cancel`
    - **Description**: Updates visit status to `Cancelled` instead of hard deletion.

### 4. `BranchManagerHomeScreen.tsx` & `BranchManagerBranchesScreen.tsx`
- **Role**: Oversees multiple branch health and metrics.
- **MVP Excluded / Deferred**:
  - `POST /notifications/bulk-read` (Notifications) — *Deferred for MVP.*
  - `POST /branches` & `DELETE /branches/:id` — *BM cannot create or delete branches.*
  - `POST /approvals/:id/query` (Query invoice) — *Too specific; deferred.*
  - `PUT /users/:id/shift` (Shift changes) — *Owned globally by the RM.*
  - `POST /attendance/absent` (Manual absent flag) — *Roster is computed automatically.*

---

## 🌍 Part 3: Regional Manager (RM) Screens

Path: `/mobile-app/src/roles/rm/*`

### 1. `RmFinanceScreen.tsx`
- **Role**: Monitors financial budgets, Capex approvals, and regional audits.
- **MVP Approved APIs**:
  - **Export Financial Data (`GET`)**:
    - **Endpoint**: `GET /api/rm/finance/export`
    - **Description**: Generates and downloads regional budgets and approvals excel report sheet.
- **MVP Excluded / Deferred**:
  - `PUT /regional/budget` — *Only implemented if editable budgets module is requested.*
  - `POST /approvals/bulk-approve` — *Bulk actions are disabled to prevent bulk errors.*

### 2. `RmUsersScreen.tsx`
- **Role**: Oversees user lists, registration, and user accounts.
- **MVP Approved APIs**:
  - **Lock/Unlock User (`PATCH` - Status Change)**:
    - **Endpoint**: `PATCH /api/users/:id/status`
    - **Description**: Sets user status to `Active` or `Locked` (to freeze login credentials).

---

## 📦 Part 4: Shared Panels & Modals

Path: `/mobile-app/src/shared/components/detail/*` and `modals/*`

### 1. `BranchDeepDiveScreen.tsx` & `BranchDetailScreen.tsx`
- **Role**: View deep details of branch assets, staff rosters, and compliance metrics.
- **MVP Approved APIs**:
  - **Register Appliance (`POST`)**:
    - **Endpoint**: `POST /api/appliances`
    - **Description**: Registers a new hardware appliance at the selected branch.
  - **Decommission Appliance (`PATCH` - Status Change)**:
    - **Endpoint**: `PATCH /api/appliances/:id/decommission`
    - **Description**: Marks the appliance status as `Decommissioned` instead of deleting the database record.

### 2. `StaffDetailScreen.tsx` & `RmProfileScreen.tsx`
- **Role**: Profile details, historical task records, and documents.
- **MVP Excluded / Deferred**:
  - `PUT /branches/:id/transfer-staff` — *Deferred.*
  - `POST /users/:id/reviews` (Manager reviews) — *Deferred.*
  - `PUT /users/:id/documents` (Document upload) — *Deferred.*
