import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AuthShell } from "@/components/patterns/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { roleHomePath } from "@/lib/role-home"

const schema = z.object({
  fullName: z.string().min(2, "Ad soyad zorunludur."),
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Parola en az 6 karakter olmalıdır."),
  girisimAdi: z.string().min(2, "Girişim adı zorunludur."),
  sektor: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: doRegister, user } = useAuth()
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
      await doRegister({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        girisimAdi: values.girisimAdi,
        sektor: values.sektor || null,
      })
      toast.success("Kayıt başarılı, hoş geldiniz.")
      navigate(user ? roleHomePath(user.role) : "/girisimim", { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Kayıt başarısız.")
    }
  }

  return (
    <AuthShell
      eyebrow="Aramıza katılın"
      title="Girişim hesabı oluşturun"
      subtitle="Girişiminizi kaydedin, programlara katılın ve gelişiminizi takip edin."
      quote="T3 girişimcilik ekosistemindeki her girişimin yolculuğunu tek profilde izleyin, veri odaklı kararlar alın."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Ad Soyad</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Parola</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="girisimAdi">Girişim Adı</Label>
          <Input id="girisimAdi" {...register("girisimAdi")} />
          {errors.girisimAdi && <p className="text-xs text-red-600">{errors.girisimAdi.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sektor">Sektör (opsiyonel)</Label>
          <Input id="sektor" {...register("sektor")} />
        </div>
        <Button type="submit" className="w-full bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          {isSubmitting ? "Kayıt oluşturuluyor…" : "Kayıt Ol"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <span className="text-muted-foreground">Zaten hesabınız var mı? </span>
        <Link to="/login" className="text-t3-blue hover:underline">
          Giriş yapın
        </Link>
      </div>
    </AuthShell>
  )
}
