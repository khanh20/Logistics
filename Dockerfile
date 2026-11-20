FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy toàn bộ mã nguồn BE
COPY BE/Logistics/ ./BE/Logistics/

# Publish cả 5 services ra các thư mục riêng
RUN dotnet publish "BE/Logistics/Services/Authentication/LG.Authentication.API/LG.Authentication.API.csproj" -c Release -o /app/publish/auth
RUN dotnet publish "BE/Logistics/Services/Core/LG.Core.API/LG.Core.API.csproj" -c Release -o /app/publish/core
RUN dotnet publish "BE/Logistics/Services/Module1/LG.Module1.API/LG.Module1.API.csproj" -c Release -o /app/publish/module1
RUN dotnet publish "BE/Logistics/Services/Module2/LG.Module2.API/LG.Module2.API.csproj" -c Release -o /app/publish/module2
RUN dotnet publish "BE/Logistics/Services/PlatformOrder/LG.PlatformOrder.API/LG.PlatformOrder.API.csproj" -c Release -o /app/publish/platform_order

# ── Runtime image ──
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Cài đặt Nginx & gettext-base để cấu hình cổng Render
RUN apt-get update && apt-get install -y nginx gettext-base curl && rm -rf /var/lib/apt/lists/*

# Copy binaries đã build
COPY --from=build /app/publish/auth ./auth
COPY --from=build /app/publish/core ./core
COPY --from=build /app/publish/module1 ./module1
COPY --from=build /app/publish/module2 ./module2
COPY --from=build /app/publish/platform_order ./platform_order

# Copy cấu hình Nginx và entrypoint
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh ./entrypoint.sh
RUN tr -d '\r' < ./entrypoint.sh > ./entrypoint_unix.sh && mv ./entrypoint_unix.sh ./entrypoint.sh && chmod +x ./entrypoint.sh

# Cấu hình tối ưu RAM cho gói Render Free (512MB RAM)
ENV DOTNET_gcServer=0 \
    DOTNET_GCHeapHardLimit=80000000 \
    DOTNET_EnableWriteXorExecute=0 \
    CORE__BASEURL=http://127.0.0.1:5002 \
    AUTH__BASEURL=http://127.0.0.1:5001 \
    ApiUris__Module1=http://127.0.0.1:5003 \
    ApiUris__Auth=http://127.0.0.1:5001 \
    ASPNETCORE_ENVIRONMENT=Production \
    PORT=10000

EXPOSE 10000

ENTRYPOINT ["./entrypoint.sh"]
