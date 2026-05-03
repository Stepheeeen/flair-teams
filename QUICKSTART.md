# Flair Teams - Quick Start Guide

Get Flair Teams running in 10 minutes.

## Prerequisites

- Node.js 18+
- GitHub account (for git)
- MongoDB Atlas free tier account
- Supabase free tier account

## Step 1: Clone & Install (2 min)

```bash
git clone <your-repo-url>
cd flair-teams
pnpm install
```

## Step 2: Create MongoDB Cluster (3 min)

1. Go to [mongodb.com](https://mongodb.com)
2. Create free account
3. Create M0 free cluster
4. Click "Connect" → "Connect your application"
5. Copy connection string (note: replace `<password>` with your password)

## Step 3: Create Supabase Project (2 min)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy:
   - Project URL
   - anon key
   - service_role key

## Step 4: Set Environment Variables (1 min)

Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flair-teams?retryWrites=true&w=majority
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 5: Create Admin User (1 min)

```bash
npx ts-node scripts/create-admin.ts
```

Follow prompts to create your admin account.

## Step 6: Start Development Server (1 min)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Test the App

1. Sign in with admin credentials
2. Create a team
3. Create a project
4. Create a task
5. Move task between columns

## Next Steps

- See [SETUP.md](./SETUP.md) for detailed setup
- See [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to Vercel
- See [README.md](./README.md) for full documentation

## Troubleshooting

### "Missing Supabase configuration" error
- Check `.env.local` has all Supabase variables
- Restart dev server after adding env vars

### MongoDB connection error
- Verify connection string is correct
- Whitelist your IP in MongoDB Atlas (Network Access)
- Check username and password in connection string

### Port 3000 already in use
```bash
pnpm dev --port 3001
```

## Common Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run type checking
pnpm type-check

# Create new admin user
npx ts-node scripts/create-admin.ts
```

## File Structure Quick Reference

```
app/
  (auth)/          ← Sign in/up pages
  (dashboard)/     ← Logged in pages
  api/             ← Backend endpoints
components/        ← React components
lib/               ← Utilities & config
scripts/           ← Admin creation script
```

## Default Routes

- `/` - Redirect to dashboard or sign in
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/dashboard` - Team overview
- `/dashboard/teams/[id]` - Team details
- `/dashboard/projects/[id]` - Project tasks board

## API Quick Reference

```bash
# Create team
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team"}'

# List teams
curl http://localhost:3000/api/teams

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "team_id": "team_id", "color": "#3b82f6"}'

# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Task Title", "project_id": "project_id", "priority": "medium"}'
```

## Environment Variables Reference

| Variable | Description | Source |
|----------|-------------|--------|
| `MONGODB_URI` | MongoDB connection string | MongoDB Atlas |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key | Supabase Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Supabase key | Supabase Settings |

## Database Collections Summary

| Collection | Purpose | Primary Key |
|-----------|---------|------------|
| users | User profiles | id (Supabase UUID) |
| teams | Team definitions | _id (MongoDB) |
| team_members | User-team relationships | team_id + user_id |
| projects | Project definitions | _id (MongoDB) |
| tasks | Task definitions | _id (MongoDB) |
| activities | Audit log | _id (MongoDB) |

## Need Help?

1. Check [SETUP.md](./SETUP.md) for detailed setup
2. Check [README.md](./README.md) for full API docs
3. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment
4. Check error logs: `tail -f .next/logs/server.log`

---

You're all set! Happy building! 🚀
