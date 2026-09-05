export interface ChartImage {
  dataUrl: string
  width: number
  height: number
}

/** Serializes a chart container's rendered <svg> to a PNG data URL so it can be embedded in Excel/PDF exports. */
export async function captureChartPng(container: HTMLElement | null, scale = 2): Promise<ChartImage | null> {
  const svg = container?.querySelector("svg")
  if (!svg) return null

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))

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
