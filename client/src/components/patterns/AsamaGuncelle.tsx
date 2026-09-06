import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Flag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { ASAMA_ETIKET, ASAMA_NOKTA, ASAMA_SIRASI, AsamaRozeti } from "@/components/patterns/AsamaRozeti"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { GirisimAsamasi, GirisimDetailDto } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Girişimcinin kendi aşamasını güncellediği yer. Aşama ekseni tıklanabilir bir şerit olarak
 * gösterilir: hangi aşamada olduğunu ve bir sonrakinin ne olduğunu aynı anda görür.
 *
 * Değişiklik tarihi sorulur, çünkü girişimci gerçekleşmeden haftalar sonra girebilir; takibin
 * doğruluğu olayın gerçek tarihine bağlı.
 */
export function AsamaGuncelle({ girisim }: { girisim: GirisimDetailDto }) {
  const queryClient = useQueryClient()
  const [secili, setSecili] = useState<GirisimAsamasi>(girisim.asama)
  const [tarih, setTarih] = useState("")
  const [aciklama, setAciklama] = useState("")

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.put<GirisimDetailDto>(`/girisimler/${girisim.id}/asama`, {
        asama: secili,
        tarih: tarih || undefined,
        aciklama: aciklama.trim() || undefined,
      })).data,
    onSuccess: () => {
      setTarih("")
      setAciklama("")
      queryClient.invalidateQueries({ queryKey: ["girisimim"] })
      queryClient.invalidateQueries({ queryKey: ["asama-gecmisi", girisim.id] })
      queryClient.invalidateQueries({ queryKey: ["girisim-durum", girisim.id] })
      toast.success("Aşaman güncellendi ve yolculuğuna işlendi.")
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Aşama güncellenemedi.")),
  })

  const mevcutIndex = ASAMA_SIRASI.indexOf(girisim.asama)
  const seciliIndex = ASAMA_SIRASI.indexOf(secili)

  return (
    <Card>
      <KartBasligi
        ikon={<Flag className="size-4" />}
        baslik="Girişimin aşaması"
        aciklama="Ürününüz hangi olgunlukta? Bu bilgi, program öncesi ve sonrası gelişiminizin ölçülmesini sağlar."
        ton="accent"
        sag={<AsamaRozeti asama={girisim.asama} />}
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ASAMA_SIRASI.map((a, i) => {
            const gecildi = i <= mevcutIndex
            const secilidir = a === secili
            return (
              <button
                key={a}
                type="button"
                onClick={() => setSecili(a)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                  secilidir ? "border-role-accent bg-role-accent-soft" : "hover:bg-muted/60",
                )}
              >
                <span className={cn("size-2 rounded-full", gecildi ? ASAMA_NOKTA[a] : "bg-muted-foreground/30")} />
                <span className={cn("text-xs font-medium", secilidir ? "text-role-accent" : "text-foreground")}>
                  {ASAMA_ETIKET[a]}
                </span>
              </button>
            )
          })}
        </div>

        {secili !== girisim.asama && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <p className="text-sm">
              <span className="font-medium text-foreground">
                {ASAMA_ETIKET[girisim.asama]} → {ASAMA_ETIKET[secili]}
              </span>{" "}
              <span className="text-muted-foreground">
                {seciliIndex < mevcutIndex
                  ? "Geriye dönük bir değişiklik kaydediyorsun."
                  : "Bu geçiş yolculuğuna kalıcı olarak işlenecek."}
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="asama-tarih">Ne zaman gerçekleşti?</Label>
                <Input id="asama-tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
                <p className="text-xs text-muted-foreground">Boş bırakırsan bugün kabul edilir.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asama-aciklama">Kısa not (isteğe bağlı)</Label>
                <Textarea
                  id="asama-aciklama"
                  rows={2}
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  placeholder="örn. İlk kurumsal müşteriyle sözleşme imzalandı."
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSecili(girisim.asama)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                className="bg-role-accent text-white hover:bg-role-accent-dark"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Kaydediliyor…" : "Aşamayı güncelle"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
