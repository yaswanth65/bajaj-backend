# Deployment Guide

## Environment Variables

All configuration is managed via environment variables in `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (Neon recommended) |
| `JWT_SECRET` | Yes | (hardcoded fallback) | Secret key for JWT signing |
| `PORT` | No | `5000` | Server port |
| `CLOUDINARY_CLOUD_NAME` | Yes* | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes* | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | - | Cloudinary API secret |

*Required only if image upload features are used.

### Example .env
```env
DATABASE_URL="postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-256-bit-secret"
PORT=5000
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="1234567890"
CLOUDINARY_API_SECRET="abcdefghijklmnop"
```

---

## Deployment Options

### Option 1: Direct Server (VPS / EC2)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone project
git clone <repo-url> /opt/bajaj-backend
cd /opt/bajaj-backend

# Install dependencies
npm install --production

# Set environment variables
cat > .env << EOF
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
PORT=5000
EOF

# Build
npm run build

# Run with process manager
npm install -g pm2
pm2 start dist/index.js --name bajaj-backend
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

```bash
docker build -t bajaj-backend .
docker run -d --env-file .env -p 5000:5000 bajaj-backend
```

### Option 3: Platform as a Service (Railway, Render, Fly.io)

1. Connect your Git repository
2. Set build command: `npm install && npm run build`
3. Set start command: `node dist/index.js`
4. Add all environment variables from `.env`
5. Deploy

---

## Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run pending migrations
npx prisma migrate deploy

# For local development only
npx prisma migrate dev
```

## Seeding

```bash
npm run seed
```

The seed script:
1. Clears all existing data
2. Creates 1 Regional Manager
3. Creates 2 Branch Admin Managers
4. Creates 4 Assistant branches
5. Creates 4 Local Coordinators (one per branch)
6. Parses Excel files to seed Appliances (AC, UPS, Inverter)
7. Generates sample complaints and approvals
8. Creates weekly verification tasks
9. Generates 3 months of historical attendance logs with weekly task plans

Default password for all seeded users: `123456789`

## Health Check

```
GET /health
```

Expected response:
```json
{ "status": "healthy", "timestamp": "..." }
```

## Monitoring

- Health endpoint: `/health` (basic uptime monitoring)
- Database: Use Neon's built-in monitoring dashboard
- Push notifications: Monitor Expo push ticket responses for delivery failures
- File uploads: Monitor Cloudinary usage dashboard

## Troubleshooting

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| `ECONNREFUSED` on startup | Database not reachable | Check DATABASE_URL and network/firewall |
| `InvalidPrismaClientError` | Prisma client not generated | Run `npx prisma generate` |
| `JWT_SECRET not set` | Missing env variable | Set JWT_SECRET in .env |
| 401 on all requests | Missing/invalid token | Re-login to get fresh JWT |
| Image upload fails | Cloudinary misconfigured | Check CLOUDINARY_* env vars |
| Push notifications not sent | Invalid Expo token | Verify user's expoPushToken format |
