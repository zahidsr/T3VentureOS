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

const schema = z.object({ email: z.string().email("Geçerli bir e-posta girin.") })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
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
      const res = await api.post<MessageResponse>("/auth/forgot-password", values)
      toast.success(res.data.message)
      navigate("/reset-password")
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    }
  }

  return (
    <AuthCard eyebrow="Hesap Kurtarma" title="Parolamı Unuttum" subtitle="E-posta adresinizi girin, size bir sıfırlama kodu gönderelim.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          Sıfırlama Kodu Gönder
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
