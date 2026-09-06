import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-t3-navy to-t3-navy-soft text-white/70">
      {/* Glow accent */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 0%, rgba(0, 120, 168, 0.28), transparent 55%)",
        }}
      />
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              {/* white plate behind the logo — its wordmark is dark and would vanish on this navy background */}
              <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                <img src="/logo.png" alt="T3 Girişim Merkezi" className="h-8 w-auto" />
              </div>
              <p className="text-[11px] font-semibold tracking-widest text-white/50">
                Girişim Ekosistemi
                <br />
                Yönetim Sistemi
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/55 leading-relaxed">
              Programdan yatırıma, T3 girişimcilik ekosisteminin tek kurumsal hafızası ve karar
              destek platformu.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-white uppercase">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors hover:underline">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link to="/girisimler" className="hover:text-white transition-colors hover:underline">
                  Girişimler
                </Link>
              </li>
              <li>
                <Link to="/programlar" className="hover:text-white transition-colors hover:underline">
                  Programlar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-white uppercase">
              Hesap
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition-colors hover:underline">
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-white transition-colors hover:underline">
                  Parolamı Unuttum
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs">
          <span className="text-white/50">
            &copy; {new Date().getFullYear()} T3 Vakfı — Tüm hakları saklıdır.
          </span>
          <div className="flex gap-4">
            <Link to="/kvkk" className="text-white/60 transition-colors hover:text-white hover:underline">
              KVKK Aydınlatma Metni
            </Link>
            <Link to="/gizlilik" className="text-white/60 transition-colors hover:text-white hover:underline">
              Gizlilik Politikası
            </Link>
          </div>
          <a
            href="https://t3gm.t3vakfi.org/tr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 transition-colors hover:text-white hover:underline"
          >
            t3gm.t3vakfi.org
          </a>
        </div>
      </div>
    </footer>
  )
}
