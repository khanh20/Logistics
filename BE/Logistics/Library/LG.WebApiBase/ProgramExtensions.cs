using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.WebApiBase
{
    public static class ProgramExtensions
    {
        public static void ConfigureSwagger(this WebApplicationBuilder builder)
        {
            builder.Services.AddSwaggerGen(option =>
            {
                option.OperationFilter<AddCommonParameterSwagger>();

                option.SwaggerDoc(
                    "v1",
                    new OpenApiInfo
                    {
                        Title = Assembly.GetEntryAssembly()?.GetName().Name,
                        Version = "v1"
                    }
                );

                option.AddSecurityDefinition(
                    JwtBearerDefaults.AuthenticationScheme,
                    new OpenApiSecurityScheme
                    {
                        Description =
                            "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                        Name = "Authorization",
                        BearerFormat = "JWT",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.ApiKey
                    }
                );

                option.AddSecurityRequirement(
                    new OpenApiSecurityRequirement
                    {
                           {
                               new OpenApiSecurityScheme
                               {
                                   Reference = new OpenApiReference
                                   {
                                       Type = ReferenceType.SecurityScheme,
                                       Id = JwtBearerDefaults.AuthenticationScheme
                                   }
                               },
                               Array.Empty<string>()
                           }
                    }
                );

                var xmlFile = Path.Combine(
                    AppContext.BaseDirectory,
                    $"{Assembly.GetExecutingAssembly().GetName().Name}.xml"
                );
                if (File.Exists(xmlFile))
                {
                    option.IncludeXmlComments(xmlFile);
                }
                var projectDependencies = Assembly
                    .GetEntryAssembly()!
                    .CustomAttributes.SelectMany(c =>
                        c.ConstructorArguments.Select(ca => ca.Value?.ToString())
                    )
                    .Where(o => o != null)
                    .ToList();
                foreach (var assembly in projectDependencies)
                {
                    var otherXml = Path.Combine(AppContext.BaseDirectory, $"{assembly}.xml");
                    if (File.Exists(otherXml))
                    {
                        option.IncludeXmlComments(otherXml);
                    }
                }
                option.CustomSchemaIds(x => x.FullName);
            });
        }

        public static void ConfigureAuthentication(this WebApplicationBuilder builder)
        {
            builder.Services.AddAuthorization();
            builder
                .Services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(
                    JwtBearerDefaults.AuthenticationScheme,
                    options =>
                    {
                        var rsaSecurityKey = CryptographyUtils.ReadKey(
                            builder.Configuration.GetValue<string>("IdentityServer:PublicKey")!,
                            builder.Configuration.GetValue<string>("IdentityServer:PrivateKey")!
                        );

                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            ValidateAudience = false,
                            ValidateIssuer = false,
                            ValidateLifetime = true,
                            ValidateIssuerSigningKey = true,
                            IssuerSigningKey = rsaSecurityKey
                        };
                        options.RequireHttpsMetadata = false;

                        options.Events = new JwtBearerEvents
                        {
                            OnMessageReceived = context =>
                            {
                                var accessToken = context
                                    .Request.Query.FirstOrDefault(q => q.Key == "access_token")
                                    .Value.ToString();
                                if (string.IsNullOrEmpty(accessToken))
                                {
                                    accessToken = context
                                        .Request.Headers.FirstOrDefault(h =>
                                            h.Key == "access_token"
                                        )
                                        .Value.ToString();
                                }

                                var path = context.HttpContext.Request.Path;
                                if (
                                    !string.IsNullOrEmpty(accessToken)
                                    && path.StartsWithSegments("/hub")
                                )
                                {
                                    context.Token = accessToken;
                                }
                                return Task.CompletedTask;
                            }
                        };
                    }
                );
        }

        public static void ConfigureCors(this WebApplicationBuilder builder)
        {
            string allowOrigins = builder.Configuration.GetSection("AllowedOrigins")!.Value!;
            Console.WriteLine($"CORS: {allowOrigins}");
            var origins = allowOrigins
                .Split(';')
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToArray();
            builder.Services.AddCors(options =>
            {
                options.AddPolicy(
                    CorsPolicy,
                    builder =>
                    {
                        builder
                            .WithOrigins(origins)
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials()
                            .WithExposedHeaders("Content-Disposition");
                    }
                );
            });
        }
    }
}
