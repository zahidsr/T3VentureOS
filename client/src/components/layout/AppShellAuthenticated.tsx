import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { useAuth } from "@/lib/auth-context"

export function AppShellAuthenticated() {
  const { user } = useAuth()
  const role = user?.role

  // Rol vurgu rengi CSS'te data-role üzerinden tanımlı (bkz. index.css); kabuk yalnızca hangi
  // rolde olunduğunu köke yazar, böylece renk kararı tek yerde kalır ve her sayfa onu miras alır.
  useEffect(() => {
    const root = document.documentElement
    if (role) root.setAttribute("data-role", role)
    return () => root.removeAttribute("data-role")
  }, [role])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
