import { Link, useNavigate } from "react-router-dom"
import { KeyRound, LogOut, Mail } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/patterns/ThemeToggle"
import { RoleBadge } from "@/components/patterns/RoleBadge"
import { InitialsAvatar } from "@/components/patterns/InitialsAvatar"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { roleHomePath } from "@/lib/role-home"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/")
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebar />
        {/* Genel tanıtım anasayfasına değil, kullanıcının kendi rol anasayfasına döner —
            oturum korunur. */}
        <Link to={roleHomePath(user.role)} className="flex items-center">
          <img src="/logo-tam-koyu.png" alt="TGM VentureOS" className="h-9 w-auto" />
        </Link>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="overflow-hidden rounded-full border-2 border-transparent transition-all duration-150 hover:ring-2 hover:ring-t3-blue/30 focus:outline-none focus:ring-2 focus:ring-t3-blue focus:ring-offset-2"
                aria-label="Hesap menüsü"
              />
            }
          >
            <InitialsAvatar name={user.fullName} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-56 overflow-hidden rounded-xl p-0">
            <div className="border-b px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-1.5">
                <RoleBadge role={user.role} className="text-[11px]" />
              </div>
            </div>
            <div className="p-1.5">
              <DropdownMenuItem render={<Link to="/hesap/parola" />} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                <KeyRound className="size-4" />
                Parola Değiştir
              </DropdownMenuItem>
              {!user.emailVerified && (
                <DropdownMenuItem render={<Link to="/hesap/dogrula" />} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                  <Mail className="size-4" />
                  E-postamı Doğrula
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={handleLogout} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                <LogOut className="size-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
