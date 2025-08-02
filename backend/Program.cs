using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PortRayAPI.Data;
using PortRayAPI.Models;
using PortRayAPI.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Database configuration
try
{
    var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrEmpty(connectionString))
    {
        // Convert Neon.tech format to standard PostgreSQL format
        if (connectionString.Contains("?sslmode"))
        {
            connectionString = connectionString.Replace("?sslmode", "?sslmode=require");
        }
        else
        {
            connectionString += "?sslmode=require";
        }
        
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));
    }
    else
    {
        Console.WriteLine("No DATABASE_URL found, skipping database configuration");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Database configuration failed: {ex.Message}");
}

// Identity configuration (only if database is available)
try
{
    if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DATABASE_URL")))
    {
        builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = true;
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Identity configuration failed: {ex.Message}");
}

// JWT Configuration
var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? "YourSecretKeyHereMustBe32CharactersLong!";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// Services
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IJwtService, JwtService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReplit", policy =>
    {
        policy.WithOrigins("https://*.replit.app", "https://*.replit.dev", "http://localhost:5000", "http://0.0.0.0:5000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// Configure pipeline

app.UseCors("AllowReplit");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Database migration
try
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Database initialization failed: {ex.Message}");
    // Continue without database for now
}

app.Run("http://0.0.0.0:5001");