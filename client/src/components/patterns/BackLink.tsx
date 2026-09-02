import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-t3-blue"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  )
}
