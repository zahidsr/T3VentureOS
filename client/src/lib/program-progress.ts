export interface ProgramIlerleme {
  yuzde: number
  durumText: string
}

/** Başlangıç/bitiş tarihine göre bir programın ne kadarının geçtiğini hesaplar — tarihlerden biri eksikse null döner. */
export function programIlerlemesi(baslangic: string | null, bitis: string | null): ProgramIlerleme | null {
  if (!baslangic || !bitis) return null

  const start = new Date(baslangic).getTime()
  const end = new Date(bitis).getTime()
  const now = Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  const yuzde = Math.round(Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)))
  const kalanGun = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  const durumText =
    now < start ? "Henüz başlamadı" : now > end ? "Süre doldu" : kalanGun <= 1 ? "Son gün" : `${kalanGun} gün kaldı`

  return { yuzde, durumText }
}
