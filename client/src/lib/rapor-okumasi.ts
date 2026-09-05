import type { AylikTrendDto, SektorSayisiDto, YatirimTuruDagilimiDto } from "@/lib/types"
import { yatirimTuruEtiketi } from "@/lib/labels"

/**
 * Grafiklerin yanında duran otomatik okumalar. Kural tabanlıdır, AI değildir: her açılışta
 * anında ve ücretsiz çalışır, aynı veride hep aynı cümleyi kurar ve test edilebilir. AI, bunların
 * üstünde duran serbest metinli ekosistem/rakip analizi için ayrı kalır.
 *
 * Ton kuralı: rakamı tekrar etmek değil, ondan bir çıkarım söylemek. "6 girişim var" demek grafiğin
 * zaten söylediği şey; "6 girişim 6 ayrı sektöre dağılmış, yoğunlaşma riski yok" bir okumadır.
 */
export interface Okuma {
  /** Ana çıkarım — grafiğin ne söylediği. */
  baslik: string
  /** Destekleyici ayrıntılar; boş olabilir. */
  detaylar: string[]
  /** Dikkat çekilmesi gereken bir durum varsa uyarı tonuna geçer. */
  ton: "notr" | "olumlu" | "uyari"
}

function yuzde(pay: number, toplam: number): number {
  return toplam === 0 ? 0 : Math.round((pay / toplam) * 100)
}

/** Sayının okunuşuna göre belirtme/iyelik eki: 69 "altmış dokuz" biter, eki "'u"dur — "%69'i" yanlıştır. */
const BIRLER_EKI: Record<number, string> = {
  0: "'ı", // sıfır
  1: "'i", // bir
  2: "'si", // iki
  3: "'ü", // üç
  4: "'ü", // dört
  5: "'i", // beş
  6: "'sı", // altı
  7: "'si", // yedi
  8: "'i", // sekiz
  9: "'u", // dokuz
}

const YUVARLAK_EKI: Record<number, string> = {
  0: "'ı", // sıfır
  10: "'u", // on
  20: "'si", // yirmi
  30: "'u", // otuz
  40: "'ı", // kırk
  50: "'si", // elli
  60: "'ı", // altmış
  70: "'i", // yetmiş
  80: "'i", // seksen
  90: "'ı", // doksan
  100: "'ü", // yüz
}

export function sayiEki(n: number): string {
  const tam = Math.abs(Math.round(n))
  const birler = tam % 10
  if (birler !== 0) return BIRLER_EKI[birler]

  const yuvarlak = tam % 100 === 0 && tam !== 0 ? 100 : tam % 100
  return YUVARLAK_EKI[yuvarlak] ?? "'i"
}

function paraKisa(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mlr ₺`
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B ₺`
  return `${value.toLocaleString("tr-TR")} ₺`
}

/** Aylık ciro/yatırım trendinin okuması: yön, en yüksek ay ve hareketsiz dönemler. */
export function aylikTrendOkumasi(trend: AylikTrendDto[]): Okuma | null {
  if (trend.length === 0) return null

  const toplamCiro = trend.reduce((acc, a) => acc + a.ciro, 0)
  const toplamYatirim = trend.reduce((acc, a) => acc + a.yatirim, 0)
  if (toplamCiro === 0 && toplamYatirim === 0) {
    return {
      baslik: `Son ${trend.length} ayda hiç ciro ya da yatırım kaydı girilmemiş.`,
      detaylar: ["Grafiğin boş olması veri girilmediği anlamına gelir; girişimlerden kayıt beklenmelidir."],
      ton: "uyari",
    }
  }

  const detaylar: string[] = []
  const ilkYari = trend.slice(0, Math.floor(trend.length / 2))
  const sonYari = trend.slice(Math.floor(trend.length / 2))
  const ilkYariCiro = ilkYari.reduce((acc, a) => acc + a.ciro, 0)
  const sonYariCiro = sonYari.reduce((acc, a) => acc + a.ciro, 0)

  let baslik: string
  let ton: Okuma["ton"] = "notr"
  if (ilkYariCiro === 0 && sonYariCiro > 0) {
    baslik = "Ciro son dönemde başladı; öncesinde kayıt yok."
    ton = "olumlu"
  } else if (ilkYariCiro > 0) {
    const degisim = Math.round(((sonYariCiro - ilkYariCiro) / ilkYariCiro) * 100)
    if (degisim > 5) {
      baslik = `Ciro dönemin ikinci yarısında %${degisim} arttı.`
      ton = "olumlu"
    } else if (degisim < -5) {
      baslik = `Ciro dönemin ikinci yarısında %${Math.abs(degisim)} geriledi.`
      ton = "uyari"
    } else {
      baslik = "Ciro dönem boyunca yatay seyretti."
    }
  } else {
    baslik = "Dönemde ciro kaydı yok, yalnızca yatırım hareketi var."
    ton = "uyari"
  }

  const enYuksekCiro = trend.reduce((max, a) => (a.ciro > max.ciro ? a : max))
  if (enYuksekCiro.ciro > 0) detaylar.push(`En yüksek ciro ${enYuksekCiro.ay} ayında: ${paraKisa(enYuksekCiro.ciro)}.`)

  if (toplamYatirim > 0) {
    const yatirimAylari = trend.filter((a) => a.yatirim > 0)
    detaylar.push(
      `Dönemde ${paraKisa(toplamYatirim)} yatırım ${yatirimAylari.length} ayda gerçekleşti (${yatirimAylari
        .map((a) => a.ay)
        .join(", ")}).`,
    )
  }

  // Süreklilik, tek seferlik sıçramadan daha çok şey anlatır.
  const bosAylar = trend.filter((a) => a.ciro === 0 && a.yatirim === 0)
  if (bosAylar.length > 0) {
    detaylar.push(
      `${trend.length} ayın ${bosAylar.length}'inde hiç hareket yok (${bosAylar.map((a) => a.ay).join(", ")}) — veri girişi düzenli değil.`,
    )
    if (bosAylar.length >= trend.length / 2) ton = "uyari"
  }

  return { baslik, detaylar, ton }
}

/** Sektör dağılımının okuması: yoğunlaşma mı, dengeli dağılım mı. */
export function sektorDagilimiOkumasi(dagilim: SektorSayisiDto[]): Okuma | null {
  if (dagilim.length === 0) return null

  const toplam = dagilim.reduce((acc, s) => acc + s.sayi, 0)
  const enBuyuk = dagilim.reduce((max, s) => (s.sayi > max.sayi ? s : max))
  const enBuyukPay = yuzde(enBuyuk.sayi, toplam)
  const detaylar: string[] = []

  let baslik: string
  let ton: Okuma["ton"] = "notr"
  if (dagilim.length === toplam) {
    baslik = `${toplam} girişimin her biri farklı sektörde — portföy tam dağınık.`
    detaylar.push("Sektörel yoğunlaşma riski yok; buna karşılık hiçbir dikeyde derinleşme de yok.")
    ton = "olumlu"
  } else if (enBuyukPay >= 50) {
    baslik = `Portföyün %${enBuyukPay}${sayiEki(enBuyukPay)} tek sektörde: ${enBuyuk.sektor}.`
    detaylar.push("Bu yoğunluk bir uzmanlaşma tercihi değilse sektörel risk oluşturur.")
    ton = "uyari"
  } else {
    baslik = `${toplam} girişim ${dagilim.length} sektöre dağılmış; en büyüğü ${enBuyuk.sektor} (%${enBuyukPay}).`
    ton = "olumlu"
  }

  const tekGirisimliler = dagilim.filter((s) => s.sayi === 1)
  if (tekGirisimliler.length > 0 && tekGirisimliler.length < dagilim.length) {
    detaylar.push(`${tekGirisimliler.length} sektörde yalnızca birer girişim var.`)
  }

  return { baslik, detaylar, ton }
}

/** Yatırım türü dağılımının okuması: sermaye hangi olgunluk aşamasında birikmiş. */
export function yatirimTuruOkumasi(dagilim: YatirimTuruDagilimiDto[]): Okuma | null {
  if (dagilim.length === 0) return null

  const toplam = dagilim.reduce((acc, y) => acc + y.toplamTutar, 0)
  if (toplam === 0) return null

  const enBuyuk = dagilim.reduce((max, y) => (y.toplamTutar > max.toplamTutar ? y : max))
  const enBuyukPay = yuzde(enBuyuk.toplamTutar, toplam)

  const erkenAsamaTurleri = ["Hibe", "OnTohum", "Tohum"]
  const erkenToplam = dagilim
    .filter((y) => erkenAsamaTurleri.includes(y.tur))
    .reduce((acc, y) => acc + y.toplamTutar, 0)
  const erkenPay = yuzde(erkenToplam, toplam)

  const detaylar = [
    `Toplam ${paraKisa(toplam)} yatırımın %${enBuyukPay}${sayiEki(enBuyukPay)} ${yatirimTuruEtiketi(enBuyuk.tur)} turunda.`,
  ]

  let baslik: string
  let ton: Okuma["ton"] = "notr"
  if (erkenPay >= 60) {
    baslik = `Sermaye ağırlıklı olarak erken aşamada: yatırımın %${erkenPay}${sayiEki(erkenPay)} hibe/tohum turlarında.`
    detaylar.push("Portföy genç; büyüme turlarına geçiş takip edilmeli.")
  } else if (erkenPay <= 20) {
    baslik = `Sermaye olgun girişimlerde yoğunlaşmış; erken aşama payı yalnızca %${erkenPay}.`
    detaylar.push("Yeni girişim akışı zayıflıyorsa portföy zamanla yaşlanır.")
    ton = "uyari"
  } else {
    baslik = `Yatırım erken ve ileri aşama arasında dengeli dağılmış (erken aşama %${erkenPay}).`
    ton = "olumlu"
  }

  return { baslik, detaylar, ton }
}
