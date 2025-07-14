#!/bin/bash

echo "🚀 Sales Tracker Setup Script"
echo "============================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

echo "✅ All prerequisites installed"
echo ""

# Start PostgreSQL with Docker Compose
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Create backend .env file
echo "📝 Creating backend configuration..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    # Update the database password to match docker-compose
    sed -i.bak 's/DB_PASSWORD=your_password_here/DB_PASSWORD=postgres123/g' backend/.env
    # Update JWT secret
    sed -i.bak 's/JWT_SECRET=your_jwt_secret_here_change_in_production/JWT_SECRET=sales_tracker_jwt_secret_2024/g' backend/.env
    rm backend/.env.bak
    echo "✅ Backend .env file created"
else
    echo "⚠️  Backend .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Run database migrations
echo "🗃️  Running database migrations..."
npm run migrate

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Default admin credentials:"
echo "Email: admin@salestracker.com"
echo "Password: admin123"
echo ""
echo "Access the application at: http://localhost:3000"