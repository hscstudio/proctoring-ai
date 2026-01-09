# Proctoring AI - Quick Start Guide

## 🚀 One-Command Startup

Run all services with a single command:

```bash
# Windows
start.bat

# Or using Docker Compose directly
docker-compose up --build
```

This will start:
- **LiveKit Server** on port 7880 (WebRTC media server)
- **Backend API** on port 5050 (Token generation)
- **React Frontend** on port 5173 (Main application)

## 📋 Prerequisites

- Docker Desktop installed and running
- Ports 5050, 5173, 7880, 7881, 7882 available

## 🛑 Stopping Services

```bash
# Windows
stop.bat

# Or using Docker Compose directly
docker-compose down
```

## 🔧 Configuration

Environment variables are set in `.env` files:
- Root `.env` - General configuration
- `livekit-server/.env` - Backend server configuration

Default credentials:
- API Key: `devkey`
- API Secret: `secret`

## 🌐 Access Points

- Frontend: http://localhost:5173
- Backend API: http://localhost:5050
- LiveKit Server: ws://localhost:7880

## 📝 Development

The setup includes hot-reload for development:
- Frontend changes are reflected immediately
- Backend requires container restart for code changes

To restart a specific service:
```bash
docker-compose restart frontend
docker-compose restart backend
```

## 🐛 Troubleshooting

If services fail to start:

1. Check if ports are available:
   ```bash
   netstat -ano | findstr "5050 5173 7880"
   ```

2. View service logs:
   ```bash
   docker-compose logs frontend
   docker-compose logs backend
   docker-compose logs livekit
   ```

3. Rebuild containers:
   ```bash
   docker-compose down
   docker-compose up --build --force-recreate
   ```

## 📦 What Changed?

Previously you needed to run 3 commands separately:
1. `docker-compose up` in `livekit-server/`
2. `node index.js` in `livekit-server/`
3. `npm run dev` in root directory

Now just run: `start.bat` ✨
