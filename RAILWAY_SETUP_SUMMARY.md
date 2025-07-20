# Railway Deployment Quick Reference

## What We've Set Up

### 1. **Railway Configuration Files**
- `railway.json` - Root configuration
- `backend/railway.json` - Backend service configuration
- `frontend/railway.json` - Frontend service configuration

### 2. **Production-Ready Frontend**
- Added `frontend/server.js` - Express server to serve built files
- Updated `frontend/package.json` with `start` script
- Created `frontend/src/config/api.ts` for environment-based API configuration

### 3. **Database Configuration**
- Updated `backend/src/config/database.ts` to support Railway's DATABASE_URL
- Added SSL support for production PostgreSQL connections

### 4. **Environment Variables Setup**
The app is configured to use these environment variables:

**Backend (Required):**
- `DATABASE_URL` - Automatically provided by Railway when you add PostgreSQL
- `JWT_SECRET` - You must set this to a secure random string
- `FRONTEND_URL` - Set to your frontend Railway domain

**Frontend (Required):**
- `VITE_API_URL` - Set to your backend Railway domain + `/api`

## Quick Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **In Railway Dashboard:**
   - Create new project from GitHub repo
   - Add PostgreSQL database
   - Add backend service (set root directory to `/backend`)
   - Add frontend service (set root directory to `/frontend`)
   - Set environment variables for each service
   - Generate domains for both services

3. **First-Time Setup:**
   - The database migrations will run automatically on first deploy
   - Default admin user will be created (admin@salestracker.com / admin123)

## Testing Locally with Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend (in another terminal)
cd frontend
npm run build
npm start
```

## Important Notes

- Always change the default admin password after deployment
- Use a strong, unique JWT_SECRET in production
- Railway provides automatic HTTPS/SSL
- Database backups are recommended for production use

## Troubleshooting

If you encounter issues:
1. Check Railway logs for each service
2. Verify all environment variables are set correctly
3. Ensure database migrations ran successfully
4. Check CORS settings match your domains