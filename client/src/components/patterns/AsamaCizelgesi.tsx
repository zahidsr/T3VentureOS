import { useQuery } from "@tanstack/react-query"
import { Award, Banknote, Flag, Layers, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { AsamaRozeti } from "@/components/patterns/AsamaRozeti"
import { ASAMA_ETIKET, ASAMA_NOKTA } from "@/lib/asama"
import { api } from "@/lib/api-client"
import type { AsamaGecisiDto, GirisimDetailDto } from "@/lib/types"
import { cn } from "@/lib/utils"

type OlayTuru = "asama" | "program" | "yatirim" | "gelisim" | "basari"

interface Olay {
  id: string
  tarih: string
  tur: OlayTuru
  baslik: string
  aciklama?: string | null
  nokta: string
}

const TUR_IKONU: Record<OlayTuru, React.ComponentType<{ className?: string }>> = {
  asama: Flag,
  program: Layers,
  yatirim: Banknote,
  gelisim: TrendingUp,
  basari: Award,
}

function formatTarih(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
}

/**
 * Girişimin yolculuğu tek bir dikey çizelgede: aşama geçişleri, program katılımları, yatırım
 * turları, gelişim adımları ve başarılar.
 *
 * Bu ekranın varlık sebebi, sistemin asıl sorusunun "şu an ne durumda" değil "programdan önce
 * neydi, program sırasında ne oldu, sonra ne yaptı" olması. Ayrı ayrı listelerde duran veriler
 * bu soruyu cevaplamıyordu; aynı zaman ekseninde durunca cevaplıyor.
 */
export function AsamaCizelgesi({ girisim }: { girisim: GirisimDetailDto }) {
  const gecmisQuery = useQuery({
    queryKey: ["asama-gecmisi", girisim.id],
    queryFn: async () => (await api.get<AsamaGecisiDto[]>(`/girisimler/${girisim.id}/asama-gecmisi`)).data,
  })

  if (gecmisQuery.isLoading) return <Skeleton className="h-64 w-full" />

  const gecisler = gecmisQuery.data ?? []

  const olaylar: Olay[] = [
    ...gecisler.map((g) => ({
      id: `asama-${g.id}`,
      tarih: g.tarih,
      tur: "asama" as const,
      baslik: g.oncekiAsama
        ? `${ASAMA_ETIKET[g.oncekiAsama]} → ${ASAMA_ETIKET[g.yeniAsama]}`
        : `${ASAMA_ETIKET[g.yeniAsama]} aşamasında başladı`,
      aciklama: g.aciklama,
      nokta: ASAMA_NOKTA[g.yeniAsama],
    })),
    ...girisim.programKatilimlari.map((k) => ({
      id: `program-${k.id}`,
      tarih: k.baslangicTarihi,
      tur: "program" as const,
      baslik: `${k.programAdi} programına katıldı`,
      aciklama: k.baslangictakiAsama ? `Programa ${ASAMA_ETIKET[k.baslangictakiAsama]} aşamasında girdi.` : null,
      nokta: "bg-t3-blue",
    })),
    // Mezuniyet ayrı bir olay: programın bittiği an ve çıkış aşaması takibin ikinci ayağı.
    ...girisim.programKatilimlari
      .filter((k) => k.bitisTarihi && (k.durum === "Mezun" || k.durum === "Ayrildi"))
      .map((k) => ({
        id: `mezun-${k.id}`,
        tarih: k.bitisTarihi!,
        tur: "program" as const,
        baslik: `${k.programAdi} programından ${k.durum === "Mezun" ? "mezun oldu" : "ayrıldı"}`,
        aciklama: k.bitistekiAsama ? `Programdan ${ASAMA_ETIKET[k.bitistekiAsama]} aşamasında çıktı.` : null,
        nokta: "bg-t3-blue",
      })),
    ...girisim.yatirimKayitlari
      .filter((y) => y.onayDurumu === "Onaylandi")
      .map((y) => ({
        id: `yatirim-${y.id}`,
        tarih: y.tarih,
        tur: "yatirim" as const,
        baslik: `${y.tur} yatırımı alındı`,
        aciklama: `${y.tutar.toLocaleString("tr-TR")} ${y.paraBirimi}${y.yatirimciAdi ? ` · ${y.yatirimciAdi}` : ""}`,
        nokta: "bg-amber-500",
      })),
    ...girisim.basarilar
      .filter((b) => b.onayDurumu === "Onaylandi")
      .map((b) => ({
        id: `basari-${b.id}`,
        tarih: b.tarih,
        tur: "basari" as const,
        baslik: b.baslik,
        aciklama: b.aciklama,
        nokta: "bg-yellow-500",
      })),
    ...girisim.gelisimAdimlari.map((a) => ({
      id: `gelisim-${a.id}`,
      tarih: a.tarih,
      tur: "gelisim" as const,
      baslik: a.baslik,
      aciklama: a.aciklama,
      nokta: "bg-emerald-500",
    })),
  ].sort((a, b) => b.tarih.localeCompare(a.tarih))

  return (
    <Card>
      <KartBasligi
        ikon={<Flag className="size-4" />}
        baslik="Girişim Yolculuğu"
        aciklama="Aşama geçişleri, program katılımları, yatırımlar ve kilometre taşları tek zaman ekseninde."
        ton="accent"
        sag={<AsamaRozeti asama={girisim.asama} />}
      />
      <CardContent>
        {olaylar.length === 0 ? (
          <EmptyState icon="🚩" message="Henüz kaydedilmiş bir olay yok." />
        ) : (
          <ol className="relative space-y-5 border-l pl-6">
            {olaylar.map((olay) => {
              const Ikon = TUR_IKONU[olay.tur]
              return (
                <li key={olay.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full ring-4 ring-background",
                      olay.nokta,
                    )}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Ikon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{olay.baslik}</span>
                    <span className="text-xs text-muted-foreground">{formatTarih(olay.tarih)}</span>
                  </div>
                  {olay.aciklama && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{olay.aciklama}</p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
