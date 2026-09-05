import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { DashboardStatsDto } from "@/lib/types"

/** SuperAdmin/ProgramYoneticisi only — lets them notice new pending approvals without opening the queue. */
export function usePendingOnayCount(role: string | undefined) {
  const enabled = role === "SuperAdmin" || role === "ProgramYoneticisi"
  const { data } = useQuery({
    queryKey: ["dashboard-pending-count"],
    queryFn: async () => (await api.get<DashboardStatsDto>("/dashboard")).data,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  return data?.bekleyenOnaySayisi ?? 0
}
