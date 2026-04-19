#!/bin/bash

echo "🚀 Activity Tracker - Setup Script"
echo "=================================="
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    exit 1
fi

echo "✅ MySQL found"
echo ""

# Prompt for MySQL credentials
read -p "Enter MySQL username (default: root): " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Enter MySQL password: " DB_PASSWORD
echo ""
echo ""

# Test MySQL connection
echo "Testing MySQL connection..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to MySQL. Please check your credentials."
    exit 1
fi

echo "✅ MySQL connection successful"
echo ""

# Create database and tables
echo "Creating database and tables..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" < backend/database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database created successfully"
else
    echo "❌ Failed to create database"
    exit 1
fi

echo ""

# Create .env file for backend
echo "Creating backend .env file..."
cat > backend/.env << EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=activity_tracker
PORT=5000
EOF

echo "✅ Backend .env file created"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

cd ..
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..
echo ""

echo "=================================="
echo "✅ Setup completed successfully!"
echo "=================================="
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm start"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open your browser to the URL shown in Terminal 2"
echo ""
