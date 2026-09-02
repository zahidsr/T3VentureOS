import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react"
import { PageHeader } from "@/components/patterns/PageHeader"
import { LinkButton } from "@/components/patterns/LinkButton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Pagination } from "@/components/patterns/Pagination"
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
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { GirisimSummaryDto, PagedResultDto, ProgramSummaryDto } from "@/lib/types"

const ALL_PROGRAMS = "__all__"

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "yeni", label: "En Yeni" },
  { value: "ciro_desc", label: "Ciro (Yüksekten Düşüğe)" },
  { value: "ciro_asc", label: "Ciro (Düşükten Yükseğe)" },
  { value: "ad_asc", label: "Girişim Adı (A-Z)" },
]

function formatCiro(value: number) {
  if (value <= 0) return null
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value)
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

/* deterministic hue from name so each card has a different color */
const tileColors = [
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
  "bg-indigo-50 text-indigo-700",
  "bg-teal-50 text-teal-700",
]

function nameColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return tileColors[Math.abs(hash) % tileColors.length]
}

function GirisimCard({ g }: { g: GirisimSummaryDto }) {
  const color = nameColor(g.ad)
  return (
    <Link
      to={`/girisimler/${g.id}`}
      className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-t3-blue/30 hover:shadow-lg"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${color}`}
        >
          {getInitials(g.ad)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-bold text-t3-navy transition-colors group-hover:text-t3-blue">
            {g.ad}
          </p>
          {g.kisaTanim ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {g.kisaTanim}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/50 italic">Açıklama girilmemiş</p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {g.sektor && (
          <span className="inline-flex items-center rounded-full bg-t3-blue-light px-2.5 py-0.5 text-xs font-semibold text-t3-blue">
            {g.sektor}
          </span>
        )}
        {g.teknoloji && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {g.teknoloji}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="mt-4 flex items-center gap-3 border-t border-dashed pt-3.5 text-xs text-muted-foreground">
        {g.kurulusYili && <span>Kuruluş {g.kurulusYili}</span>}
        {g.ekipBuyuklugu && (
          <>
            <span className="text-border">·</span>
            <span>{g.ekipBuyuklugu} kişi</span>
          </>
        )}
        <span className="ml-auto flex items-center gap-1 font-medium text-t3-blue opacity-0 transition-opacity group-hover:opacity-100">
          Detay <ArrowRight className="size-3" />
        </span>
      </div>
      {formatCiro(g.toplamOnayliCiro) && (
        <div className="mt-2.5 inline-flex w-fit items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          {formatCiro(g.toplamOnayliCiro)} onaylı ciro
        </div>
      )}
    </Link>
  )
}

export default function GirisimlerIndexPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [sektor, setSektor] = useState(searchParams.get("sektor") ?? "")
  const [programId, setProgramId] = useState(ALL_PROGRAMS)
  const [ara, setAra] = useState("")
  const [sirala, setSirala] = useState("yeni")
  const [page, setPage] = useState(1)
  const debouncedAra = useDebouncedValue(ara)

  const programsQuery = useQuery({
    queryKey: ["programs", "all"],
    queryFn: async () =>
      (await api.get<PagedResultDto<ProgramSummaryDto>>("/programs", { params: { pageSize: 100 } })).data,
  })

  const girisimlerQuery = useQuery({
    queryKey: ["girisimler", sektor, programId, debouncedAra, sirala, page],
    queryFn: async () =>
      (
        await api.get<PagedResultDto<GirisimSummaryDto>>("/girisimler", {
          params: {
            sektor: sektor || undefined,
            programId: programId === ALL_PROGRAMS ? undefined : programId,
            ara: debouncedAra || undefined,
            sirala,
            page,
          },
        })
      ).data,
  })

  const girisimler = girisimlerQuery.data?.items ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Girişim Ekosistemi"
        title="Girişimler"
        subtitle="T3 ekosistemindeki girişimlerin profillerini görüntüleyin ve yönetin."
        actions={
          user?.role !== "KararVerici" ? (
            <LinkButton to="/girisimler/yeni" className="bg-t3-blue text-white hover:bg-t3-blue-dark shadow-md shadow-t3-blue/20">
              + Yeni Girişim
            </LinkButton>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground mt-7" />
        <div className="w-64 space-y-1.5">
          <Label htmlFor="ara-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ara
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              id="ara-filter"
              placeholder="Girişim adı veya teknoloji ara…"
              value={ara}
              onChange={(e) => { setAra(e.target.value); setPage(1) }}
              className="pl-8"
            />
          </div>
        </div>
        <div className="w-52 space-y-1.5">
          <Label htmlFor="sektor-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sektör
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              id="sektor-filter"
              placeholder="Örn. Fintech"
              value={sektor}
              onChange={(e) => { setSektor(e.target.value); setPage(1) }}
              className="pl-8"
            />
          </div>
        </div>
        <div className="w-64 space-y-1.5">
          <Label htmlFor="program-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Program
          </Label>
          <Select value={programId} onValueChange={(value) => { setProgramId(value ?? ALL_PROGRAMS); setPage(1) }}>
            <SelectTrigger id="program-filter" className="w-full">
              <SelectValue placeholder="Tüm programlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROGRAMS}>Tüm programlar</SelectItem>
              {(programsQuery.data?.items ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56 space-y-1.5">
          <Label htmlFor="sirala-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sırala
          </Label>
          <Select value={sirala} onValueChange={(value) => { setSirala(value ?? "yeni"); setPage(1) }}>
            <SelectTrigger id="sirala-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(ara || sektor || programId !== ALL_PROGRAMS || sirala !== "yeni") && (
          <button
            onClick={() => { setAra(""); setSektor(""); setProgramId(ALL_PROGRAMS); setSirala("yeni"); setPage(1) }}
            className="mt-6 text-xs font-medium text-t3-blue hover:underline"
          >
            Filtreleri temizle
          </button>
        )}
      </div>

      {/* Results */}
      {girisimlerQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : girisimler.length === 0 ? (
        <EmptyState
          icon="🏢"
          message="Kriterlere uyan girişim bulunamadı."
          action={
            (ara || sektor || programId !== ALL_PROGRAMS || sirala !== "yeni") ? (
              <button
                onClick={() => { setAra(""); setSektor(""); setProgramId(ALL_PROGRAMS); setSirala("yeni"); setPage(1) }}
                className="text-sm font-medium text-t3-blue hover:underline"
              >
                Filtreleri temizle
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {girisimlerQuery.data?.totalCount ?? girisimler.length} girişim listeleniyor
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {girisimler.map((g) => (
              <GirisimCard key={g.id} g={g} />
            ))}
          </div>
          <Pagination
            page={girisimlerQuery.data?.page ?? 1}
            totalPages={girisimlerQuery.data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
