using System.Text;
using System.Text.Json.Serialization;
using LG.Authentication.ApplicationServices;
using LG.Authentication.Infrastructure;
using LG.Authentication.Infrastructure.Data;
using LG.Authentication.Infrastructure.Security;
using LG.Authentication.API.Middleware;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// 1. CREATE BUILDER
var builder = WebApplication.CreateBuilder(args);

// ── Load .env (dev local) ─────────────────────────────────────────────────────
var envFile = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFile)) DotNetEnv.Env.Load(envFile);

// Env vars ghi đè appsettings → quan trọng cho Koyeb / Railway / Docker
builder.Configuration.AddEnvironmentVariables();

// 2. CONFIGURE SERVICES
// ── Infrastructure (DB / Repos / Security) ────────────────────────────────────
// Truyền migrations assembly = tên project Infrastructure
builder.Services.AddInfrastructure(builder.Configuration,
    migrationsAssembly: "LG.Authentication.Infrastructure");

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddApplicationServices();
builder.Services.AddHttpContextAccessor();

// ── Controllers + JSON ───────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        // Tránh vòng lặp object khi serialize navigation properties
        opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Giữ tên property dạng camelCase (default của ASP.NET)
        opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is required. Set in appsettings or JWT__SECRETKEY env var.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAud = builder.Configuration["Jwt:Audience"];
var isDev = builder.Environment.IsDevelopment();

builder.Services
    .AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.RequireHttpsMetadata = !isDev;
        opt.SaveToken = true;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = !string.IsNullOrEmpty(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = !string.IsNullOrEmpty(jwtAud),
            ValidAudience = jwtAud,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            // Claim mapping — permission check dùng claim "permission"
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = "email",
        };

        opt.Events = new JwtBearerEvents
        {
            // Đọc JWT từ cookie "muaho.access" nếu FE không gửi Authorization header
            // (hữu ích khi dùng cookie-based auth trong browser)
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                {
                    var fromCookie = ctx.Request.Cookies["muaho.access"];
                    if (!string.IsNullOrEmpty(fromCookie))
                        ctx.Token = fromCookie;
                }
                return Task.CompletedTask;
            },

            // Thêm header báo token hết hạn để FE biết cần refresh
            OnAuthenticationFailed = ctx =>
            {
                if (ctx.Exception is SecurityTokenExpiredException)
                    ctx.Response.Headers["x-token-expired"] = "true";
                return Task.CompletedTask;
            },

            // Trả JSON thay vì redirect khi 401
            OnChallenge = ctx =>
            {
                if (!ctx.Response.HasStarted)
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode = 401;
                    ctx.Response.ContentType = "application/json";
                    return ctx.Response.WriteAsync(
                        """{"success":false,"message":"Unauthorized. Token missing or invalid.","errorCode":"UNAUTHORIZED"}""");
                }
                return Task.CompletedTask;
            },

            // Trả JSON thay vì redirect khi 403
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    """{"success":false,"message":"Access denied. Insufficient permissions.","errorCode":"FORBIDDEN"}""");
            },
        };
    });

// ── Authorization — Policy per permission ─────────────────────────────────────
// Mỗi permission code (VD: "order.create") có một policy riêng
// Controller dùng: [Authorize(Policy = "order.create")]
// hoặc dùng [RequirePermission(Permissions.OrderCreate)] attribute đã có sẵn
builder.Services.AddAuthorization(opt =>
{
    // Lấy toàn bộ permission constants bằng reflection để tự động đăng ký
    var allPermissionCodes = typeof(Permissions)
        .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
        .Where(f => f.FieldType == typeof(string))
        .Select(f => (string)f.GetValue(null)!)
        .Where(v => v.Contains('.'));   // chỉ lấy dạng "module.action"

    foreach (var code in allPermissionCodes)
        opt.AddPolicy(code, policy => policy.RequireClaim("permission", code));
});

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:5173"];

builder.Services.AddCors(opt => opt.AddPolicy("FE", p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MuaHo — Authentication & Shared API",
        Version = "v1",
        Description = "Auth, RBAC, Notification, AuditLog cho hệ thống Mua Hộ",
    });
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Nhập: Bearer {access_token}",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
    });
    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                    { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("postgres");

// 3. BUILD
var app = builder.Build();

// ── Seed database ─────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DataSeeder.SeedAsync(db, hasher, logger);
}

// 4. MIDDLEWARE PIPELINE (thứ tự quan trọng)
// Forwarded Headers — bắt buộc cho Koyeb / Railway / Docker / Nginx proxy
// Đảm bảo X-Forwarded-Proto được đọc đúng để HTTPS redirect hoạt động
var fwdOpts = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
};
// Tin tưởng mọi proxy (cần cho cloud deploy — thắt chặt lại nếu biết IP proxy cụ thể)
fwdOpts.KnownNetworks.Clear();
fwdOpts.KnownProxies.Clear();
app.UseForwardedHeaders(fwdOpts);

// Global exception handler — phải đứng đầu pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MuaHo Auth API v1");
    c.RoutePrefix = "swagger";
});

app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", service = "auth", time = DateTime.UtcNow }));
app.MapHealthChecks("/health");

app.UseRouting();
app.UseCors("FE");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();