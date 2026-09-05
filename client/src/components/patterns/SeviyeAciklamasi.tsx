import { useState } from "react"
import { HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SeviyeRozeti } from "@/components/patterns/SeviyeRozeti"
import type { GirisimSeviyesi, UserRole } from "@/lib/types"

const SEVIYELER: { seviye: GirisimSeviyesi; aralik: string }[] = [
  { seviye: "Bronz", aralik: "0 – 39 puan" },
  { seviye: "Gumus", aralik: "40 – 64 puan" },
  { seviye: "Altin", aralik: "65 – 84 puan" },
  { seviye: "Platin", aralik: "85 – 100 puan" },
]

const PUAN_BILESENLERI = [
  { baslik: "Profil bilgileri", puan: "50 puan", detay: "Kısa tanım, iletişim muhatabı, logo ve sunum taslağı." },
  { baslik: "Girilen kayıtlar", puan: "58 puan", detay: "Onaylı satış, yatırım, istihdam, başarı kayıtları ve gelişim adımları." },
]

/** Rozetin ne anlama geldiği role göre farklı bir soruya cevap verir. */
const ROL_METNI: Record<UserRole, string> = {
  StartupKullanicisi:
    "Puanın, girişiminin profilinin ne kadar eksiksiz ve güncel olduğunu gösterir. Girişiminin başarısını ölçmez — sistemdeki görünürlüğünü ölçer. Puanın yükseldikçe yöneticilerin panelinde daha üst sıralarda görünürsün.",
  ProgramYoneticisi:
    "Puan, girişimin başarısını değil profilinin ne kadar eksiksiz olduğunu gösterir. Düşük puanlı girişimler genellikle veri girmeyi bırakmış olanlardır; onlara hatırlatma yapmak için iyi bir işarettir.",
  SuperAdmin:
    "Puan, girişimin başarısını değil sistemdeki veri kalitesini ölçer. Yüksek puanlı bir girişimin verisine güvenerek karar verebilirsin; düşük puanlı bir girişimin raporları eksik veriye dayanıyor olabilir.",
}

/**
 * Rozetler tek başına ne olduklarını anlatmıyordu. Bu açıklama üç rolde de aynı yerde durur ama
 * metni role göre değişir: herkesin bu rozete bakarken sorduğu soru farklı.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Girişim puanı ve seviyeler</DialogTitle>
            <DialogDescription>{rol ? ROL_METNI[rol] : ROL_METNI.SuperAdmin}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Puan nasıl hesaplanır</p>
              <ul className="space-y-2">
                {PUAN_BILESENLERI.map((b) => (
                  <li key={b.baslik} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium text-foreground">{b.baslik}</span>
                      <span className="block text-xs text-muted-foreground">{b.detay}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-role-accent">{b.puan}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Seviyeler</p>
              <div className="grid grid-cols-2 gap-2">
                {SEVIYELER.map((s) => (
                  <div key={s.seviye} className="flex items-center gap-2 rounded-lg border p-2">
                    <SeviyeRozeti seviye={s.seviye} />
                    <span className="text-xs text-muted-foreground">{s.aralik}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Toplam en fazla 100'dür; bileşenlerin toplamı 100'ü aştığı için 100'e giden birden fazla
              yol vardır. Puan yalnızca artar; girilen veri geri alınmadığı için kazanılan puan da
              düşmez. Uzun süre veri girilmezse puan değil, ayrı bir "güncellenmedi" işareti gösterilir.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
