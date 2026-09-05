import type { YatirimTuru } from "@/lib/types"

/**
 * Enum değerlerinin kullanıcıya gösterilen Türkçe karşılıkları. Tek yerde durur: aynı tür grafik
 * açıklamasında "Seri B", okumada "SeriB" görünmesin.
 */
export const YATIRIM_TUR_LABEL: Record<YatirimTuru, string> = {
  Hibe: "Hibe",
  OnTohum: "Ön Tohum",
  Tohum: "Tohum",
  SeriA: "Seri A",
  SeriB: "Seri B",
  SeriSonrasi: "Seri Sonrası",
  Diger: "Diğer",
}

export function yatirimTuruEtiketi(tur: string): string {
  return YATIRIM_TUR_LABEL[tur as YatirimTuru] ?? tur
}
