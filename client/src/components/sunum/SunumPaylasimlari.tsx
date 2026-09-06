import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Copy, Eye, Link2, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { SunumPaylasimiDto } from "@/lib/types"

const SURE_SECENEKLERI: Record<string, string> = {
  "7": "7 gün",
  "30": "30 gün",
  "90": "90 gün",
}

function paylasimUrl(jeton: string) {
  return `${window.location.origin}/sunum/${jeton}`
}

function formatTarih(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", { dateStyle: "medium" })
}

/**
 * Sunumu sistem dışına açan bağlantılar. Giriş yapmamış birine içerik gösterildiği için her
 * bağlantının zorunlu bir son kullanma tarihi var ve girişimci istediği an iptal edebiliyor;
 * süresiz bağlantı seçeneği bilinçli olarak yok.
 */
export function SunumPaylasimlari({ girisimId }: { girisimId: string }) {
  const queryClient = useQueryClient()
  const [sure, setSure] = useState("30")
  const [etiket, setEtiket] = useState("")
  const [kopyalanan, setKopyalanan] = useState<string | null>(null)

  const paylasimlarQuery = useQuery({
    queryKey: ["sunum-paylasimlari", girisimId],
    queryFn: async () => (await api.get<SunumPaylasimiDto[]>(`/girisimler/${girisimId}/sunum-paylasimlari`)).data,
  })

  const olusturMutation = useMutation({
    mutationFn: async () =>
      (await api.post<SunumPaylasimiDto>(`/girisimler/${girisimId}/sunum-paylasimlari`, {
        gecerlilikGun: Number(sure),
        etiket: etiket.trim() || undefined,
      })).data,
    onSuccess: async (yeni) => {
      setEtiket("")
      await queryClient.invalidateQueries({ queryKey: ["sunum-paylasimlari", girisimId] })
      try {
        await navigator.clipboard.writeText(paylasimUrl(yeni.jeton))
        toast.success("Bağlantı oluşturuldu ve panoya kopyalandı.")
      } catch {
        // Pano izni yoksa bağlantı yine listede duruyor; kullanıcı elle kopyalayabilir.
        toast.success("Bağlantı oluşturuldu.")
      }
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Bağlantı oluşturulamadı.")),
  })

  const iptalMutation = useMutation({
    mutationFn: async (paylasimId: string) =>
      (await api.delete(`/girisimler/${girisimId}/sunum-paylasimlari/${paylasimId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sunum-paylasimlari", girisimId] })
      toast.success("Bağlantı iptal edildi; artık açılamaz.")
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Bağlantı iptal edilemedi.")),
  })

  async function kopyala(jeton: string) {
    try {
      await navigator.clipboard.writeText(paylasimUrl(jeton))
      setKopyalanan(jeton)
      setTimeout(() => setKopyalanan(null), 2000)
    } catch {
      toast.error("Panoya kopyalanamadı.")
    }
  }

  const paylasimlar = paylasimlarQuery.data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4 text-role-accent" />
          Paylaşım Bağlantıları
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sunumunu sisteme kayıtlı olmayan birine (ör. bir yatırımcıya) açabilirsin. Bağlantı yalnızca
          sunum bölümlerini ve künyeni gösterir; ciro, yatırım ve istihdam kayıtların paylaşılmaz.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-4">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="paylasim-etiket">Kime? (kendi notun)</Label>
            <Input
              id="paylasim-etiket"
              value={etiket}
              onChange={(e) => setEtiket(e.target.value)}
              placeholder="örn. Ahmet Bey — X Fonu"
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="paylasim-sure">Geçerlilik</Label>
            <Select items={SURE_SECENEKLERI} value={sure} onValueChange={(v) => setSure(v ?? "30")}>
              <SelectTrigger id="paylasim-sure" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURE_SECENEKLERI).map(([deger, etiketMetni]) => (
                  <SelectItem key={deger} value={deger}>
                    {etiketMetni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-role-accent text-white hover:bg-role-accent-dark"
            disabled={olusturMutation.isPending}
            onClick={() => olusturMutation.mutate()}
          >
            {olusturMutation.isPending ? "Oluşturuluyor…" : "Bağlantı oluştur"}
          </Button>
        </div>

        {paylasimlarQuery.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : paylasimlar.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Henüz paylaşım bağlantısı oluşturmadın.</p>
        ) : (
          <ul className="divide-y">
            {paylasimlar.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{p.etiket ?? "Etiketsiz bağlantı"}</span>
                    {p.gecerli ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                        Aktif · {formatTarih(p.gecerlilikBitisi)} tarihine kadar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {p.iptalEdildi ? "İptal edildi" : "Süresi doldu"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="size-3" />
                    {p.goruntulenmeSayisi} görüntülenme
                    {p.sonGoruntulenme && ` · son: ${formatTarih(p.sonGoruntulenme)}`}
                  </div>
                </div>
                {p.gecerli && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => void kopyala(p.jeton)}>
                      {kopyalanan === p.jeton ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      <span className="ml-1.5">{kopyalanan === p.jeton ? "Kopyalandı" : "Kopyala"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={iptalMutation.isPending}
                      onClick={() => iptalMutation.mutate(p.id)}
                      aria-label="Bağlantıyı iptal et"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
