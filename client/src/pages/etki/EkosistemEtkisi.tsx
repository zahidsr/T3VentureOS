import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Banknote, Globe2, TrendingUp, Users } from "lucide-react"
import { HeroMetrik, SayfaHero } from "@/components/patterns/SayfaHero"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api-client"
import type { EkosistemEtkisiDto } from "@/lib/types"

const RENKLER = {
  ciro: "#0078a8",
  ihracat: "#7c3aed",
  yatirim: "#f7941d",
  istihdam: "#1a7f5a",
} as const

function kisaTutar(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mlr`
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B`
  return value.toLocaleString("tr-TR")
}

function paraEtiketi(value: number) {
  return `${kisaTutar(value)} ₺`
}

function EtkiGrafigi({
  baslik,
  aciklama,
  ikon,
  ton,
  children,
}: {
  baslik: string
  aciklama: string
  ikon: React.ReactNode
  ton: "accent" | "notr" | "olumlu" | "mor"
  children: React.ReactNode
}) {
  return (
    <Card>
      <KartBasligi ikon={ikon} baslik={baslik} aciklama={aciklama} ton={ton} />
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * "T3 ekosistemi ne üretti" sorusunun tek ekranlık cevabı. Girişimlerin tek tek girdiği sayısal
 * veriler burada toplanır; her veri türü kendi grafiğinde kalır, çünkü TL ile kişi aynı eksende
 * kıyaslanamaz.
 */
export default function EkosistemEtkisiPage() {
  const etkiQuery = useQuery({
    queryKey: ["ekosistem-etkisi"],
    queryFn: async () => (await api.get<EkosistemEtkisiDto>("/dashboard/etki")).data,
  })

  if (etkiQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const data = etkiQuery.data
  if (!data) return <EmptyState icon="⚠️" message="Etki verisi yüklenemedi." />

  const veriYok = data.donemler.length === 0

  return (
    <div className="space-y-8">
      <SayfaHero
        eyebrow="Ekosistem Etkisi"
        baslik="T3 ekosistemi ne üretti?"
        aciklama="Girişimlerin girdiği tüm sayısal verilerin toplamı: üretilen ciro, ihracat, çekilen yatırım ve yaratılan istihdam."
        sag={
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetrik ikon={<TrendingUp className="size-5" />} deger={paraEtiketi(data.toplamCiro)} etiket="Toplam Ciro" />
            <HeroMetrik ikon={<Globe2 className="size-5" />} deger={paraEtiketi(data.toplamIhracat)} etiket="Toplam İhracat" />
            <HeroMetrik ikon={<Banknote className="size-5" />} deger={paraEtiketi(data.toplamYatirim)} etiket="Çekilen Yatırım" />
            <HeroMetrik
              ikon={<Users className="size-5" />}
              deger={`${data.guncelIstihdam.toLocaleString("tr-TR")} kişi`}
              etiket="Güncel İstihdam"
              vurgulu
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-role-accent-soft text-role-accent">
          <Users className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-muted-foreground">
          Ekosistem, verinin başladığı dönemden bugüne{" "}
          <span className="font-semibold text-foreground">{data.istihdamArtisi.toLocaleString("tr-TR")} kişilik</span>{" "}
          net istihdam artışı ve <span className="font-semibold text-foreground">{paraEtiketi(data.toplamIhracat)}</span>{" "}
          ihracat üretti.
        </p>
        <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          {data.veriGirenGirisimSayisi}/{data.toplamGirisimSayisi} girişim veri girdi
        </span>
      </div>

      {veriYok ? (
        <EmptyState icon="📊" message="Henüz onaylanmış veri yok." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <EtkiGrafigi baslik="Ciro" aciklama="Tüm girişimlerin dönemsel onaylı cirosu." ikon={<TrendingUp className="size-4" />} ton="accent">
              <BarChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                <Bar dataKey="ciro" name="Ciro" fill={RENKLER.ciro} radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </EtkiGrafigi>

            <EtkiGrafigi baslik="İhracat" aciklama="Dönemsel toplam ihracat." ikon={<Globe2 className="size-4" />} ton="mor">
              <AreaChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                <Area dataKey="ihracat" name="İhracat" stroke={RENKLER.ihracat} fill={RENKLER.ihracat} fillOpacity={0.15} strokeWidth={2.5} />
              </AreaChart>
            </EtkiGrafigi>

            <EtkiGrafigi baslik="Çekilen Yatırım" aciklama="Yatırım turlarının gerçekleştiği dönemler." ikon={<Banknote className="size-4" />} ton="notr">
              <BarChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                <Bar dataKey="yatirim" name="Yatırım" fill={RENKLER.yatirim} radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </EtkiGrafigi>

            <EtkiGrafigi
              baslik="İstihdam"
              aciklama="Ekosistemdeki toplam çalışan sayısı. O dönem kayıt girmemiş girişimlerin son bilinen sayısı taşınır."
              ikon={<Users className="size-4" />}
              ton="olumlu"
            >
              <LineChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={44} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString("tr-TR")} kişi`, "Çalışan"]} />
                <Line dataKey="istihdam" name="Çalışan" stroke={RENKLER.istihdam} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </EtkiGrafigi>
          </div>
        </>
      )}
    </div>
  )
}
