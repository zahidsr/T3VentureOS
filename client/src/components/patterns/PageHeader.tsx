import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="relative mb-8 flex flex-wrap items-end justify-between gap-4 pb-6">
      {/* gradient accent bar */}
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-role-accent/40 via-border to-transparent" />

      <div className="flex items-start gap-4">
        {/* left accent line */}
        <div className="mt-1.5 hidden h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-role-accent to-role-accent/20 sm:block" />
        <div>
          {eyebrow && (
            <span className="mb-1.5 block text-xs font-bold tracking-widest text-role-accent uppercase">
              {eyebrow}
            </span>
          )}
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-t3-navy">{title}</h1>
          {subtitle && (
            <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
