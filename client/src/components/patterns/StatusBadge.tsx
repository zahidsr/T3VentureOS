import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const toneMap: Record<string, string> = {
  Open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Trial: "bg-slate-100 text-slate-600 border-slate-200",
  Pending: "bg-slate-100 text-slate-600 border-slate-200",
  Closed: "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-red-50 text-red-700 border-red-200",
  Disabled: "bg-red-50 text-red-700 border-red-200",
  Invited: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Declined: "bg-red-50 text-red-700 border-red-200",
  Withdrawn: "bg-red-50 text-red-700 border-red-200",
  InReview: "bg-t3-blue-light text-t3-blue border-blue-200",
  UnderReview: "bg-t3-blue-light text-t3-blue border-blue-200",
  Submitted: "bg-t3-blue-light text-t3-blue border-blue-200",
  InProgress: "bg-t3-blue-light text-t3-blue border-blue-200",
  // OnayDurumu (Turkish) — SatisKaydi/YatirimKaydi/Basari/Dokuman/GuncellemeTalebi review status
  Beklemede: "bg-slate-100 text-slate-600 border-slate-200",
  Onaylandi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Reddedildi: "bg-red-50 text-red-700 border-red-200",
}

const labelMap: Record<string, string> = {
  Open: "Açık",
  Draft: "Taslak",
  Closed: "Kapalı",
  InReview: "Değerlendirmede",
  Completed: "Tamamlandı",
  Submitted: "Gönderildi",
  UnderReview: "İncelemede",
  Approved: "Onaylandı",
  Rejected: "Reddedildi",
  Withdrawn: "Geri Çekildi",
  Pending: "Bekliyor",
  InProgress: "Devam Ediyor",
  Declined: "Reddedildi",
  Active: "Aktif",
  Suspended: "Askıya Alındı",
  Disabled: "Devre Dışı",
  Invited: "Davet Edildi",
  Trial: "Deneme",
  Basic: "Başlangıç",
  Pro: "Pro",
  Enterprise: "Kurumsal",
  Beklemede: "Beklemede",
  Onaylandi: "Onaylandı",
  Reddedildi: "Reddedildi",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", toneMap[status] ?? "bg-slate-100 text-slate-600 border-slate-200", className)}
    >
      {labelMap[status] ?? status}
    </Badge>
  )
}
