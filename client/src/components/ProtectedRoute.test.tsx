import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/lib/auth-context"
import type { UserDto } from "@/lib/types"

vi.mock("@/lib/auth-context", () => ({ useAuth: vi.fn() }))
const mockUseAuth = vi.mocked(useAuth)

const startupUser: UserDto = {
  id: "1",
  fullName: "Girişim Temsilcisi",
  email: "girisim@t3vakfi.local",
  role: "StartupKullanicisi",
  status: "Active",
  girisimId: "g1",
  girisimAdi: "Test Girişim",
  emailVerified: true,
  lastLoginAt: null,
}

function renderProtected(roles?: UserDto["role"][]) {
  return render(
    <MemoryRouter initialEntries={["/korumali"]}>
      <Routes>
        <Route path="/login" element={<div>Giriş sayfası</div>} />
        <Route path="/erisim-reddedildi" element={<div>Erişim reddedildi</div>} />
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/korumali" element={<div>Korumalı içerik</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("shows a loading state while auth status is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null, isLoading: true, isAuthenticated: false,
      login: vi.fn(), register: vi.fn(), refreshUser: vi.fn(), logout: vi.fn(),
    })

    renderProtected()

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument()
  })

  it("redirects to /login when the user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null, isLoading: false, isAuthenticated: false,
      login: vi.fn(), register: vi.fn(), refreshUser: vi.fn(), logout: vi.fn(),
    })

    renderProtected()

    expect(screen.getByText("Giriş sayfası")).toBeInTheDocument()
  })

  it("redirects to /erisim-reddedildi when the role is not allowed", () => {
    mockUseAuth.mockReturnValue({
      user: startupUser, isLoading: false, isAuthenticated: true,
      login: vi.fn(), register: vi.fn(), refreshUser: vi.fn(), logout: vi.fn(),
    })

    renderProtected(["SuperAdmin", "ProgramYoneticisi"])

    expect(screen.getByText("Erişim reddedildi")).toBeInTheDocument()
  })

  it("renders the protected content when authenticated with an allowed role", () => {
    mockUseAuth.mockReturnValue({
      user: startupUser, isLoading: false, isAuthenticated: true,
      login: vi.fn(), register: vi.fn(), refreshUser: vi.fn(), logout: vi.fn(),
    })

    renderProtected(["StartupKullanicisi"])

    expect(screen.getByText("Korumalı içerik")).toBeInTheDocument()
  })
})
