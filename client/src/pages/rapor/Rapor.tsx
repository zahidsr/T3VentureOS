import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
import { cn } from "@/lib/utils"
import ExcelJS from "exceljs"
import type { AiAnalizDto, AiAnalizKaydiDto, DashboardStatsDto, YatirimTuru } from "@/lib/types"

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

// -------------------------------------------------------- Excel (styled + grafikli)

const XLSX_T3_BLUE = "FF0078A8"
const XLSX_T3_NAVY = "FF2D3F47"
const XLSX_ROW_TINT = "FFEBF6F9"
const XLSX_BORDER = "FFD7E4E8"
const XLSX_MUTED = "FF64748B"

interface ChartImage {
  dataUrl: string
  width: number
  height: number
}

/** Serializes the container's rendered <svg> to a PNG data URL so it can be embedded in the Excel export. */
async function captureChartPng(container: HTMLElement | null, scale = 2): Promise<ChartImage | null> {
  const svg = container?.querySelector("svg")
  if (!svg) return null

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))

  const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Grafik görüntüsü oluşturulamadı."))
      image.src = url
    })

    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)

    return { dataUrl: canvas.toDataURL("image/png"), width, height }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_T3_BLUE } }
    cell.alignment = { vertical: "middle" }
    cell.border = { bottom: { style: "thin", color: { argb: XLSX_BORDER } } }
  })
  row.height = 20
}

function styleDataRow(row: ExcelJS.Row, alternate: boolean) {
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: XLSX_BORDER } } }
    if (alternate) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_ROW_TINT } }
  })
}

/** Places a chart image (if captured) at the top of the sheet, then a styled data table below it. */
function addChartSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  chart: ChartImage | null,
  headerRow: string[],
  dataRows: (string | number)[][],
  currencyColumns: number[] = [],
) {
  const ws = workbook.addWorksheet(name)
  let startRow = 1

  if (chart) {
    const imageId = workbook.addImage({ base64: chart.dataUrl, extension: "png" })
    const displayWidth = Math.min(620, chart.width)
    const displayHeight = (chart.height / chart.width) * displayWidth
    ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: displayWidth, height: displayHeight } })
    startRow = Math.ceil(displayHeight / 20) + 2
  }

  const headerRowRef = ws.getRow(startRow)
  headerRowRef.values = headerRow
  styleHeaderRow(headerRowRef)

  dataRows.forEach((r, i) => {
    const row = ws.getRow(startRow + 1 + i)
    row.values = r
    styleDataRow(row, i % 2 === 1)
    currencyColumns.forEach((colIdx) => {
      row.getCell(colIdx).numFmt = '#,##0 "₺"'
    })
  })

  headerRow.forEach((_, idx) => {
    ws.getColumn(idx + 1).width = idx === 0 ? 28 : 22
  })
}

interface RaporCharts {
  sektor: ChartImage | null
  yatirimTuru: ChartImage | null
  aylikTrend: ChartImage | null
}

async function downloadXlsx(stats: DashboardStatsDto, charts: RaporCharts) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "T3 GEYS"
  workbook.created = new Date()

  // ---- Özet ----
  const wsOzet = workbook.addWorksheet("Özet")
  wsOzet.mergeCells("A1:B1")
  const title = wsOzet.getCell("A1")
  title.value = "T3 Girişim Ekosistemi — Özet Rapor"
  title.font = { bold: true, size: 15, color: { argb: XLSX_T3_NAVY } }
  wsOzet.getRow(1).height = 26

  wsOzet.mergeCells("A2:B2")
  const subtitle = wsOzet.getCell("A2")
  subtitle.value = `Oluşturulma tarihi: ${new Date().toLocaleDateString("tr-TR")}`
  subtitle.font = { italic: true, size: 10, color: { argb: XLSX_MUTED } }
  wsOzet.getRow(2).height = 18

  const ozetHeader = wsOzet.getRow(4)
  ozetHeader.values = ["Metrik", "Değer"]
  styleHeaderRow(ozetHeader)

  const ozetRows: [string, number][] = [
    ["Toplam Girişim", stats.toplamGirisim],
    ["Aktif Program", stats.aktifProgramSayisi],
    ["Bekleyen Onay", stats.bekleyenOnaySayisi],
    ["Onaylı Yatırım (TRY)", stats.toplamOnayliYatirim],
    ["Onaylı Ciro (TRY)", stats.toplamOnayliCiro],
  ]
  ozetRows.forEach(([metrik, deger], i) => {
    const row = wsOzet.getRow(5 + i)
    row.values = [metrik, deger]
    styleDataRow(row, i % 2 === 1)
    if (metrik.includes("TRY")) row.getCell(2).numFmt = '#,##0 "₺"'
    else row.getCell(2).numFmt = "#,##0"
  })
  wsOzet.getColumn(1).width = 28
  wsOzet.getColumn(2).width = 22

  // ---- Sektör Dağılımı ----
  addChartSheet(
    workbook,
    "Sektör Dağılımı",
    charts.sektor,
    ["Sektör", "Girişim Sayısı"],
    stats.sektorDagilimi.map((s) => [s.sektor, s.sayi]),
  )

  // ---- Yatırım Türü Dağılımı ----
  addChartSheet(
    workbook,
    "Yatırım Türü",
    charts.yatirimTuru,
    ["Yatırım Türü", "Toplam Tutar (TRY)"],
    stats.yatirimTuruDagilimi.map((y) => [YATIRIM_TUR_LABEL[y.tur] ?? y.tur, y.toplamTutar]),
    [2],
  )

  // ---- Aylık Trend ----
  addChartSheet(
    workbook,
    "Aylık Trend",
    charts.aylikTrend,
    ["Ay", "Onaylı Ciro (TRY)", "Onaylı Yatırım (TRY)"],
    stats.aylikTrend.map((a) => [a.ay, a.ciro, a.yatirim]),
    [2, 3],
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `t3-geys-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAnalizId, setSelectedAnalizId] = useState<string | null>(null)
  const [isExportingXlsx, setIsExportingXlsx] = useState(false)
  const trendChartRef = useRef<HTMLDivElement>(null)
  const yatirimChartRef = useRef<HTMLDivElement>(null)
  const sektorChartRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardStatsDto>("/dashboard")).data,
  })

  const aiHistoryQuery = useQuery({
    queryKey: ["ai-analiz-gecmisi"],
    queryFn: async () => (await api.get<AiAnalizKaydiDto[]>("/dashboard/ai-analiz-gecmisi")).data,
  })

  const aiMutation = useMutation({
    mutationFn: async () => (await api.post<AiAnalizDto>("/dashboard/ai-analiz")).data,
    onSuccess: () => {
      setSelectedAnalizId(null)
      queryClient.invalidateQueries({ queryKey: ["ai-analiz-gecmisi"] })
    },
    onError: () => {/* hata kartın içinde gösteriliyor */},
  })

  const aiHistory = aiHistoryQuery.data ?? []
  const latestHistoryItem = aiHistory[0]
  const selectedHistoryItem = aiHistory.find((a) => a.id === selectedAnalizId)
  const displayedAnaliz = aiMutation.data?.analiz ?? selectedHistoryItem?.metin ?? latestHistoryItem?.metin
  const activeHistoryId = aiMutation.data ? undefined : (selectedAnalizId ?? latestHistoryItem?.id)

  async function handleExportXlsx() {
    if (!data) return
    setIsExportingXlsx(true)
    try {
      const [sektor, yatirimTuru, aylikTrend] = await Promise.all([
        captureChartPng(sektorChartRef.current),
        captureChartPng(yatirimChartRef.current),
        captureChartPng(trendChartRef.current),
      ])
      await downloadXlsx(data, { sektor, yatirimTuru, aylikTrend })
    } catch {
      toast.error("Excel raporu oluşturulamadı. Lütfen tekrar deneyin.")
    } finally {
      setIsExportingXlsx(false)
    }
  }

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
            <Button variant="outline" className="gap-1.5" onClick={handleExportXlsx} disabled={isExportingXlsx}>
              <Download className="size-4" />
              {isExportingXlsx ? "Hazırlanıyor…" : "Excel İndir"}
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
                : displayedAnaliz
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
          ) : displayedAnaliz ? (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{displayedAnaliz}</p>
              {aiHistory.length > 1 && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Geçmiş Analizler
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiHistory.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAnalizId(a.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          activeHistoryId === a.id
                            ? "border-t3-blue bg-t3-blue-light text-t3-blue"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {new Date(a.createdAt).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
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
          <CardContent className="pt-6" ref={trendChartRef}>
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
          <CardContent className="pt-6" ref={yatirimChartRef}>
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
        <CardContent className="pt-6" ref={sektorChartRef}>
          {data.sektorDagilimi.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sektör bilgisi girilmiş girişim bulunmuyor.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Bir sektör çubuğuna tıklayarak o sektördeki girişimleri listeleyin.
              </p>
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
                  <Bar
                    dataKey="sayi"
                    fill={T3_BLUE}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                    cursor="pointer"
                    onClick={(entry) => {
                      const sektor = entry?.payload?.sektor as string | undefined
                      if (sektor) navigate(`/girisimler?sektor=${encodeURIComponent(sektor)}`)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
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
