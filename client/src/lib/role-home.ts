import type { UserRole } from "@/lib/types"

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
      return "/panel"
    case "ProgramYoneticisi":
      return "/panel"
    case "StartupKullanicisi":
      return "/girisimim"
  }
}
