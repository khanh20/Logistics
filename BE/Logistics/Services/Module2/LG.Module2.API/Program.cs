using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using LG.Module2.API.Middleware;
using LG.Module2.ApplicationServices;
using LG.Module2.Infrastructure.Data;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var builder = WebApplication.CreateBuilder(args);

var envFile = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFile)) DotNetEnv.Env.Load(envFile);
builder.Configuration.AddEnvironmentVariables();

// ── Module 2 (DB / Repos / App Services) ─────────────────────────────────────
builder.Services.AddModule2(builder.Configuration,
    migrationsAssembly: "LG.Module2.Infrastructure");

builder.Services.AddHttpContextAccessor();

// ── Controllers + JSON ────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.ReferenceHandler      = ReferenceHandler.IgnoreCycles;
        opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.Configure<ApiBehaviorOptions>(opt =>
{
    opt.InvalidModelStateResponseFactory = ctx =>
    {
        var errors = ctx.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(e => e.Key, e => e.Value!.Errors.Select(x => x.ErrorMessage).ToArray());
        var firstMsg = errors.SelectMany(kv => kv.Value).FirstOrDefault() ?? "Dữ liệu không hợp lệ.";
        return new BadRequestObjectResult(new { success = false, message = firstMsg, errorCode = "VALIDATION_ERROR", errors });
    };
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;
    opt.AddFixedWindowLimiter("warehouse-scan", o => { o.PermitLimit = 120; o.Window = TimeSpan.FromMinutes(1); o.QueueLimit = 0; });
    opt.AddFixedWindowLimiter("auth-sensitive", o => { o.PermitLimit = 20;  o.Window = TimeSpan.FromMinutes(1); o.QueueLimit = 0; });
    opt.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1) }));
    opt.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.StatusCode  = 429;
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsync(
            """{"success":false,"message":"Quá nhiều request. Vui lòng thử lại sau.","errorCode":"RATE_LIMITED"}""", ct);
    };
});

builder.Services.AddEndpointsApiExplorer();

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is required.");
var isDev = builder.Environment.IsDevelopment();

builder.Services
    .AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.RequireHttpsMetadata = !isDev;
        opt.SaveToken = true;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer          = false,
            ValidateAudience        = false,
            ValidateLifetime        = true,
            ClockSkew               = TimeSpan.FromSeconds(30),
            RoleClaimType           = System.Security.Claims.ClaimTypes.Role,
            NameClaimType           = "email",
        };
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                {
                    var fromCookie = ctx.Request.Cookies["muaho.access"];
                    if (!string.IsNullOrEmpty(fromCookie)) ctx.Token = fromCookie;
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = ctx =>
            {
                if (ctx.Exception is SecurityTokenExpiredException)
                    ctx.Response.Headers["x-token-expired"] = "true";
                return Task.CompletedTask;
            },
            OnChallenge = ctx =>
            {
                if (!ctx.Response.HasStarted)
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode  = 401;
                    ctx.Response.ContentType = "application/json";
                    return ctx.Response.WriteAsync(
                        """{"success":false,"message":"Unauthorized. Token missing or invalid.","errorCode":"UNAUTHORIZED"}""");
                }
                return Task.CompletedTask;
            },
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode  = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    """{"success":false,"message":"Access denied. Insufficient permissions.","errorCode":"FORBIDDEN"}""");
            },
        };
    });

// ── Authorization ─────────────────────────────────────────────────────────────
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
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
     .SetPreflightMaxAge(TimeSpan.FromMinutes(10))
     .WithExposedHeaders("x-token-expired", "Retry-After")));

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "MuaHo — Module 2: Shipping & Logistics API",
        Version = "v1",
        Description = "Vận chuyển quốc tế, tracking, giao hàng nội địa cho hệ thống Mua Hộ",
    });
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In          = ParameterLocation.Header,
        Name        = "Authorization",
        Type        = SecuritySchemeType.Http,
        Scheme      = "Bearer",
        BearerFormat = "JWT",
        Description = "Nhập: Bearer {access_token}",
    });
    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
    {{
        new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
        Array.Empty<string>()
    }});
});

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks().AddDbContextCheck<Module2DbContext>("postgres-mod2");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. BUILD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Module2DbContext>();
    await db.Database.MigrateAsync();
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
var fwdOpts = new ForwardedHeadersOptions
    { ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost };
fwdOpts.KnownNetworks.Clear();
fwdOpts.KnownProxies.Clear();
app.UseForwardedHeaders(fwdOpts);

if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<Module2ExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MuaHo Module 2 API v1");
    c.RoutePrefix = "swagger";
});

app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", service = "mod2", time = DateTime.UtcNow }));
app.MapHealthChecks("/health");

app.UseRouting();
app.UseCors("FE");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
