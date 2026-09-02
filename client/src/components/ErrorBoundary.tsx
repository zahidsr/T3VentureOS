import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Beklenmeyen bir hata oluştu:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="size-8" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-t3-navy">Beklenmeyen bir hata oluştu</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Sayfa yüklenirken bir sorun çıktı. Sayfayı yenilemeyi deneyebilirsiniz; sorun devam
              ederse lütfen sistem yöneticinizle iletişime geçin.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} className="bg-t3-blue text-white hover:bg-t3-blue-dark">
            Sayfayı Yenile
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
