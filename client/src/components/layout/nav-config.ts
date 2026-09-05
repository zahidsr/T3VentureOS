import type { ComponentType } from "react"
import { BarChart2, Building2, CheckSquare2, GitCompareArrows, History, Layers, Rocket, Users } from "lucide-react"
import type { UserRole } from "@/lib/types"

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: "pendingOnay"
  children?: NavItem[]
  /** Only match the exact path — needed when another nav item's `to` starts with this one's. */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/girisimler", label: "Girişimler", icon: Building2, roles: ["SuperAdmin", "ProgramYoneticisi"], end: true },
  { to: "/girisimler/karsilastirma", label: "Rakip Karşılaştırma", icon: GitCompareArrows, roles: ["SuperAdmin", "ProgramYoneticisi"] },
  { to: "/programlar", label: "Programlar", icon: Layers, roles: ["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi"] },
  { to: "/onaylar", label: "Onaylar", icon: CheckSquare2, roles: ["SuperAdmin", "ProgramYoneticisi"], badge: "pendingOnay" },
  { to: "/girisimim", label: "Girişimim", icon: Rocket, roles: ["StartupKullanicisi"] },
  { to: "/rapor", label: "Rapor", icon: BarChart2, roles: ["SuperAdmin", "ProgramYoneticisi"] },
  { to: "/admin/kullanicilar", label: "Kullanıcılar", icon: Users, roles: ["SuperAdmin"] },
  { to: "/admin/islem-gecmisi", label: "İşlem Geçmişi", icon: History, roles: ["SuperAdmin"] },
]

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
