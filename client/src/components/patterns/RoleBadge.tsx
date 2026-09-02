import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/types"

export const ROLE_LABEL: Record<UserRole, string> = {
  SuperAdmin: "Süper Admin",
  ProgramYoneticisi: "Program Yöneticisi",
  StartupKullanicisi: "Startup Kullanıcısı",
  KararVerici: "Karar Verici",
}

const ROLE_CLASSES: Record<UserRole, string> = {
  SuperAdmin: "bg-violet-50 text-violet-700 border-violet-200",
  ProgramYoneticisi: "bg-t3-blue-light text-t3-blue border-blue-200",
  StartupKullanicisi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  KararVerici: "bg-amber-50 text-amber-700 border-amber-200",
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", ROLE_CLASSES[role], className)}>
      {ROLE_LABEL[role]}
    </Badge>
  )
}
