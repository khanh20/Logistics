#!/bin/bash
set -e

# Đọc cổng Render cấp (mặc định là 10000)
export PORT=${PORT:-10000}

# Sinh file cấu hình nginx hoàn chỉnh từ template
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[INIT] Khoi dong cac service .NET trong thu muc rieng de nhan appsettings.json..."

echo "[INIT] 1. Starting LG.Authentication.API (port 5001)..."
(cd /app/auth && exec dotnet LG.Authentication.API.dll --urls "http://127.0.0.1:5001") &
sleep 2

echo "[INIT] 2. Starting LG.Core.API (port 5002)..."
(cd /app/core && exec dotnet LG.Core.API.dll --urls "http://127.0.0.1:5002") &
sleep 2

echo "[INIT] 3. Starting LG.Module1.API (port 5003)..."
(cd /app/module1 && exec dotnet LG.Module1.API.dll --urls "http://127.0.0.1:5003") &
sleep 2

echo "[INIT] 4. Starting LG.Module2.API (port 5004)..."
(cd /app/module2 && exec dotnet LG.Module2.API.dll --urls "http://127.0.0.1:5004") &
sleep 2

echo "[INIT] Khoi dong Nginx Gateway tren cong $PORT..."
nginx -g "daemon off;"
