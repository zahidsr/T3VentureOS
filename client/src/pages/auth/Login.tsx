import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/patterns/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { roleHomePath } from "@/lib/role-home"

/**
 * T3 KYS (kurumsal kimlik doğrulama) entegrasyon noktası — hangi protokolün (OAuth2/SAML)
 * kullanılacağı T3 KYS tarafıyla netleşene kadar bu bir placeholder'dır; gerçek SSO redirect
 * flow'u netleştiğinde burası o akışı tetikleyecek şekilde değiştirilecek.
 */
function handleT3KysLogin() {
  toast.info("T3 KYS ile giriş entegrasyonu yakında aktif olacak.")
}

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Parola zorunludur."),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const loggedInUser = await login(values.email, values.password)
      toast.success("Giriş başarılı.")
      // Startup kullanıcısının tek bir "evi" var — nereden geldiğine bakılmaksızın hep Girişimim'e düşer.
      // SuperAdmin için de aynısı geçerli: girişte her zaman doğrudan genel bakış paneline düşer.
      if (loggedInUser.role === "StartupKullanicisi" || loggedInUser.role === "SuperAdmin") {
        navigate(roleHomePath(loggedInUser.role), { replace: true })
        return
      }
      const from = (location.state as { from?: Location })?.from?.pathname
      navigate(from || roleHomePath(loggedInUser.role), { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Giriş başarısız.")
    }
  }

  return (
    <AuthShell
      eyebrow="Hoş geldiniz"
      title="Hesabınıza giriş yapın"
      subtitle="Devam etmek için kurumsal e-posta adresinizi girin."
      quote="T3 girişimcilik ekosistemindeki her girişimin yolculuğunu tek profilde izleyin, veri odaklı kararlar alın."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        )}
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
        <Button type="submit" className="w-full bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        veya
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleT3KysLogin}
      >
        <ShieldCheck className="size-4" />
        T3 KYS ile Giriş Yap
      </Button>

      <div className="mt-4 flex flex-col items-center gap-2 text-center text-sm">
        <Link to="/forgot-password" className="text-t3-blue hover:underline">
          Parolamı unuttum
        </Link>
        <span>
          <span className="text-muted-foreground">Hesabınız yok mu? </span>
          <Link to="/register" className="text-t3-blue hover:underline">
            Kayıt olun
          </Link>
        </span>
        {/* Kullanıcı hesabını burada oluşturuyor; aydınlatma metni giriş noktasında erişilebilir olmalı. */}
        <span className="text-xs text-muted-foreground">
          <Link to="/kvkk" className="hover:text-foreground hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          {" · "}
          <Link to="/gizlilik" className="hover:text-foreground hover:underline">
            Gizlilik Politikası
          </Link>
        </span>
      </div>
    </AuthShell>
  )
}
