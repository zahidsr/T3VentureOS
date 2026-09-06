export type NakitPlani = {
  kasadakiPara: number
  aylikGelir: number
  aylikGider: number
  version: string
  updatedAt: string
}
export type NakitYaniti = { plan?: NakitPlani | null }
export type Hedef = { baslik: string; tamamlandi: boolean }
export type HedefYaniti = {
  haftaBaslangici: string
  buHafta: string
  hedefler: Hedef[]
  version?: string | null
  updatedAt?: string | null
}

export function nakitOmru(kasa: number, gelir: number, gider: number, indirim = 0) {
  const netGider = gider * (1 - indirim / 100) - gelir
  return { netGider, ay: netGider > 0 ? kasa / netGider : null }
}

export function haftaKaydir(hafta: string, gun: number) {
  const date = new Date(`${hafta}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + gun)
  return date.toISOString().slice(0, 10)
}

export function tutarGecerli(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 999_999_999_999.99
}
