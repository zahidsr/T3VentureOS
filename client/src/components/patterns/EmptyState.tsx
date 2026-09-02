import type { ReactNode } from "react"

export function EmptyState({
  icon,
  message,
  action,
}: {
  icon: ReactNode
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="text-4xl opacity-70">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
