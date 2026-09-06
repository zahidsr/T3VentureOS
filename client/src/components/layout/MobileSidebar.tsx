import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { KeyRound, LogOut, Mail, Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { usePendingOnayCount } from "@/lib/hooks/use-pending-onay-count"
import { navItemsForRole } from "@/components/layout/nav-config"
import { roleHomePath } from "@/lib/role-home"
import { InitialsAvatar } from "@/components/patterns/InitialsAvatar"
import { ThemeToggle } from "@/components/patterns/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function MobileSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const pendingOnayCount = usePendingOnayCount(user?.role)

  if (!user) return null
  const items = navItemsForRole(user.role)

  function handleLogout() {
    setOpen(false)
    logout()
    navigate("/")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-full flex-col gap-6 px-4 pt-6">
          {/* Genel tanıtım anasayfasına değil, kullanıcının kendi rol anasayfasına döner —
              oturum korunur. */}
          <Link to={roleHomePath(user.role)} onClick={() => setOpen(false)} className="flex items-center">
            <img src="/logo-tam.png" alt="T3GM VentureOS" className="h-9 w-auto" />
          </Link>

          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )
                }
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge === "pendingOnay" && pendingOnayCount > 0 && (
                  <span className="ml-auto flex min-w-[18px] items-center justify-center rounded-full bg-t3-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingOnayCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <InitialsAvatar name={user.fullName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
                </div>
              </div>
              <ThemeToggle className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground" />
            </div>
            <Link
              to="/hesap/parola"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <KeyRound className="size-4" />
              Parola Değiştir
            </Link>
            {!user.emailVerified && (
              <Link
                to="/hesap/dogrula"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <Mail className="size-4" />
                E-postamı Doğrula
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="size-4" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
