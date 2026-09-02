import { ShieldAlert } from "lucide-react"
import { LinkButton } from "@/components/patterns/LinkButton"

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-22rem)] max-w-md flex-col items-center justify-center rounded-2xl border bg-card px-8 py-16 text-center shadow-sm">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="font-heading text-xl font-bold text-t3-navy">Erişim Reddedildi</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">Bu sayfayı görüntülemek için yetkiniz bulunmuyor.</p>
      <LinkButton to="/" className="bg-t3-blue text-white hover:bg-t3-blue-dark">
        Ana Sayfaya Dön
      </LinkButton>
    </div>
  )
}
