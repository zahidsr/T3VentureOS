import { Link } from "react-router-dom"
import { ThemeToggle } from "@/components/patterns/ThemeToggle"
import { LinkButton } from "@/components/patterns/LinkButton"

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/logo.png"
            alt="T3 Girişim Merkezi"
            className="h-12 w-auto transition-transform duration-200 group-hover:scale-105"
          />
          <span className="hidden border-l border-gray-200 pl-3 text-xs leading-tight font-semibold tracking-wide text-gray-500 sm:block">
            Ekosistemi
            <br />
            Yönetim Sistemi
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle className="text-gray-500 hover:bg-gray-100 hover:text-gray-900" />
          <LinkButton
            to="/register"
            variant="outline"
            className="h-11 border-t3-blue/30 px-5 text-sm font-semibold text-t3-blue hover:bg-t3-blue-light"
          >
            Kayıt Ol
          </LinkButton>
          <LinkButton
            to="/login"
            className="h-11 bg-t3-blue px-6 text-sm font-semibold text-white shadow-md shadow-t3-blue/20 hover:bg-t3-blue-dark"
          >
            Giriş Yap
          </LinkButton>
        </div>
      </div>
    </header>
  )
}
