import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Clock, FileText, Mail, Phone, Presentation, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { API_URL, api } from "@/lib/api-client"
import type { GirisimDetailDto, GirisimSaglikDto, PitchDeckDto } from "@/lib/types"
import { isAxiosError } from "axios"
import { cn } from "@/lib/utils"

function fileUrl(dosyaUrl: string) {
  return `${API_URL.replace(/\/api\/?$/, "")}${dosyaUrl}`
}

function gunIfadesi(gun: number | null | undefined) {
  if (gun === null || gun === undefined) return "hiç veri girilmemiş"
  if (gun <= 0) return "bugün"
  if (gun === 1) return "dün"
  return `${gun} gün önce`
}

function KunyeBolumu({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 space-y-2 p-4">
      <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{baslik}</div>
      {children}
    </div>
  )
}

/**
 * Yöneticinin "bu takım kim, ne durumda, kime ulaşırım" sorusunu sekme gezmeden cevaplaması için
 * girişim detayının en üstünde duran künye. Sunum, iletişim muhatabı ve güncellik tek satırda.
 */
export function GirisimKunyesi({ girisim }: { girisim: GirisimDetailDto }) {
  const durumQuery = useQuery({
    queryKey: ["girisim-durum", girisim.id],
    queryFn: async () => (await api.get<GirisimSaglikDto>(`/girisimler/${girisim.id}/durum`)).data,
  })

  const deckQuery = useQuery({
    queryKey: ["sunum-taslagi", girisim.id],
    queryFn: async () => {
      try {
        return (await api.get<PitchDeckDto>(`/girisimler/${girisim.id}/sunum-taslagi`)).data
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
  })

  const durum = durumQuery.data
  const deck = deckQuery.data
  const contact = girisim.contact
  const sunumDokumani = girisim.dokumanlar.find((d) => d.tur === "Sunum" && d.onayDurumu === "Onaylandi")
  const tamlikYuzdesi = durum ? Math.round((durum.tamamlananAdim / durum.toplamAdim) * 100) : 0

  return (
    <Card className="mb-6 overflow-hidden p-0">
      <CardContent className="flex flex-col divide-y p-0 md:flex-row md:divide-x md:divide-y-0">
        <KunyeBolumu baslik="Durum">
          {durum ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      tamlikYuzdesi >= 80 ? "bg-emerald-500" : tamlikYuzdesi >= 50 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${tamlikYuzdesi}%` }}
                  />
                </div>
                <span className="text-sm font-medium">Profil {tamlikYuzdesi}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                Son veri girişi: {gunIfadesi(durum.guncellemeUzerindenGecenGun)}
              </div>
              {durum.bekleyenKayitSayisi > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600">
                  <AlertTriangle className="size-3" />
                  {durum.bekleyenKayitSayisi} kayıt onay bekliyor
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Durum yükleniyor…</p>
          )}
        </KunyeBolumu>

        <KunyeBolumu baslik="İletişim Muhatabı">
          {contact ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <User className="size-3.5 text-muted-foreground" />
                {contact.adSoyad}
                {contact.unvan && <span className="font-normal text-muted-foreground">· {contact.unvan}</span>}
              </div>
              {/* Yöneticinin "istediğinde iletişime geçsin" ihtiyacı: numarayı kopyalamak yerine tıklasın. */}
              {contact.telefon && (
                <a
                  href={`tel:${contact.telefon.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 text-sm text-role-accent hover:underline"
                >
                  <Phone className="size-3.5" />
                  {contact.telefon}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-sm text-role-accent hover:underline"
                >
                  <Mail className="size-3.5" />
                  {contact.email}
                </a>
              )}
              {contact.linkedInUrl && (
                <a
                  href={contact.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-role-accent hover:underline"
                >
                  LinkedIn profili
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Henüz iletişim muhatabı girilmemiş. Girişimin kendi profilinden eklemesi gerekiyor.
            </p>
          )}
        </KunyeBolumu>

        <KunyeBolumu baslik="Sunum">
          <div className="space-y-1.5">
            {deck ? (
              <>
                <span className="flex items-center gap-1.5 text-sm">
                  <Presentation className="size-3.5 text-emerald-600" />
                  {deck.bolumler.length} bölümlük sunum taslağı
                </span>
                <Link
                  to={`/girisimler/${girisim.id}?sekme=sunum`}
                  className="block text-sm text-role-accent hover:underline"
                >
                  Sunumu görüntüle
                </Link>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Sunum taslağı oluşturulmamış.</span>
            )}
            {sunumDokumani ? (
              <a
                href={fileUrl(sunumDokumani.dosyaUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-role-accent hover:underline"
              >
                <FileText className="size-3.5" />
                Yüklenen sunum dosyası
              </a>
            ) : (
              <span className="block text-sm text-muted-foreground">Yüklenmiş sunum dosyası yok.</span>
            )}
          </div>
        </KunyeBolumu>
      </CardContent>
    </Card>
  )
}
