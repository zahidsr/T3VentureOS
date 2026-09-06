import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Building2, Download, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { API_URL, api } from "@/lib/api-client"
import { basariTuruEtiketi, katilimDurumuEtiketi } from "@/lib/labels"
import { buildSirketCvPdf } from "@/lib/sirket-cv-pdf"
import type { PaylasilanCvDto } from "@/lib/types"

function fileUrl(dosyaUrl: string) {
  return `${API_URL.replace(/\/api\/?$/, "")}${dosyaUrl}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("tr-TR")
}

async function downloadPdf(cv: PaylasilanCvDto) {
  const doc = await buildSirketCvPdf({
    ad: cv.girisimAdi,
    sektor: cv.sektor ?? null,
    kisaTanim: cv.kisaTanim ?? null,
    teknoloji: cv.teknoloji ?? null,
    websiteUrl: cv.websiteUrl ?? null,
    kurulusYili: cv.kurulusYili ?? null,
    ekipBuyuklugu: cv.ekipBuyuklugu ?? null,
    logoUrl: cv.logoUrl ? fileUrl(cv.logoUrl) : null,
    kapakGorseliUrl: cv.kapakGorseliUrl ? fileUrl(cv.kapakGorseliUrl) : null,
    contact:
      cv.iletisimAdSoyad || cv.iletisimEmail
        ? { adSoyad: cv.iletisimAdSoyad ?? "", unvan: cv.iletisimUnvan ?? null, telefon: null, email: cv.iletisimEmail ?? null, linkedInUrl: null }
        : null,
    programKatilimlari: cv.programKatilimlari,
    gelisimAdimlari: cv.gelisimAdimlari,
    basarilar: cv.basarilar,
    // Finansal alanlar kasıtlı olarak gönderilmiyor: paylaşım bağlantısı ciro/yatırım göstermez.
  })
  const safeName = cv.girisimAdi.trim().replace(/\s+/g, "-")
  doc.save(`${safeName}-sirket-cv-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Paylaşım bağlantısıyla açılan, giriş gerektirmeyen Şirket CV'si sayfası. Sistemin kimliksiz
 * sayfalarından biridir; bu yüzden yalnızca profil, künye ve onaylı başarıları gösterir — ciro,
 * yatırım ve istihdam kayıtları bu ekranda hiç yer almaz.
 */
export default function PaylasilanCvPage() {
  const { jeton } = useParams<{ jeton: string }>()

  const cvQuery = useQuery({
    queryKey: ["paylasilan-cv", jeton],
    queryFn: async () => (await api.get<PaylasilanCvDto>(`/paylasim/cv/${jeton}`)).data,
    retry: false,
  })

  if (cvQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (cvQuery.isError || !cvQuery.data) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-t3-navy">Bağlantı geçerli değil</h1>
        <p className="text-sm text-muted-foreground">
          Bu bağlantının süresi dolmuş, iptal edilmiş ya da hiç var olmamış olabilir. CV'yi paylaşan
          kişiden yeni bir bağlantı isteyebilirsin.
        </p>
      </div>
    )
  }

  const cv = cvQuery.data
  const logoSrc = cv.logoUrl ? fileUrl(cv.logoUrl) : null
  const bannerSrc = cv.kapakGorseliUrl ? fileUrl(cv.kapakGorseliUrl) : null

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      {bannerSrc ? (
        <div className="h-40 w-full overflow-hidden sm:h-56">
          <img src={bannerSrc} alt="" className="size-full object-cover" />
        </div>
      ) : (
        <div className="h-16 w-full bg-t3-navy" />
      )}

      <div className="mx-auto max-w-4xl space-y-6 px-6">
        <header className={`flex flex-wrap items-start gap-4 ${bannerSrc ? "-mt-10" : "pt-6"}`}>
          {logoSrc ? (
            <img src={logoSrc} alt={`${cv.girisimAdi} logosu`} className="size-20 shrink-0 rounded-2xl border-4 border-background object-cover shadow-sm" />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-muted shadow-sm">
              <Building2 className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-2">
            <p className="text-xs font-bold tracking-widest text-t3-blue uppercase">Şirket CV'si</p>
            <h1 className="font-heading text-3xl font-extrabold text-t3-navy">{cv.girisimAdi}</h1>
            <p className="text-sm text-muted-foreground">
              {[cv.sektor, cv.kurulusYili ? `Kuruluş ${cv.kurulusYili}` : null, cv.ekipBuyuklugu ? `${cv.ekipBuyuklugu} kişi` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button className="mt-2 bg-role-accent text-white hover:bg-role-accent-dark" onClick={() => void downloadPdf(cv)}>
            <Download className="size-4" />
            PDF İndir
          </Button>
        </header>

        {cv.kisaTanim && <p className="max-w-2xl text-sm leading-relaxed text-foreground">{cv.kisaTanim}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {(cv.iletisimAdSoyad || cv.iletisimEmail) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">İletişim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {cv.iletisimAdSoyad && (
                  <p className="font-medium text-foreground">
                    {cv.iletisimAdSoyad}
                    {cv.iletisimUnvan && <span className="font-normal text-muted-foreground"> · {cv.iletisimUnvan}</span>}
                  </p>
                )}
                {cv.iletisimEmail && (
                  <a href={`mailto:${cv.iletisimEmail}`} className="flex items-center gap-1.5 text-t3-blue hover:underline">
                    <Mail className="size-3.5" />
                    {cv.iletisimEmail}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Program Katılım Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {cv.programKatilimlari.length === 0 ? (
                <p className="text-sm text-muted-foreground">Herhangi bir programa katılım bulunmuyor.</p>
              ) : (
                <ul className="space-y-2">
                  {cv.programKatilimlari.map((k, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{k.programAdi}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(k.baslangicTarihi)} – {formatDate(k.bitisTarihi)}
                        </p>
                      </div>
                      <Badge variant="outline">{katilimDurumuEtiketi(k.durum)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gelişim Yolculuğu</CardTitle>
          </CardHeader>
          <CardContent>
            {cv.gelisimAdimlari.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz bir gelişim adımı eklenmemiş.</p>
            ) : (
              <ol className="space-y-3 border-l-2 border-t3-blue-light pl-4">
                {[...cv.gelisimAdimlari]
                  .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
                  .map((g, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-t3-blue" />
                      <p className="text-xs font-medium text-muted-foreground">{formatDate(g.tarih)}</p>
                      <p className="text-sm font-semibold text-t3-navy">{g.baslik}</p>
                      {g.aciklama && <p className="mt-0.5 text-sm text-muted-foreground">{g.aciklama}</p>}
                    </li>
                  ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {cv.basarilar.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Başarılar</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {cv.basarilar.map((b, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">{basariTuruEtiketi(b.tur)}</Badge>
                    <span className="font-medium text-foreground">{b.baslik}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(b.tarih)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          Bu CV {new Date(cv.guncellemeTarihi).toLocaleDateString("tr-TR")} tarihli verilerle hazırlanmıştır ·
          T3 Girişim Ekosistemi
        </footer>
      </div>
    </div>
  )
}
