import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  Banknote,
  Building2,
  Clock,
  Layers,
  Mail,
  Presentation,
  BellRing,
  Search,
  Trophy,
  TrendingUp,
} from "lucide-react"
import { HeroMetrik, SayfaHero } from "@/components/patterns/SayfaHero"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { LinkButton } from "@/components/patterns/LinkButton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { InitialsAvatar } from "@/components/patterns/InitialsAvatar"
import { GuncellikRozeti, SeviyeRozeti } from "@/components/patterns/SeviyeRozeti"
import { SeviyeAciklamasi } from "@/components/patterns/SeviyeAciklamasi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { GirisimSaglikDto, PanelOzetiDto } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mlr ₺`
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} B ₺`
  return `${value.toLocaleString("tr-TR")} ₺`
}

/** "17 gün önce" gibi bir ifade, ham tarihten daha hızlı okunur — panelin derdi hız. */
function gunIfadesi(gun: number | null) {
  if (gun === null) return "hiç veri girilmemiş"
  if (gun <= 0) return "bugün"
  if (gun === 1) return "dün"
  return `${gun} gün önce`
}

function TamlikCubugu({ tamamlanan, toplam }: { tamamlanan: number; toplam: number }) {
  const yuzde = Math.round((tamamlanan / toplam) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", yuzde >= 80 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${yuzde}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {tamamlanan}/{toplam}
      </span>
    </div>
  )
}

function GirisimSatiri({
  girisim,
  sag,
  sol,
}: {
  girisim: GirisimSaglikDto
  sag?: React.ReactNode
  sol?: React.ReactNode
}) {
  return (
    <Link
      to={`/girisimler/${girisim.girisimId}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
    >
      {sol}
      <InitialsAvatar name={girisim.ad} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{girisim.ad}</div>
        <div className="truncate text-xs text-muted-foreground">{girisim.sektor ?? "Sektör girilmemiş"}</div>
      </div>
      <div className="shrink-0 text-right">{sag}</div>
    </Link>
  )
}

/**
 * Yöneticinin giriş ekranı. Amaç, "şu girişim ne durumda" sorusunu tek bakışta cevaplamak:
 * önce sayılar, sonra doğrudan eyleme çağıran listeler (bekleyen onay, bayatlamış kayıt, eksik
 * profil), en altta da her girişimi bulup açabileceğin arama.
 */
export default function PanelPage() {
  const { user } = useAuth()
  const [arama, setArama] = useState("")
  const [siralama, setSiralama] = useState<"puan" | "ad" | "guncellik">("puan")
  const aramaDebounced = useDebouncedValue(arama, 200)

  const hatirlatmaMutation = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>("/dashboard/donem-hatirlatmasi")).data,
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(extractErrorMessage(error, "Hatırlatma gönderilemedi.")),
  })

  const panelQuery = useQuery({
    queryKey: ["panel"],
    queryFn: async () => (await api.get<PanelOzetiDto>("/dashboard/panel")).data,
  })

  const data = panelQuery.data

  const filtrelenmis = useMemo(() => {
    const q = aramaDebounced.trim().toLocaleLowerCase("tr")
    const tumu = (data?.tumGirisimler ?? []).filter(
      (g) => !q || g.ad.toLocaleLowerCase("tr").includes(q) || (g.sektor ?? "").toLocaleLowerCase("tr").includes(q),
    )

    return [...tumu].sort((a, b) => {
      if (siralama === "ad") return a.ad.localeCompare(b.ad, "tr")
      // Hiç veri girmemişler (gün = null) en bayat sayılır; listenin başına gelsinler.
      if (siralama === "guncellik") {
        return (b.guncellemeUzerindenGecenGun ?? Number.MAX_SAFE_INTEGER) -
          (a.guncellemeUzerindenGecenGun ?? Number.MAX_SAFE_INTEGER)
      }
      return b.puan - a.puan || a.ad.localeCompare(b.ad, "tr")
    })
  }, [data, aramaDebounced, siralama])

  if (panelQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!data) {
    return <EmptyState icon="⚠️" message="Panel verisi yüklenemedi." />
  }

  const bekleyenUyari = data.bekleyenOnaySayisi > 0
  const bayatSayisi = data.uzunSuredirGuncellenmeyenler.length

  return (
    <div className="space-y-8">
      <SayfaHero
        eyebrow="Genel Bakış"
        baslik={user?.fullName ? `Merhaba, ${user.fullName}` : "Genel Bakış"}
        aciklama="Ekosistemin güncel durumu ve bugün ilgilenmen gereken kayıtlar."
        aksiyonlar={
          data.bekleyenOnaySayisi > 0 ? (
            <LinkButton to="/onaylar" className="bg-white text-t3-navy hover:bg-white/90">
              {data.bekleyenOnaySayisi} kayıt onay bekliyor
            </LinkButton>
          ) : undefined
        }
        sag={
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetrik ikon={<Building2 className="size-5" />} deger={data.toplamGirisim} etiket="Girişim" />
            <HeroMetrik ikon={<Layers className="size-5" />} deger={data.aktifProgramSayisi} etiket="Aktif Program" />
            <HeroMetrik
              ikon={<TrendingUp className="size-5" />}
              deger={formatCompactCurrency(data.toplamOnayliCiro)}
              etiket="Onaylı Ciro"
            />
            <HeroMetrik
              ikon={<Banknote className="size-5" />}
              deger={formatCompactCurrency(data.toplamOnayliYatirim)}
              etiket="Onaylı Yatırım"
            />
          </div>
        }
      />

      {/* Sayılar durumu anlatır ama iş çıkarmaz; asıl değer bu üç listede. */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card>
          <KartBasligi
            ikon={<AlertTriangle className="size-4" />}
            baslik="Onay Bekleyenler"
            ton={bekleyenUyari ? "uyari" : "olumlu"}
          />
          <CardContent className="space-y-3">
            {data.bekleyenOnaySayisi === 0 ? (
              <p className="text-sm text-muted-foreground">Kuyruk temiz, bekleyen kayıt yok.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{data.bekleyenOnaySayisi} kayıt</span> karar bekliyor.
                  En eskisi <span className="font-semibold text-foreground">{data.enEskiBekleyenOnayGun} gündür</span>{" "}
                  kuyrukta.
                </p>
                <LinkButton to="/onaylar" size="sm" className="bg-role-accent text-white hover:bg-role-accent-dark">
                  Onay kuyruğunu aç
                </LinkButton>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <KartBasligi
            ikon={<Clock className="size-4" />}
            baslik="Uzun Süredir Güncellenmeyenler"
            ton={bayatSayisi > 0 ? "uyari" : "notr"}
            sag={
              // Listeyi görmek yetmiyor; yöneticinin tek tek peşine düşmemesi için eylem burada.
              <Button
                size="sm"
                variant="outline"
                disabled={hatirlatmaMutation.isPending}
                onClick={() => hatirlatmaMutation.mutate()}
              >
                <BellRing className="mr-1.5 size-3.5" />
                {hatirlatmaMutation.isPending ? "Gönderiliyor…" : "Hatırlat"}
              </Button>
            }
          />
          <CardContent>
            {bayatSayisi === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tüm girişimler son {data.bayatlikEsigiGun} gün içinde veri girmiş.
              </p>
            ) : (
              <div className="-mx-2 space-y-0.5">
                {data.uzunSuredirGuncellenmeyenler.map((g) => (
                  <GirisimSatiri
                    key={g.girisimId}
                    girisim={g}
                    sag={
                      <span className="text-xs font-medium text-amber-600">
                        {gunIfadesi(g.guncellemeUzerindenGecenGun)}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <KartBasligi ikon={<Building2 className="size-4" />} baslik="Profili Eksik Girişimler" ton="notr" />
          <CardContent className="space-y-3">
            {data.profiliEksikOlanlar.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tüm profiller tamam.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="gap-1">
                    <Mail className="size-3" />
                    {data.iletisimsizGirisimSayisi} iletişim kişisi yok
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Presentation className="size-3" />
                    {data.sunumsuzGirisimSayisi} sunum yok
                  </Badge>
                </div>
                <div className="-mx-2 space-y-0.5">
                  {data.profiliEksikOlanlar.slice(0, 3).map((g) => (
                    <GirisimSatiri
                      key={g.girisimId}
                      girisim={g}
                      sag={<TamlikCubugu tamamlanan={g.tamamlananAdim} toplam={g.toplamAdim} />}
                    />
                  ))}
                </div>
                {data.profiliEksikOlanlar.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    ve {data.profiliEksikOlanlar.length - 3} girişim daha
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Yüksek puanın karşılığı: burada görünmek. */}
      <Card>
        <KartBasligi
          ikon={<Trophy className="size-4" />}
          baslik="Öne Çıkan Girişimler"
          aciklama="Profilini en eksiksiz tutan ve en çok veri giren girişimler."
          ton="uyari"
          sag={<SeviyeAciklamasi rol={user?.role} />}
        />
        <CardContent>
          <div className="-mx-2 space-y-0.5">
            {data.oneCikanlar.map((g, i) => (
              <GirisimSatiri
                key={g.girisimId}
                girisim={g}
                sol={
                  <span className="w-5 text-center text-sm font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                }
                sag={<SeviyeRozeti seviye={g.seviye} puan={g.puan} />}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Tüm Girişimler</CardTitle>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Sırala:</span>
              {(
                [
                  ["puan", "Puan"],
                  ["guncellik", "Güncellik"],
                  ["ad", "Ad"],
                ] as const
              ).map(([deger, etiket]) => (
                <button
                  key={deger}
                  type="button"
                  onClick={() => setSiralama(deger)}
                  className={cn(
                    "rounded-md px-2 py-1 transition-colors",
                    siralama === deger
                      ? "bg-role-accent-soft font-medium text-role-accent"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {etiket}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Girişim ya da sektör ara…"
                className="pl-9"
                aria-label="Girişim ara"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtrelenmis.length === 0 ? (
            <EmptyState icon="🔍" message="Aramaya uyan girişim yok." />
          ) : (
            <div className="-mx-2 divide-y divide-border/60">
              {filtrelenmis.map((g) => (
                <GirisimSatiri
                  key={g.girisimId}
                  girisim={g}
                  sag={
                    <div className="flex items-center gap-3">
                      {g.bekleyenKayitSayisi > 0 && (
                        <Badge variant="outline" className="text-amber-600">
                          {g.bekleyenKayitSayisi} bekleyen
                        </Badge>
                      )}
                      <GuncellikRozeti guncel={g.guncel} gun={g.guncellemeUzerindenGecenGun} />
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {gunIfadesi(g.guncellemeUzerindenGecenGun)}
                      </span>
                      <SeviyeRozeti seviye={g.seviye} puan={g.puan} />
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
