import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Pagination } from "@/components/patterns/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api-client"
import type { IslemKaydiDto, PagedResultDto } from "@/lib/types"

const EYLEM_LABEL: Record<string, string> = {
  KullaniciDavetEdildi: "Kullanıcı davet edildi",
  DavetYenidenGonderildi: "Davet yeniden gönderildi",
  KullaniciDevreDisiBirakildi: "Kullanıcı devre dışı bırakıldı",
  KullaniciAktiflestirildi: "Kullanıcı aktifleştirildi",
  RolDegistirildi: "Rol değiştirildi",
  GirisimAtamasiDegistirildi: "Girişim ataması değiştirildi",
  TopluDavetTamamlandi: "Toplu davet tamamlandı",
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR")
}

export default function IslemGecmisiIndexPage() {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ["islem-gecmisi", page],
    queryFn: async () =>
      (await api.get<PagedResultDto<IslemKaydiDto>>("/admin/islem-gecmisi", { params: { page } })).data,
  })

  const items = query.data?.items ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Denetim"
        title="İşlem Geçmişi"
        subtitle="Sistem yöneticilerinin kullanıcı yönetimi üzerinde yaptığı işlemlerin kaydı."
      />

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="🕓" message="Henüz kayıtlı bir işlem yok." />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Eylem</TableHead>
                <TableHead>Yapan</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(k.createdAt)}</TableCell>
                  <TableCell className="font-medium text-t3-navy">{EYLEM_LABEL[k.eylem] ?? k.eylem}</TableCell>
                  <TableCell>{k.actorAdSoyad}</TableCell>
                  <TableCell>{k.hedefAdSoyad ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{k.detay ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={query.data?.page ?? 1} totalPages={query.data?.totalPages ?? 1} onPageChange={setPage} />
    </div>
  )
}
