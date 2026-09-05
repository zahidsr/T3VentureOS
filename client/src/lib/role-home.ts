import type { UserRole } from "@/lib/types"

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
      return "/girisimler"
    case "ProgramYoneticisi":
      return "/girisimler"
    case "StartupKullanicisi":
      return "/girisimim"
  }
}
