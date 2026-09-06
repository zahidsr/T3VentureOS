import type { ReactNode } from "react"

/**
 * Liste ve form sayfalarının başlığı. Ana sayfa ile aynı dili konuşur (eyebrow rozeti, iri
 * başlık) ama koyu hero bloğu kullanmaz: her gün açılan çalışma ekranlarında her sayfaya koyu
 * blok koymak yorucu olurdu. Hero, sayısı gösterilecek özet sayfalarına ayrılmıştır.
 */
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full bg-role-accent-soft px-3 py-1 text-[11px] font-bold tracking-widest text-role-accent uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-2.5 font-heading text-3xl font-extrabold leading-tight text-t3-navy">{title}</h1>
        {subtitle && (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</div>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
