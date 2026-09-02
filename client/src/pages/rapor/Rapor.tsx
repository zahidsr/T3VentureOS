import { useMutation, useQuery } from "@tanstack/react-query"
import { TrendingUp, Activity, Clock, Banknote, BarChart2, Building2, Download, LineChart as LineChartIcon, PieChart as PieChartIcon, Sparkles } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { PageHeader } from "@/components/patterns/PageHeader"
import { StatGrid, StatTile } from "@/components/patterns/StatTile"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, extractErrorMessage } from "@/lib/api-client"
import * as XLSX from "xlsx"
import type { AiAnalizDto, DashboardStatsDto, YatirimTuru } from "@/lib/types"

const YATIRIM_TUR_LABEL: Record<YatirimTuru, string> = {
  Hibe: "Hibe",
  OnTohum: "Ön Tohum",
  Tohum: "Tohum",
  SeriA: "Seri A",
  SeriB: "Seri B",
  SeriSonrasi: "Seri Sonrası",
  Diger: "Diğer",
}

const DONUT_COLORS = ["#0078a8", "#f7941d", "#22a6d4", "#8b5cf6", "#10b981", "#d82020", "#64748b"]

function downloadCsv(stats: DashboardStatsDto) {
  const rows = [
    ["Metrik", "Değer"],
    ["Toplam Girişim", String(stats.toplamGirisim)],
    ["Aktif Program", String(stats.aktifProgramSayisi)],
    ["Bekleyen Onay", String(stats.bekleyenOnaySayisi)],
    ["Onaylı Yatırım (TRY)", String(stats.toplamOnayliYatirim)],
    ["Onaylı Ciro (TRY)", String(stats.toplamOnayliCiro)],
    [],
    ["Sektör", "Girişim Sayısı"],
    ...stats.sektorDagilimi.map((s) => [s.sektor, String(s.sayi)]),
    [],
    ["Yatırım Türü", "Toplam Tutar (TRY)"],
    ...stats.yatirimTuruDagilimi.map((y) => [YATIRIM_TUR_LABEL[y.tur] ?? y.tur, String(y.toplamTutar)]),
    [],
    ["Ay", "Onaylı Ciro (TRY)", "Onaylı Yatırım (TRY)"],
    ...stats.aylikTrend.map((a) => [a.ay, String(a.ciro), String(a.yatirim)]),
  ]
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n")
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `t3-geys-rapor-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadXlsx(stats: DashboardStatsDto) {
  const workbook = XLSX.utils.book_new()

  const ozetRows = [
    { Metrik: "Toplam Girişim", Değer: stats.toplamGirisim },
    { Metrik: "Aktif Program", Değer: stats.aktifProgramSayisi },
    { Metrik: "Bekleyen Onay", Değer: stats.bekleyenOnaySayisi },
    { Metrik: "Onaylı Yatırım (TRY)", Değer: stats.toplamOnayliYatirim },
    { Metrik: "Onaylı Ciro (TRY)", Değer: stats.toplamOnayliCiro },
  ]

  const sektorRows = stats.sektorDagilimi.map((s) => ({ Sektör: s.sektor, "Girişim Sayısı": s.sayi }))
  const yatirimRows = stats.yatirimTuruDagilimi.map((y) => ({ "Yatırım Türü": YATIRIM_TUR_LABEL[y.tur] ?? y.tur, "Toplam Tutar (TRY)": y.toplamTutar }))
  const trendRows = stats.aylikTrend.map((a) => ({ Ay: a.ay, "Onaylı Ciro (TRY)": a.ciro, "Onaylı Yatırım (TRY)": a.yatirim }))

  const wsOzet = XLSX.utils.json_to_sheet(ozetRows)
  const wsSektor = XLSX.utils.json_to_sheet(sektorRows)
  const wsYatirim = XLSX.utils.json_to_sheet(yatirimRows)
  const wsTrend = XLSX.utils.json_to_sheet(trendRows)

  XLSX.utils.book_append_sheet(workbook, wsOzet, "Özet")
  XLSX.utils.book_append_sheet(workbook, wsSektor, "Sektör Dağılımı")
  XLSX.utils.book_append_sheet(workbook, wsYatirim, "Yatırım Türü")
  XLSX.utils.book_append_sheet(workbook, wsTrend, "Aylık Trend")

  XLSX.writeFile(workbook, `t3-geys-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

const T3_BLUE = "#0078a8"
const T3_ORANGE = "#f7941d"

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR")
}

function formatCurrency(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mlr ₺`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} B ₺`
  }
  return `${value.toLocaleString("tr-TR")} ₺`
}

export default function RaporPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardStatsDto>("/dashboard")).data,
  })

  const aiMutation = useMutation({
    mutationFn: async () => (await api.post<AiAnalizDto>("/dashboard/ai-analiz")).data,
    onError: () => {/* hata kartın içinde gösteriliyor */},
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader eyebrow="Rapor" title="Özet Rapor" subtitle="Ekosistem verileri yüklenemedi." />
        <p className="text-sm text-red-600">{extractErrorMessage(error, "Veriler yüklenemedi.")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="T3 Girişim Ekosistemi"
        title="Özet Rapor"
        subtitle="Onaylı girişim verileri üzerinden program ve yatırım durumuna genel bakış."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => downloadCsv(data)}>
              <Download className="size-4" />
              CSV İndir
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => downloadXlsx(data)}>
              <Download className="size-4" />
              Excel İndir
            </Button>
          </div>
        }
      />

      {/* ---------------------------------------------------- İstatistik Kartları */}
      <div>
        <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Genel Durum</p>
        <StatGrid>
          <StatTile
            value={formatNumber(data.toplamGirisim)}
            label="Toplam Girişim"
            tone="info"
            icon={<Building2 className="size-5" />}
          />
          <StatTile
            value={formatNumber(data.aktifProgramSayisi)}
            label="Aktif Program"
            tone="success"
            icon={<Activity className="size-5" />}
          />
          <StatTile
            value={formatNumber(data.bekleyenOnaySayisi)}
            label="Bekleyen Onay"
            tone={data.bekleyenOnaySayisi > 0 ? "warning" : "neutral"}
            icon={<Clock className="size-5" />}
          />
          <StatTile
            value={formatCurrency(data.toplamOnayliYatirim)}
            label="Onaylı Yatırım"
            tone="success"
            icon={<TrendingUp className="size-5" />}
          />
          <StatTile
            value={formatCurrency(data.toplamOnayliCiro)}
            label="Onaylı Ciro"
            tone="info"
            icon={<Banknote className="size-5" />}
          />
        </StatGrid>
      </div>

      {/* ---------------------------------------------------- AI Analizi */}
      <Card className="overflow-hidden border-t3-blue/20">
        <CardHeader className="border-b bg-gradient-to-r from-t3-blue-light to-transparent pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-t3-blue text-white">
                <Sparkles className="size-4" />
              </div>
              <CardTitle className="text-base">AI Analizi</CardTitle>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-t3-blue text-white hover:bg-t3-blue-dark"
              disabled={aiMutation.isPending}
              onClick={() => aiMutation.mutate()}
            >
              <Sparkles className="size-4" />
              {aiMutation.isPending
                ? "Analiz ediliyor…"
                : aiMutation.data
                  ? "Yeniden Analiz Et"
                  : "Analiz Oluştur"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {aiMutation.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : aiMutation.isError ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">AI analizi şu an kullanılamıyor</p>
                <p className="mt-1 text-xs text-amber-700">
                  {extractErrorMessage(aiMutation.error, "Anthropic API'ye bağlanılamadı.")}
                </p>
              </div>
            </div>
          ) : aiMutation.data ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{aiMutation.data.analiz}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ekosistem verilerinin yapay zeka ile yorumlanmış özetini görmek için "Analiz Oluştur"a tıklayın.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- Aylık Trend + Yatırım Türü Dağılımı */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-t3-blue-light">
                <LineChartIcon className="size-4 text-t3-blue" />
              </div>
              <CardTitle className="text-base">Aylık Trend (Son 6 Ay)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {data.aylikTrend.every((a) => a.ciro === 0 && a.yatirim === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Son 6 ayda onaylanmış bir kayıt bulunmuyor.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.aylikTrend} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                    width={64}
                  />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="ciro" name="Onaylı Ciro" stroke={T3_BLUE} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="yatirim" name="Onaylı Yatırım" stroke={T3_ORANGE} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-t3-blue-light">
                <PieChartIcon className="size-4 text-t3-blue" />
              </div>
              <CardTitle className="text-base">Yatırım Türü Dağılımı</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {data.yatirimTuruDagilimi.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Onaylı yatırım kaydı bulunmuyor.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.yatirimTuruDagilimi}
                    dataKey="toplamTutar"
                    nameKey="tur"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {data.yatirimTuruDagilimi.map((entry, i) => (
                      <Cell key={entry.tur} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, _name, item) => [formatCurrency(Number(value)), YATIRIM_TUR_LABEL[item.payload.tur as YatirimTuru] ?? item.payload.tur]} />
                  <Legend
                    formatter={(value) => YATIRIM_TUR_LABEL[value as YatirimTuru] ?? value}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------- Sektör Dağılımı */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-t3-blue-light">
              <BarChart2 className="size-4 text-t3-blue" />
            </div>
            <CardTitle className="text-base">Sektör Dağılımı</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {data.sektorDagilimi.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sektör bilgisi girilmiş girişim bulunmuyor.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, data.sektorDagilimi.length * 44)}>
              <BarChart
                data={data.sektorDagilimi}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="sektor"
                  width={120}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(value) => [formatNumber(Number(value)), "Girişim"]}
                />
                <Bar dataKey="sayi" fill={T3_BLUE} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- Metrik Kartları */}
      <div>
        <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Metrik Açıklamaları</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Building2,
              color: "bg-t3-blue-light text-t3-blue",
              title: "Toplam Girişim",
              desc: "Sistemde kayıtlı tüm girişimlerin sayısı.",
            },
            {
              icon: Activity,
              color: "bg-emerald-50 text-emerald-600",
              title: "Aktif Program",
              desc: "Şu anda yürütülmekte olan girişimcilik programı sayısı.",
            },
            {
              icon: Clock,
              color: "bg-amber-50 text-amber-600",
              title: "Bekleyen Onay",
              desc: "Satış, yatırım, başarı, doküman ve profil güncelleme onay kuyruğu toplamı.",
            },
            {
              icon: TrendingUp,
              color: "bg-emerald-50 text-emerald-600",
              title: "Onaylı Yatırım",
              desc: "Yönetici onayından geçmiş tüm yatırım kayıtlarının TRY toplamı.",
            },
            {
              icon: Banknote,
              color: "bg-t3-blue-light text-t3-blue",
              title: "Onaylı Ciro",
              desc: "Yönetici onayından geçmiş tüm satış kayıtlarının toplam ciro TRY değeri.",
            },
          ].map((m) => (
            <div key={m.title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${m.color}`}>
                <m.icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-t3-navy">{m.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
