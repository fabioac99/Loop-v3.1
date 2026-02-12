#!/bin/bash
set -e

echo "🔧 LOOP Platform Setup"
echo "======================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install it first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose is required."; exit 1; }

echo ""
echo "1. Starting database services..."
docker compose up -d postgres redis
echo "   Waiting for PostgreSQL to be ready..."
sleep 5

echo ""
echo "2. Installing backend dependencies..."
cd backend
npm ci
npx prisma generate

echo ""
echo "3. Running database migrations..."
npx prisma migrate dev --name init --skip-seed 2>/dev/null || npx prisma db push
echo ""
echo "4. Seeding database..."
npx ts-node prisma/seed.ts

echo ""
echo "5. Installing frontend dependencies..."
cd ../frontend
npm ci

echo ""
echo "============================================"
echo "✅ LOOP Platform setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Or with Docker:"
echo "  docker compose up --build"
echo ""
echo "Default admin login:"
echo "  Email:    admin@loop.local"
echo "  Password: Admin123!"
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:4000/api"
echo "  API Docs:  http://localhost:4000/api/docs"
echo "============================================"
