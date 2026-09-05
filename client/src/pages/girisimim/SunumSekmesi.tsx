import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Download, RefreshCw, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import { PDF_FONT, createTurkishPdf } from "@/lib/pdf"
import type { GirisimDetailDto, PitchDeckDto } from "@/lib/types"
import { isAxiosError } from "axios"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
}

/** Her bölüm ayrı bir slayt sayfası — sunum olarak açılabilsin, rapor gibi akmasın. */
async function downloadDeckPdf(girisim: GirisimDetailDto, deck: PitchDeckDto) {
  const doc = await createTurkishPdf({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 56

  deck.bolumler.forEach((bolum, index) => {
    if (index > 0) doc.addPage()

    doc.setFont(PDF_FONT, "bold")
    doc.setFontSize(10)
    doc.setTextColor(0, 120, 168)
    doc.text(girisim.ad.toLocaleUpperCase("tr"), margin, margin)

    doc.setFontSize(26)
    doc.setTextColor(45, 63, 71)
    doc.text(bolum.baslik, margin, margin + 44)

    doc.setDrawColor(0, 120, 168)
    doc.setLineWidth(2)
    doc.line(margin, margin + 58, margin + 64, margin + 58)

    doc.setFont(PDF_FONT, "normal")
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 47)
    const lines = doc.splitTextToSize(bolum.icerik, pageWidth - margin * 2) as string[]
    doc.text(lines, margin, margin + 96, { lineHeightFactor: 1.5 })

    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text(`${index + 1} / ${deck.bolumler.length}`, pageWidth - margin, pageHeight - margin / 2, { align: "right" })
  })

  const safeName = girisim.ad.replace(/[^\p{L}\p{N}]+/gu, "-").toLocaleLowerCase("tr")
  doc.save(`${safeName}-sunum-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Girişimin verisinden üretilen Sequoia pitch deck taslağı. Veri değiştikçe taslak "güncel değil"
 * işaretlenir; girişimci tek tıkla yeniden üretir — sunumun profille birlikte yaşamasının amacı,
 * girişimciye veriyi güncel tutmak için somut bir karşılık vermek.
 */
export function SunumSekmesi({ girisim }: { girisim: GirisimDetailDto }) {
  const queryClient = useQueryClient()

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

  const deck = deckQuery.data

  if (deckQuery.isLoading) return <Skeleton className="h-72 w-full" />

  if (!deck) {
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
            Sequoia pitch deck şablonu · {deck.bolumler.length} bölüm
          </div>
          <div className="text-xs text-muted-foreground">
            Son üretim: {formatDateTime(deck.olusturulmaTarihi)}
            {deck.olusturanAdSoyad && ` · ${deck.olusturanAdSoyad}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void downloadDeckPdf(girisim, deck)}>
            <Download className="mr-2 size-4" />
            PDF indir
          </Button>
          <Button
            className="bg-role-accent text-white hover:bg-role-accent-dark"
            disabled={uretMutation.isPending}
            onClick={() => uretMutation.mutate()}
          >
            <RefreshCw className="mr-2 size-4" />
            {uretMutation.isPending ? "Yenileniyor…" : "Yeniden üret"}
          </Button>
        </div>
      </div>

      {!deck.guncel && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Sunum güncel değil</p>
            <p className="text-amber-800 dark:text-amber-300/90">
              Bu sunum hazırlandıktan sonra girişim verilerin değişti. Yeni rakamların sunuma yansıması
              için yeniden üret.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {deck.bolumler.map((bolum, index) => (
          <Card key={bolum.anahtar}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-baseline gap-2 text-base">
                <span className="text-xs font-bold tabular-nums text-role-accent">
                  {String(index + 1).padStart(2, "0")}
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
    </div>
  )
}
