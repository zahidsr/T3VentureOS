import { Outlet } from "react-router-dom"
import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { Footer } from "@/components/layout/Footer"

export function AppShellPublic() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
