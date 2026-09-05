import { CheckCircle2, Info, TriangleAlert } from "lucide-react"
import type { Okuma } from "@/lib/rapor-okumasi"
import { cn } from "@/lib/utils"

const tonStilleri = {
  notr: { kap: "border-border bg-muted/40", ikon: "text-muted-foreground", Ikon: Info },
  olumlu: { kap: "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20", ikon: "text-emerald-600", Ikon: CheckCircle2 },
  uyari: { kap: "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20", ikon: "text-amber-600", Ikon: TriangleAlert },
} as const

/**
 * Bir grafiğin altında duran otomatik okuma. Grafik veriyi gösterir; bu kutu o verinin ne
 * anlattığını söyler — raporun sayfada bir sonuç bırakması için.
 */
export function OkumaKutusu({ okuma, className }: { okuma: Okuma | null; className?: string }) {
  if (!okuma) return null
  const { kap, ikon, Ikon } = tonStilleri[okuma.ton]

  return (
    <div className={cn("mt-3 flex items-start gap-2.5 rounded-lg border p-3", kap, className)}>
      <Ikon className={cn("mt-0.5 size-4 shrink-0", ikon)} />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{okuma.baslik}</p>
        {okuma.detaylar.length > 0 && (
          <ul className="space-y-0.5 text-xs leading-relaxed text-muted-foreground">
            {okuma.detaylar.map((detay) => (
              <li key={detay}>{detay}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
