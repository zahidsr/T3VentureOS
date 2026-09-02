using T3VentureOS.Domain.Entities;

namespace T3VentureOS.Web.Dtos;

public record UserDto(Guid Id, string FullName, string Email, string Role, string Status, Guid? GirisimId, string? GirisimAdi, bool EmailVerified);

public record InviteUserRequest(string Email, string FullName, string Role, Guid? GirisimId);

public static class UserDtoExtensions
{
    public static UserDto ToDto(this User user) =>
        new(user.Id, user.FullName, user.Email, user.Role.ToString(), user.Status.ToString(), user.GirisimId, user.Girisim?.Ad, user.EmailVerified);
}
