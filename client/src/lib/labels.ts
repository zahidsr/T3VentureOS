import type { BasariTuru, KatilimDurumu, YatirimTuru } from "@/lib/types"

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

export const BASARI_TUR_LABEL: Record<BasariTuru, string> = {
  Hibe: "Hibe",
  Odul: "Ödül",
  Sertifika: "Sertifika",
  Diger: "Diğer",
}

export function basariTuruEtiketi(tur: string): string {
  return BASARI_TUR_LABEL[tur as BasariTuru] ?? tur
}

export const KATILIM_DURUMU_LABEL: Record<KatilimDurumu, string> = {
  Basvuru: "Başvuru",
  KabulEdildi: "Kabul Edildi",
  DevamEdiyor: "Devam Ediyor",
  Mezun: "Mezun",
  Ayrildi: "Ayrıldı",
}

export function katilimDurumuEtiketi(durum: string): string {
  return KATILIM_DURUMU_LABEL[durum as KatilimDurumu] ?? durum
}
