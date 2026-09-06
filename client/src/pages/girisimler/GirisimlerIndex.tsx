import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowRight, Building2, Layers, Search, SlidersHorizontal } from "lucide-react"
import { HeroMetrik, SayfaHero } from "@/components/patterns/SayfaHero"
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
import { API_URL, api } from "@/lib/api-client"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { GirisimSummaryDto, PagedResultDto, ProgramSummaryDto } from "@/lib/types"
import { SeviyeRozeti } from "@/components/patterns/SeviyeRozeti"
import { AsamaRozeti } from "@/components/patterns/AsamaRozeti"

const ALL_PROGRAMS = "__all__"

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "yeni", label: "En Yeni" },
  { value: "puan_desc", label: "Puan (Yüksekten Düşüğe)" },
  { value: "puan_asc", label: "Puan (Düşükten Yükseğe)" },
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

function logoSrcFor(logoUrl: string | null) {
  return logoUrl ? `${API_URL.replace(/\/api\/?$/, "")}${logoUrl}` : null
}

function GirisimCard({ g }: { g: GirisimSummaryDto }) {
  const color = nameColor(g.ad)
  const logoSrc = logoSrcFor(g.logoUrl)
  return (
    <Link
      to={`/girisimler/${g.id}`}
      // Kartlar eşit yükseklikte olsun: açıklaması kısa olan kart, uzun olanın yanında
      // yamuk durmasın diye alt bilgi flex ile en alta itilir.
      className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors duration-150 hover:border-role-accent/40"
    >
      <div className="flex items-start gap-3">
        {logoSrc ? (
          <img src={logoSrc} alt={`${g.ad} logosu`} className="size-11 shrink-0 rounded-xl border object-cover" />
        ) : (
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${color}`}>
            {getInitials(g.ad)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-heading text-base font-bold text-t3-navy transition-colors group-hover:text-role-accent">
              {g.ad}
            </p>
            {/* Girişimin hangi olgunluk aşamasında olduğu, takip sisteminin ana bilgisi. */}
            <AsamaRozeti asama={g.asama} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[g.sektor, g.kurulusYili ? `Kuruluş ${g.kurulusYili}` : null, g.ekipBuyuklugu ? `${g.ekipBuyuklugu} kişi` : null]
              .filter(Boolean)
              .join(" · ") || "Bilgi girilmemiş"}
          </p>
        </div>
      </div>

      {g.kisaTanim ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{g.kisaTanim}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground/60 italic">Açıklama girilmemiş</p>
      )}

      {g.teknoloji && (
        <p className="mt-2 truncate text-xs text-muted-foreground" title={g.teknoloji}>
          {g.teknoloji}
        </p>
      )}

      {/* Rozet başlık satırında girişim adını kısaltıyordu; ad en önemli bilgi, rozet alta indi. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatCiro(g.toplamOnayliCiro) ? `${formatCiro(g.toplamOnayliCiro)} onaylı ciro` : "Ciro kaydı yok"}
          </span>
          <SeviyeRozeti seviye={g.seviye} puan={g.puan} />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-role-accent opacity-0 transition-opacity group-hover:opacity-100">
          Detay <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  )
}

export default function GirisimlerIndexPage() {
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
  // Hero'daki sayı "kayıtlı girişim" mi yoksa "filtre sonucu" mu, etiketi buna göre değişsin.
  const filtreliMi = Boolean(sektor || debouncedAra) || programId !== ALL_PROGRAMS

  return (
    <div>
      <SayfaHero
        eyebrow="Girişim Ekosistemi"
        baslik="Girişimler"
        aciklama="T3 ekosistemindeki girişimlerin profilleri, bulundukları aşama ve ürettikleri değer."
        aksiyonlar={
          <>
            <LinkButton
              to="/girisimler/yeni"
              className="bg-white text-t3-navy hover:bg-white/90"
            >
              + Yeni Girişim
            </LinkButton>
            <LinkButton
              to="/girisimler/karsilastirma"
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Rakip Karşılaştır
            </LinkButton>
          </>
        }
        sag={
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetrik
              ikon={<Building2 className="size-5" />}
              deger={girisimlerQuery.data?.totalCount ?? "—"}
              etiket={filtreliMi ? "Filtreye uyan girişim" : "Kayıtlı girişim"}
              vurgulu
            />
            <HeroMetrik
              ikon={<Layers className="size-5" />}
              deger={programsQuery.data?.totalCount ?? "—"}
              etiket="Hızlandırma programı"
            />
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border bg-card px-5 py-4">
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
          {/* Base UI, items verilmezse seçili değerin ham hâlini basar ("__all__"); etiketler burada da tanımlanır. */}
          <Select
            items={{
              [ALL_PROGRAMS]: "Tüm programlar",
              ...Object.fromEntries((programsQuery.data?.items ?? []).map((p) => [p.id, p.name])),
            }}
            value={programId}
            onValueChange={(value) => { setProgramId(value ?? ALL_PROGRAMS); setPage(1) }}
          >
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
          <Select
            items={Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]))}
            value={sirala}
            onValueChange={(value) => { setSirala(value ?? "yeni"); setPage(1) }}
          >
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
