import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Award, Banknote, ChevronDown, Flag, Layers, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { AsamaRozeti } from "@/components/patterns/AsamaRozeti"
import { Button } from "@/components/ui/button"
import { ASAMA_ETIKET, ASAMA_NOKTA, ASAMA_SIRASI } from "@/lib/asama"
import { api } from "@/lib/api-client"
import type { AsamaGecisiDto, GirisimAsamasi, GirisimDetailDto } from "@/lib/types"
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
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })
}

/** Şeritte yer dar; aşamaya ulaşılan an "Ağu 2026" olarak kısaltılır. */
function kisaTarih(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", { month: "short", year: "numeric" })
}

/** Varsayılan olarak gösterilen olay sayısı. Kayıt biriktikçe kart sonsuza uzamasın. */
const ILK_GOSTERILEN = 6

/**
 * Aşama ekseni, ulaşılan aşamalar tarihleriyle işaretli. Kartın en üstünde durur çünkü "bu girişim
 * nereden nereye geldi" sorusunun cevabı burada tek satırda okunur; altındaki olay listesi ise
 * detay isteyen için.
 */
function AsamaYolu({ asama, gecisler }: { asama: GirisimAsamasi; gecisler: AsamaGecisiDto[] }) {
  const tarihler = useMemo(() => {
    const map = new Map<GirisimAsamasi, string>()
    for (const g of [...gecisler].sort((a, b) => a.tarih.localeCompare(b.tarih))) {
      if (!map.has(g.yeniAsama)) map.set(g.yeniAsama, g.tarih)
    }
    return map
  }, [gecisler])

  const simdikiIndex = ASAMA_SIRASI.indexOf(asama)

  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-3">
      {ASAMA_SIRASI.map((a, i) => {
        const ulasildi = i <= simdikiIndex
        const buradayiz = i === simdikiIndex
        const tarih = tarihler.get(a)
        return (
          <li key={a} className="flex min-w-[5.5rem] flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full",
                !ulasildi ? "bg-muted" : tarih ? ASAMA_NOKTA[asama] : "bg-muted-foreground/25",
              )}
            />
            <div>
              <p
                className={cn(
                  "text-xs leading-tight",
                  buradayiz
                    ? "font-bold text-foreground"
                    : ulasildi
                      ? "font-medium text-foreground/70"
                      : "text-muted-foreground/50",
                )}
              >
                {ASAMA_ETIKET[a]}
              </p>
              {/* Geçiş kaydı olmayan ama geride kalmış aşama: girişim oraya hiç uğramamış
                  (ör. Prototip'ten doğrudan İlk Müşteri'ye geçmiş). "Bilinmiyor" demek yanıltıcı
                  olurdu, atlandığını açıkça yazıyoruz. */}
              <p className="text-[11px] leading-tight text-muted-foreground">
                {tarih ? kisaTarih(tarih) : ulasildi ? "atlandı" : ""}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
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
  const [hepsi, setHepsi] = useState(false)
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

  // Liste varsayılan olarak kısaltılır; yıl başlıkları ancak kesme yapıldıktan sonra hesaplanır ki
  // "2025" başlığı altında tek bir olay kalıp gerisi gizlenmiş gibi görünmesin.
  const kesilmis = hepsi ? olaylar : olaylar.slice(0, ILK_GOSTERILEN)
  const gosterilecek: { yil: string; olaylar: Olay[] }[] = []
  for (const olay of kesilmis) {
    const yil = olay.tarih.slice(0, 4)
    const sonGrup = gosterilecek.at(-1)
    if (sonGrup?.yil === yil) sonGrup.olaylar.push(olay)
    else gosterilecek.push({ yil, olaylar: [olay] })
  }

  return (
    <Card>
      <KartBasligi
        ikon={<Flag className="size-4" />}
        baslik="Girişim Yolculuğu"
        aciklama="Girişimin bugüne kadar geçtiği aşamalar ve bu yolda kaydedilen olaylar."
        ton="accent"
        sag={<AsamaRozeti asama={girisim.asama} />}
      />
      <CardContent className="space-y-6">
        <AsamaYolu asama={girisim.asama} gecisler={gecisler} />

        {olaylar.length === 0 ? (
          <EmptyState icon="🚩" message="Henüz kaydedilmiş bir olay yok." />
        ) : (
          <div>
            {gosterilecek.map((grup) => (
              <div key={grup.yil} className="mb-1">
                {/* Yıl başlığı: uzayan listede göz nerede olduğunu bu satırdan bulur. */}
                <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">{grup.yil}</p>
                <ol className="relative space-y-3 border-l pl-6">
                  {grup.olaylar.map((olay) => {
                    const Ikon = TUR_IKONU[olay.tur]
                    return (
                      <li key={olay.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[27px] top-1.5 size-2.5 rounded-full ring-4 ring-background",
                            olay.nokta,
                          )}
                        />
                        <div className="flex flex-wrap items-baseline gap-x-2">
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
              </div>
            ))}

            {olaylar.length > ILK_GOSTERILEN && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => setHepsi((v) => !v)}
              >
                <ChevronDown className={cn("size-4 transition-transform", hepsi && "rotate-180")} />
                {hepsi ? "Daha az göster" : `Önceki ${olaylar.length - ILK_GOSTERILEN} olayı göster`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
