import { describe, expect, it } from "vitest"
import { roleHomePath } from "@/lib/role-home"

describe("roleHomePath", () => {
  it("routes SuperAdmin and ProgramYoneticisi to the genel bakış panel", () => {
    expect(roleHomePath("SuperAdmin")).toBe("/panel")
    expect(roleHomePath("ProgramYoneticisi")).toBe("/panel")
  })

  it("routes StartupKullanicisi to their own girişim page", () => {
    expect(roleHomePath("StartupKullanicisi")).toBe("/girisimim")
  })
})
