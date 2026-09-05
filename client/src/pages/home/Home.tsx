import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Network, ShieldCheck, TrendingUp, ArrowRight, Building2, Activity, Banknote } from "lucide-react"
import { LinkButton } from "@/components/patterns/LinkButton"
import { ProgramsCarousel } from "@/components/patterns/ProgramsCarousel"
import { api } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { roleHomePath } from "@/lib/role-home"

interface PublicStatsDto {
  toplamGirisim: number
  aktifProgramSayisi: number
  toplamOnayliYatirim: number
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mlr ₺`
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} B ₺`
  return `${value.toLocaleString("tr-TR")} ₺`
}

function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => (await api.get<PublicStatsDto>("/dashboard/ozet")).data,
    staleTime: 60_000,
  })
}

const features = [
  {
    icon: Network,
    title: "Tek Kurumsal Hafıza",
    desc: "Bir girişimin T3 ile temasından güncel satış ve yatırım durumuna kadar tüm yolculuğu tek profilde.",
    color: "text-t3-blue bg-t3-blue-light",
  },
  {
    icon: ShieldCheck,
    title: "Onay Kontrollü Veri",
    desc: "Girişimler kendi verilerini günceller; değişiklikler yönetici onayından geçtikten sonra yayınlanır.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: TrendingUp,
    title: "Karar Destek Dashboardu",
    desc: "Doğrulanmış girişim verileri üzerinden program, etkinlik ve yatırım kararlarını destekleyen raporlar.",
    color: "text-violet-600 bg-violet-50",
  },
]

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { data: publicStats, isLoading: statsLoading } = usePublicStats()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate(roleHomePath(user.role), { replace: true })
    }
  }, [isLoading, isAuthenticated, user, navigate])

  if (isLoading || isAuthenticated) return null

  return (
    <div className="space-y-16">
      {/* ------------------------------------------------- Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-t3-navy via-t3-navy-soft to-[#151450] px-8 py-16 text-white sm:px-14 sm:py-20">
        {/* glow orbs */}
        <div className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-t3-blue/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 size-72 rounded-full bg-violet-600/10 blur-3xl" />
        {/* dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ---- Sol: mesaj + CTA ---- */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold tracking-wider text-blue-200 uppercase">
              <span className="size-1.5 rounded-full bg-t3-blue animate-pulse" />
              Girişim Merkezi Koordinatörlüğü
            </div>
            <h1 className="font-heading text-4xl font-extrabold leading-tight sm:text-5xl">
              T3 Girişim Ekosistemi{" "}
              <span className="bg-gradient-to-r from-t3-blue to-blue-300 bg-clip-text text-transparent">
                Yönetim Sistemi
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Programdan yatırıma, T3 girişimcilik ekosisteminin tek kurumsal hafızası ve karar destek platformu.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton
                to="/login"
                size="lg"
                className="group bg-t3-blue text-white hover:bg-t3-blue-dark shadow-lg shadow-t3-blue/30 gap-2"
              >
                Giriş Yap
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </LinkButton>
              <LinkButton
                to="/register"
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15"
              >
                Girişiminizle Kayıt Olun
              </LinkButton>
            </div>
          </div>

          {/* ---- Sağ: canlı platform istatistikleri ---- */}
          <div className="rounded-2xl border border-white/15 bg-white/8 p-6 backdrop-blur-sm sm:p-7">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-widest text-white/60 uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Canlı Platform Verisi
            </div>
            <div className="space-y-4">
              {[
                { icon: Building2, label: "Kayıtlı Girişim", value: publicStats?.toplamGirisim },
                { icon: Activity, label: "Aktif Program", value: publicStats?.aktifProgramSayisi },
                { icon: Banknote, label: "Onaylı Yatırım", value: publicStats?.toplamOnayliYatirim, currency: true },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <s.icon className="size-5 text-blue-200" />
                  </div>
                  <div className="min-w-0">
                    {statsLoading ? (
                      <div className="h-6 w-16 animate-pulse rounded bg-white/15" />
                    ) : (
                      <p className="font-heading text-xl font-extrabold text-white">
                        {s.currency ? formatCompactCurrency(s.value ?? 0) : (s.value ?? 0).toLocaleString("tr-TR")}
                      </p>
                    )}
                    <p className="text-xs text-white/55">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- Aktif Programlar */}
      <ProgramsCarousel />

      {/* -------------------------------------------- Feature Cards */}
      <section>
        <div className="mb-6 text-center">
          <span className="text-xs font-bold tracking-widest text-t3-blue uppercase">Platform Özellikleri</span>
          <h2 className="mt-1 font-heading text-2xl font-extrabold text-t3-navy">
            Neden T3 VentureOS ?
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border bg-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* subtle number bg */}
              <span className="pointer-events-none absolute right-4 top-2 font-heading text-6xl font-extrabold text-foreground/[0.04] select-none">
                {i + 1}
              </span>
              <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="size-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-t3-navy">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------- CTA strip */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border bg-t3-blue-light px-8 py-10 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <p className="font-heading text-lg font-bold text-t3-navy">Platforma erişmek için giriş yapın</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kurumsal e-posta adresiniz ve parolanızla hemen başlayın.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <LinkButton to="/register" variant="outline" className="border-t3-blue/30 text-t3-blue hover:bg-t3-blue-light">
            Kayıt Ol
          </LinkButton>
          <LinkButton to="/login" className="bg-t3-blue text-white hover:bg-t3-blue-dark shadow-md shadow-t3-blue/20">
            Giriş Yap →
          </LinkButton>
        </div>
      </section>
    </div>
  )
}
