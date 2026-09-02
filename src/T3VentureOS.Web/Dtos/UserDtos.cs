using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Web.Dtos;

public record UserDto(
    Guid Id, string FullName, string Email, string Role, string Status,
    Guid? GirisimId, string? GirisimAdi, bool EmailVerified, DateTime? LastLoginAt);

public record InviteUserRequest(string Email, string FullName, string Role, Guid? GirisimId);

public record ChangeRoleRequest(string Role, Guid? GirisimId);

public record ChangeGirisimRequest(Guid GirisimId);

public record BulkInviteRowRequest(string Email, string FullName, string Role, string? GirisimAdi);

public record BulkInviteRequest(List<BulkInviteRowRequest> Rows);

public record BulkInviteRowResultDto(int SatirNo, string Email, bool Basarili, string? Hata);

public record BulkInviteResponseDto(int ToplamSatir, int BasariliSayisi, int HataliSayisi, List<BulkInviteRowResultDto> Sonuclar);

public static class UserDtoExtensions
{
    public static UserDto ToDto(this User user) =>
        new(user.Id, user.FullName, user.Email, user.Role.ToString(), user.Status.ToString(),
            user.GirisimId, user.Girisim?.Ad, user.EmailVerified, user.LastLoginAt);

    public static BulkInviteRowResultDto ToDto(this BulkInviteRowResult r) =>
        new(r.SatirNo, r.Email, r.Basarili, r.Hata);
}
