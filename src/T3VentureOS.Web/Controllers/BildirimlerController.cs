using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/bildirimler")]
[Authorize]
public class BildirimlerController : ControllerBase
{
    private readonly NotificationService _notifications;
    private readonly ICurrentUserService _currentUser;

    public BildirimlerController(NotificationService notifications, ICurrentUserService currentUser)
    {
        _notifications = notifications;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _notifications.ListAsync(_currentUser.UserId!.Value, page, pageSize);
        return Ok(result.ToPagedDto(b => new BildirimDto(b.Id, b.Tur.ToString(), b.Baslik, b.Mesaj, b.IlgiliGirisimId, b.Okundu, b.CreatedAt)));
    }

    [HttpGet("okunmamis-sayisi")]
    public async Task<IActionResult> OkunmamisSayisi()
    {
        var sayi = await _notifications.UnreadCountAsync(_currentUser.UserId!.Value);
        return Ok(new UnreadCountDto(sayi));
    }

    [HttpPost("{id:guid}/okundu")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var ok = await _notifications.MarkAsReadAsync(id, _currentUser.UserId!.Value);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("tumunu-okundu-yap")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await _notifications.MarkAllAsReadAsync(_currentUser.UserId!.Value);
        return NoContent();
    }
}
