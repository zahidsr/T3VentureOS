import { useState } from "react"
import { HelpCircle, Sparkles, Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { GirisimSeviyesi, UserRole } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEVIYELER: { seviye: GirisimSeviyesi; ad: string; alt: number; ust: number; renk: string; nokta: string }[] = [
  { seviye: "Bronz", ad: "Bronz", alt: 0, ust: 39, renk: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200", nokta: "bg-amber-400" },
  { seviye: "Gumus", ad: "Gümüş", alt: 40, ust: 64, renk: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", nokta: "bg-slate-400" },
  { seviye: "Altin", ad: "Altın", alt: 65, ust: 84, renk: "border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200", nokta: "bg-yellow-400" },
  { seviye: "Platin", ad: "Platin", alt: 85, ust: 100, renk: "border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200", nokta: "bg-cyan-400" },
]

/** Puanın iki kaynağı — girişimciye "nereden kazanılır" sorusunun görsel cevabı. */
const KAYNAKLAR = [
  { baslik: "Profil bilgileri", puan: 50, detay: "Kısa tanım, iletişim muhatabı, logo, sunum" },
  { baslik: "Girilen kayıtlar", puan: 58, detay: "Ciro, yatırım, istihdam, başarı, gelişim adımı" },
]

/** Rozetin cevapladığı soru role göre değişir. */
const ROL_METNI: Record<UserRole, string> = {
  StartupKullanicisi: "Puanın, girişiminin başarısını değil profilinin ne kadar eksiksiz olduğunu gösterir. Yükseldikçe yöneticilerin panelinde daha üst sıralarda görünürsün.",
  ProgramYoneticisi: "Puan, girişimin başarısını değil profilinin doluluğunu gösterir. Düşük puanlılar genellikle veri girmeyi bırakmış olanlardır.",
  SuperAdmin: "Puan, girişimin başarısını değil sistemdeki veri kalitesini ölçer. Yüksek puanlı bir girişimin verisine güvenerek karar verebilirsin.",
}

/**
 * Rozetin ne anlama geldiğini anlatan pencere. İlk hâli üç blok paragraf ve altında uzun bir metin
 * kutusuydu; okunmuyordu. Artık ağırlık görselde: seviyeler bir ilerleme merdiveni olarak, puanın
 * kaynakları ise ağırlıklarıyla orantılı çubuklarla gösteriliyor.
 */
export function SeviyeAciklamasi({ rol }: { rol: UserRole | undefined }) {
  const [acik, setAcik] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <HelpCircle className="size-3.5" />
        Seviye nedir?
      </button>

      <Dialog open={acik} onOpenChange={setAcik}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-role-accent-soft text-role-accent">
                <Trophy className="size-4" />
              </span>
              Girişim puanı ve seviyeler
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {rol ? ROL_METNI[rol] : ROL_METNI.SuperAdmin}
            </p>

            {/* Seviyeler bir merdiven olarak: aralıklar yan yana ve soldan sağa ilerliyor. */}
            <div>
              <div className="flex h-2 overflow-hidden rounded-full">
                {SEVIYELER.map((s) => (
                  <div
                    key={s.seviye}
                    className={cn("h-full", s.nokta)}
                    style={{ width: `${s.ust - s.alt + 1}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SEVIYELER.map((s) => (
                  <div key={s.seviye} className={cn("rounded-xl border px-3 py-2", s.renk)}>
                    <div className="text-sm font-bold">{s.ad}</div>
                    <div className="text-xs tabular-nums opacity-75">
                      {s.alt}–{s.ust} puan
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Puan nereden geliyor: ağırlıklar çubuk uzunluğuyla görünür. */}
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Puan nereden gelir</p>
              {KAYNAKLAR.map((k) => (
                <div key={k.baslik} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{k.baslik}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-role-accent">
                      en fazla {k.puan}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-role-accent/70" style={{ width: `${k.puan}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{k.detay}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-role-accent" />
                Puan yalnızca artar; girilen veri geri alınmadığı için kazanılan puan düşmez.
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-role-accent" />
                Uzun süre veri girilmezse puan değil, ayrı bir “güncellenmedi” işareti gösterilir.
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-role-accent" />
                Bileşenlerin toplamı 100'ü aştığı için 100'e giden birden fazla yol vardır.
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
