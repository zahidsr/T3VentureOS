import type { ComponentType } from "react"
import {
  Award,
  BarChart2,
  Building2,
  CheckSquare2,
  FileText,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Layers,
  MessageSquareWarning,
  Presentation,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react"
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
  { to: "/panel", label: "Genel Bakış", icon: LayoutDashboard, roles: ["SuperAdmin", "ProgramYoneticisi"] },
  // Girişimcinin bölümleri sekme yerine sidebar'da: sekme şeridi sekiz başlıkta okunmaz hâle
  // geliyordu ve her bölüm artık paylaşılabilir bir adrese sahip.
  { to: "/girisimim", label: "Girişimim", icon: Rocket, roles: ["StartupKullanicisi"], end: true },
  { to: "/girisimim/programlar", label: "Program Geçmişim", icon: Layers, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/gelisim", label: "Gelişim", icon: TrendingUp, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/finansal", label: "Satış & Yatırım", icon: BarChart2, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/istihdam", label: "İstihdam", icon: Users, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/basari-dokuman", label: "Başarı & Doküman", icon: Award, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/sunum", label: "Sunum", icon: Presentation, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/rapor", label: "Rapor", icon: FileText, roles: ["StartupKullanicisi"] },
  { to: "/girisimim/itirazlarim", label: "İtirazlarım", icon: MessageSquareWarning, roles: ["StartupKullanicisi"] },
  { to: "/girisimler", label: "Girişimler", icon: Building2, roles: ["SuperAdmin", "ProgramYoneticisi"], end: true },
  { to: "/girisimler/karsilastirma", label: "Rakip Karşılaştırma", icon: GitCompareArrows, roles: ["SuperAdmin", "ProgramYoneticisi"] },
  { to: "/programlar", label: "Programlar", icon: Layers, roles: ["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi"] },
  { to: "/onaylar", label: "Onaylar", icon: CheckSquare2, roles: ["SuperAdmin", "ProgramYoneticisi"], badge: "pendingOnay" },
  { to: "/rapor", label: "Rapor", icon: BarChart2, roles: ["SuperAdmin", "ProgramYoneticisi"] },
  { to: "/admin/kullanicilar", label: "Kullanıcılar", icon: Users, roles: ["SuperAdmin"] },
  { to: "/admin/islem-gecmisi", label: "İşlem Geçmişi", icon: History, roles: ["SuperAdmin"] },
]

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
