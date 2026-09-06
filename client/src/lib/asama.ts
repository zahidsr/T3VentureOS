import type { GirisimAsamasi } from "@/lib/types"

/** Aşama ekseni: soldan sağa olgunluk. Sıralama, ilerleme hesaplarının da dayanağıdır. */
export const ASAMA_SIRASI: GirisimAsamasi[] = ["Fikir", "Prototip", "MVP", "IlkMusteri", "Olcekleme", "Buyume"]

export const ASAMA_ETIKET: Record<GirisimAsamasi, string> = {
  Fikir: "Fikir",
  Prototip: "Prototip",
  MVP: "MVP",
  IlkMusteri: "İlk Müşteri",
  Olcekleme: "Ölçekleme",
  Buyume: "Büyüme",
}

/** Zaman çizelgesindeki nokta renkleri; rozet renkleriyle aynı sırayı izler. */
export const ASAMA_NOKTA: Record<GirisimAsamasi, string> = {
  Fikir: "bg-slate-400",
  Prototip: "bg-sky-400",
  MVP: "bg-violet-400",
  IlkMusteri: "bg-amber-400",
  Olcekleme: "bg-orange-400",
  Buyume: "bg-emerald-500",
}
