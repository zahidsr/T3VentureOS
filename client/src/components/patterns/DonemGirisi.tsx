import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CalendarClock, Check, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { api, extractErrorMessage } from "@/lib/api-client"
import { YATIRIM_TUR_LABEL } from "@/lib/labels"
import type { DonemGirisiSonucuDto, EksikDonemDto } from "@/lib/types"

const YATIRIM_YOK = "yok"

/**
 * Bir çeyreğin tüm sayısal verisi tek ekranda. Girişimci daha önce ciro için bir sayfaya, istihdam
 * için başkasına, yatırım için bir üçüncüsüne gitmek zorundaydı; her çeyrek bunu yapması
 * beklenemezdi. Buradaki tek form üç kaydı birden oluşturur, boş bırakılan alanlar atlanır.
 */
export function DonemGirisi({ girisimId }: { girisimId: string }) {
  const queryClient = useQueryClient()
  const [donem, setDonem] = useState<string | null>(null)
  const [ciro, setCiro] = useState("")
  const [ihracat, setIhracat] = useState("")
  const [calisan, setCalisan] = useState("")
  const [yeniIseAlim, setYeniIseAlim] = useState("")
  const [yatirimTuru, setYatirimTuru] = useState(YATIRIM_YOK)
  const [yatirimTutari, setYatirimTutari] = useState("")
  const [sonuc, setSonuc] = useState<DonemGirisiSonucuDto | null>(null)

  const eksikQuery = useQuery({
    queryKey: ["eksik-donemler", girisimId],
    queryFn: async () => (await api.get<EksikDonemDto[]>(`/girisimler/${girisimId}/eksik-donemler`)).data,
  })

  const kaydetMutation = useMutation({
    mutationFn: async (secilenDonem: string) =>
      (await api.post<DonemGirisiSonucuDto>(`/girisimler/${girisimId}/donem-girisi`, {
        donem: secilenDonem,
        ciro: ciro ? Number(ciro) : undefined,
        ihracat: ihracat ? Number(ihracat) : undefined,
        calisanSayisi: calisan ? Number(calisan) : undefined,
        yeniIseAlim: yeniIseAlim ? Number(yeniIseAlim) : undefined,
        yatirimTuru: yatirimTuru !== YATIRIM_YOK ? yatirimTuru : undefined,
        yatirimTutari: yatirimTuru !== YATIRIM_YOK && yatirimTutari ? Number(yatirimTutari) : undefined,
      })).data,
    onSuccess: async (data) => {
      setSonuc(data)
      setCiro(""); setIhracat(""); setCalisan(""); setYeniIseAlim("")
      setYatirimTuru(YATIRIM_YOK); setYatirimTutari(""); setDonem(null)
      await queryClient.invalidateQueries({ queryKey: ["eksik-donemler", girisimId] })
      queryClient.invalidateQueries({ queryKey: ["girisimim"] })
      queryClient.invalidateQueries({ queryKey: ["girisim-durum", girisimId] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Veriler kaydedilemedi.")),
  })

  if (eksikQuery.isLoading) return <Skeleton className="h-40 w-full" />
  const eksikler = eksikQuery.data ?? []

  // Karşılık ekranı: girişimci ne kazandığını girer girmez görsün.
  if (sonuc) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <Check className="size-5" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-t3-navy">{sonuc.donem} verilerin kaydedildi</p>
              <p className="text-sm text-muted-foreground">
                {sonuc.eklenenKayitSayisi} kayıt onaya gönderildi.
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {sonuc.kazanimlar.map((k) => (
              <li key={k} className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-role-accent" />
                <span className="text-muted-foreground">{k}</span>
              </li>
            ))}
          </ul>

          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Puanın ve yatırımcı hazırlığın, kayıtlar yönetici tarafından onaylandığında güncellenir.
          </p>

          <Button variant="outline" onClick={() => setSonuc(null)}>
            Başka bir dönem gir
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (eksikler.length === 0) {
    return (
      <Card>
        <KartBasligi
          ikon={<Check className="size-4" />}
          baslik="Dönem verilerin güncel"
          aciklama="Son dört çeyreğin ciro ve istihdam kayıtları girilmiş durumda."
          ton="olumlu"
        />
      </Card>
    )
  }

  return (
    <Card>
      <KartBasligi
        ikon={<CalendarClock className="size-4" />}
        baslik="Çeyrek verisi gir"
        aciklama="Ciro, ihracat, çalışan sayısı ve varsa yatırım — hepsi tek ekranda, tek gönderimde."
        ton="uyari"
      />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Verisi eksik dönemler</p>
          <div className="flex flex-wrap gap-2">
            {eksikler.map((e) => (
              <button key={e.donem} type="button" onClick={() => setDonem(e.donem)}>
                <Badge
                  variant="outline"
                  className={
                    donem === e.donem
                      ? "border-role-accent bg-role-accent-soft text-role-accent"
                      : "text-muted-foreground hover:bg-muted"
                  }
                >
                  {e.donem}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {donem && (
          <div className="space-y-4 rounded-xl border border-dashed p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="dg-ciro">Ciro (₺)</Label>
                <Input id="dg-ciro" type="number" min="0" value={ciro} onChange={(e) => setCiro(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dg-ihracat">İhracat (₺)</Label>
                <Input id="dg-ihracat" type="number" min="0" value={ihracat} onChange={(e) => setIhracat(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dg-calisan">Çalışan sayısı</Label>
                <Input id="dg-calisan" type="number" min="0" value={calisan} onChange={(e) => setCalisan(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dg-alim">Yeni işe alım</Label>
                <Input id="dg-alim" type="number" min="0" value={yeniIseAlim} onChange={(e) => setYeniIseAlim(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dg-yatirim-tur">Bu dönem yatırım aldın mı?</Label>
                <Select
                  items={{ [YATIRIM_YOK]: "Hayır", ...YATIRIM_TUR_LABEL }}
                  value={yatirimTuru}
                  onValueChange={(v) => setYatirimTuru(v ?? YATIRIM_YOK)}
                >
                  <SelectTrigger id="dg-yatirim-tur" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={YATIRIM_YOK}>Hayır</SelectItem>
                    {Object.entries(YATIRIM_TUR_LABEL).map(([deger, etiket]) => (
                      <SelectItem key={deger} value={deger}>
                        {etiket}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {yatirimTuru !== YATIRIM_YOK && (
                <div className="space-y-1.5">
                  <Label htmlFor="dg-yatirim-tutar">Yatırım tutarı (₺)</Label>
                  <Input
                    id="dg-yatirim-tutar"
                    type="number"
                    min="0"
                    value={yatirimTutari}
                    onChange={(e) => setYatirimTutari(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Boş bıraktığın alanlar kaydedilmez. Kayıtlar yönetici onayına gider.
              </p>
              <Button
                className="bg-role-accent text-white hover:bg-role-accent-dark"
                disabled={kaydetMutation.isPending}
                onClick={() => kaydetMutation.mutate(donem)}
              >
                {kaydetMutation.isPending ? "Gönderiliyor…" : `${donem} verilerini gönder`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
