import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api-client"
import type { PaylasilanSunumDto } from "@/lib/types"

const SLAYT_RENKLERI = ["#0078a8", "#1a7f5a", "#f7941d", "#7c3aed", "#d82020"]

/**
 * Paylaşım bağlantısıyla açılan, giriş gerektirmeyen sunum sayfası. Sistemin tek kimliksiz
 * sayfasıdır; bu yüzden yalnızca sunum bölümlerini ve künyeyi gösterir.
 */
export default function PaylasilanSunumPage() {
  const { jeton } = useParams<{ jeton: string }>()

  const sunumQuery = useQuery({
    queryKey: ["paylasilan-sunum", jeton],
    queryFn: async () => (await api.get<PaylasilanSunumDto>(`/paylasim/sunum/${jeton}`)).data,
    retry: false,
  })

  if (sunumQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (sunumQuery.isError || !sunumQuery.data) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-t3-navy">Bağlantı geçerli değil</h1>
        <p className="text-sm text-muted-foreground">
          Bu bağlantının süresi dolmuş, iptal edilmiş ya da hiç var olmamış olabilir. Sunumu paylaşan
          kişiden yeni bir bağlantı isteyebilirsin.
        </p>
      </div>
    )
  }

  const s = sunumQuery.data

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-6">
        <header className="space-y-2">
          <p className="text-xs font-bold tracking-widest text-t3-blue uppercase">Yatırımcı Sunumu</p>
          <h1 className="font-heading text-3xl font-extrabold text-t3-navy">{s.girisimAdi}</h1>
          <p className="text-sm text-muted-foreground">
            {[s.sektor, s.kurulusYili ? `Kuruluş ${s.kurulusYili}` : null].filter(Boolean).join(" · ")}
          </p>
          {s.kisaTanim && <p className="max-w-2xl text-sm leading-relaxed text-foreground">{s.kisaTanim}</p>}
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {s.bolumler.map((bolum, i) => (
            <Card key={bolum.anahtar} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: SLAYT_RENKLERI[i % SLAYT_RENKLERI.length] }} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline gap-2 text-base">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: SLAYT_RENKLERI[i % SLAYT_RENKLERI.length] }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {bolum.baslik}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{bolum.icerik}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {(s.iletisimAdSoyad || s.iletisimEmail) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">İletişim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {s.iletisimAdSoyad && (
                <p className="font-medium text-foreground">
                  {s.iletisimAdSoyad}
                  {s.iletisimUnvan && <span className="font-normal text-muted-foreground"> · {s.iletisimUnvan}</span>}
                </p>
              )}
              {s.iletisimEmail && (
                <a href={`mailto:${s.iletisimEmail}`} className="flex items-center gap-1.5 text-t3-blue hover:underline">
                  <Mail className="size-3.5" />
                  {s.iletisimEmail}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          Bu sunum {new Date(s.sunumTarihi).toLocaleDateString("tr-TR")} tarihli verilerle hazırlanmıştır ·
          T3 Girişim Ekosistemi
        </footer>
      </div>
    </div>
  )
}
