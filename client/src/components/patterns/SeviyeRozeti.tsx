import { Award, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { GirisimSeviyesi } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEVIYE_STILI: Record<GirisimSeviyesi, { etiket: string; sinif: string }> = {
  Bronz: { etiket: "Bronz", sinif: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" },
  Gumus: { etiket: "Gümüş", sinif: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  Altin: { etiket: "Altın", sinif: "border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200" },
  Platin: { etiket: "Platin", sinif: "border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200" },
}

/** Girişim seviyesi. Puan yalnızca arttığı için seviye de geri düşmez. */
export function SeviyeRozeti({
  seviye,
  puan,
  className,
}: {
  seviye: GirisimSeviyesi
  puan?: number
  className?: string
}) {
  const { etiket, sinif } = SEVIYE_STILI[seviye] ?? SEVIYE_STILI.Bronz
  return (
    <Badge variant="outline" className={cn("gap-1", sinif, className)}>
      <Award className="size-3" />
      {etiket}
      {puan !== undefined && <span className="tabular-nums opacity-80">· {puan}</span>}
    </Badge>
  )
}

/**
 * Güncellik, seviyeden ayrı bir işarettir: kazanılan puan geri alınmaz, ama girişimin verisinin
 * bayatladığı da görünmelidir.
 */
export function GuncellikRozeti({ guncel, gun }: { guncel: boolean; gun: number | null }) {
  if (gun === null) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Clock className="size-3" />
        Veri girilmemiş
      </Badge>
    )
  }
  if (guncel) return null

  return (
    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:text-amber-300">
      <Clock className="size-3" />
      {gun} gündür güncellenmedi
    </Badge>
  )
}
