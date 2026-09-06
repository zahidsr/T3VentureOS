import { Badge } from "@/components/ui/badge"
import type { GirisimAsamasi } from "@/lib/types"
import { ASAMA_ETIKET, ASAMA_NOKTA, ASAMA_SIRASI } from "@/lib/asama"
import { cn } from "@/lib/utils"

const ASAMA_STIL: Record<GirisimAsamasi, string> = {
  Fikir: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Prototip: "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200",
  MVP: "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200",
  IlkMusteri: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  Olcekleme: "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200",
  Buyume: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
}

export function AsamaRozeti({ asama, className }: { asama: GirisimAsamasi; className?: string }) {
  return (
    <Badge variant="outline" className={cn(ASAMA_STIL[asama] ?? ASAMA_STIL.Fikir, className)}>
      {ASAMA_ETIKET[asama] ?? asama}
    </Badge>
  )
}

/**
 * Aşama ekseninin tamamı, bulunulan nokta işaretli. Tek bir rozet "MVP" der; bu şerit "altı
 * aşamanın üçüncüsünde" der — ilerlemeyi ancak eksen üzerinde görünce anlarsın.
 */
export function AsamaSeridi({ asama, className }: { asama: GirisimAsamasi; className?: string }) {
  const index = ASAMA_SIRASI.indexOf(asama)
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {ASAMA_SIRASI.map((a, i) => (
        <div
          key={a}
          title={ASAMA_ETIKET[a]}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= index ? ASAMA_NOKTA[asama] : "bg-muted",
          )}
        />
      ))}
    </div>
  )
}
