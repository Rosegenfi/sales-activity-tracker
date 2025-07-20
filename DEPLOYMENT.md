# Deploying Sales Tracker to Railway

This guide will help you deploy the Sales Tracker application to Railway.

## Prerequisites

1. A [Railway account](https://railway.app)
2. Railway CLI installed (optional but recommended)
   ```bash
   npm install -g @railway/cli
   ```
3. A GitHub account (for automatic deployments)

## Deployment Steps

### Method 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Create a new Railway project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select your repository

3. **Configure Services**
   
   Railway will detect this as a monorepo. You'll need to create three services:

   **a. PostgreSQL Database:**
   - Click "New Service" → "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL instance

   **b. Backend Service:**
   - Click "New Service" → "GitHub Repo"
   - Set the root directory to `/backend`
   - Railway will automatically detect it as a Node.js app

   **c. Frontend Service:**
   - Click "New Service" → "GitHub Repo"
   - Set the root directory to `/frontend`
   - Railway will automatically detect it as a Node.js app

4. **Configure Environment Variables**

   **For the Backend Service:**
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRE=7d
   FRONTEND_URL=https://your-frontend-domain.railway.app
   ```

   **For the Frontend Service:**
   ```
   VITE_API_URL=https://your-backend-domain.railway.app/api
   ```

5. **Configure Service Settings**

   **Backend Service:**
   - Go to Settings → Domains
   - Generate a domain (e.g., `salestracker-backend.railway.app`)

   **Frontend Service:**
   - Go to Settings → Domains
   - Generate a domain (e.g., `salestracker.railway.app`)

### Method 2: Deploy via Railway CLI

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Create a new project**
   ```bash
   railway init
   ```

3. **Add PostgreSQL**
   ```bash
   railway add postgresql
   ```

4. **Deploy Backend**
   ```bash
   cd backend
   railway up
   ```

5. **Deploy Frontend**
   ```bash
   cd ../frontend
   railway up
   ```

### Post-Deployment Steps

1. **Update CORS settings**
   - Update the backend's `FRONTEND_URL` environment variable with your frontend's Railway domain
   - Update the frontend's `VITE_API_URL` with your backend's Railway domain

2. **Run Database Migrations**
   - In the Railway dashboard, go to your backend service
   - Click on the "Settings" tab
   - Under "Deploy" section, add a release command:
     ```
     npm run migrate
     ```
   - Or run it manually via Railway CLI:
     ```bash
     railway run npm run migrate
     ```

3. **Verify Deployment**
   - Visit your frontend URL
   - Login with the default admin credentials:
     - Email: `admin@salestracker.com`
     - Password: `admin123`
   - **Important:** Change the admin password immediately after first login

## Environment Variables Reference

### Backend Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Railway |
| `JWT_SECRET` | Secret key for JWT tokens | Random secure string |
| `JWT_EXPIRE` | JWT token expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.railway.app` |

### Frontend Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-api.railway.app/api` |

## Monitoring and Logs

- View logs in Railway dashboard under each service
- Set up health checks for the backend at `/api/health`
- Monitor PostgreSQL metrics in the database service dashboard

## Troubleshooting

### Database Connection Issues
- Ensure the `DATABASE_URL` is properly set in the backend service
- Check if PostgreSQL service is running

### CORS Errors
- Verify `FRONTEND_URL` in backend matches your frontend domain
- Check that the backend URL in frontend includes `/api`

### Build Failures
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation succeeds locally

## Production Considerations

1. **Security**
   - Change default admin password
   - Use strong JWT secret
   - Enable HTTPS (Railway provides this automatically)

2. **Performance**
   - Consider adding Redis for session management
   - Enable gzip compression
   - Use CDN for static assets

3. **Monitoring**
   - Set up error tracking (e.g., Sentry)
   - Configure uptime monitoring
   - Set up database backups

## Updating the Application

Railway automatically deploys when you push to your connected GitHub branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

For manual deployments via CLI:
```bash
railway up
```