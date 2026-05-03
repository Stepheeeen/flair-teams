# Flair Teams MVP - Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB account (free tier at mongodb.com)
- Supabase account (free tier at supabase.com)

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd flair-teams
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Set Up MongoDB

1. Create a MongoDB account at [mongodb.com](https://mongodb.com)
2. Create a new cluster (free tier is available)
3. Create a database user with a strong password
4. Get your connection string from the "Connect" button
5. Copy the connection string to your `.env.local` file:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flair-teams?retryWrites=true&w=majority
```

## 4. Set Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

4. Add these to your `.env.local` file

## 5. Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 6. Create Admin User

Before deploying or running the application, create an admin user:

```bash
npx ts-node scripts/create-admin.ts
```

Follow the prompts to create your admin account.

## 7. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 8. Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

- `app/` - Next.js App Router pages and routes
- `app/(auth)/` - Authentication pages (sign in, sign up)
- `app/(dashboard)/` - Protected dashboard pages
- `app/api/` - API routes for backend operations
- `components/` - Reusable React components
- `lib/` - Utility functions and configurations
  - `db.ts` - MongoDB connection
  - `auth.ts` - Supabase authentication utilities
  - `models/` - Mongoose schemas
  - `schemas.ts` - Zod validation schemas
- `scripts/` - Utility scripts (e.g., admin creation)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create team
- `GET /api/teams/[teamId]` - Get team details
- `PUT /api/teams/[teamId]` - Update team
- `DELETE /api/teams/[teamId]` - Delete team
- `GET /api/teams/[teamId]/members` - List team members
- `POST /api/teams/[teamId]/members` - Invite member
- `PUT /api/teams/[teamId]/members/[userId]` - Update member role
- `DELETE /api/teams/[teamId]/members/[userId]` - Remove member

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project details
- `PUT /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/[taskId]` - Get task details
- `PUT /api/tasks/[taskId]` - Update task
- `DELETE /api/tasks/[taskId]` - Delete task

### Activity
- `GET /api/teams/[teamId]/activity` - Get team activity log

## Features

### Phase 1: Core Infrastructure ✓
- MongoDB database setup
- Supabase authentication integration
- Database models and schemas
- Validation with Zod

### Phase 2: Authentication & Teams ✓
- User authentication (sign up, sign in, sign out)
- Protected routes and middleware
- Team creation and management
- Team member invitations and role management
- Team access control

### Phase 3: Projects & Tasks ✓
- Project creation and management
- Task creation and status tracking
- Task assignment and prioritization
- Activity logging

### Phase 4: Real-time Collaboration (Coming Soon)
- Socket.io integration for real-time updates
- Live task status updates
- Real-time notifications
- Activity feed updates

### Phase 5: Polish & Deploy (Coming Soon)
- Email notifications
- Advanced search and filtering
- Mobile responsiveness
- Performance optimization
- Deployment to Vercel

## Development Notes

- All database operations use MongoDB
- Authentication is handled by Supabase
- Role-based access control (Admin, Manager, Member)
- API routes include proper error handling and validation
- Activity logging for team actions

## Troubleshooting

### Build Error: Missing Supabase configuration
Make sure all environment variables are set in `.env.local` and restart the dev server.

### MongoDB Connection Error
Check that your MongoDB connection string is correct and your IP address is whitelisted in MongoDB Atlas.

### Supabase Authentication Issues
Verify that your Supabase keys are correct and the project is active.

## Next Steps

1. Implement real-time collaboration with Socket.io
2. Add email notifications for invitations
3. Add advanced search and filtering
4. Implement activity feed UI
5. Add team and project settings pages
6. Deploy to Vercel

## Support

For issues or questions, create an issue in the repository or contact the development team.
