import { Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute } from "@/components/ProtectedRoute"

import HomePage from "@/pages/home/Home"

import LoginPage from "@/pages/auth/Login"
import RegisterPage from "@/pages/auth/Register"
import ForgotPasswordPage from "@/pages/auth/ForgotPassword"
import ResetPasswordPage from "@/pages/auth/ResetPassword"
import AccessDeniedPage from "@/pages/auth/AccessDenied"

import GirisimlerIndexPage from "@/pages/girisimler/GirisimlerIndex"
import GirisimCreatePage from "@/pages/girisimler/GirisimCreate"
import GirisimDetailsPage from "@/pages/girisimler/GirisimDetails"

import ProgramlarIndexPage from "@/pages/programlar/ProgramlarIndex"
import ProgramCreatePage from "@/pages/programlar/ProgramCreate"
import ProgramDetailsPage from "@/pages/programlar/ProgramDetails"

import OnaylarIndexPage from "@/pages/onaylar/OnaylarIndex"
import KullanicilarIndexPage from "@/pages/admin/KullanicilarIndex"
import IslemGecmisiIndexPage from "@/pages/admin/IslemGecmisiIndex"
import GirisimimPage from "@/pages/girisimim/Girisimim"
import RaporPage from "@/pages/rapor/Rapor"
import ChangePasswordPage from "@/pages/account/ChangePassword"
import VerifyEmailPage from "@/pages/account/VerifyEmail"

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/erisim-reddedildi" element={<AccessDeniedPage />} />

        {/* Girişimler listesi — SuperAdmin & Program Yöneticisi (Karar Verici read-only) */}
        <Route element={<ProtectedRoute roles={["SuperAdmin", "ProgramYoneticisi", "KararVerici"]} />}>
          <Route path="/girisimler" element={<GirisimlerIndexPage />} />
        </Route>

        {/* Girişim detayı — yöneticiler + kendi girişimini görüntüleyen StartupKullanicisi
            (erişim backend'de GirisimErisim attribute'u ile kendi girişimiyle sınırlanır) */}
        <Route element={<ProtectedRoute roles={["SuperAdmin", "ProgramYoneticisi", "KararVerici", "StartupKullanicisi"]} />}>
          <Route path="/girisimler/:id" element={<GirisimDetailsPage />} />
        </Route>

        {/* Programlar — also open to StartupKullanicisi so they can browse + self-apply */}
        <Route element={<ProtectedRoute roles={["SuperAdmin", "ProgramYoneticisi", "KararVerici", "StartupKullanicisi"]} />}>
          <Route path="/programlar" element={<ProgramlarIndexPage />} />
          <Route path="/programlar/:id" element={<ProgramDetailsPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={["SuperAdmin", "ProgramYoneticisi"]} />}>
          <Route path="/girisimler/yeni" element={<GirisimCreatePage />} />
          <Route path="/programlar/yeni" element={<ProgramCreatePage />} />
          <Route path="/onaylar" element={<OnaylarIndexPage />} />
        </Route>

        {/* SuperAdmin only */}
        <Route element={<ProtectedRoute roles={["SuperAdmin"]} />}>
          <Route path="/admin/kullanicilar" element={<KullanicilarIndexPage />} />
          <Route path="/admin/islem-gecmisi" element={<IslemGecmisiIndexPage />} />
        </Route>

        {/* Startup Kullanıcısı */}
        <Route element={<ProtectedRoute roles={["StartupKullanicisi"]} />}>
          <Route path="/girisimim" element={<GirisimimPage />} />
        </Route>

        {/* Karar Verici (+ Admin roles can also view the dashboard) */}
        <Route element={<ProtectedRoute roles={["SuperAdmin", "ProgramYoneticisi", "KararVerici"]} />}>
          <Route path="/rapor" element={<RaporPage />} />
        </Route>

        {/* Hesabım — herhangi bir kimliği doğrulanmış kullanıcı */}
        <Route element={<ProtectedRoute />}>
          <Route path="/hesap/parola" element={<ChangePasswordPage />} />
          <Route path="/hesap/dogrula" element={<VerifyEmailPage />} />
        </Route>

        <Route path="*" element={<div className="py-20 text-center text-muted-foreground">Sayfa bulunamadı.</div>} />
      </Route>
    </Routes>
  )
}
