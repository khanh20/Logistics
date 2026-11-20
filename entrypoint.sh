#!/bin/bash
set -e

# Đọc cổng Render cấp (mặc định là 10000 nếu chưa có)
export PORT=${PORT:-10000}

# Sinh file cấu hình nginx hoàn chỉnh từ template
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[INIT] Khoi dong cac service .NET..."

echo "[INIT] 1. Starting LG.Authentication.API (port 5001)..."
ASPNETCORE_URLS=http://127.0.0.1:5001 dotnet /app/auth/LG.Authentication.API.dll &

echo "[INIT] 2. Starting LG.Core.API (port 5002)..."
ASPNETCORE_URLS=http://127.0.0.1:5002 dotnet /app/core/LG.Core.API.dll &

echo "[INIT] 3. Starting LG.Module1.API (port 5003)..."
ASPNETCORE_URLS=http://127.0.0.1:5003 dotnet /app/module1/LG.Module1.API.dll &

echo "[INIT] 4. Starting LG.Module2.API (port 5004)..."
ASPNETCORE_URLS=http://127.0.0.1:5004 dotnet /app/module2/LG.Module2.API.dll &

echo "[INIT] 5. Starting LG.PlatformOrder.API (port 5005)..."
ASPNETCORE_URLS=http://127.0.0.1:5005 dotnet /app/platform_order/LG.PlatformOrder.API.dll &

echo "[INIT] Khoi dong Nginx Gateway tren cong $PORT..."
nginx -g "daemon off;"
