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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
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
            <LinkButton to="/programlar/yeni" className="bg-t3-blue text-white hover:bg-t3-blue-dark">
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
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
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
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Katılımcı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programlar.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/programlar/${p.id}`}
                        className="font-medium text-t3-navy hover:text-t3-blue hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-semibold", programDurumClasses[p.durum])}>
                        {programDurumLabels[p.durum]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(p.baslangicTarihi)}</TableCell>
                    <TableCell>{formatDate(p.bitisTarihi)}</TableCell>
                    <TableCell>{p.katilimciSayisi} katılımcı</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
