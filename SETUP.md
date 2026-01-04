# Simple Media - Development Setup

## Prerequisites

1. **Install Docker Desktop for Windows**
   - Download from: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
   - Install and restart your computer
   - Make sure Docker Desktop is running

2. **Install Node.js** (for local development)
   - Download from: https://nodejs.org/
   - Choose LTS version

## Quick Start

### Option 1: Docker Development (Recommended)
```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build

# Stop environment
docker compose -f docker-compose.dev.yml down
```

### Option 2: Local Development
```bash
# Install dependencies for frontend
cd apps/frontend
npm install

# Install dependencies for backend  
cd ../backend
npm install

# Start backend (in one terminal)
npm run dev

# Start frontend (in another terminal)
cd ../frontend  
npm run dev
```

## Access Points

- **Frontend**: http://localhost:8100
- **Backend API**: http://localhost:8101
- **Health Check**: http://localhost:8101/api/health

## Project Structure

```
simple-media/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite + Tailwind
│   └── backend/           # Node.js + TypeScript + Fastify
├── packages/
│   └── types/             # Shared TypeScript types
├── docker-compose.yml     # Production setup
├── docker-compose.dev.yml # Development with hot reload
└── data/                  # SQLite database (created on first run)
```

## Development Workflow

1. Make changes to frontend/backend code
2. Changes auto-reload in development mode
3. Shared types in `packages/types` keep frontend/backend in sync
4. SQLite database persists in `./data/` folder

## What's Ready

✅ Frontend: React app with Tailwind CSS  
✅ Backend: Fastify API with CORS enabled  
✅ Types: Shared TypeScript definitions  
✅ Docker: Development and production configurations  
✅ Hot Reload: Code changes update automatically  

## Next Steps

After Docker is installed and running:

1. Run `docker compose -f docker-compose.dev.yml up --build`
2. Visit http://localhost:3000 to see the app
3. Check http://localhost:3001/api/health for backend status
4. Start building book management features