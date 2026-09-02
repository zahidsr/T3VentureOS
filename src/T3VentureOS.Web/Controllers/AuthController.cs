using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly JwtTokenService _jwt;
    private readonly UserService _users;
    private readonly ICurrentUserService _currentUser;

    public AuthController(AuthService auth, JwtTokenService jwt, UserService users, ICurrentUserService currentUser)
    {
        _auth = auth;
        _jwt = jwt;
        _users = users;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var (success, error, user) = await _auth.ValidateCredentialsAsync(request.Email, request.Password);
        if (!success || user is null)
            return BadRequest(new ErrorResponse(error ?? "Giriş başarısız."));

        return Ok(new AuthResponse(_jwt.CreateToken(user), user.ToDto()));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var (success, error, user) = await _auth.RegisterAsync(
            request.Email, request.Password, request.FullName, request.GirisimAdi, request.Sektor);
        if (!success || user is null)
            return BadRequest(new ErrorResponse(error ?? "Kayıt başarısız."));

        return Ok(new AuthResponse(_jwt.CreateToken(user), user.ToDto()));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        await _auth.RequestPasswordResetAsync(request.Email);
        return Ok(new MessageResponse("Hesap varsa, parola sıfırlama kodu e-posta adresinize gönderildi."));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var ok = await _auth.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!ok) return BadRequest(new ErrorResponse("Kod geçersiz veya süresi dolmuş."));
        return Ok(new MessageResponse("Parolanız güncellendi. Şimdi giriş yapabilirsiniz."));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await _users.GetByIdAsync(_currentUser.UserId!.Value);
        if (user is null) return Unauthorized();
        return Ok(user.ToDto());
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var (success, error) = await _auth.ChangePasswordAsync(_currentUser.UserId!.Value, request.CurrentPassword, request.NewPassword);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Parola değiştirilemedi."));
        return Ok(new MessageResponse("Parolanız güncellendi."));
    }

    [HttpPost("resend-verification")]
    [Authorize]
    public async Task<IActionResult> ResendVerification()
    {
        await _auth.RequestEmailVerificationAsync(_currentUser.UserId!.Value);
        return Ok(new MessageResponse("Doğrulama kodu e-posta adresinize gönderildi."));
    }

    [HttpPost("verify-email")]
    [Authorize]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request)
    {
        var ok = await _auth.VerifyEmailAsync(request.Token);
        if (!ok) return BadRequest(new ErrorResponse("Kod geçersiz veya süresi dolmuş."));
        return Ok(new MessageResponse("E-posta adresiniz doğrulandı."));
    }
}
