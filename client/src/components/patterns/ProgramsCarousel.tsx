import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { API_URL, api } from "@/lib/api-client"
import { LinkButton } from "@/components/patterns/LinkButton"
import { cn } from "@/lib/utils"
import type { ProgramSummaryDto } from "@/lib/types"

const AUTO_ADVANCE_MS = 5500

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
}

function kapakSrcFor(kapakGorseliUrl: string | null) {
  return kapakGorseliUrl ? `${API_URL.replace(/\/api\/?$/, "")}${kapakGorseliUrl}` : null
}

export function ProgramsCarousel() {
  const { data: programs, isLoading } = useQuery({
    queryKey: ["programs-aktif-carousel"],
    queryFn: async () => (await api.get<ProgramSummaryDto[]>("/programs/aktif")).data,
    staleTime: 60_000,
  })

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = programs?.length ?? 0
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (paused || count < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [paused, count])

  // clamp when the underlying data set shrinks (e.g. after a refetch)
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0)
  }, [count, index])

  if (isLoading || count === 0) return null

  function go(delta: number) {
    setIndex((i) => (i + delta + count) % count)
  }

  return (
    <section aria-label="Aktif programlar">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-t3-blue uppercase">Şu An Açık</span>
          <h2 className="mt-1 font-heading text-2xl font-extrabold text-t3-navy">Aktif Programlar</h2>
        </div>
        {count > 1 && (
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Önceki program"
              className="flex size-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-t3-blue hover:text-t3-blue"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Sonraki program"
              className="flex size-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-t3-blue hover:text-t3-blue"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-3xl border bg-card shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          setPaused(true)
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current
          setPaused(false)
          if (start === null) return
          const delta = e.changedTouches[0].clientX - start
          if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1)
          touchStartX.current = null
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {programs!.map((p) => {
            const kapakSrc = kapakSrcFor(p.kapakGorseliUrl)
            return (
              <article key={p.id} className="relative w-full shrink-0 overflow-hidden px-8 py-10 sm:px-12 sm:py-14">
                {kapakSrc && (
                  <>
                    <img src={kapakSrc} alt="" className="absolute inset-0 size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10" />
                  </>
                )}
                <div className={cn("relative mx-auto flex max-w-3xl flex-col items-start gap-5", kapakSrc && "text-white")}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                      kapakSrc ? "bg-white/15 text-white backdrop-blur" : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full animate-pulse", kapakSrc ? "bg-emerald-300" : "bg-emerald-500")} />
                    Başvurulara açık
                  </span>
                  <h3 className={cn("font-heading text-2xl font-extrabold sm:text-3xl", kapakSrc ? "text-white" : "text-t3-navy")}>
                    {p.name}
                  </h3>
                  {p.description && (
                    <p
                      className={cn(
                        "line-clamp-3 text-sm leading-relaxed sm:text-base",
                        kapakSrc ? "text-white/85" : "text-muted-foreground",
                      )}
                    >
                      {p.description}
                    </p>
                  )}
                  <div className={cn("flex flex-wrap items-center gap-5 text-sm", kapakSrc ? "text-white/80" : "text-gray-500")}>
                    {formatDate(p.baslangicTarihi) && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className={cn("size-4", kapakSrc ? "text-white" : "text-t3-blue")} />
                        {formatDate(p.baslangicTarihi)}
                        {formatDate(p.bitisTarihi) ? ` – ${formatDate(p.bitisTarihi)}` : ""}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Users className={cn("size-4", kapakSrc ? "text-white" : "text-t3-blue")} />
                      {p.katilimciSayisi} girişim katılıyor
                    </span>
                  </div>
                  <LinkButton
                    to="/register"
                    className="group mt-1 gap-2 bg-t3-blue text-white hover:bg-t3-blue-dark shadow-md shadow-t3-blue/20"
                  >
                    Girişiminizle katılın
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </LinkButton>
                </div>
              </article>
            )
          })}
        </div>

        {count > 1 && (
          <div className="flex items-center justify-center gap-2 pb-6">
            {programs!.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}. programa git`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-t3-blue" : "w-1.5 bg-gray-200 hover:bg-gray-300",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
