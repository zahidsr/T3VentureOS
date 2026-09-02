import { describe, expect, it } from "vitest"
import { roleHomePath } from "@/lib/role-home"

describe("roleHomePath", () => {
  it("routes SuperAdmin and ProgramYoneticisi to the girişimler list", () => {
    expect(roleHomePath("SuperAdmin")).toBe("/girisimler")
    expect(roleHomePath("ProgramYoneticisi")).toBe("/girisimler")
  })

  it("routes StartupKullanicisi to their own girişim page", () => {
    expect(roleHomePath("StartupKullanicisi")).toBe("/girisimim")
  })

  it("routes KararVerici to the report/dashboard page", () => {
    expect(roleHomePath("KararVerici")).toBe("/rapor")
  })
})
