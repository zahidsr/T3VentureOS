import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SeviyeRozeti } from "@/components/patterns/SeviyeRozeti"
import { SeviyeAciklamasi } from "@/components/patterns/SeviyeAciklamasi"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api-client"
import type { GirisimSaglikDto, GirisimSeviyesi } from "@/lib/types"

/** Bir sonraki seviyeye kaç puan kaldığını gösterebilmek için eşikler burada da bilinir. */
const SEVIYE_ESIKLERI: { seviye: GirisimSeviyesi; esik: number }[] = [
  { seviye: "Gumus", esik: 40 },
  { seviye: "Altin", esik: 65 },
  { seviye: "Platin", esik: 85 },
]

const SEVIYE_ADI: Record<GirisimSeviyesi, string> = {
  Bronz: "Bronz",
  Gumus: "Gümüş",
  Altin: "Altın",
  Platin: "Platin",
}

/**
 * Girişimcinin kendi puanı ve puanı yükseltecek somut adımlar. Amaç oyunlaştırmayı süs olarak
 * değil, "ne yaparsam ne kazanırım" sorusunun net cevabı olarak sunmak — girişimci sisteme
 * dönmek için bir sebep bulsun.
 */
export function PuanKarti({ girisimId }: { girisimId: string }) {
  const { user } = useAuth()
  const durumQuery = useQuery({
    queryKey: ["girisim-durum", girisimId],
    queryFn: async () => (await api.get<GirisimSaglikDto>(`/girisimler/${girisimId}/durum`)).data,
  })

  if (durumQuery.isLoading) return <Skeleton className="h-40 w-full" />
  const durum = durumQuery.data
  if (!durum) return null

  const sonraki = SEVIYE_ESIKLERI.find((s) => durum.puan < s.esik)
  const adimlar = durum.sonrakiAdimlar.slice(0, 3)

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-role-accent-soft">
              <Trophy className="size-5 text-role-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-2xl font-extrabold text-t3-navy">{durum.puan}</span>
                <span className="text-sm text-muted-foreground">/ 100 profil puanı</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {sonraki
                  ? `${SEVIYE_ADI[sonraki.seviye]} seviyesine ${sonraki.esik - durum.puan} puan kaldı.`
                  : "En üst seviyedesin — profilini güncel tutmaya devam et."}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SeviyeRozeti seviye={durum.seviye} />
            <SeviyeAciklamasi rol={user?.role} />
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-role-accent transition-all" style={{ width: `${durum.puan}%` }} />
        </div>

        {adimlar.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Puanını yükseltmek için</p>
            <ul className="space-y-1.5">
              {adimlar.map((adim) => (
                <li key={adim.aciklama} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="size-3.5 shrink-0 text-role-accent" />
                  <span className="min-w-0 flex-1 text-muted-foreground">{adim.aciklama}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-role-accent">+{adim.puan}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!durum.guncel && durum.guncellemeUzerindenGecenGun !== null && (
          // Puan düşmüyor; bayatlama ayrı bir hatırlatma olarak duruyor.
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            {durum.guncellemeUzerindenGecenGun} gündür veri girmedin. Puanın düşmez, ama güncel veri
            girişimini yöneticilerin gözünde görünür tutar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
