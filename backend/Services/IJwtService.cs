using PortRayAPI.Models;

namespace PortRayAPI.Services;

public interface IJwtService
{
    string GenerateToken(ApplicationUser user);
}