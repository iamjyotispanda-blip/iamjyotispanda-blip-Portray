using Microsoft.AspNetCore.Identity;

namespace PortRayAPI.Models;

public class ApplicationUser : IdentityUser
{
    public string Name { get; set; } = string.Empty;
    public new string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool IsVerified { get; set; } = false;
    public string? VerificationToken { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    
    // Additional fields for compatibility
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}