# Flair Teams MVP - Deployment Guide

## Deploying to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub repository with the code pushed
- MongoDB Atlas cluster (production)
- Supabase project

### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Connect your GitHub account and select this repository

### Step 2: Add Environment Variables

In Vercel project settings:

1. Go to Settings > Environment Variables
2. Add the following variables:
   ```
   MONGODB_URI=your_production_mongodb_connection_string
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. For each variable, select which environments it applies to (Production, Preview, Development)

### Step 3: Deploy

1. Click "Deploy"
2. Vercel will automatically build and deploy your application
3. Your app will be available at `your-project.vercel.app`

### Step 4: Create Production Admin User

Once deployed:

1. Connect to your production MongoDB cluster
2. Update your `.env.local` with production credentials
3. Run the admin creation script:
   ```bash
   npx ts-node scripts/create-admin.ts
   ```

### Step 5: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow the DNS configuration instructions

## Production Checklist

- [ ] MongoDB Atlas cluster created and secured
- [ ] Supabase project created with auth configured
- [ ] Environment variables set in Vercel
- [ ] Admin user created
- [ ] SSL certificate configured (automatic with Vercel)
- [ ] Backup strategy planned for MongoDB
- [ ] Monitoring and error tracking set up
- [ ] Email service configured (if using notifications)

## Performance Optimization

### Database
- Add MongoDB indexes for frequently queried fields
- Use connection pooling (MongoDB Atlas supports this)
- Archive old activity logs periodically

### Frontend
- Enable Next.js Image Optimization
- Configure cache headers for static assets
- Use Code Splitting for large components

### API Routes
- Implement rate limiting for public endpoints
- Add caching headers for read-only endpoints
- Monitor API response times

## Monitoring & Logging

### Sentry Integration (Optional)

1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create a new project
3. Add to your app:
   ```bash
   npm install @sentry/nextjs
   ```

### Database Monitoring

MongoDB Atlas provides built-in monitoring:
- Monitor performance metrics
- Set up alerts for high resource usage
- Review slow query logs

## Scaling Considerations

### When to Scale

- User base exceeds 10,000+ active users
- API response times degrade
- Database query performance decreases

### Scaling Strategies

1. **Database**: Consider MongoDB sharding for large datasets
2. **Backend**: Implement caching layer (Redis)
3. **Frontend**: Use CDN for static assets
4. **Real-time**: Scale Socket.io with horizontal scaling

## Backup & Recovery

### MongoDB Atlas Backup

1. Enable automatic daily backups (free with Atlas)
2. Set backup retention policy (default: 7 days)
3. Test restore procedures regularly

### Code Backup

- Use GitHub for code backups
- Tag releases for production versions
- Maintain CHANGELOG for version history

## Troubleshooting Deployment Issues

### Build Failures
- Check build logs in Vercel console
- Verify all environment variables are set
- Ensure dependencies are compatible

### Runtime Errors
- Check Vercel Function logs
- Verify API endpoints are accessible
- Test database connections

### Performance Issues
- Check Vercel Analytics
- Review MongoDB slow query logs
- Monitor API response times

## Rollback Procedure

If you need to rollback to a previous version:

1. In Vercel, go to Deployments
2. Find the previous working deployment
3. Click "Redeploy"
4. Verify the rollback was successful

## Zero-Downtime Deployments

Vercel automatically handles zero-downtime deployments:
- New code is deployed to all edge locations
- Old deployments remain active until new ones are healthy
- Traffic is gradually shifted to new deployment

## Support & Monitoring

### Error Tracking
- Use Vercel's built-in error reporting
- Integrate with Sentry for detailed error tracking
- Set up alerts for critical errors

### Uptime Monitoring
- Use UptimeRobot or similar service
- Configure alerts for downtime
- Monitor SLA compliance

### Analytics
- Use Vercel Analytics for page performance
- Monitor API endpoint usage
- Track error rates

## Next Steps After Deployment

1. Set up automated backups
2. Configure monitoring and alerting
3. Plan for scaling as user base grows
4. Implement automated testing and CI/CD
5. Document runbooks for common operations
