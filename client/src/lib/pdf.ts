import jsPDF from "jspdf"

/**
 * jsPDF'in gömülü fontları (helvetica vb.) Latin-1 kodlaması kullanır; ı, ş, ğ, İ ve ₺ bu tabloda
 * yoktur ve çıktıda "Detayl1", "Sa_l1k", "°" gibi bozulmalara dönüşür. Türkçe raporlar için
 * gerçek bir Unicode TrueType font gömmek zorunludur.
 *
 * Font dosyaları bundle'a gömülmez; PDF üretilirken /fonts altından çekilir, böylece uygulamayı
 * ilk açan kullanıcı 240 KB'lık font yükünü boşuna taşımaz.
 */
export const PDF_FONT = "Roboto"

type FontWeight = "normal" | "bold"

const FONT_FILES: Record<FontWeight, string> = {
  normal: "/fonts/Roboto-Regular.ttf",
  bold: "/fonts/Roboto-Bold.ttf",
}

let fontCache: Promise<Record<FontWeight, string>> | null = null

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  // String.fromCharCode(...bytes) 120 KB'lık bir fontta çağrı yığınını taşırır — parça parça çevir.
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function loadFonts(): Promise<Record<FontWeight, string>> {
  fontCache ??= (async () => {
    const [regular, bold] = await Promise.all(
      (["normal", "bold"] as const).map(async (weight) => {
        const response = await fetch(FONT_FILES[weight])
        if (!response.ok) throw new Error(`Font yüklenemedi: ${FONT_FILES[weight]}`)
        return toBase64(await response.arrayBuffer())
      }),
    )
    return { normal: regular, bold }
  })()

  try {
    return await fontCache
  } catch (error) {
    // Başarısız bir yükleme kalıcı olarak önbelleğe yazılmasın; sonraki deneme tekrar uğraşsın.
    fontCache = null
    throw error
  }
}

/**
 * Türkçe karakterleri doğru basan, hazır bir jsPDF belgesi döndürür. Çağıranlar font ailesi olarak
 * daima {@link PDF_FONT} kullanmalıdır — "helvetica"ya düşen her çağrı bozuk karakter üretir.
 */
export async function createTurkishPdf(
  options: { orientation?: "portrait" | "landscape" } = {},
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: options.orientation ?? "portrait" })
  const fonts = await loadFonts()

  doc.addFileToVFS("Roboto-Regular.ttf", fonts.normal)
  doc.addFont("Roboto-Regular.ttf", PDF_FONT, "normal")
  doc.addFileToVFS("Roboto-Bold.ttf", fonts.bold)
  doc.addFont("Roboto-Bold.ttf", PDF_FONT, "bold")
  doc.setFont(PDF_FONT, "normal")

  return doc
}
