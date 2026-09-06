import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { PageHeader } from "@/components/patterns/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { MessageResponse } from "@/lib/types"

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut parolanızı girin."),
    newPassword: z.string().min(8, "Yeni parola en az 8 karakter olmalıdır."),
    confirmPassword: z.string().min(1, "Yeni parolanızı tekrar girin."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parolalar eşleşmiyor.",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const res = await api.post<MessageResponse>("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.success(res.data.message)
      reset()
    } catch (error) {
      setSubmitError(extractErrorMessage(error, "Parola değiştirilemedi."))
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Hesabım" title="Parola Değiştir" subtitle="Mevcut parolanızı doğrulayıp yeni bir parola belirleyin." />
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Mevcut Parola</Label>
              <Input id="currentPassword" type="password" {...register("currentPassword")} />
              {errors.currentPassword && <p className="text-xs text-red-600">{errors.currentPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Yeni Parola</Label>
              <Input id="newPassword" type="password" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Yeni Parola (Tekrar)</Label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="bg-role-accent text-white hover:bg-role-accent-dark" disabled={isSubmitting}>
              {isSubmitting ? "Güncelleniyor…" : "Parolayı Güncelle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
