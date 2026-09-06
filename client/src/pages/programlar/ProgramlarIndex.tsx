import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { PageHeader } from "@/components/patterns/PageHeader"
import { LinkButton } from "@/components/patterns/LinkButton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Pagination } from "@/components/patterns/Pagination"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { API_URL, api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { programIlerlemesi } from "@/lib/program-progress"
import { cn } from "@/lib/utils"
import type { PagedResultDto, ProgramDurumu, ProgramSummaryDto } from "@/lib/types"

const programDurumLabels: Record<ProgramDurumu, string> = {
  Taslak: "Taslak",
  Aktif: "Aktif",
  Tamamlandi: "Tamamlandı",
  Arsivlendi: "Arşivlendi",
}

const PROGRAM_DURUM_OPTIONS: ProgramDurumu[] = ["Taslak", "Aktif", "Tamamlandi", "Arsivlendi"]
const ALL_DURUMLAR = "__all__"

const programDurumClasses: Record<ProgramDurumu, string> = {
  Taslak: "bg-slate-100 text-slate-600 border-slate-200",
  Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Tamamlandi: "bg-t3-blue-light text-t3-blue border-blue-200",
  Arsivlendi: "bg-red-50 text-red-700 border-red-200",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("tr-TR")
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

function kapakSrcFor(kapakGorseliUrl: string | null) {
  return kapakGorseliUrl ? `${API_URL.replace(/\/api\/?$/, "")}${kapakGorseliUrl}` : null
}

function ProgramCard({ p }: { p: ProgramSummaryDto }) {
  const kapakSrc = kapakSrcFor(p.kapakGorseliUrl)
  const ilerleme = p.durum === "Aktif" ? programIlerlemesi(p.baslangicTarihi, p.bitisTarihi) : null

  return (
    <Link
      to={`/programlar/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors duration-150 hover:border-t3-blue/30"
    >
      <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-t3-navy to-t3-navy-soft">
        {kapakSrc ? (
          <img src={kapakSrc} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-heading text-xl font-extrabold text-white/30">{getInitials(p.name)}</span>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge variant="outline" className={cn("border font-semibold", programDurumClasses[p.durum])}>
            {programDurumLabels[p.durum]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-heading text-base font-bold text-t3-navy transition-colors group-hover:text-t3-blue">
          {p.name}
        </p>
        {p.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/50 italic">Açıklama girilmemiş</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatDate(p.baslangicTarihi)} – {formatDate(p.bitisTarihi)}
          </span>
          <span className="text-border">·</span>
          <span>{p.katilimciSayisi} katılımcı</span>
        </div>

        {ilerleme && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-t3-blue" style={{ width: `${ilerleme.yuzde}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{ilerleme.durumText}</p>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function ProgramlarIndexPage() {
  const { user } = useAuth()
  const canCreate = user?.role === "SuperAdmin" || user?.role === "ProgramYoneticisi"
  const [ara, setAra] = useState("")
  const [durumFilter, setDurumFilter] = useState(ALL_DURUMLAR)
  const [page, setPage] = useState(1)
  const debouncedAra = useDebouncedValue(ara)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["programs", debouncedAra, durumFilter, page],
    queryFn: async () =>
      (
        await api.get<PagedResultDto<ProgramSummaryDto>>("/programs", {
          params: {
            ara: debouncedAra || undefined,
            durum: durumFilter === ALL_DURUMLAR ? undefined : durumFilter,
            page,
          },
        })
      ).data,
  })

  const programlar = data?.items ?? []

  return (
    <div>
      <PageHeader
        eyebrow="T3 Girişim Ekosistemi"
        title="Programlar"
        subtitle="T3 Vakfı'nın girişimcilik programlarını görüntüleyin ve yönetin."
        actions={
          canCreate ? (
            <LinkButton to="/programlar/yeni" className="bg-role-accent text-white hover:bg-role-accent-dark">
              Yeni Program
            </LinkButton>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            id="ara-filter"
            placeholder="Program adı ara…"
            value={ara}
            onChange={(e) => { setAra(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select
          items={{ [ALL_DURUMLAR]: "Tüm durumlar", ...programDurumLabels }}
          value={durumFilter}
          onValueChange={(value) => { setDurumFilter(value ?? ALL_DURUMLAR); setPage(1) }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tüm durumlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DURUMLAR}>Tüm durumlar</SelectItem>
            {PROGRAM_DURUM_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {programDurumLabels[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-red-600">{extractErrorMessage(error, "Programlar yüklenemedi.")}</p>}

      {!isLoading && !isError && programlar.length === 0 && (
        <EmptyState
          icon="🚀"
          message={ara ? "Kriterlere uyan program bulunamadı." : "Henüz bir program oluşturulmamış."}
          action={
            ara ? (
              <button
                onClick={() => { setAra(""); setPage(1) }}
                className="text-sm font-medium text-t3-blue hover:underline"
              >
                Filtreleri temizle
              </button>
            ) : canCreate ? (
              <LinkButton to="/programlar/yeni" variant="outline">
                Yeni Program Oluştur
              </LinkButton>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && programlar.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programlar.map((p) => (
              <ProgramCard key={p.id} p={p} />
            ))}
          </div>
          <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
