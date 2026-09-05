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
import { PageHeader } from "@/components/patterns/PageHeader"
import { StatGrid, StatTile } from "@/components/patterns/StatTile"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  children,
}: {
  baslik: string
  aciklama: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{baslik}</CardTitle>
        <p className="text-xs text-muted-foreground">{aciklama}</p>
      </CardHeader>
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
      <PageHeader
        eyebrow="Ekosistem Etkisi"
        title="Ekosistem Etkisi"
        subtitle="Girişimlerin girdiği tüm sayısal verilerin toplamı: üretilen ciro, ihracat, çekilen yatırım ve yaratılan istihdam."
      />

      <StatGrid>
        <StatTile value={paraEtiketi(data.toplamCiro)} label="Toplam Ciro" tone="info" icon={<TrendingUp className="size-4" />} />
        <StatTile value={paraEtiketi(data.toplamIhracat)} label="Toplam İhracat" tone="neutral" icon={<Globe2 className="size-4" />} />
        <StatTile value={paraEtiketi(data.toplamYatirim)} label="Çekilen Yatırım" tone="success" icon={<Banknote className="size-4" />} />
        <StatTile
          value={`${data.guncelIstihdam.toLocaleString("tr-TR")} kişi`}
          label="Güncel İstihdam"
          tone="success"
          icon={<Users className="size-4" />}
        />
        <StatTile
          value={`${data.veriGirenGirisimSayisi}/${data.toplamGirisimSayisi}`}
          label="Veri Giren Girişim"
          tone={data.veriGirenGirisimSayisi < data.toplamGirisimSayisi ? "warning" : "success"}
        />
      </StatGrid>

      {veriYok ? (
        <EmptyState icon="📊" message="Henüz onaylanmış veri yok." />
      ) : (
        <>
          <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            Ekosistem, verinin başladığı dönemden bugüne{" "}
            <span className="font-semibold text-foreground">{data.istihdamArtisi.toLocaleString("tr-TR")} kişilik</span> net
            istihdam artışı ve{" "}
            <span className="font-semibold text-foreground">{paraEtiketi(data.toplamIhracat)}</span> ihracat üretti.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <EtkiGrafigi baslik="Ciro" aciklama="Tüm girişimlerin dönemsel onaylı cirosu.">
              <BarChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                <Bar dataKey="ciro" name="Ciro" fill={RENKLER.ciro} radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </EtkiGrafigi>

            <EtkiGrafigi baslik="İhracat" aciklama="Dönemsel toplam ihracat.">
              <AreaChart data={data.donemler} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                <Area dataKey="ihracat" name="İhracat" stroke={RENKLER.ihracat} fill={RENKLER.ihracat} fillOpacity={0.15} strokeWidth={2.5} />
              </AreaChart>
            </EtkiGrafigi>

            <EtkiGrafigi baslik="Çekilen Yatırım" aciklama="Yatırım turlarının gerçekleştiği dönemler.">
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
