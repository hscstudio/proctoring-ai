@echo off
echo ========================================
echo Starting Proctoring AI Application
echo ========================================
echo.
echo This will start:
echo  - LiveKit Server (Port 7880)
echo  - Backend API (Port 5050)
echo  - React Frontend (Port 5173)
echo.
echo Press Ctrl+C to stop all services
echo ========================================
echo.

docker-compose up --build
