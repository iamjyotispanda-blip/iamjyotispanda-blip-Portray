using Microsoft.AspNetCore.Identity;

namespace PortRayAPI.Models;

public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string? Role { get; set; } = "User";
}