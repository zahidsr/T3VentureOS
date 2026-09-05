import { describe, expect, it } from "vitest"
import { aiMaddeleriniAyir } from "@/lib/ai-metni"

describe("aiMaddeleriniAyir", () => {
  it("madde işaretlerini ve kalın vurgu yıldızlarını temizler", () => {
    const metin = "* **Veri Bütünlüğü:** Eksik kayıt var.\n- İkinci madde\n• Üçüncü madde"

    expect(aiMaddeleriniAyir(metin)).toEqual([
      "Veri Bütünlüğü: Eksik kayıt var.",
      "İkinci madde",
      "Üçüncü madde",
    ])
  })

  it("boş satırları atar", () => {
    expect(aiMaddeleriniAyir("Bir\n\n   \nİki")).toEqual(["Bir", "İki"])
  })

  it("işaretsiz düz metni olduğu gibi bırakır", () => {
    expect(aiMaddeleriniAyir("Tek satırlık analiz.")).toEqual(["Tek satırlık analiz."])
  })
})
