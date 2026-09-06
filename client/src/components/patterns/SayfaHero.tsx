import type { ReactNode } from "react"

/**
 * İç sayfaların üst bloğu. Ana sayfadaki hero ile aynı dili konuşur (koyu gradient zemin, yumuşak
 * ışık lekeleri, eyebrow rozeti, iri başlık) ama panel ekranlarında her gün bakılacağı için
 * yüksekliği ve efektleri ölçülü tutulur.
 *
 * Sağ taraf serbest bir alandır: sayfanın en önemli sayıları ya da eylemleri oraya konur.
 */
export function SayfaHero({
  eyebrow,
  baslik,
  aciklama,
  sag,
  aksiyonlar,
}: {
  eyebrow: string
  baslik: ReactNode
  aciklama?: ReactNode
  sag?: ReactNode
  aksiyonlar?: ReactNode
}) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-t3-navy via-t3-navy-soft to-[#151450] px-6 py-8 text-white sm:px-10 sm:py-10">
      {/* Rol vurgu rengiyle boyanan yumuşak ışık lekeleri — hangi paneldeyken hangi renk. */}
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-role-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-0 size-56 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-widest text-white/80 uppercase">
            {eyebrow}
          </span>
          <h1 className="mt-3 font-heading text-2xl font-extrabold leading-tight sm:text-3xl">{baslik}</h1>
          {aciklama && <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{aciklama}</p>}
          {aksiyonlar && <div className="mt-5 flex flex-wrap gap-2">{aksiyonlar}</div>}
        </div>

        {sag && <div className="min-w-0">{sag}</div>}
      </div>
    </section>
  )
}

/** Hero'nun içinde duran cam efektli sayı kutusu — ana sayfadaki "canlı platform verisi" kartıyla aynı dil. */
export function HeroMetrik({
  ikon,
  deger,
  etiket,
  vurgulu,
}: {
  ikon: ReactNode
  deger: ReactNode
  etiket: string
  vurgulu?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
          vurgulu ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-blue-200"
        }`}
      >
        {ikon}
      </div>
      <div className="min-w-0">
        <p className="font-heading text-xl font-extrabold text-white">{deger}</p>
        <p className="text-xs text-white/55">{etiket}</p>
      </div>
    </div>
  )
}
