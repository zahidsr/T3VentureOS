import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { GirisimAnalizDto } from "@/lib/types"

export type AnalizTuru = "durum" | "gelisim"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * AI metni madde işaretli düz metin döndürüyor; markdown motoru kurmak yerine satırları listeye
 * çeviriyoruz. Model kalın vurgu için ** kullanabildiğinden bu işaretler temizlenir.
 */
function maddelereAyir(metin: string): string[] {
  return metin
    .split("\n")
    .map((satir) => satir.trim().replace(/^[*\-•]\s*/, "").replace(/\*\*/g, ""))
    .filter(Boolean)
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
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-role-accent" />
              {baslik}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{aciklama}</p>
          </div>
          <Button
            size="sm"
            variant={analiz ? "outline" : "default"}
            className={analiz ? undefined : "bg-role-accent text-white hover:bg-role-accent-dark"}
            disabled={uretMutation.isPending}
            onClick={() => uretMutation.mutate()}
          >
            {uretMutation.isPending ? "Hazırlanıyor…" : analiz ? "Yeniden analiz et" : "Analiz et"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analizQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : analiz ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {maddelereAyir(analiz.metin).map((madde, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-role-accent" />
                  <span>{madde}</span>
                </li>
              ))}
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
