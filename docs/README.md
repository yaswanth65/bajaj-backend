# Bajaj Operations Backend

Backend API server for the Bajaj Operations Management mobile application. Powers branch-level operations including user authentication, task management, attendance tracking, appliance monitoring, complaint ticketing, approval workflows, branch visit scheduling, and push notifications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express 4.x |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 5.x |
| Auth | JWT + bcryptjs |
| File Uploads | Cloudinary (via Multer in-memory) |
| Push Notifications | Expo Server SDK |

## Prerequisites

- Node.js >= 18
- PostgreSQL database (Neon or local)
- Cloudinary account (for image uploads)
- Expo push notification credentials (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host:5432/bajaj_ops?sslmode=require"
JWT_SECRET="your-secret-key"
PORT=5000
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with test data
npm run seed
```

### 4. Run the Server

```bash
# Development
npm run dev

# Production build
npm run build && npm start
```

Server starts on `http://localhost:5000` (or the configured `PORT`).

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `ts-node src/index.ts` | Development server with ts-node |
| `build` | `tsc` | Compile TypeScript to dist/ |
| `start` | `node dist/index.js` | Production server |
| `seed` | `ts-node src/seed.ts` | Seed database with test data |
| `prisma:generate` | `prisma generate` | Regenerate Prisma client |
| `prisma:migrate` | `prisma migrate dev` | Run database migrations |

## API Overview

All routes are prefixed with `/api`. Authentication is via `Authorization: Bearer <token>` header.

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/auth` | Login |
| Attendance | `/api/attendance` | Mark and view attendance |
| Tasks | `/api/tasks` | Task CRUD, completion, proof submission |
| Dashboard | `/api/dashboard` | Role-based metrics |
| Users | `/api/users` | User management |
| Branches | `/api/branches` | Branch information |
| Appliances | `/api/appliances` | Appliance CRUD |
| Complaints | `/api/complaints` | Complaint lifecycle |
| Approvals | `/api/approvals` | Approval workflow |
| Visits | `/api/visits` | Branch visit scheduling |
| Notifications | `/api/notifications` | Notification management |
| Cron | `/api/cron` | Automated task generation |

For full API documentation, see [API.md](./API.md).

## Project Structure

```
backend/
├── prisma/              # Database schema and migrations
│   ├── schema.prisma    # Data model (9 models, 8 enums)
│   └── migrations/      # SQL migration files
├── src/
│   ├── index.ts         # Express app entry point
│   ├── seed.ts          # Database seeder
│   ├── routes/          # Express routers (13 files)
│   ├── controllers/     # Request handlers (12 files)
│   ├── middlewares/      # Auth middleware
│   └── services/        # External service integrations
└── docs/                # Documentation
```

## User Roles

| Role | ID | Description |
|------|-----|-------------|
| Local Coordinator | `lc` | Branch-level operator, marks tasks, attendance, reports issues |
| Branch Manager | `branchManager` | Manages multiple branches, approves requests, schedules visits |
| Regional Manager | `rm` | Regional oversight, high-cost approvals, critical alerts |

## License

Proprietary - Bajaj Operations
