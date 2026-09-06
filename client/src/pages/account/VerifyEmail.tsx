import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail } from "lucide-react"
import { PageHeader } from "@/components/patterns/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { MessageResponse } from "@/lib/types"

const schema = z.object({ token: z.string().min(1, "Doğrulama kodu zorunludur.") })
type FormValues = z.infer<typeof schema>

export default function VerifyEmailPage() {
  const { user, refreshUser } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const resendMutation = useMutation({
    mutationFn: async () => (await api.post<MessageResponse>("/auth/resend-verification")).data,
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(extractErrorMessage(error, "Kod gönderilemedi.")),
  })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const res = await api.post<MessageResponse>("/auth/verify-email", values)
      toast.success(res.data.message)
      await refreshUser()
    } catch (error) {
      setSubmitError(extractErrorMessage(error, "Doğrulama başarısız."))
    }
  }

  if (user?.emailVerified) {
    return (
      <div>
        <PageHeader eyebrow="Hesabım" title="E-postamı Doğrula" />
        <Card className="max-w-md">
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-emerald-700">
            <Mail className="size-5" />
            E-posta adresiniz zaten doğrulanmış.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Hesabım"
        title="E-postamı Doğrula"
        subtitle={`${user?.email ?? "E-posta adresinize"} gönderilen kodu girin.`}
      />
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="token">Doğrulama Kodu</Label>
              <Input id="token" {...register("token")} />
              {errors.token && <p className="text-xs text-red-600">{errors.token.message}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="bg-role-accent text-white hover:bg-role-accent-dark" disabled={isSubmitting}>
                {isSubmitting ? "Doğrulanıyor…" : "Doğrula"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                {resendMutation.isPending ? "Gönderiliyor…" : "Kodu Yeniden Gönder"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
