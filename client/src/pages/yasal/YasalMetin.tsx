import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

/**
 * Yasal metinlerin ortak iskeleti. Metinler sistemin gerçekte ne yaptığına göre yazıldı; yine de
 * hukuki bağlayıcılık iddiası taşımadıkları ve kurumun hukuk birimince onaylanması gerektiği
 * sayfanın en üstünde açıkça belirtilir.
 */
export function YasalMetin({
  baslik,
  ustBaslik,
  guncellemeTarihi,
  children,
}: {
  baslik: string
  ustBaslik: string
  guncellemeTarihi: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-bold tracking-widest text-t3-blue uppercase">{ustBaslik}</p>
      <h1 className="mt-1.5 font-heading text-3xl font-extrabold text-t3-navy">{baslik}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Son güncelleme: {guncellemeTarihi}</p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-amber-900 dark:text-amber-200">
          Bu metin, sistemin işleyişi esas alınarak hazırlanmış bir <strong>taslaktır</strong> ve
          yayına alınmadan önce kurumun hukuk birimince gözden geçirilmelidir. Köşeli parantez içindeki
          alanlar kurum bilgileriyle doldurulmalıdır.
        </p>
      </div>

      <div className="mt-8 space-y-8">{children}</div>
    </article>
  )
}

export function Bolum({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-bold text-t3-navy">{baslik}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function Liste({ ogeler }: { ogeler: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {ogeler.map((oge, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-t3-blue/60" />
          <span>{oge}</span>
        </li>
      ))}
    </ul>
  )
}
