import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Banknote, Target } from "lucide-react"
import { toast } from "sonner"
import { api, extractErrorMessage } from "@/lib/api-client"
import { haftaKaydir, nakitOmru, tutarGecerli } from "@/lib/girisim-araclari"
import type { NakitYaniti, HedefYaniti } from "@/lib/girisim-araclari"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const endpoint = "/girisimler/benim/araclar"
const para = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " ₺"
const tarih = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const ayMetni = (ay: number | null) => ay === null ? "Nakit azalmıyor" : ay === 0 ? "0 ay" : ay < 0.1 ? "0,1 aydan az" : `${ay.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ay`
const queryOptions = { refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 1 }

function Hata({ error, reload }: { error: unknown; reload: () => void }) {
  return <div role="alert" className="space-y-2 text-sm"><p className="text-destructive">{extractErrorMessage(error, "Kayıt yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.")}</p><Button variant="outline" type="button" onClick={reload}>Son kaydı yükle</Button></div>
}

function KayitZamani({ value, dirty }: { value?: string | null; dirty: boolean }) {
  return <p className="text-xs text-muted-foreground" role="status">{dirty ? "Kaydedilmemiş değişiklikler var." : value ? `Son kayıt: ${new Date(value).toLocaleString("tr-TR")}` : "Henüz kayıt yok."}</p>
}

function NakitForm({ data, girisimId, reload }: { data: NakitYaniti; girisimId: string; reload: () => void }) {
  const cache = useQueryClient()
  const initial = [data.plan?.kasadakiPara, data.plan?.aylikGelir, data.plan?.aylikGider].map(n => n?.toString() ?? "")
  const [values, setValues] = useState(initial)
  const [indirim, setIndirim] = useState(0)
  const valid = values.every(tutarGecerli)
  const dirty = values.some((v, i) => v !== initial[i])
  const normal = nakitOmru(Number(values[0]), Number(values[1]), Number(values[2]))
  const senaryo = nakitOmru(Number(values[0]), Number(values[1]), Number(values[2]), indirim)
  const save = useMutation({
    mutationFn: async () => (await api.put<NakitYaniti>(`${endpoint}/nakit`, {
      kasadakiPara: Number(values[0]), aylikGelir: Number(values[1]), aylikGider: Number(values[2]), version: data.plan?.version ?? null,
    })).data,
    onSuccess: result => { cache.setQueryData(["araclar-nakit", girisimId], result); toast.success("Nakit planı kaydedildi.") },
  })
  return <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (valid && dirty) save.mutate() }}>
    <p className="text-sm text-muted-foreground">Gelir ve giderler aynı kalırsa kasanız kaç ay yeter? Tüm tutarlar TL.</p>
    <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-3">
      {["Kasadaki para", "Aylık gelir", "Aylık gider"].map((label, i) => <div className="space-y-1.5" key={label}>
        <Label htmlFor={`nakit-${i}`}>{label}</Label>
        <Input id={`nakit-${i}`} type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" required placeholder="0" value={values[i]} onChange={e => setValues(old => old.map((v, j) => j === i ? e.target.value : v))} />
      </div>)}
    </fieldset>
    <div className="rounded-xl bg-muted/50 p-4" aria-live="polite">
      <p className="text-xs font-medium text-muted-foreground">Tahmini nakit ömrü</p>
      <p className="my-1 text-3xl font-semibold tracking-tight">{valid ? ayMetni(normal.ay) : "—"}</p>
      <p className="text-sm text-muted-foreground">{!valid ? "Üç tutarı da sıfır veya pozitif, en fazla iki ondalık basamakla girin." : normal.netGider > 0 ? `Ayda ${para(normal.netGider)} nakit tüketimi.` : normal.netGider === 0 ? "Aylık gelir ve gider dengede." : `Ayda ${para(-normal.netGider)} nakit fazlası.`}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="nakit-senaryo">Gideri %{indirim} azaltırsam</Label>
      <input id="nakit-senaryo" className="w-full accent-primary" type="range" min="0" max="50" step="5" value={indirim} onChange={e => setIndirim(Number(e.target.value))} disabled={!valid} />
      <p className="text-sm" aria-live="polite">{valid ? `${ayMetni(senaryo.ay)} · Yeni aylık gider: ${para(Number(values[2]) * (1 - indirim / 100))}` : "Senaryo için tutarları girin."}</p>
      <p className="text-xs text-muted-foreground">Senaryo kayıtlı tutarları değiştirmez. Hesap gelecekteki yatırım ve tek seferlik ödemeleri içermez.</p>
    </div>
    {save.isError && <Hata error={save.error} reload={reload} />}
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={!valid || !dirty || save.isPending}>{save.isPending ? "Kaydediliyor…" : "Nakit planını kaydet"}</Button><KayitZamani value={data.plan?.updatedAt} dirty={dirty} /></div>
  </form>
}

function HedefForm({ data, girisimId, reload, changeWeek }: { data: HedefYaniti; girisimId: string; reload: () => void; changeWeek: (s: string) => void }) {
  const cache = useQueryClient()
  const [hedefler, setHedefler] = useState(data.hedefler)
  const dirty = JSON.stringify(hedefler) !== JSON.stringify(data.hedefler)
  const completed = hedefler.filter(h => h.baslik.trim() && h.tamamlandi).length
  const save = useMutation({
    mutationFn: async () => (await api.put<HedefYaniti>(`${endpoint}/hedefler/${data.haftaBaslangici}`, { hedefler, version: data.version ?? null })).data,
    onSuccess: result => {
      cache.setQueryData(["araclar-hedefler", girisimId, data.haftaBaslangici], result)
      // Initial request uses the server's current week, not the browser's timezone.
      if (data.haftaBaslangici === data.buHafta) cache.setQueryData(["araclar-hedefler", girisimId, "current"], result)
      toast.success("Haftalık hedefler kaydedildi.")
    },
  })
  return <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (dirty) save.mutate() }}>
    <p className="text-sm text-muted-foreground">Bu hafta ilerlemek istediğiniz üç konu. Küçük, ölçülebilir adımlar yazın.</p>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" variant="outline" size="sm" disabled={dirty || save.isPending || data.haftaBaslangici <= "2020-01-06"} onClick={() => changeWeek(haftaKaydir(data.haftaBaslangici, -7))}>Önceki hafta</Button>
      <span className="text-xs font-medium">{tarih(data.haftaBaslangici)} – {tarih(haftaKaydir(data.haftaBaslangici, 6))}</span>
      <Button type="button" variant="outline" size="sm" disabled={dirty || save.isPending || data.haftaBaslangici >= data.buHafta} onClick={() => changeWeek(haftaKaydir(data.haftaBaslangici, 7))}>Sonraki hafta</Button>
    </div>
    <div className="flex items-center justify-between text-sm"><span>{data.haftaBaslangici === data.buHafta ? "Bu hafta" : "Geçmiş hafta"} · Türkiye saati</span><span className="font-semibold" role="status">{completed}/3 tamamlandı</span></div>
    <fieldset disabled={save.isPending} className="space-y-3">
      {hedefler.map((h, i) => <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
        <input type="checkbox" className="size-5 shrink-0 accent-primary" aria-label={`${i + 1}. hedef tamamlandı`} checked={h.tamamlandi} disabled={!h.baslik.trim()} onChange={e => setHedefler(old => old.map((item, j) => j === i ? { ...item, tamamlandi: e.target.checked } : item))} />
        <div className="min-w-0 flex-1"><Label htmlFor={`hedef-${i}`} className="mb-1 text-xs text-muted-foreground">{i + 1}. hedef</Label><Input id={`hedef-${i}`} maxLength={200} placeholder={["5 potansiyel müşteriyle görüş", "Ürün demosunu tamamla", "İlk teklifini gönder"][i]} value={h.baslik} className={h.tamamlandi ? "line-through text-muted-foreground" : ""} onChange={e => setHedefler(old => old.map((item, j) => j === i ? { baslik: e.target.value, tamamlandi: !!e.target.value.trim() && item.tamamlandi } : item))} /></div>
      </div>)}
    </fieldset>
    {save.isError && <Hata error={save.error} reload={reload} />}
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={!dirty || save.isPending}>{save.isPending ? "Kaydediliyor…" : "Hedefleri kaydet"}</Button>{dirty && <Button variant="ghost" type="button" disabled={save.isPending} onClick={() => { setHedefler(data.hedefler); save.reset() }}>Vazgeç</Button>}</div>
    <KayitZamani value={data.updatedAt} dirty={dirty} />
    {dirty && <p className="text-xs text-muted-foreground">Hafta değiştirmeden önce kaydedin veya vazgeçin.</p>}
  </form>
}

export function GirisimAraclari({ girisimId }: { girisimId: string }) {
  const [week, setWeek] = useState("current")
  const nakit = useQuery({ ...queryOptions, queryKey: ["araclar-nakit", girisimId], queryFn: async () => (await api.get<NakitYaniti>(`${endpoint}/nakit`)).data })
  const hedef = useQuery({ ...queryOptions, queryKey: ["araclar-hedefler", girisimId, week], queryFn: async () => (await api.get<HedefYaniti>(`${endpoint}/hedefler`, { params: week === "current" ? {} : { hafta: week } })).data })
  return <section aria-label="Girişimci araçları" className="mb-6 grid items-start gap-4 xl:grid-cols-2">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-5 text-primary" />Nakit ömrü</CardTitle></CardHeader><CardContent>
      {nakit.isPending ? <p role="status">Nakit planı yükleniyor…</p> : nakit.isError ? <Hata error={nakit.error} reload={() => void nakit.refetch()} /> : <NakitForm key={`${girisimId}-${nakit.data.plan?.version ?? "empty"}`} girisimId={girisimId} data={nakit.data} reload={() => void nakit.refetch()} />}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" />Haftalık 3 hedef</CardTitle></CardHeader><CardContent>
      {hedef.isPending ? <p role="status">Haftalık hedefler yükleniyor…</p> : hedef.isError ? <Hata error={hedef.error} reload={() => void hedef.refetch()} /> : <HedefForm key={`${girisimId}-${hedef.data.haftaBaslangici}-${hedef.data.version ?? "empty"}`} data={hedef.data} girisimId={girisimId} reload={() => void hedef.refetch()} changeWeek={setWeek} />}
    </CardContent></Card>
  </section>
}
