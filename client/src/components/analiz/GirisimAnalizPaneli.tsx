import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { GirisimAnalizDto } from "@/lib/types"
import { aiMaddeleriniAyir } from "@/lib/ai-metni"

export type AnalizTuru = "durum" | "gelisim" | "program-etkisi"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Bir girişimin verisi üzerinden AI analizi. Aynı bileşen iki soruyu da karşılar; hangisinin
 * sorulduğunu <c>tur</c> belirler ve metin sunucuda saklandığı için sayfa her açılışta yeniden
 * üretim beklemez.
 */
export function GirisimAnalizPaneli({
  girisimId,
  tur,
  baslik,
  aciklama,
  bosDurumMetni,
}: {
  girisimId: string
  tur: AnalizTuru
  baslik: string
  aciklama: string
  bosDurumMetni: string
}) {
  const queryClient = useQueryClient()
  const queryKey = ["girisim-analiz", girisimId, tur]

  const analizQuery = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return (await api.get<GirisimAnalizDto>(`/girisimler/${girisimId}/ai-analiz/${tur}`)).data
      } catch (error) {
        // Henüz üretilmemiş analiz hata değil, boş durumdur.
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
  })

  const uretMutation = useMutation({
    mutationFn: async () => (await api.post<GirisimAnalizDto>(`/girisimler/${girisimId}/ai-analiz/${tur}`)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      toast.success("Analiz hazır.")
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Analiz üretilemedi.")),
  })

  const analiz = analizQuery.data

  return (
    <Card>
      <KartBasligi
        ikon={<Sparkles className="size-4" />}
        baslik={baslik}
        aciklama={aciklama}
        ton="mor"
        sag={
          <Button
            size="sm"
            variant={analiz ? "outline" : "default"}
            className={analiz ? undefined : "bg-role-accent text-white hover:bg-role-accent-dark"}
            disabled={uretMutation.isPending}
            onClick={() => uretMutation.mutate()}
          >
            {uretMutation.isPending ? "Hazırlanıyor…" : analiz ? "Yeniden analiz et" : "Analiz et"}
          </Button>
        }
      />
      <CardContent>
        {analizQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : analiz ? (
          <div className="space-y-3">
            {/* Düz madde listesi bir metin duvarı gibi okunuyordu; her bulgu numaralı kendi
                kutusunda duruyor ve varsa "Başlık: açıklama" kalıbı başlık olarak ayrılıyor. */}
            <ul className="space-y-2">
              {aiMaddeleriniAyir(analiz.metin).map((madde, i) => {
                const ayrac = madde.indexOf(":")
                const basligiVar = ayrac > 0 && ayrac < 60
                return (
                  <li key={i} className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-role-accent-soft text-[11px] font-bold tabular-nums text-role-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0 text-sm leading-relaxed">
                      {basligiVar ? (
                        <>
                          <span className="font-semibold text-foreground">{madde.slice(0, ayrac)}</span>
                          <span className="text-muted-foreground">{madde.slice(ayrac + 1)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{madde}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(analiz.createdAt)}
              {analiz.createdByAdSoyad && ` · ${analiz.createdByAdSoyad}`}
            </p>
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">{bosDurumMetni}</p>
        )}
      </CardContent>
    </Card>
  )
}
