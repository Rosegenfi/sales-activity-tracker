# Sales Tracker - Team Performance Management Platform

A comprehensive full-stack web application designed for Account Executives (AEs) to track their sales activities, set goals, and monitor performance. The platform also provides management with insights into team performance and facilitates team communication.

## 🌟 Features

### Core Functionality
- **Weekly Commitments & Results**: AEs log weekly targets and actual results for calls, emails, and meetings
- **Automatic Daily Averages**: System calculates daily targets based on weekly commitments
- **Monday Focus**: Prompts for weekly planning and previous week results entry

### Performance Tracking
- **Visual Analytics**: Charts and graphs showing week-on-week progression
- **Achievement Tracking**: Percentage-based goal achievement visualization
- **Individual & Team Metrics**: Comprehensive performance data at all levels

### Team Features
- **Centralized Leaderboard**: Real-time rankings with top performers highlighted
- **Individual Profile Pages**: Detailed performance history for each AE
- **Daily Goal Setting**: AEs can set and track daily targets

### Team Communication
- **Team Updates Hub**: Centralized repository for:
  - Presentations and Guides
  - Ticket Links
  - Upcoming Events
  - QC Updates

### User Management
- **Role-Based Access**: Separate permissions for AEs and Administrators
- **User Administration**: Create, activate/deactivate users (Admin only)
- **Secure Authentication**: JWT-based authentication system

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Router** for navigation
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** for password hashing

## 📋 Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Git

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sales-tracker
   ```

2. **Run the setup script**
   ```bash
   ./setup.sh
   ```
   This script will:
   - Start PostgreSQL database using Docker
   - Install all dependencies
   - Run database migrations
   - Create default admin user

3. **Start the application**
   
   In separate terminals:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   ```
   
   ```bash
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

4. **Access the application**
   - Open http://localhost:3000 in your browser
   - Login with default admin credentials:
     - Email: `admin@salestracker.com`
     - Password: `admin123`

## 📂 Project Structure

```
sales-tracker/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth & other middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml      # PostgreSQL setup
└── setup.sh               # Setup script
```

## 🔑 Environment Variables

Backend environment variables (`.env`):
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_tracker
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

## 📱 Application Pages

### For All Users
- **Dashboard**: Overview with Monday prompts and quick stats
- **Leaderboard**: Team rankings and top performers
- **Weekly Commits**: Historical performance data with charts
- **Daily Goals**: Set and track daily targets
- **Team Updates**: View team announcements and resources
- **User Profile**: Individual performance metrics

### Admin Only
- **User Management**: Create and manage user accounts

## 🔐 User Roles

### Account Executive (AE)
- View and edit own commitments, results, and goals
- View leaderboard and all team members
- Access team updates
- View own profile and performance data

### Administrator
- All AE permissions
- Create new users
- Activate/deactivate users
- Create and manage team updates
- View all user profiles and data

## 📊 Database Schema

### Main Tables
- `users`: User accounts and authentication
- `weekly_commitments`: Weekly targets for calls, emails, meetings
- `weekly_results`: Actual weekly performance
- `daily_goals`: Daily targets and achievement status
- `team_updates`: Team announcements and resources

## 🧪 Development

### Backend Development
```bash
cd backend
npm run dev     # Start development server
npm run build   # Build for production
npm start       # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
```

### Database Management
```bash
cd backend
npm run migrate # Run database migrations
```

## 🚢 Production Deployment

1. Set secure environment variables
2. Build both frontend and backend
3. Use a process manager (PM2, systemd) for the backend
4. Serve frontend build with nginx or similar
5. Use a production PostgreSQL instance

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.