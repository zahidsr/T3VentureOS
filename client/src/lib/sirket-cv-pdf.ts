import { PDF_FONT, createTurkishPdf } from "@/lib/pdf"
import { basariTuruEtiketi, katilimDurumuEtiketi, yatirimTuruEtiketi } from "@/lib/labels"

export interface SirketCvProgramKatilimi {
  programAdi: string
  donem: string | null
  durum: string
  baslangicTarihi: string
  bitisTarihi: string | null
}

export interface SirketCvGelisimAdimi {
  tarih: string
  baslik: string
  aciklama: string | null
}

export interface SirketCvBasari {
  tur: string
  baslik: string
  aciklama: string | null
  tarih: string
}

export interface SirketCvSatisKaydi {
  donem: string
  ciro: number
  ihracat: number | null
}

export interface SirketCvYatirimKaydi {
  tur: string
  tutar: number
  paraBirimi: string
  tarih: string
  yatirimciAdi: string | null
}

export interface SirketCvContact {
  adSoyad: string
  unvan: string | null
  telefon: string | null
  email: string | null
  linkedInUrl: string | null
}

/**
 * Girişimcinin kendi görüntülediği CV ile paylaşım bağlantısıyla dışarı açılan CV aynı düzeni
 * kullanır. Finansal alanlar (onaylı satış/yatırım) opsiyoneldir: yalnızca girişimcinin kendi
 * indirdiği tam sürümde doldurulur, paylaşım bağlantısında hiç gönderilmediği için o bölümler
 * otomatik olarak atlanır.
 */
export interface SirketCvData {
  ad: string
  sektor: string | null
  kisaTanim: string | null
  teknoloji: string | null
  websiteUrl: string | null
  kurulusYili: number | null
  ekipBuyuklugu: number | null
  logoUrl: string | null
  kapakGorseliUrl: string | null
  contact: SirketCvContact | null
  programKatilimlari: SirketCvProgramKatilimi[]
  gelisimAdimlari: SirketCvGelisimAdimi[]
  basarilar: SirketCvBasari[]
  onayliSatisKayitlari?: SirketCvSatisKaydi[]
  onayliYatirimKayitlari?: SirketCvYatirimKaydi[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("tr-TR")
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value)
  } catch {
    return `${value.toLocaleString("tr-TR")} ${currency}`
  }
}

/**
 * Bir görsel URL'ini (PNG/JPEG/SVG fark etmez) canvas üzerinden PNG data URL'ine çevirir.
 * jsPDF'in addImage'ı SVG kabul etmediği için gömülecek her logo/banner önce burada rasterize
 * edilir. Görsel yüklenemezse (CORS, 404, ağ hatası) null döner ve çağıran taraf o alanı
 * atlayarak devam eder — CV üretimi bir görsel eksikse asla kesilmemeli.
 */
async function loadImageAsPng(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Görsel yüklenemedi"))
      img.src = url
    })
    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height) return null

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, width, height)
    return { dataUrl: canvas.toDataURL("image/png"), width, height }
  } catch {
    return null
  }
}

/** Şirket CV'sinin ilk sayfasına dinamik olarak çekilen kapak görseli + logo; ikisi de opsiyonel. */
async function drawKapakVeLogo(
  doc: Awaited<ReturnType<typeof createTurkishPdf>>,
  ad: string,
  logoUrl: string | null,
  kapakGorseliUrl: string | null,
  margin: number,
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const [banner, logo] = await Promise.all([
    kapakGorseliUrl ? loadImageAsPng(kapakGorseliUrl) : Promise.resolve(null),
    logoUrl ? loadImageAsPng(logoUrl) : Promise.resolve(null),
  ])

  const BANNER_HEIGHT = 110
  const LOGO_SIZE = 46

  if (banner) {
    doc.addImage(banner.dataUrl, "PNG", 0, 0, pageWidth, BANNER_HEIGHT, undefined, "FAST")
  }

  let titleY: number
  let titleX = margin

  if (banner && logo) {
    // Logo, banner'ın alt kenarına biner (kart avatarı gibi); arkasına kontrast için beyaz kart konur.
    const logoY = BANNER_HEIGHT - LOGO_SIZE / 2
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin - 4, logoY - 4, LOGO_SIZE + 8, LOGO_SIZE + 8, 6, 6, "F")
    doc.addImage(logo.dataUrl, "PNG", margin, logoY, LOGO_SIZE, LOGO_SIZE, undefined, "FAST")
    titleX = margin + LOGO_SIZE + 16
    titleY = BANNER_HEIGHT - LOGO_SIZE / 2 + LOGO_SIZE / 2 + 4
  } else if (banner) {
    titleY = BANNER_HEIGHT + 30
  } else if (logo) {
    doc.addImage(logo.dataUrl, "PNG", margin, 24, LOGO_SIZE, LOGO_SIZE, undefined, "FAST")
    titleX = margin + LOGO_SIZE + 16
    titleY = 24 + LOGO_SIZE / 2 + 4
  } else {
    titleY = 50
  }

  doc.setFont(PDF_FONT, "bold")
  doc.setFontSize(18)
  doc.setTextColor(45, 63, 71)
  doc.text(ad, titleX, titleY)

  const afterTitleY = titleY + 20
  return Math.max(afterTitleY, banner ? BANNER_HEIGHT + 24 : afterTitleY)
}

/** Şirket CV'sini üretir — hem girişimcinin kendi tam sürümü hem paylaşım bağlantısındaki kısıtlı sürüm bu fonksiyonu kullanır. */
export async function buildSirketCvPdf(data: SirketCvData) {
  const doc = await createTurkishPdf()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = await drawKapakVeLogo(doc, data.ad, data.logoUrl, data.kapakGorseliUrl, margin)

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = 50
    }
  }

  function sectionTitle(title: string) {
    ensureSpace(26)
    doc.setFont(PDF_FONT, "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 120, 168)
    doc.text(title, margin, y)
    y += 18
    doc.setTextColor(30, 41, 47)
    doc.setFont(PDF_FONT, "normal")
    doc.setFontSize(10)
  }

  function bodyLine(text: string) {
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2) as string[]
    lines.forEach((line) => {
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 14
    })
  }

  function keyValueRow(label: string, value: string) {
    ensureSpace(16)
    doc.setFont(PDF_FONT, "bold")
    doc.text(label, margin, y)
    doc.setFont(PDF_FONT, "normal")
    doc.text(value, margin + 160, y)
    y += 16
  }

  doc.setFont(PDF_FONT, "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Şirket CV'si — Oluşturulma tarihi: ${new Date().toLocaleDateString("tr-TR")}`, margin, y)
  y += 26
  doc.setTextColor(30, 41, 47)

  sectionTitle("Şirket Özeti")
  keyValueRow("Sektör", data.sektor ?? "—")
  keyValueRow("Kuruluş Yılı", data.kurulusYili != null ? String(data.kurulusYili) : "—")
  keyValueRow("Ekip Büyüklüğü", data.ekipBuyuklugu != null ? `${data.ekipBuyuklugu} kişi` : "—")
  keyValueRow("Teknoloji", data.teknoloji ?? "—")
  keyValueRow("Website", data.websiteUrl ?? "—")
  if (data.kisaTanim) {
    ensureSpace(16)
    doc.setFont(PDF_FONT, "bold")
    doc.text("Kısa Tanım", margin, y)
    y += 16
    doc.setFont(PDF_FONT, "normal")
    bodyLine(data.kisaTanim)
  }
  y += 10

  sectionTitle("İletişim / Muhatap")
  if (data.contact) {
    keyValueRow("Ad Soyad", data.contact.adSoyad)
    keyValueRow("Unvan", data.contact.unvan ?? "—")
    keyValueRow("Telefon", data.contact.telefon ?? "—")
    keyValueRow("E-posta", data.contact.email ?? "—")
    keyValueRow("LinkedIn", data.contact.linkedInUrl ?? "—")
  } else {
    bodyLine("İletişim/muhatap bilgisi girilmemiş.")
  }
  y += 10

  sectionTitle("Program Katılım Geçmişi")
  if (data.programKatilimlari.length === 0) {
    bodyLine("Herhangi bir programa katılım bulunmuyor.")
  } else {
    data.programKatilimlari.forEach((k) => {
      bodyLine(
        `• ${k.programAdi} — ${katilimDurumuEtiketi(k.durum)} (${formatDate(k.baslangicTarihi)} – ${formatDate(k.bitisTarihi)})`,
      )
    })
  }
  y += 10

  sectionTitle("Gelişim Yolculuğu")
  if (data.gelisimAdimlari.length === 0) {
    bodyLine("Henüz bir gelişim adımı eklenmemiş.")
  } else {
    ;[...data.gelisimAdimlari]
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
      .forEach((g) => {
        bodyLine(`• ${formatDate(g.tarih)} — ${g.baslik}${g.aciklama ? `: ${g.aciklama}` : ""}`)
      })
  }
  y += 10

  if (data.onayliSatisKayitlari) {
    sectionTitle("Onaylı Satış Özeti")
    keyValueRow("Toplam Onaylı Ciro", formatCurrency(data.onayliSatisKayitlari.reduce((sum, s) => sum + s.ciro, 0), "TRY"))
    if (data.onayliSatisKayitlari.length === 0) {
      bodyLine("Onaylı satış kaydı bulunmuyor.")
    } else {
      data.onayliSatisKayitlari.forEach((s) => {
        bodyLine(
          `• ${s.donem}: ${formatCurrency(s.ciro, "TRY")}${s.ihracat != null ? ` (İhracat: ${formatCurrency(s.ihracat, "TRY")})` : ""}`,
        )
      })
    }
    y += 10
  }

  if (data.onayliYatirimKayitlari) {
    sectionTitle("Onaylı Yatırım Özeti")
    if (data.onayliYatirimKayitlari.length === 0) {
      bodyLine("Onaylı yatırım kaydı bulunmuyor.")
    } else {
      const toplamlar = data.onayliYatirimKayitlari.reduce<Record<string, number>>((map, v) => {
        map[v.paraBirimi] = (map[v.paraBirimi] ?? 0) + v.tutar
        return map
      }, {})
      Object.entries(toplamlar).forEach(([currency, tutar]) => keyValueRow(`Toplam Onaylı Yatırım (${currency})`, formatCurrency(tutar, currency)))
      data.onayliYatirimKayitlari.forEach((v) => {
        bodyLine(
          `• ${yatirimTuruEtiketi(v.tur)} — ${formatCurrency(v.tutar, v.paraBirimi)} (${formatDate(v.tarih)}${v.yatirimciAdi ? `, ${v.yatirimciAdi}` : ""})`,
        )
      })
    }
    y += 10
  }

  sectionTitle("Başarılar")
  if (data.basarilar.length === 0) {
    bodyLine("Onaylı başarı kaydı bulunmuyor.")
  } else {
    data.basarilar.forEach((b) => {
      bodyLine(`• ${basariTuruEtiketi(b.tur)} — ${b.baslik} (${formatDate(b.tarih)})`)
    })
  }

  return doc
}
