import type { ReactNode } from "react"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Ton = "accent" | "notr" | "uyari" | "olumlu" | "mor"

const TON_STILI: Record<Ton, string> = {
  accent: "bg-role-accent-soft text-role-accent",
  notr: "bg-muted text-muted-foreground",
  uyari: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300",
  olumlu: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
  mor: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300",
}

/**
 * Kartların ortak başlığı: ana sayfadaki özellik kartlarındaki gibi renkli ikon rozeti + başlık.
 * Tek yerde durur ki her kart aynı görünsün; daha önce her sayfa kendi başlık düzenini kuruyordu.
 */
export function KartBasligi({
  ikon,
  baslik,
  aciklama,
  ton = "accent",
  sag,
}: {
  ikon: ReactNode
  baslik: ReactNode
  aciklama?: ReactNode
  ton?: Ton
  sag?: ReactNode
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TON_STILI[ton])}>
            {ikon}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{baslik}</CardTitle>
            {aciklama && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{aciklama}</p>}
          </div>
        </div>
        {sag && <div className="shrink-0">{sag}</div>}
      </div>
    </CardHeader>
  )
}
