import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AuthCard } from "@/components/patterns/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { MessageResponse } from "@/lib/types"

const schema = z.object({
  token: z.string().min(1, "Doğrulama kodu zorunludur."),
  newPassword: z.string().min(8, "Parola en az 8 karakter olmalıdır."),
})
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const res = await api.post<MessageResponse>("/auth/reset-password", values)
      toast.success(res.data.message)
      navigate("/login")
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    }
  }

  return (
    <AuthCard eyebrow="Hesap Kurtarma" title="Parola Sıfırla" subtitle="E-postanıza gönderilen kodu ve yeni parolanızı girin.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="token">Doğrulama Kodu</Label>
          <Input id="token" {...register("token")} />
          {errors.token && <p className="text-xs text-red-600">{errors.token.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Yeni Parola</Label>
          <Input id="newPassword" type="password" {...register("newPassword")} />
          {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          Parolayı Güncelle
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-t3-blue hover:underline">
          Girişe dön
        </Link>
      </div>
    </AuthCard>
  )
}
