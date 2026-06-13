# User-Specific API Documentation (docs2)

This directory contains the reference documentation for the user-specific, role-based API architecture implemented for the Bajaj Operations App. 

Unlike generic CRUD or resource-based endpoints, this architecture exposes **lean, single-purpose, role-optimized APIs** designed to match the specific data needs of user interface screens for each dashboard role. This optimizes data payload sizes, eliminates client-side sorting, and improves latency.

## Documentation Map

1. **[API Reference: Role-Based Endpoints (API_ROLE_BASED.md)](file:///C:/temporary%20projects/testing%20serverCompontnets%20apk/bajaj%20operations%20project/backend/docs2/API_ROLE_BASED.md)**
   Comprehensive specifications of all LC, BM, and RM role-specific endpoints, request/response JSON schemas, and authorization rules.

2. **[Data Modeling & Auth Scoping (DATAMODELS_AND_ROLES.md)](file:///C:/temporary%20projects/testing%20serverCompontnets%20apk/bajaj%20operations%20project/backend/docs2/DATAMODELS_AND_ROLES.md)**
   A mapping of user roles, their database schemas, relationship scoping rules (e.g. `branchScope` arrays), and permission gating mechanisms.

3. **[Frontend Integration Guide (FRONTEND_INTEGRATION.md)](file:///C:/temporary%20projects/testing%20serverCompontnets%20apk/bajaj%20operations%20project/backend/docs2/FRONTEND_INTEGRATION.md)**
   A guide detailing how the React Native frontend (`AppContext.tsx`) queries the API, consumes single-call bundled endpoints, and maps results to global application state.

## Core Architectural Rules

1. **Role Gating**: Every endpoint mounted under a role-specific router (e.g., `/api/lc/*`, `/api/bm/*`, `/api/rm/*`) verifies that the authenticated token matches the corresponding `user.role` (e.g. `lc`, `branchManager`, `rm`). Wrong roles immediately receive a `403 Forbidden` response.
2. **Bundling**: Dashboard endpoints bundle multiple related entities into a single HTTP response (e.g., `/lc/dashboard` returns `branch`, `tasks`, `complaints`, `appliances`, `todayAttendance` in a single round-trip).
3. **Fields Projection**: All database queries perform strict fields projection (`select` in Prisma) to fetch and transmit only the fields required by the screen. Extra fields like `latitude`, `longitude`, metadata, or cross-relation IDs are omitted unless explicitly required.
4. **Server-Side Aggregation**: Analytical computations (like monthly branch budget burn rates or regional averages) are computed directly on the database server to minimize memory usage and payload size.
