export interface ChartImage {
  dataUrl: string
  width: number
  height: number
}

/**
 * Rasterleştirilen SVG, blob URL'inden yüklendiği için sayfanın stil sayfalarına erişemez: rengi,
 * çizgi kalınlığı ya da yazı tipi bir CSS sınıfından gelen her şey çıktıda kaybolur (grafik boş bir
 * kutuya döner). Bu yüzden klonlanan düğümlerin hesaplanmış stilleri satır içine yazılır.
 */
const COPIED_STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "color",
]

function inlineComputedStyles(source: SVGSVGElement, clone: SVGSVGElement) {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))]
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))]

  sourceNodes.forEach((node, i) => {
    const target = cloneNodes[i]
    if (!(target instanceof SVGElement) && !(target instanceof HTMLElement)) return

    const computed = window.getComputedStyle(node)
    const declarations = COPIED_STYLE_PROPS.map((prop) => `${prop}:${computed.getPropertyValue(prop)}`)
      .filter((d) => !d.endsWith(":"))
      .join(";")

    if (declarations) target.setAttribute("style", declarations)
  })
}

/**
 * Kaptaki grafiği bulur. Düz `querySelector("svg")` işe yaramaz: kart başlıklarındaki lucide
 * ikonları da birer <svg>'dir ve DOM'da grafikten önce geldikleri için 14x14'lük ikon yakalanır.
 * Sayfada mini sparkline grafikleri de bulunabildiğinden, ilk eşleşme yerine alan olarak en büyük
 * yüzey seçilir; Recharts yüzeyi varsa aday kümesi onlarla sınırlanır.
 */
function findChartSvg(container: HTMLElement): SVGSVGElement | null {
  const surfaces = Array.from(container.querySelectorAll<SVGSVGElement>("svg.recharts-surface"))
  const candidates = surfaces.length > 0 ? surfaces : Array.from(container.querySelectorAll<SVGSVGElement>("svg"))
  if (candidates.length === 0) return null

  const area = (svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect()
    return rect.width * rect.height
  }
  return candidates.reduce((largest, svg) => (area(svg) > area(largest) ? svg : largest))
}

/** Serializes a chart container's rendered <svg> to a PNG data URL so it can be embedded in Excel/PDF exports. */
export async function captureChartPng(container: HTMLElement | null, scale = 2): Promise<ChartImage | null> {
  const svg = container ? findChartSvg(container) : null
  if (!svg) return null

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  // Recharts, viewBox yerine width/height ile çalışır; ölçek bozulmasın diye açıkça verilir.
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${width} ${height}`)
  inlineComputedStyles(svg, clone)

  const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Grafik görüntüsü oluşturulamadı."))
      image.src = url
    })

    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)

    return { dataUrl: canvas.toDataURL("image/png"), width, height }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
