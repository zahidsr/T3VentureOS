import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { KeyRound, LogOut, Mail, Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import { roleHomePath } from "@/lib/role-home"
import type { DashboardStatsDto } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/patterns/LinkButton"
import { ThemeToggle } from "@/components/patterns/ThemeToggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
}

/** SuperAdmin/ProgramYoneticisi only — lets them notice new pending approvals without opening the queue. */
function usePendingOnayCount(role: string | undefined) {
  const enabled = role === "SuperAdmin" || role === "ProgramYoneticisi"
  const { data } = useQuery({
    queryKey: ["dashboard-pending-count"],
    queryFn: async () => (await api.get<DashboardStatsDto>("/dashboard")).data,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  return data?.bekleyenOnaySayisi ?? 0
}

function roleLabel(role: string | undefined): string {
  switch (role) {
    case "SuperAdmin": return "Süper Admin"
    case "ProgramYoneticisi": return "Program Yöneticisi"
    case "StartupKullanicisi": return "Startup Kullanıcısı"
    case "KararVerici": return "Karar Verici"
    default: return ""
  }
}

function navItemsForRole(role: string | undefined): NavItem[] {
  switch (role) {
    case "SuperAdmin":
      return [
        { to: "/girisimler", label: "Girişimler" },
        { to: "/programlar", label: "Programlar" },
        { to: "/onaylar", label: "Onaylar" },
        { to: "/admin/kullanicilar", label: "Kullanıcılar" },
      ]
    case "ProgramYoneticisi":
      return [
        { to: "/girisimler", label: "Girişimler" },
        { to: "/programlar", label: "Programlar" },
        { to: "/onaylar", label: "Onaylar" },
      ]
    case "StartupKullanicisi":
      return [
        { to: "/girisimim", label: "Girişimim" },
        { to: "/programlar", label: "Programlar" },
      ]
    case "KararVerici":
      return [{ to: "/rapor", label: "Rapor" }]
    default:
      return []
  }
}

function UserAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"

  return (
    <div className="relative inline-flex" title="Oturumunuz açık">
      <div className="flex size-10 items-center justify-center rounded-full bg-t3-blue text-sm font-bold text-white select-none">
        {initials}
      </div>
      {/* Aktif oturum göstergesi — hesabın hâlâ açık olduğunu dinamik olarak belirtir */}
      <span className="absolute right-0 bottom-0 flex size-3 items-center justify-center rounded-full bg-white ring-2 ring-white">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
      </span>
    </div>
  )
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = navItemsForRole(user?.role)
  const pendingOnayCount = usePendingOnayCount(user?.role)
  const logoTo = isAuthenticated && user ? roleHomePath(user.role) : "/"

  function handleLogout() {
    logout()
    navigate("/")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">

        {/* ─── Logo ─── */}
        <div className="flex flex-1 items-center">
          <Link to={logoTo} className="group flex items-center gap-3">
            <img
              src="/logo.png"
              alt="T3 Girişim Merkezi"
              className="h-12 w-auto transition-transform duration-200 group-hover:scale-105"
            />
            <span className="hidden border-l border-gray-200 pl-3 text-xs leading-tight font-semibold tracking-wide text-gray-500 sm:block">
              Ekosistemi
              <br />
              Yönetim Sistemi
            </span>
          </Link>
        </div>

        {/* ─── Desktop Nav ─── */}
        <nav aria-label="Ana Menü" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-1.5 transition-colors duration-150",
                      isActive
                        ? "font-semibold text-t3-blue"
                        : "text-gray-500 hover:text-gray-900",
                    )
                  }
                >
                  {item.label}
                  {item.to === "/onaylar" && pendingOnayCount > 0 && (
                    <span className="flex min-w-[18px] items-center justify-center rounded-full bg-t3-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingOnayCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ─── Desktop User ─── */}
        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <ThemeToggle className="text-gray-500 hover:bg-gray-100 hover:text-gray-900" />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="overflow-hidden rounded-full border-2 border-transparent shadow-sm transition-all duration-150 hover:ring-2 hover:ring-t3-blue/30 focus:outline-none focus:ring-2 focus:ring-t3-blue focus:ring-offset-2"
                    aria-label="Hesap menüsü"
                  />
                }
              >
                <UserAvatar name={user?.fullName ?? ""} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-56 rounded-xl p-0 overflow-hidden">
                {/* User info header */}
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-full bg-t3-blue-light px-2 py-0.5 text-[11px] font-semibold text-t3-blue">
                      {roleLabel(user?.role)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Oturum açık
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="p-1.5">
                  <DropdownMenuItem
                    render={<Link to="/hesap/parola" />}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                  >
                    <KeyRound className="size-4" />
                    Parola Değiştir
                  </DropdownMenuItem>
                  {user && !user.emailVerified && (
                    <DropdownMenuItem
                      render={<Link to="/hesap/dogrula" />}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                    >
                      <Mail className="size-4" />
                      E-postamı Doğrula
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                  >
                    <LogOut className="size-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <LinkButton
                to="/register"
                variant="outline"
                className="h-11 border-t3-blue/30 px-5 text-sm font-semibold text-t3-blue hover:bg-t3-blue-light"
              >
                Kayıt Ol
              </LinkButton>
              <LinkButton
                to="/login"
                className="h-11 bg-t3-blue px-6 text-sm font-semibold text-white shadow-md shadow-t3-blue/20 hover:bg-t3-blue-dark"
              >
                Giriş Yap
              </LinkButton>
            </>
          )}
        </div>

        {/* ─── Mobile hamburger ─── */}
        <div className="flex items-center md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                />
              }
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l border-gray-100 bg-white">
              <div className="flex flex-col gap-6 px-4 pt-6">
                {/* Brand */}
                <Link to={logoTo} onClick={() => setOpen(false)} className="flex items-center">
                  <img src="/logo.png" alt="T3 Girişim Merkezi" className="h-10 w-auto" />
                </Link>

                {/* Nav */}
                <nav className="flex flex-col gap-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-t3-blue-light font-semibold text-t3-blue"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )
                      }
                    >
                      {item.label}
                      {item.to === "/onaylar" && pendingOnayCount > 0 && (
                        <span className="flex min-w-[18px] items-center justify-center rounded-full bg-t3-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {pendingOnayCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>

                {/* User section */}
                {isAuthenticated ? (
                  <div className="mt-auto flex flex-col gap-3 border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={user?.fullName ?? ""} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{user?.fullName}</p>
                          <p className="truncate text-xs text-gray-500">{user?.email ?? ""}</p>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Oturum açık
                          </span>
                        </div>
                      </div>
                      <ThemeToggle className="shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900" />
                    </div>
                    <Link
                      to="/hesap/parola"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <KeyRound className="size-4" />
                      Parola Değiştir
                    </Link>
                    {user && !user.emailVerified && (
                      <Link
                        to="/hesap/dogrula"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <Mail className="size-4" />
                        E-postamı Doğrula
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Çıkış Yap
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 pt-5">
                    <div className="flex items-center gap-2">
                      <LinkButton
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="h-11 flex-1 bg-t3-blue text-sm font-semibold text-white hover:bg-t3-blue-dark"
                      >
                        Giriş Yap
                      </LinkButton>
                      <ThemeToggle className="shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900" />
                    </div>
                    <LinkButton
                      to="/register"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="h-11 border-t3-blue/30 text-sm font-semibold text-t3-blue hover:bg-t3-blue-light"
                    >
                      Kayıt Ol
                    </LinkButton>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  )
}
