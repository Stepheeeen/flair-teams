# Flair Teams MVP

A modern, collaborative project management platform built with Next.js 16, React 19, MongoDB, and Supabase. Flair Teams enables teams to manage projects, assign tasks, track progress, and collaborate in real-time.

## Features

### Authentication & Teams
- User authentication with Supabase
- Team creation and management
- Role-based access control (Admin, Manager, Member)
- Team member invitations
- Secure session management

### Projects & Tasks
- Create and organize projects
- Task creation with priorities (Low, Medium, High)
- Task status tracking (To Do, In Progress, Done)
- Task assignment to team members
- Activity logging for all team actions

### Dashboard
- Unified dashboard for team overview
- Quick access to teams and projects
- Team member management
- Sidebar navigation

### Real-time Collaboration
- Real-time task updates
- Activity feed (foundation for real-time collaboration)
- Team activity logging

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React features
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components

### Backend
- **Next.js API Routes** - Serverless backend
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Zod** - Schema validation

### Authentication & Services
- **Supabase** - Authentication and user management

## Project Structure

```
├── app/
│   ├── (auth)/               # Authentication pages
│   │   ├── signin/
│   │   └── signup/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Team overview
│   │   ├── teams/            # Team details
│   │   └── projects/         # Project details
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── teams/            # Team management
│   │   ├── projects/         # Project management
│   │   └── tasks/            # Task management
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Home page (redirects to dashboard)
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── dashboard/            # Dashboard-specific components
├── lib/
│   ├── db.ts                 # MongoDB connection
│   ├── auth.ts               # Supabase auth utilities
│   ├── auth-context.tsx      # React context for auth
│   ├── api-utils.ts          # Shared API utilities
│   ├── models/               # Mongoose schemas
│   └── schemas.ts            # Zod validation schemas
├── scripts/
│   └── create-admin.ts       # Admin user creation script
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── SETUP.md                  # Local development setup
├── DEPLOYMENT.md             # Production deployment guide
└── README.md                 # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (free tier at mongodb.com)
- Supabase account (free tier at supabase.com)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd flair-teams
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Create admin user**
   ```bash
   npx ts-node scripts/create-admin.ts
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user profile

### Team Endpoints
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/[teamId]` - Get team details
- `PUT /api/teams/[teamId]` - Update team
- `DELETE /api/teams/[teamId]` - Delete team
- `GET /api/teams/[teamId]/members` - List team members
- `POST /api/teams/[teamId]/members` - Invite member
- `PUT /api/teams/[teamId]/members/[userId]` - Update member role
- `DELETE /api/teams/[teamId]/members/[userId]` - Remove member
- `GET /api/teams/[teamId]/activity` - Get team activity log

### Project Endpoints
- `GET /api/projects` - List projects (with optional teamId filter)
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project details
- `PUT /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project

### Task Endpoints
- `GET /api/tasks` - List tasks (requires projectId query param)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[taskId]` - Get task details
- `PUT /api/tasks/[taskId]` - Update task
- `DELETE /api/tasks/[taskId]` - Delete task

## Database Schema

### Collections

**users**
- Synced from Supabase Auth
- Fields: id, email, name, avatar_url, role, timestamps

**teams**
- Fields: name, description, owner_id, avatar_url, is_active, timestamps

**team_members**
- Junction table linking users to teams
- Fields: team_id, user_id, role, invited_by, timestamps

**projects**
- Fields: name, description, team_id, created_by, status, color, timestamps

**tasks**
- Fields: title, description, project_id, assigned_to, created_by, status, priority, due_date, order, timestamps

**activities**
- Fields: team_id, user_id, action, resource_type, resource_id, details, timestamps

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourname%2Fflair-teams)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Authentication

The app uses Supabase for authentication:
- Users create accounts with email and password
- Sessions are managed via HTTP-only cookies
- All protected routes verify authentication
- Role-based access control for operations

## Database

MongoDB stores application data:
- Connection pooling for performance
- Proper indexing on frequently queried fields
- Activity logging for audit trails
- Automatic timestamps for all documents

## Development Workflow

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run admin creation script
npx ts-node scripts/create-admin.ts

# Type check
pnpm type-check
```

## Code Quality

- **TypeScript** - Full type safety
- **Zod** - Runtime schema validation
- **ESLint** - Code linting (via Next.js)
- **Prettier** - Code formatting

## Security Best Practices

- Secure password hashing (via Supabase)
- HTTP-only cookies for sessions
- Role-based access control for all operations
- Input validation with Zod
- Protected API routes with auth verification
- Environment variables for sensitive data

## Performance

- Server-side rendering with Next.js
- Optimized database queries with indexes
- Component-level code splitting
- Efficient state management with React Context
- Caching strategies for API responses

## Known Limitations & Future Work

### Coming Soon
- Real-time collaboration with Socket.io
- Email notifications for team invitations
- Advanced search and filtering
- Mobile app
- Dark mode
- Team and project settings pages
- Advanced reporting and analytics

### Future Enhancements
- File uploads and attachments
- Comments and discussions on tasks
- Time tracking
- Custom workflows
- API key management
- Webhooks for integrations
- Mobile-first responsive design optimization

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - feel free to use this project as you wish.

## Support

- For setup help, see [SETUP.md](./SETUP.md)
- For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md)
- For bugs or features, create an issue on GitHub

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [MongoDB](https://mongodb.com)
- [Supabase](https://supabase.com)

---

Made with ❤️ for collaborative teams
