import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import {
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import jsPDF from "jspdf"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, extractErrorMessage } from "@/lib/api-client"
import { captureChartPng, type ChartImage } from "@/lib/chart-export"
import type { AiAnalizDto, DashboardFiltreSecenekleriDto, GirisimKarsilastirmaDto } from "@/lib/types"

const ALL_SEKTOR = "__all__"

type MetricKey = "sektor" | "kurulusYili" | "ekipBuyuklugu" | "ciro" | "yatirim" | "pazarPayi" | "buyumeOrani"

const METRIC_DEFS: { key: MetricKey; label: string }[] = [
  { key: "sektor", label: "Sektör" },
  { key: "kurulusYili", label: "Kuruluş Yılı" },
  { key: "ekipBuyuklugu", label: "Ekip Büyüklüğü" },
  { key: "ciro", label: "Toplam Onaylı Ciro" },
  { key: "yatirim", label: "Toplam Onaylı Yatırım" },
  { key: "pazarPayi", label: "Pazar Payı (seçili sette)" },
  { key: "buyumeOrani", label: "Büyüme Oranı (Son 6 Ay)" },
]

// Sıra bilerek bu şekilde: kırmızı/yeşil bitişik olmadığında renk körlüğü ayrımı güvenli kalıyor
// (validate_palette.js ile doğrulandı — bitişik en kötü çift ΔE 16.1 deutan / 17.4 normal görüş).
const LINE_COLORS = ["#0078a8", "#f7941d", "#7c3aed", "#dc2626", "#0891b2", "#16a34a"]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value)
}

/** Karşılaştırılan set içindeki ciro payı — gerçek pazar verisi değil, seçili girişimler arasındaki orana dayalı bir vekil (proxy). */
function pazarPayiText(g: GirisimKarsilastirmaDto, selected: GirisimKarsilastirmaDto[]): string {
  const toplam = selected.reduce((sum, x) => sum + x.toplamOnayliCiro, 0)
  if (toplam <= 0) return "—"
  return `%${Math.round((g.toplamOnayliCiro / toplam) * 100)}`
}

/** Son 6 aylık pencerenin ilk ve son ayındaki onaylı ciroya göre kaba bir büyüme oranı. */
function buyumeOraniText(g: GirisimKarsilastirmaDto): string {
  const ilk = g.aylikTrend[0]?.ciro ?? 0
  const son = g.aylikTrend[g.aylikTrend.length - 1]?.ciro ?? 0
  if (ilk > 0) return `%${Math.round(((son - ilk) / ilk) * 100)}`
  if (son > 0) return "Yeni gelir"
  return "—"
}

/** Radar normalizasyonu için ham büyüme skoru — ilk ay ciro 0 ise ("yeni gelir" durumu) yüksek bir skorla temsil edilir. */
function buyumeOraniValue(g: GirisimKarsilastirmaDto): number {
  const ilk = g.aylikTrend[0]?.ciro ?? 0
  const son = g.aylikTrend[g.aylikTrend.length - 1]?.ciro ?? 0
  if (ilk > 0) return ((son - ilk) / ilk) * 100
  return son > 0 ? 200 : 0
}

/** Radar grafiğinin her ekseni farklı birimde (TRY, kişi, %) olduğundan, eksen içi min-max ile 0-100'e normalize edilir. */
function normalizeValues(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 50)
  return values.map((v) => Math.round(((v - min) / (max - min)) * 100))
}

const RADAR_METRIC_DEFS: { key: string; label: string; getValue: (g: GirisimKarsilastirmaDto) => number }[] = [
  { key: "ciro", label: "Ciro", getValue: (g) => g.toplamOnayliCiro },
  { key: "yatirim", label: "Yatırım", getValue: (g) => g.toplamOnayliYatirim },
  { key: "ekip", label: "Ekip Büyüklüğü", getValue: (g) => g.ekipBuyuklugu ?? 0 },
  { key: "buyume", label: "Büyüme Oranı", getValue: buyumeOraniValue },
]

function metricValue(g: GirisimKarsilastirmaDto, key: MetricKey, selected: GirisimKarsilastirmaDto[]): string {
  switch (key) {
    case "sektor":
      return g.sektor ?? "—"
    case "kurulusYili":
      return g.kurulusYili != null ? String(g.kurulusYili) : "—"
    case "ekipBuyuklugu":
      return g.ekipBuyuklugu != null ? `${g.ekipBuyuklugu} kişi` : "—"
    case "ciro":
      return formatCurrency(g.toplamOnayliCiro)
    case "yatirim":
      return formatCurrency(g.toplamOnayliYatirim)
    case "pazarPayi":
      return pazarPayiText(g, selected)
    case "buyumeOrani":
      return buyumeOraniText(g)
  }
}

// -------------------------------------------------- Detaylı analiz PDF'i

async function downloadRakipAnaliziPdf(
  selected: GirisimKarsilastirmaDto[],
  activeMetrics: { key: MetricKey; label: string }[],
  aiAnalizMetni: string | undefined,
  radarChart: ChartImage | null,
  ciroChart: ChartImage | null,
  yatirimChart: ChartImage | null,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
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
    ensureSpace(26)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 120, 168)
    doc.text(title, margin, y)
    y += 18
    doc.setTextColor(30, 41, 47)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
  }

  async function addChart(title: string, chart: ChartImage | null) {
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
    doc.addImage(chart.dataUrl, "PNG", margin, y, displayWidth, displayHeight)
    y += displayHeight + 24
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(45, 63, 71)
  doc.text("Detaylı Rakip Analizi", margin, y)
  y += 18
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Oluşturulma tarihi: ${new Date().toLocaleDateString("tr-TR")}`, margin, y)
  y += 26
  doc.setTextColor(30, 41, 47)

  sectionTitle("Yan Yana Karşılaştırma")
  const usableWidth = pageWidth - margin * 2
  const labelColWidth = 130
  const valueColWidth = (usableWidth - labelColWidth) / selected.length

  ensureSpace(16)
  doc.setFont("helvetica", "bold")
  selected.forEach((g, i) => {
    const lines = doc.splitTextToSize(g.ad, valueColWidth - 6) as string[]
    doc.text(lines, margin + labelColWidth + i * valueColWidth, y)
  })
  y += 14 * Math.max(1, ...selected.map((g) => (doc.splitTextToSize(g.ad, valueColWidth - 6) as string[]).length))
  y += 6
  doc.setFont("helvetica", "normal")

  activeMetrics.forEach((m) => {
    ensureSpace(16)
    doc.setFont("helvetica", "bold")
    doc.text(m.label, margin, y)
    doc.setFont("helvetica", "normal")
    selected.forEach((g, i) => {
      doc.text(metricValue(g, m.key, selected), margin + labelColWidth + i * valueColWidth, y)
    })
    y += 16
  })
  y += 12

  await addChart("Karşılaştırmalı Profil (Normalize Edilmiş)", radarChart)

  if (aiAnalizMetni) {
    sectionTitle("AI Destekli Rakip Analizi")
    const lines = doc.splitTextToSize(aiAnalizMetni, pageWidth - margin * 2) as string[]
    lines.forEach((line) => {
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 14
    })
    y += 12
  }

  await addChart("Ciro Büyüme Trendi (Son 6 Ay)", ciroChart)
  await addChart("Yatırım Trendi (Son 6 Ay)", yatirimChart)

  doc.save(`rakip-analizi-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function numberOrUndefined(value: string) {
  if (value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export default function GirisimKarsilastirmaPage() {
  const [searchParams] = useSearchParams()
  const prefilledRef = useRef(false)

  const [sektor, setSektor] = useState(searchParams.get("sektor") ?? ALL_SEKTOR)
  const [kurulusYiliMin, setKurulusYiliMin] = useState("")
  const [kurulusYiliMax, setKurulusYiliMax] = useState("")
  const [ekipMin, setEkipMin] = useState("")
  const [ekipMax, setEkipMax] = useState("")
  const [ciroMin, setCiroMin] = useState("")
  const [ciroMax, setCiroMax] = useState("")
  const [yatirimMin, setYatirimMin] = useState("")
  const [yatirimMax, setYatirimMax] = useState("")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    new Set(METRIC_DEFS.map((m) => m.key)),
  )
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const radarChartRef = useRef<HTMLDivElement>(null)
  const ciroChartRef = useRef<HTMLDivElement>(null)
  const yatirimChartRef = useRef<HTMLDivElement>(null)

  const aiAnaliziMutation = useMutation({
    mutationFn: async (girisimIds: string[]) =>
      (await api.post<AiAnalizDto>("/girisimler/karsilastirma/ai-analiz", { girisimIds })).data,
  })

  const filterParams = {
    sektor: sektor === ALL_SEKTOR ? undefined : sektor,
    kurulusYiliMin: numberOrUndefined(kurulusYiliMin),
    kurulusYiliMax: numberOrUndefined(kurulusYiliMax),
    ekipMin: numberOrUndefined(ekipMin),
    ekipMax: numberOrUndefined(ekipMax),
    ciroMin: numberOrUndefined(ciroMin),
    ciroMax: numberOrUndefined(ciroMax),
    yatirimMin: numberOrUndefined(yatirimMin),
    yatirimMax: numberOrUndefined(yatirimMax),
  }
  const hasActiveFilter = Object.values(filterParams).some((v) => v !== undefined)

  function resetFilters() {
    setSektor(ALL_SEKTOR)
    setKurulusYiliMin("")
    setKurulusYiliMax("")
    setEkipMin("")
    setEkipMax("")
    setCiroMin("")
    setCiroMax("")
    setYatirimMin("")
    setYatirimMax("")
  }

  const filtreSecenekleriQuery = useQuery({
    queryKey: ["dashboard-filtre-secenekleri"],
    queryFn: async () => (await api.get<DashboardFiltreSecenekleriDto>("/dashboard/filtre-secenekleri")).data,
  })

  const karsilastirmaQuery = useQuery({
    queryKey: ["girisimler-karsilastirma", filterParams],
    queryFn: async () =>
      (await api.get<GirisimKarsilastirmaDto[]>("/girisimler/karsilastirma", { params: filterParams })).data,
  })

  const sonuclar = karsilastirmaQuery.data ?? []

  // Deep-link'ten gelen girişimi (ör. GirisimDetails'ten "Karşılaştır") sonuçlar yüklenince bir kez seçili işaretle.
  useEffect(() => {
    const girisimId = searchParams.get("girisimId")
    if (!girisimId || prefilledRef.current || sonuclar.length === 0) return
    if (sonuclar.some((g) => g.id === girisimId)) {
      setSelectedIds((prev) => new Set(prev).add(girisimId))
      prefilledRef.current = true
    }
  }, [searchParams, sonuclar])

  function toggleSelected(id: string, checked: boolean) {
    aiAnaliziMutation.reset()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleMetric(key: MetricKey, checked: boolean) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const selected = sonuclar.filter((g) => selectedIds.has(g.id))
  const activeMetrics = METRIC_DEFS.filter((m) => selectedMetrics.has(m.key))

  const trendData =
    selected.length > 0
      ? selected[0].aylikTrend.map((_, i) => {
          const row: Record<string, string | number> = { ay: selected[0].aylikTrend[i].ay }
          selected.forEach((g) => {
            row[g.ad] = g.aylikTrend[i]?.ciro ?? 0
          })
          return row
        })
      : []

  const trendDataYatirim =
    selected.length > 0
      ? selected[0].aylikTrend.map((_, i) => {
          const row: Record<string, string | number> = { ay: selected[0].aylikTrend[i].ay }
          selected.forEach((g) => {
            row[g.ad] = g.aylikTrend[i]?.yatirim ?? 0
          })
          return row
        })
      : []

  const radarData =
    selected.length >= 2
      ? RADAR_METRIC_DEFS.map((m) => {
          const normalized = normalizeValues(selected.map((g) => m.getValue(g)))
          const row: Record<string, string | number> = { metric: m.label }
          selected.forEach((g, i) => {
            row[g.ad] = normalized[i]
          })
          return row
        })
      : []

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      const [radarChart, ciroChart, yatirimChart] = await Promise.all([
        captureChartPng(radarChartRef.current),
        captureChartPng(ciroChartRef.current),
        captureChartPng(yatirimChartRef.current),
      ])
      await downloadRakipAnaliziPdf(
        selected,
        activeMetrics,
        aiAnaliziMutation.data?.analiz,
        radarChart,
        ciroChart,
        yatirimChart,
      )
    } catch {
      toast.error("Rakip analizi PDF'i oluşturulamadı. Lütfen tekrar deneyin.")
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Girişim Ekosistemi"
        title="Rakip Karşılaştırma"
        subtitle="Sektör, kuruluş yılı, ekip büyüklüğü, ciro ve yatırım kriterlerine göre girişim setini filtreleyin; karşılaştırmak istediklerinizi seçin."
      />

      {/* ---------------------------------------------------- Filtreler */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="w-52 space-y-1.5">
          <Label htmlFor="k-sektor" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Sektör
          </Label>
          <Select value={sektor} onValueChange={(value) => setSektor(value ?? ALL_SEKTOR)}>
            <SelectTrigger id="k-sektor" className="w-full">
              <SelectValue placeholder="Tüm sektörler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SEKTOR}>Tüm sektörler</SelectItem>
              {(filtreSecenekleriQuery.data?.sektorler ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Kuruluş Yılı</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min"
              value={kurulusYiliMin}
              onChange={(e) => setKurulusYiliMin(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={kurulusYiliMax}
              onChange={(e) => setKurulusYiliMax(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ekip Büyüklüğü</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min"
              value={ekipMin}
              onChange={(e) => setEkipMin(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={ekipMax}
              onChange={(e) => setEkipMax(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ciro Aralığı (TRY)</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min"
              value={ciroMin}
              onChange={(e) => setCiroMin(e.target.value)}
              className="w-28"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={ciroMax}
              onChange={(e) => setCiroMax(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Yatırım Aralığı (TRY)</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min"
              value={yatirimMin}
              onChange={(e) => setYatirimMin(e.target.value)}
              className="w-28"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={yatirimMax}
              onChange={(e) => setYatirimMax(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        {hasActiveFilter && (
          <button onClick={resetFilters} className="mb-2.5 text-xs font-medium text-t3-blue hover:underline">
            Filtreleri temizle
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- Sonuç listesi */}
      {karsilastirmaQuery.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : sonuclar.length === 0 ? (
        <EmptyState icon="🏢" message="Kriterlere uyan girişim bulunamadı." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kriterlere Uyan Girişimler <span className="font-normal text-muted-foreground">({sonuclar.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Girişim</TableHead>
                    <TableHead>Sektör</TableHead>
                    <TableHead>Kuruluş Yılı</TableHead>
                    <TableHead>Ekip</TableHead>
                    <TableHead>Onaylı Ciro</TableHead>
                    <TableHead>Onaylı Yatırım</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sonuclar.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(g.id)}
                          onCheckedChange={(checked) => toggleSelected(g.id, checked === true)}
                          aria-label={`${g.ad} karşılaştırmaya ekle`}
                        />
                      </TableCell>
                      <TableCell className="flex items-center gap-2 font-medium text-t3-navy">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-t3-blue-light text-xs font-bold text-t3-blue">
                          {getInitials(g.ad)}
                        </span>
                        {g.ad}
                      </TableCell>
                      <TableCell>{g.sektor ?? "—"}</TableCell>
                      <TableCell>{g.kurulusYili ?? "—"}</TableCell>
                      <TableCell>{g.ekipBuyuklugu ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(g.toplamOnayliCiro)}</TableCell>
                      <TableCell>{formatCurrency(g.toplamOnayliYatirim)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- Karşılaştırma */}
      {selected.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold text-t3-navy">Detaylı Karşılaştırma</h2>
            <Button variant="outline" className="gap-1.5" onClick={handleExportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? "Hazırlanıyor…" : "Detaylı Analiz PDF İndir"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gösterilecek Metrikler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {METRIC_DEFS.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={selectedMetrics.has(m.key)}
                      onCheckedChange={(checked) => toggleMetric(m.key, checked === true)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yan Yana Karşılaştırma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metrik</TableHead>
                      {selected.map((g) => (
                        <TableHead key={g.id}>{g.ad}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeMetrics.map((m) => (
                      <TableRow key={m.key}>
                        <TableCell className="font-semibold text-t3-navy">{m.label}</TableCell>
                        {selected.map((g) => (
                          <TableCell key={g.id}>{metricValue(g, m.key, selected)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Pazar payı, gerçek pazar verisi değil; yalnızca seçili girişimler arasındaki onaylı ciro oranına dayalı kaba bir tahmindir.
              </p>
            </CardContent>
          </Card>

          {selected.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Karşılaştırmalı Profil</CardTitle>
              </CardHeader>
              <CardContent ref={radarChartRef}>
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {selected.map((g, i) => (
                      <Radar
                        key={g.id}
                        name={g.ad}
                        dataKey={g.ad}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        fill={LINE_COLORS[i % LINE_COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  Her eksen, seçili girişimler arasında 0-100 aralığına ayrı ayrı normalize edilmiştir — mutlak
                  değer değil, göreli konum gösterir (tam tablo için yukarıdaki "Yan Yana Karşılaştırma"ya bakın).
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border-t3-blue/20">
            <CardHeader className="border-b bg-muted/40 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-t3-blue text-white">
                    <Sparkles className="size-4" />
                  </div>
                  <CardTitle className="text-base">AI Destekli Rakip Analizi</CardTitle>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-t3-blue text-white hover:bg-t3-blue-dark"
                  disabled={aiAnaliziMutation.isPending || selected.length < 2}
                  onClick={() => aiAnaliziMutation.mutate(selected.map((g) => g.id))}
                >
                  <Sparkles className="size-4" />
                  {aiAnaliziMutation.isPending
                    ? "Analiz ediliyor…"
                    : aiAnaliziMutation.data
                      ? "Yeniden Oluştur"
                      : "Analiz Oluştur"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selected.length < 2 ? (
                <p className="text-sm text-muted-foreground">Detaylı analiz için en az 2 girişim seçin.</p>
              ) : aiAnaliziMutation.isPending ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : aiAnaliziMutation.isError ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="mt-0.5 text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">AI analizi şu an kullanılamıyor</p>
                    <p className="mt-1 text-xs text-amber-700">
                      {extractErrorMessage(aiAnaliziMutation.error, "Anthropic API'ye bağlanılamadı.")}
                    </p>
                  </div>
                </div>
              ) : aiAnaliziMutation.data ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{aiAnaliziMutation.data.analiz}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  SWOT-benzeri değerlendirme, göreli pazar konumlandırması ve büyüme trendi yorumu içeren bir özet için
                  "Analiz Oluştur"a tıklayın.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ciro Büyüme Trendi (Son 6 Ay)</CardTitle>
            </CardHeader>
            <CardContent ref={ciroChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={64} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selected.map((g, i) => (
                    <Line
                      key={g.id}
                      type="monotone"
                      dataKey={g.ad}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yatırım Trendi (Son 6 Ay)</CardTitle>
            </CardHeader>
            <CardContent ref={yatirimChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendDataYatirim} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={64} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selected.map((g, i) => (
                    <Line
                      key={g.id}
                      type="monotone"
                      dataKey={g.ad}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
