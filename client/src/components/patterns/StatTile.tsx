import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Tone = "neutral" | "success" | "warning" | "danger" | "info"

const toneBar: Record<Tone, string> = {
  neutral: "before:bg-slate-300",
  success: "before:bg-emerald-500",
  warning: "before:bg-amber-500",
  danger: "before:bg-red-500",
  info: "before:bg-role-accent",
}

const toneIconBg: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-400",
  success: "bg-emerald-50 text-emerald-500",
  warning: "bg-amber-50 text-amber-500",
  danger: "bg-red-50 text-red-500",
  info: "bg-role-accent-soft text-role-accent",
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
}

export function StatTile({
  value,
  label,
  tone = "neutral",
  icon,
}: {
  value: ReactNode
  label: string
  tone?: Tone
  icon?: ReactNode
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        toneBar[tone],
      )}
    >
      {/* İkon mutlak konumlandırılıyordu ve uzun tutarların üstüne biniyordu; artık akışın
          içinde, sayı da daralan alanda küçülebiliyor. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-heading text-2xl font-extrabold text-t3-navy tabular-nums whitespace-nowrap sm:text-3xl">
            {value}
          </div>
          <div className="mt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</div>
        </div>
        {icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              toneIconBg[tone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
