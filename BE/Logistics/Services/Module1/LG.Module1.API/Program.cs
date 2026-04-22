using System.Text;
using System.Text.Json.Serialization;
using LG.Module1.API.Middleware;
using LG.Module1.Infrastructure;
using LG.Module1.Infrastructure.Data;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CREATE BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var builder = WebApplication.CreateBuilder(args);

// ── Load .env ─────────────────────────────────────────────────────────────────
var envFile = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFile)) DotNetEnv.Env.Load(envFile);
builder.Configuration.AddEnvironmentVariables();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CONFIGURE SERVICES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Module 1 (DB / Repos / App Services) ─────────────────────────────────────
builder.Services.AddModule1(builder.Configuration,
    migrationsAssembly: "LG.Module1.Infrastructure");

builder.Services.AddHttpContextAccessor();

// ── Controllers + JSON ───────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();

// ── JWT (shared secret với Auth service) ─────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is required.");
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
            ValidateIssuer = false,   // share secret với Auth — skip issuer
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = "email",
        };

        opt.Events = new JwtBearerEvents
        {
            // Đọc JWT từ cookie nếu FE không gửi Authorization header
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

            OnAuthenticationFailed = ctx =>
            {
                if (ctx.Exception is SecurityTokenExpiredException)
                    ctx.Response.Headers["x-token-expired"] = "true";
                return Task.CompletedTask;
            },

            // Trả JSON 401 thay vì redirect
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

            // Trả JSON 403 thay vì redirect
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    """{"success":false,"message":"Access denied. Insufficient permissions.","errorCode":"FORBIDDEN"}""");
            },
        };
    });

// ── Authorization — permission-based policies ─────────────────────────────────
builder.Services.AddAuthorization(opt =>
{
    var permCodes = typeof(Permissions)
        .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
        .Where(f => f.FieldType == typeof(string))
        .Select(f => (string)f.GetValue(null)!)
        .Where(v => v.Contains('.'));

    foreach (var code in permCodes)
        opt.AddPolicy(code, policy => policy.RequireClaim("permission", code));
});

// ── CORS ──────────────────────────────────────────────────────────────────────
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
              ?? ["http://localhost:3000", "http://localhost:5173"];

builder.Services.AddCors(opt => opt.AddPolicy("FE", p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// ── Swagger ────────────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MuaHo — Module 1: Order & Catalog API",
        Version = "v1",
        Description = "Product catalog, platform integration, cart, order cho hệ thống Mua Hộ",
    });
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Description = "Nhập: Bearer {access_token}",
    });
    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
    {{
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        },
        Array.Empty<string>()
    }});
});

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks().AddDbContextCheck<Module1DbContext>("postgres-mod1");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. BUILD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var app = builder.Build();

// ── Auto migrate ───────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Module1DbContext>();
    await db.Database.MigrateAsync();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MIDDLEWARE PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ForwardedHeaders — bắt buộc cho Koyeb / Railway / Docker / Nginx proxy
var fwdOpts = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
};
fwdOpts.KnownNetworks.Clear();
fwdOpts.KnownProxies.Clear();
app.UseForwardedHeaders(fwdOpts);

// Global exception handler — đứng đầu pipeline
app.UseMiddleware<Module1ExceptionMiddleware>();

// Swagger — luôn bật (không guard bằng IsDevelopment để staging cũng xem được)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MuaHo Module 1 API v1");
    c.RoutePrefix = "swagger";
});

// Health endpoints — không cần auth
app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", service = "mod1", time = DateTime.UtcNow }));
app.MapHealthChecks("/health");

// Routing → CORS → Auth → Controllers
app.UseRouting();
app.UseCors("FE");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();