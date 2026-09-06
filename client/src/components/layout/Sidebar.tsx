import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { usePendingOnayCount } from "@/lib/hooks/use-pending-onay-count"
import { cn } from "@/lib/utils"
import { navItemsForRole } from "@/components/layout/nav-config"

const COLLAPSE_KEY = "t3-sidebar-collapsed"

export function Sidebar() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")
  const pendingOnayCount = usePendingOnayCount(user?.role)

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  if (!user) return null
  const items = navItemsForRole(user.role)

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        {/* Logonun yazısı beyaz olduğu için koyu sidebar'da tam sürümü kullanılır; daraltılmış
            hâlde yatay logo sığmaz, yalnızca TGM işareti gösterilir. */}
        {collapsed ? (
          <img src="/logo-isaret.png" alt="TGM VentureOS" className="mx-auto h-9 w-auto shrink-0" />
        ) : (
          <img src="/logo-tam.png" alt="TGM VentureOS — Girişim Ekosistemi Yönetim Sistemi" className="w-full max-w-[196px]" />
        )}
      </div>

      <nav aria-label="Ana Menü" className="flex-1 space-y-1 px-2 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge === "pendingOnay" && pendingOnayCount > 0 && (
              <span className="ml-auto flex min-w-[18px] items-center justify-center rounded-full bg-t3-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingOnayCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && "Daralt"}
      </button>
    </aside>
  )
}
