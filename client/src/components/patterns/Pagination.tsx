import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Shared pager for any list backed by a `PagedResultDto<T>` response
 * (`GET /girisimler`, `/programs`, `/admin/users`).
 *
 * Usage:
 *   const [page, setPage] = useState(1)
 *   const { data } = useQuery({ queryKey: ["girisimler", page, ...], queryFn: ... })
 *   <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Önceki
      </Button>
      <span className="text-sm text-muted-foreground">
        Sayfa <span className="font-semibold text-t3-navy">{page}</span> / {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sonraki
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
