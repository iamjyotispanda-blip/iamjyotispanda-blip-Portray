using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PortRayAPI.Models;
using PortRayAPI.Services;
using System.ComponentModel.DataAnnotations;

namespace PortRayAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtService jwtService,
        IEmailService emailService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtService = jwtService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid data provided"
                });
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "User with this email already exists"
                });
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                EmailConfirmed = false
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                });
            }

            // Generate email confirmation token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmationLink = Url.Action(
                "ConfirmEmail",
                "Auth",
                new { userId = user.Id, token = token },
                Request.Scheme,
                Request.Host.Value);

            if (!string.IsNullOrEmpty(confirmationLink))
            {
                await _emailService.SendEmailConfirmationAsync(user.Email!, confirmationLink);
            }

            return Ok(new AuthResponse
            {
                Success = true,
                Message = "Registration successful. Please check your email to confirm your account.",
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName!,
                    LastName = user.LastName!,
                    Role = user.Role!,
                    EmailConfirmed = user.EmailConfirmed
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "An error occurred during registration"
            });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid data provided"
                });
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                // For development: Create the admin user if it doesn't exist and this is the admin email
                if (request.Email.Equals("superadmin@Portray.com", StringComparison.OrdinalIgnoreCase))
                {
                    var adminUser = new ApplicationUser
                    {
                        UserName = "superadmin@Portray.com",
                        Email = "superadmin@Portray.com",
                        Name = "System Administrator",
                        Role = "SystemAdmin",
                        IsVerified = true,
                        EmailConfirmed = true,
                        IsActive = true
                    };
                    
                    var createResult = await _userManager.CreateAsync(adminUser, "Csmpl@123");
                    if (createResult.Succeeded)
                    {
                        user = adminUser;
                        _logger.LogInformation("Created system admin user");
                    }
                    else
                    {
                        _logger.LogError("Failed to create admin user: {Errors}", string.Join(", ", createResult.Errors.Select(e => e.Description)));
                        return Unauthorized(new AuthResponse
                        {
                            Success = false,
                            Message = "Authentication system error"
                        });
                    }
                }
                else
                {
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Message = "Invalid email or password"
                    });
                }
            }

            if (!user.EmailConfirmed)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Please confirm your email before logging in"
                });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Account is deactivated"
                });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
            if (!result.Succeeded)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid email or password"
                });
            }

            var token = _jwtService.GenerateToken(user);
            
            // Determine redirect path based on role
            var redirectPath = user.Role switch
            {
                "SystemAdmin" => "/portal/welcome",
                "Admin" => "/dashboard",
                _ => "/dashboard"
            };

            return Ok(new AuthResponse
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                RedirectPath = redirectPath,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName ?? "",
                    LastName = user.LastName ?? "",
                    Role = user.Role!,
                    EmailConfirmed = user.EmailConfirmed
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "An error occurred during login"
            });
        }
    }

    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(string userId, string token)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                return BadRequest("Invalid confirmation link");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return BadRequest("User not found");
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (!result.Succeeded)
            {
                return BadRequest("Email confirmation failed");
            }

            // Redirect to frontend success page
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5000";
            return Redirect($"{frontendUrl}/email-confirmed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during email confirmation");
            return StatusCode(500, "An error occurred during email confirmation");
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid email provided");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null || !user.EmailConfirmed)
            {
                // Don't reveal that the user does not exist or is not confirmed
                return Ok(new { message = "If your email is registered, you will receive a password reset link" });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = Url.Action(
                "ResetPassword",
                "Auth",
                new { email = user.Email, token = token },
                Request.Scheme,
                Request.Host.Value);

            if (!string.IsNullOrEmpty(resetLink))
            {
                await _emailService.SendPasswordResetAsync(user.Email!, resetLink);
            }

            return Ok(new { message = "If your email is registered, you will receive a password reset link" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during forgot password");
            return StatusCode(500, "An error occurred while processing your request");
        }
    }

    [HttpGet("reset-password")]
    public IActionResult ResetPassword(string email, string token)
    {
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(token))
        {
            return BadRequest("Invalid reset link");
        }

        // Redirect to frontend reset password page with email and token
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5000";
        return Redirect($"{frontendUrl}/reset-password?email={email}&token={token}");
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid data provided");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return BadRequest("Invalid reset request");
            }

            var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            return Ok(new { message = "Password has been reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return StatusCode(500, "An error occurred while resetting password");
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new UserInfo
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName!,
                LastName = user.LastName!,
                Role = user.Role!,
                EmailConfirmed = user.EmailConfirmed
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, "An error occurred while getting user information");
        }
    }
}

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}