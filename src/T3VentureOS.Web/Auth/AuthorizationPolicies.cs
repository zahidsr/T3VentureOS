using T3VentureOS.Domain;
using Microsoft.AspNetCore.Authorization;

namespace T3VentureOS.Web.Auth;

/// <summary>
/// Single source of truth for the role combinations controllers authorize against — replaces the
/// raw, copy-pasted <c>[Authorize(Roles = "SuperAdmin,ProgramYoneticisi")]</c>-style strings that used
/// to be scattered (and free to drift/typo independently) across every controller.
/// </summary>
public static class AuthorizationPolicies
{
    /// <summary>Girişim/program/onay kayıtlarını yönetir; dashboard + girişim listeleme/raporlama: SuperAdmin, ProgramYoneticisi.</summary>
    public const string YoneticiErisimi = nameof(YoneticiErisimi);

    /// <summary>Girişimin kendi self-servis işlemleri (başvuru, güncelleme talebi): yalnızca StartupKullanicisi.</summary>
    public const string StartupErisimi = nameof(StartupErisimi);

    /// <summary>Girişim veri kayıtları (satış/yatırım/başarı/doküman/gelişim adımı): girişimin kendisi ya da bir yönetici.</summary>
    public const string GirisimVeriGirisiErisimi = nameof(GirisimVeriGirisiErisimi);

    /// <summary>
    /// Onay/red kararı verme: yalnızca SuperAdmin. ProgramYoneticisi kuyruğu görür ve öneri bırakır
    /// (bkz. <see cref="YoneticiErisimi"/>) ama nihai kararı veremez.
    /// </summary>
    public const string OnayKararErisimi = nameof(OnayKararErisimi);

    /// <summary>Sistem geneli kullanıcı yönetimi: yalnızca SuperAdmin.</summary>
    public const string SistemYonetimiErisimi = nameof(SistemYonetimiErisimi);

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(YoneticiErisimi, p => p.RequireRole(
            UserRole.SuperAdmin.ToString(), UserRole.ProgramYoneticisi.ToString()));

        options.AddPolicy(StartupErisimi, p => p.RequireRole(UserRole.StartupKullanicisi.ToString()));

        options.AddPolicy(GirisimVeriGirisiErisimi, p => p.RequireRole(
            UserRole.StartupKullanicisi.ToString(), UserRole.SuperAdmin.ToString(), UserRole.ProgramYoneticisi.ToString()));

        options.AddPolicy(OnayKararErisimi, p => p.RequireRole(UserRole.SuperAdmin.ToString()));

        options.AddPolicy(SistemYonetimiErisimi, p => p.RequireRole(UserRole.SuperAdmin.ToString()));
    }
}
