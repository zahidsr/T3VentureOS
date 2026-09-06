import type { ReactNode } from "react"

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  quote,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  quote: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-22rem)] items-center py-10">
      <div className="mx-auto flex w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60">
        {/* Left panel — kurumsal kimlik */}
        <div className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-t3-navy via-t3-navy-soft to-[#151450] p-10 text-white md:flex">
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -top-20 -right-16 size-60 rounded-full bg-t3-blue/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 size-48 rounded-full bg-violet-600/10 blur-3xl" />
          {/* Dot grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative">
            {/* Logo — white plate so the dark wordmark stays legible on this navy panel */}
            {/* Panel zaten koyu; logonun beyaz yazısı doğrudan okunuyor, beyaz kutuya gerek yok. */}
            <img src="/logo-tam.png" alt="TGM VentureOS" className="h-14 w-auto" />

            {/* Bottom separator line */}
            <div className="mt-6 h-px w-12 rounded-full bg-t3-blue/60" />

            <p className="mt-6 text-sm leading-relaxed text-white/75">
              &ldquo;{quote}&rdquo;
            </p>
          </div>

          <div className="relative text-xs text-white/40">
            © {new Date().getFullYear()} T3 Vakfı — Girişim Ekosistemi Yönetim Sistemi
          </div>
        </div>

        {/* Right panel — form */}
        <div className="w-full bg-white p-8 md:w-3/5 md:p-10">
          <span className="mb-1.5 block text-xs font-bold tracking-widest text-t3-blue uppercase">
            {eyebrow}
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-t3-navy">{title}</h1>
          {subtitle && (
            <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className={subtitle ? "" : "mt-6"}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-22rem)] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60">
        <span className="mb-1.5 block text-xs font-bold tracking-widest text-t3-blue uppercase">
          {eyebrow}
        </span>
        <h1 className="font-heading text-2xl font-extrabold text-t3-navy">{title}</h1>
        {subtitle && (
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
        )}
        <div className={subtitle ? "" : "mt-6"}>{children}</div>
      </div>
    </div>
  )
}
