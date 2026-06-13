# Architecture

## System Overview

The Bajaj Operations Backend follows a layered architecture with Express.js handling HTTP routing, controllers containing business logic, Prisma ORM for database access, and dedicated services for external integrations (Cloudinary, Expo push notifications).

```
┌─────────────┐     ┌─────────────────────────────────────┐
│  Mobile App │────▶│         Express API Server          │
│  (React     │     │                                     │
│   Native)   │◀────│  Routes → Controllers → Services    │
└─────────────┘     │               │                     │
                    │          Prisma ORM                  │
                    │               │                     │
                    └───────────────┼─────────────────────┘
                                    │
                            ┌───────▼──────┐
                            │  PostgreSQL  │
                            │  (Neon)      │
                            └──────────────┘
```

## Request Lifecycle

```
HTTP Request
    │
    ▼
Express Server (src/index.ts)
    │  CORS, JSON parsing
    ▼
Route Handler (src/routes/*.routes.ts)
    │  Path matching, method validation
    ▼
Auth Middleware (src/middlewares/auth.middleware.ts)
    │  JWT verification, user context injection
    ▼
Controller (src/controllers/*.controller.ts)
    │  Input validation, business logic, DB queries via Prisma
    ▼
Service (src/services/*.service.ts) - Optional
    │  Cloudinary uploads, Expo push notifications
    ▼
JSON Response
```

## Route Structure

All routes are mounted under `/api` via `src/routes/index.ts`:

```
/api
├── /auth
│   └── POST /login
├── /attendance
│   ├── GET  /
│   ├── POST /
│   └── GET  /my-calendar
├── /tasks
│   ├── GET  /
│   ├── POST /
│   ├── POST /:id/complete
│   ├── POST /:id/submit-proof
│   └── POST /:id/revoke
├── /dashboard
│   └── GET  /metrics
├── /users
│   ├── GET  /
│   ├── POST /
│   └── PUT  /:id
├── /branches
│   ├── GET  /
│   └── GET  /:id
├── /appliances
│   ├── GET  /
│   ├── POST /
│   └── PUT  /:id
├── /complaints
│   ├── GET  /
│   ├── POST /
│   ├── POST /:id/resolve
│   ├── POST /:id/escalate
│   ├── POST /:id/assign-vendor
│   └── POST /:id/approve-high-cost
├── /approvals
│   ├── GET  /
│   ├── POST /
│   ├── POST /:id/approve
│   └── POST /:id/reject
├── /visits
│   ├── GET  /
│   ├── POST /
│   └── POST /:id/report
├── /notifications
│   ├── GET  /
│   ├── POST /:id/read
│   ├── POST /:id/bookmark
│   ├── POST /:id/acknowledge
│   └── POST /:id/escalate
└── /cron
    └── GET  /generate-appliance-tasks
```

## Authentication

JWT-based authentication via `Authorization: Bearer <token>` header. The `authenticateToken` middleware decodes the JWT and populates `req.user` with:

```typescript
{
  id: string;          // User UUID
  name: string;        // Display name
  email: string;       // Email address
  role: RoleId;        // "lc" | "branchManager" | "rm"
  branchId: string | null;   // Assigned branch (LC only)
  branchScope: string[];     // Visible branches (managers)
}
```

## Role-Based Access Control

Data scoping is implemented at the controller level:

- **LC (Local Coordinator)**: Views own data and branch data filtered by `branchId`. Can mark attendance, complete assigned tasks, report complaints.
- **Branch Manager (branchManager)**: Views data across branches listed in `branchScope`. Manages users, schedules visits, approves/rejects requests.
- **RM (Regional Manager)**: Views all branches. Handles escalated complaints, high-cost approvals, and critical alerts.

## Dashboard Architecture

The dashboard controller (`dashboard.controller.ts`) provides three distinct metric views depending on the user's role:

| Role | Metrics |
|------|---------|
| LC | Branch health %, task completion stats, open issues, staff pulse (absences, late marks), action queue |
| Branch Manager | Multi-branch stats, usedBudget vs monthlyBudget, watchlist (at-risk appliances), upcoming visits, pending approvals |
| RM | Regional averages (health, attendance, performance), critical alerts, decision feed (high-cost complaints, pending RM approvals, SLA drops) |

## External Services

### Cloudinary
- Used for image uploads (task proof photos).
- Multer handles in-memory file uploads (5MB limit).
- `cloudinary.service.ts` uploads buffers via stream and returns secure URLs.

### Expo Push Notifications
- `notification.service.ts` sends push notifications via Expo Server SDK.
- `sendPushNotification` targets individual Expo push tokens.
- `notifyBranchManagers` finds all `branchManager` users whose `branchScope` includes a given branch.
- `notifyRegionalManagers` finds all `rm` users.
- Messages are chunked to respect Expo API limits.

## Error Handling

- 401: Missing or invalid authentication token
- 403: Expired token
- 404: Resource not found
- 500: Server error (logged, generic message returned)

Controllers respond with JSON in the format:
```json
{ "message": "Description", "data": { ... } }
```
