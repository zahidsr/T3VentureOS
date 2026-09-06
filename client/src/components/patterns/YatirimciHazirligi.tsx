import { useQuery } from "@tanstack/react-query"
import { Check, Target, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api-client"
import type { YatirimciHazirligiDto } from "@/lib/types"
import { cn } from "@/lib/utils"

const DURUM_STILI: Record<string, string> = {
  "Hazır": "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  "Neredeyse hazır": "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/20",
  "Eksikler var": "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  "Hazırlık başlamadı": "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-200",
}

/**
 * Girişimcinin "yatırımcıya hazır mıyım" sorusuna denetlenebilir ölçütlerle cevap. Puan kartıyla
 * karışmaması için farkı açıkça yazılır: puan verinin varlığını, bu kart verinin bir yatırımcı
 * görüşmesine dayanıp dayanmadığını ölçer.
 */
export function YatirimciHazirligi({ girisimId }: { girisimId: string }) {
  const hazirlikQuery = useQuery({
    queryKey: ["yatirimci-hazirligi", girisimId],
    queryFn: async () => (await api.get<YatirimciHazirligiDto>(`/girisimler/${girisimId}/yatirimci-hazirligi`)).data,
  })

  if (hazirlikQuery.isLoading) return <Skeleton className="h-64 w-full" />
  const h = hazirlikQuery.data
  if (!h) return null

  const eksikler = h.kriterler.filter((k) => !k.karsilandi)
  const tamamlananlar = h.kriterler.filter((k) => k.karsilandi)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-role-accent" />
              Yatırımcıya hazır mıyım?
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Profil puanı verinin <span className="font-medium">var olup olmadığını</span> ölçer; bu kart
              verinin bir yatırımcı görüşmesine <span className="font-medium">dayanıp dayanmadığını</span>.
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", DURUM_STILI[h.durum])}>
            {h.durum} · %{h.yuzde}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", h.yuzde >= 75 ? "bg-emerald-500" : h.yuzde >= 40 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${h.yuzde}%` }}
          />
        </div>

        {eksikler.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Tamamlanması gerekenler</p>
            <ul className="space-y-2.5">
              {eksikler.map((k) => (
                <li key={k.anahtar} className="flex gap-2.5">
                  <X className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{k.baslik}</p>
                    <p className="text-xs text-muted-foreground">{k.nedenOnemli}</p>
                    {k.ipucu && <p className="text-xs font-medium text-role-accent">{k.ipucu}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tamamlananlar.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Tamamlananlar</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {tamamlananlar.map((k) => (
                <li key={k.anahtar} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 shrink-0 text-emerald-600" />
                  {k.baslik}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
