import { useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { AlertTriangle, Download, Pencil, RefreshCw, RotateCcw, Sparkles } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import { PDF_FONT, createTurkishPdf } from "@/lib/pdf"
import { captureChartPng, type ChartImage } from "@/lib/chart-export"
import { aiMaddeleriniAyir } from "@/lib/ai-metni"
import { SunumPaylasimlari } from "@/components/sunum/SunumPaylasimlari"
import type { GirisimDetailDto, PitchDeckBolumuDto, PitchDeckDto } from "@/lib/types"

/** Slaytların kurumsal paleti — grafik serileri ve PDF vurguları aynı renkleri kullanır. */
const SLAYT_RENKLERI = ["#0078a8", "#1a7f5a", "#f7941d", "#7c3aed", "#d82020"]

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B`
  return value.toLocaleString("tr-TR")
}

interface DeckGrafigi {
  baslik: string
  veri: { ad: string; deger: number }[]
}

/** Sunuma yalnızca onaylı kayıtlardan grafik çıkar — metinle aynı veri kaynağına dayansın. */
function deckGrafikleri(girisim: GirisimDetailDto): DeckGrafigi[] {
  const grafikler: DeckGrafigi[] = []

  const ciro = girisim.satisKayitlari
    .filter((s) => s.onayDurumu === "Onaylandi")
    .slice()
    .sort((a, b) => a.donem.localeCompare(b.donem))
    .map((s) => ({ ad: s.donem, deger: s.ciro }))
  if (ciro.length > 0) grafikler.push({ baslik: "Dönemsel Ciro (₺)", veri: ciro })

  const yatirimlar = girisim.yatirimKayitlari.filter((y) => y.onayDurumu === "Onaylandi")
  if (yatirimlar.length > 0) {
    const turBazli = new Map<string, number>()
    for (const y of yatirimlar) turBazli.set(y.tur, (turBazli.get(y.tur) ?? 0) + y.tutar)
    grafikler.push({
      baslik: "Yatırım Turları (₺)",
      veri: [...turBazli.entries()].map(([ad, deger]) => ({ ad, deger })),
    })
  }

  return grafikler
}

function DeckGrafik({ grafik, renkIndex }: { grafik: DeckGrafigi; renkIndex: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={grafik.veri} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="ad" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12 }} width={56} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("tr-TR")} ₺`} />
        <Bar dataKey="deger" radius={[6, 6, 0, 0]}>
          {grafik.veri.map((_, i) => (
            <Cell key={i} fill={SLAYT_RENKLERI[(renkIndex + i) % SLAYT_RENKLERI.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

type SlaytGorseli = ChartImage & { baslik: string }

async function downloadDeckPdf(girisim: GirisimDetailDto, deck: PitchDeckDto, grafikGorselleri: SlaytGorseli[]) {
  const doc = await createTurkishPdf({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 56
  let slaytNo = 0
  const toplamSlayt = deck.bolumler.length + grafikGorselleri.length

  function hexToRgb(hex: string): [number, number, number] {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]
  }

  /** Her slaytın ortak iskeleti: sol kenarda renk şeridi, üstte girişim adı, altta sayfa numarası. */
  function slaytCercevesi(baslik: string, renk: string) {
    if (slaytNo > 0) doc.addPage()
    slaytNo += 1
    const [r, g, b] = hexToRgb(renk)

    doc.setFillColor(r, g, b)
    doc.rect(0, 0, 14, pageHeight, "F")

    doc.setFont(PDF_FONT, "bold")
    doc.setFontSize(10)
    doc.setTextColor(r, g, b)
    doc.text(girisim.ad.toLocaleUpperCase("tr"), margin, margin)

    doc.setFontSize(26)
    doc.setTextColor(45, 63, 71)
    doc.text(baslik, margin, margin + 44)

    doc.setFillColor(r, g, b)
    doc.rect(margin, margin + 54, 64, 4, "F")

    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text(`${slaytNo} / ${toplamSlayt}`, pageWidth - margin, pageHeight - margin / 2, { align: "right" })
  }

  deck.bolumler.forEach((bolum, index) => {
    slaytCercevesi(bolum.baslik, SLAYT_RENKLERI[index % SLAYT_RENKLERI.length])
    doc.setFont(PDF_FONT, "normal")
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 47)
    const temizIcerik = aiMaddeleriniAyir(bolum.icerik).join("\n")
    const lines = doc.splitTextToSize(temizIcerik, pageWidth - margin * 2) as string[]
    doc.text(lines, margin, margin + 96, { lineHeightFactor: 1.5 })
  })

  grafikGorselleri.forEach((gorsel, i) => {
    slaytCercevesi(gorsel.baslik, SLAYT_RENKLERI[(deck.bolumler.length + i) % SLAYT_RENKLERI.length])
    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin - (margin + 90)
    const olcek = Math.min(maxWidth / gorsel.width, maxHeight / gorsel.height)
    doc.addImage(
      gorsel.dataUrl,
      "PNG",
      margin,
      margin + 90,
      gorsel.width * olcek,
      gorsel.height * olcek,
      undefined,
      "MEDIUM",
    )
  })

  const safeName = girisim.ad.replace(/[^\p{L}\p{N}]+/gu, "-").toLocaleLowerCase("tr")
  doc.save(`${safeName}-sunum-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function BolumKarti({
  bolum,
  index,
  onKaydet,
  onSifirla,
  kaydediliyor,
  duzenlenebilir,
}: {
  bolum: PitchDeckBolumuDto
  index: number
  duzenlenebilir: boolean
  onKaydet: (icerik: string) => void
  onSifirla: () => void
  kaydediliyor: boolean
}) {
  const [duzenleniyor, setDuzenleniyor] = useState(false)
  const [taslak, setTaslak] = useState(bolum.icerik)
  const renk = SLAYT_RENKLERI[index % SLAYT_RENKLERI.length]

  function baslaDuzenleme() {
    setTaslak(bolum.icerik)
    setDuzenleniyor(true)
  }

  function kaydet() {
    if (!taslak.trim()) {
      toast.error("Bölüm metni boş bırakılamaz.")
      return
    }
    onKaydet(taslak.trim())
    setDuzenleniyor(false)
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: renk }} />
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-baseline gap-2 text-base">
            <span className="text-xs font-bold tabular-nums" style={{ color: renk }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            {bolum.baslik}
          </CardTitle>
          <div className="flex items-center gap-2">
            {bolum.elleDuzenlendi && (
              <Badge variant="outline" className="text-xs">
                Elle düzenlendi
              </Badge>
            )}
            {duzenlenebilir && !duzenleniyor && (
              <Button variant="ghost" size="icon" onClick={baslaDuzenleme} aria-label={`${bolum.baslik} bölümünü düzenle`}>
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {duzenleniyor ? (
          <div className="space-y-3">
            <Textarea value={taslak} onChange={(e) => setTaslak(e.target.value)} rows={6} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={kaydediliyor} onClick={kaydet}>
                Kaydet
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDuzenleniyor(false)}>
                Vazgeç
              </Button>
              {bolum.elleDuzenlendi && bolum.aiMetniVar && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={kaydediliyor}
                  onClick={() => {
                    onSifirla()
                    setDuzenleniyor(false)
                  }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  AI metnine dön
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{bolum.icerik}</p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Girişimin verisinden üretilen Sequoia pitch deck taslağı. Veri değiştikçe taslak "güncel değil"
 * işaretlenir; girişimci tek tıkla yeniden üretir. Elle düzenlenen bölümler yeniden üretimde
 * korunur — girişimcinin emeği bir "yenile" tıklamasıyla kaybolmasın.
 */
export function SunumPaneli({
  girisim,
  duzenlenebilir = true,
}: {
  girisim: GirisimDetailDto
  /** Yönetici tarafında sunum salt okunur gösterilir: üretim ve düzenleme girişimcinin işidir. */
  duzenlenebilir?: boolean
}) {
  const queryClient = useQueryClient()
  const grafikKaplari = useRef<(HTMLDivElement | null)[]>([])
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false)

  const grafikler = useMemo(() => deckGrafikleri(girisim), [girisim])

  const deckQuery = useQuery({
    queryKey: ["sunum-taslagi", girisim.id],
    queryFn: async () => {
      try {
        return (await api.get<PitchDeckDto>(`/girisimler/${girisim.id}/sunum-taslagi`)).data
      } catch (error) {
        // Henüz üretilmemiş bir taslak hata değil, boş durumdur.
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
  })

  const uretMutation = useMutation({
    mutationFn: async () => (await api.post<PitchDeckDto>(`/girisimler/${girisim.id}/sunum-taslagi`)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["sunum-taslagi", girisim.id], data)
      toast.success("Sunum taslağın hazır.")
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Sunum üretilemedi.")),
  })

  const bolumMutation = useMutation({
    mutationFn: async ({ anahtar, icerik }: { anahtar: string; icerik: string | null }) =>
      (await api.put<PitchDeckDto>(`/girisimler/${girisim.id}/sunum-taslagi/${anahtar}`, { icerik })).data,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["sunum-taslagi", girisim.id], data)
      toast.success(variables.icerik === null ? "AI metnine dönüldü." : "Bölüm güncellendi.")
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Bölüm güncellenemedi.")),
  })

  const deck = deckQuery.data

  async function handlePdf() {
    if (!deck) return
    setPdfHazirlaniyor(true)
    try {
      const gorseller = (
        await Promise.all(
          grafikler.map(async (g, i) => {
            const gorsel = await captureChartPng(grafikKaplari.current[i])
            return gorsel ? { ...gorsel, baslik: g.baslik } : null
          }),
        )
      ).filter((g): g is SlaytGorseli => g !== null)

      await downloadDeckPdf(girisim, deck, gorseller)
    } catch {
      toast.error("Sunum PDF'i oluşturulamadı.")
    } finally {
      setPdfHazirlaniyor(false)
    }
  }

  if (deckQuery.isLoading) return <Skeleton className="h-72 w-full" />

  if (!deck) {
    if (!duzenlenebilir) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Bu girişim henüz sunum taslağı oluşturmamış.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <Sparkles className="size-8 text-role-accent" />
          <div className="max-w-md space-y-1">
            <p className="font-heading text-lg font-bold text-t3-navy">Sunumun henüz hazır değil</p>
            <p className="text-sm text-muted-foreground">
              Profilindeki bilgiler, onaylı ciro ve yatırım kayıtların kullanılarak Sequoia pitch deck
              şablonuna göre 10 bölümlük bir yatırımcı sunumu hazırlanır. Verilerini güncelledikçe
              sunumu yeniden üretebilirsin.
            </p>
          </div>
          <Button
            className="bg-role-accent text-white hover:bg-role-accent-dark"
            disabled={uretMutation.isPending}
            onClick={() => uretMutation.mutate()}
          >
            {uretMutation.isPending ? "Hazırlanıyor…" : "Sunumumu oluştur"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="text-sm">
          <div className="font-medium text-foreground">
            Sequoia pitch deck şablonu · {deck.bolumler.length + grafikler.length} slayt
          </div>
          <div className="text-xs text-muted-foreground">
            Son üretim: {formatDateTime(deck.olusturulmaTarihi)}
            {deck.olusturanAdSoyad && ` · ${deck.olusturanAdSoyad}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pdfHazirlaniyor} onClick={() => void handlePdf()}>
            <Download className="mr-2 size-4" />
            {pdfHazirlaniyor ? "Hazırlanıyor…" : "PDF indir"}
          </Button>
          {duzenlenebilir && (
            <Button
              className="bg-role-accent text-white hover:bg-role-accent-dark"
              disabled={uretMutation.isPending}
              onClick={() => uretMutation.mutate()}
            >
              <RefreshCw className="mr-2 size-4" />
              {uretMutation.isPending ? "Yenileniyor…" : "Yeniden üret"}
            </Button>
          )}
        </div>
      </div>

      {!deck.guncel && duzenlenebilir && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Sunum güncel değil</p>
            <p className="text-amber-800 dark:text-amber-300/90">
              Bu sunum hazırlandıktan sonra girişim verilerin değişti. Yeni rakamların sunuma yansıması
              için yeniden üret. Elle düzenlediğin bölümler korunur.
            </p>
          </div>
        </div>
      )}

      {duzenlenebilir && <SunumPaylasimlari girisimId={girisim.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        {deck.bolumler.map((bolum, index) => (
          <BolumKarti
            key={bolum.anahtar}
            bolum={bolum}
            index={index}
            duzenlenebilir={duzenlenebilir}
            kaydediliyor={bolumMutation.isPending}
            onKaydet={(icerik) => bolumMutation.mutate({ anahtar: bolum.anahtar, icerik })}
            onSifirla={() => bolumMutation.mutate({ anahtar: bolum.anahtar, icerik: null })}
          />
        ))}
      </div>

      {grafikler.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {grafikler.map((grafik, i) => (
            <Card key={grafik.baslik} className="overflow-hidden">
              <div
                className="h-1"
                style={{ backgroundColor: SLAYT_RENKLERI[(deck.bolumler.length + i) % SLAYT_RENKLERI.length] }}
              />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{grafik.baslik}</CardTitle>
              </CardHeader>
              <CardContent
                ref={(el) => {
                  grafikKaplari.current[i] = el
                }}
              >
                <DeckGrafik grafik={grafik} renkIndex={deck.bolumler.length + i} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
