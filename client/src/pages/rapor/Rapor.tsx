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
import { OkumaKutusu } from "@/components/patterns/OkumaKutusu"
import { AiMetni } from "@/components/patterns/AiMetni"
import { YATIRIM_TUR_LABEL } from "@/lib/labels"
import { aylikTrendOkumasi, sektorDagilimiOkumasi, yatirimTuruOkumasi, type Okuma } from "@/lib/rapor-okumasi"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, extractErrorMessage } from "@/lib/api-client"
import { captureChartPng, type ChartImage } from "@/lib/chart-export"
import { cn } from "@/lib/utils"
import ExcelJS from "exceljs"
import { PDF_FONT, createTurkishPdf } from "@/lib/pdf"
import type {
  AiAnalizDto,
  AiAnalizKaydiDto,
  DashboardFiltreSecenekleriDto,
  DashboardStatsDto,
  YatirimTuru,
} from "@/lib/types"

const ALL_VALUE = "__all__"

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

// -------------------------------------------------------- PDF (jsPDF)

async function downloadPdf(stats: DashboardStatsDto, charts: RaporCharts, aiAnalizMetni?: string) {
  const doc = await createTurkishPdf()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = 50

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = 50
    }
  }

  function sectionTitle(title: string) {
    ensureSpace(24)
    doc.setFont(PDF_FONT, "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 120, 168)
    doc.text(title, margin, y)
    y += 18
    doc.setTextColor(30, 41, 47)
    doc.setFont(PDF_FONT, "normal")
    doc.setFontSize(10)
  }

  async function addChart(title: string, chart: ChartImage | null, okuma: Okuma | null = null) {
    sectionTitle(title)
    if (!chart) {
      doc.text("Veri bulunmuyor.", margin, y)
      y += 20
      return
    }
    const maxWidth = pageWidth - margin * 2
    const displayWidth = Math.min(maxWidth, chart.width)
    const displayHeight = (chart.height / chart.width) * displayWidth
    ensureSpace(displayHeight + 10)
    // Sıkıştırmasız gömülen grafikler raporu 12 MB'a çıkarıyordu — e-postayla paylaşılamayacak kadar ağır.
    doc.addImage(chart.dataUrl, "PNG", margin, y, displayWidth, displayHeight, undefined, "MEDIUM")
    y += displayHeight + 16

    // İndirilen rapor da bir sonuç bıraksın: grafiğin altına ekrandaki okumanın aynısı yazılır.
    if (okuma) {
      doc.setFont(PDF_FONT, "bold")
      doc.setFontSize(10)
      doc.setTextColor(45, 63, 71)
      const baslikSatirlari = doc.splitTextToSize(okuma.baslik, pageWidth - margin * 2) as string[]
      ensureSpace(baslikSatirlari.length * 13 + 6)
      doc.text(baslikSatirlari, margin, y)
      y += baslikSatirlari.length * 13 + 2

      doc.setFont(PDF_FONT, "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      okuma.detaylar.forEach((detay) => {
        const satirlar = doc.splitTextToSize(`• ${detay}`, pageWidth - margin * 2 - 10) as string[]
        ensureSpace(satirlar.length * 12)
        doc.text(satirlar, margin + 10, y)
        y += satirlar.length * 12
      })
      doc.setTextColor(30, 41, 47)
      doc.setFontSize(10)
    }

    y += 24
  }

  doc.setFont(PDF_FONT, "bold")
  doc.setFontSize(16)
  doc.setTextColor(45, 63, 71)
  doc.text("T3 Girişim Ekosistemi — Özet Rapor", margin, y)
  y += 18
  doc.setFont(PDF_FONT, "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Oluşturulma tarihi: ${new Date().toLocaleDateString("tr-TR")}`, margin, y)
  y += 26

  sectionTitle("Genel Durum")
  const kpiRows: [string, string][] = [
    ["Toplam Girişim", stats.toplamGirisim.toLocaleString("tr-TR")],
    ["Aktif Program", stats.aktifProgramSayisi.toLocaleString("tr-TR")],
    ["Bekleyen Onay", stats.bekleyenOnaySayisi.toLocaleString("tr-TR")],
    ["Onaylı Yatırım (TRY)", stats.toplamOnayliYatirim.toLocaleString("tr-TR")],
    ["Onaylı Ciro (TRY)", stats.toplamOnayliCiro.toLocaleString("tr-TR")],
  ]
  kpiRows.forEach(([label, value]) => {
    ensureSpace(16)
    doc.text(label, margin, y)
    doc.text(value, margin + 240, y)
    y += 16
  })
  y += 12

  if (aiAnalizMetni) {
    sectionTitle("AI Analizi")
    const lines = doc.splitTextToSize(aiAnalizMetni, pageWidth - margin * 2) as string[]
    lines.forEach((line) => {
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 14
    })
    y += 12
  }

  await addChart("Aylık Trend (Son 6 Ay)", charts.aylikTrend, aylikTrendOkumasi(stats.aylikTrend))
  await addChart("Yatırım Türü Dağılımı", charts.yatirimTuru, yatirimTuruOkumasi(stats.yatirimTuruDagilimi))
  await addChart("Sektör Dağılımı", charts.sektor, sektorDagilimiOkumasi(stats.sektorDagilimi))

  doc.save(`t3-geys-rapor-${new Date().toISOString().slice(0, 10)}.pdf`)
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
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const trendChartRef = useRef<HTMLDivElement>(null)
  const yatirimChartRef = useRef<HTMLDivElement>(null)
  const sektorChartRef = useRef<HTMLDivElement>(null)

  const [baslangic, setBaslangic] = useState("")
  const [bitis, setBitis] = useState("")
  const [sektorFiltre, setSektorFiltre] = useState(ALL_VALUE)
  const [programFiltre, setProgramFiltre] = useState(ALL_VALUE)
  const [girisimFiltre, setGirisimFiltre] = useState(ALL_VALUE)

  const filterParams = {
    baslangic: baslangic || undefined,
    bitis: bitis || undefined,
    sektor: sektorFiltre === ALL_VALUE ? undefined : sektorFiltre,
    programId: programFiltre === ALL_VALUE ? undefined : programFiltre,
    girisimId: girisimFiltre === ALL_VALUE ? undefined : girisimFiltre,
  }
  const hasActiveFilter = Object.values(filterParams).some((v) => v !== undefined)

  function resetFilters() {
    setBaslangic("")
    setBitis("")
    setSektorFiltre(ALL_VALUE)
    setProgramFiltre(ALL_VALUE)
    setGirisimFiltre(ALL_VALUE)
  }

  const filtreSecenekleriQuery = useQuery({
    queryKey: ["dashboard-filtre-secenekleri"],
    queryFn: async () => (await api.get<DashboardFiltreSecenekleriDto>("/dashboard/filtre-secenekleri")).data,
  })
  const filtreSecenekleri = filtreSecenekleriQuery.data

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", filterParams],
    queryFn: async () => (await api.get<DashboardStatsDto>("/dashboard", { params: filterParams })).data,
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

  async function handleExportPdf() {
    if (!data) return
    setIsExportingPdf(true)
    try {
      const [sektor, yatirimTuru, aylikTrend] = await Promise.all([
        captureChartPng(sektorChartRef.current),
        captureChartPng(yatirimChartRef.current),
        captureChartPng(trendChartRef.current),
      ])
      await downloadPdf(data, { sektor, yatirimTuru, aylikTrend }, displayedAnaliz)
    } catch {
      toast.error("PDF raporu oluşturulamadı. Lütfen tekrar deneyin.")
    } finally {
      setIsExportingPdf(false)
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
            <Button variant="outline" className="gap-1.5" onClick={handleExportPdf} disabled={isExportingPdf}>
              <Download className="size-4" />
              {isExportingPdf ? "Hazırlanıyor…" : "PDF İndir"}
            </Button>
          </div>
        }
      />

      {/* ---------------------------------------------------- Filtreler */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border bg-card px-5 py-4">
        <div className="w-40 space-y-1.5">
          <Label htmlFor="rapor-baslangic" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Başlangıç
          </Label>
          <Input
            id="rapor-baslangic"
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </div>
        <div className="w-40 space-y-1.5">
          <Label htmlFor="rapor-bitis" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Bitiş
          </Label>
          <Input id="rapor-bitis" type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
        </div>
        <div className="w-48 space-y-1.5">
          <Label htmlFor="rapor-sektor-filter" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Sektör
          </Label>
          {/* Base UI, items verilmezse seçili değerin ham hâlini basar ("__all__"). */}
          <Select
            items={{ [ALL_VALUE]: "Tüm sektörler", ...Object.fromEntries((filtreSecenekleri?.sektorler ?? []).map((s) => [s, s])) }}
            value={sektorFiltre}
            onValueChange={(value) => setSektorFiltre(value ?? ALL_VALUE)}
          >
            <SelectTrigger id="rapor-sektor-filter" className="w-full">
              <SelectValue placeholder="Tüm sektörler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm sektörler</SelectItem>
              {(filtreSecenekleri?.sektorler ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56 space-y-1.5">
          <Label htmlFor="rapor-program-filter" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Program
          </Label>
          <Select
            items={{ [ALL_VALUE]: "Tüm programlar", ...Object.fromEntries((filtreSecenekleri?.programlar ?? []).map((p) => [p.id, p.ad])) }}
            value={programFiltre}
            onValueChange={(value) => setProgramFiltre(value ?? ALL_VALUE)}
          >
            <SelectTrigger id="rapor-program-filter" className="w-full">
              <SelectValue placeholder="Tüm programlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm programlar</SelectItem>
              {(filtreSecenekleri?.programlar ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.ad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56 space-y-1.5">
          <Label htmlFor="rapor-girisim-filter" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Girişim
          </Label>
          <Select
            items={{ [ALL_VALUE]: "Tüm girişimler", ...Object.fromEntries((filtreSecenekleri?.girisimler ?? []).map((g) => [g.id, g.ad])) }}
            value={girisimFiltre}
            onValueChange={(value) => setGirisimFiltre(value ?? ALL_VALUE)}
          >
            <SelectTrigger id="rapor-girisim-filter" className="w-full">
              <SelectValue placeholder="Tüm girişimler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm girişimler</SelectItem>
              {(filtreSecenekleri?.girisimler ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.ad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilter && (
          <button onClick={resetFilters} className="mb-2.5 text-xs font-medium text-t3-blue hover:underline">
            Filtreleri temizle
          </button>
        )}
      </div>

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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-role-accent" />
              AI Analizi
            </CardTitle>
            <Button
              size="sm"
              className="gap-1.5 bg-role-accent text-white hover:bg-role-accent-dark"
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
              <AiMetni metin={displayedAnaliz} />
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="size-4 text-muted-foreground" />
              Aylık Trend (Son 6 Ay)
            </CardTitle>
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
          {/* Okuma grafik kabının dışında: PDF/Excel'e giden görüntü yalnızca grafiği içersin. */}
          <div className="px-6 pb-6">
            <OkumaKutusu okuma={aylikTrendOkumasi(data.aylikTrend)} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-muted-foreground" />
              Yatırım Türü Dağılımı
            </CardTitle>
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
          <div className="px-6 pb-6">
            <OkumaKutusu okuma={yatirimTuruOkumasi(data.yatirimTuruDagilimi)} />
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------- Sektör Dağılımı */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="size-4 text-muted-foreground" />
              Sektör Dağılımı
            </CardTitle>
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
        <div className="px-6 pb-6">
          <OkumaKutusu okuma={sektorDagilimiOkumasi(data.sektorDagilimi)} />
        </div>
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
