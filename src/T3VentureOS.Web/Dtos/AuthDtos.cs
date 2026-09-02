namespace T3VentureOS.Web.Dtos;

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string FullName, string GirisimAdi, string? Sektor);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record VerifyEmailRequest(string Token);

public record AuthResponse(string AccessToken, UserDto User);
public record MessageResponse(string Message);
public record ErrorResponse(string Error);
