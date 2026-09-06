import { describe, expect, it } from "vitest"
import { haftaKaydir, nakitOmru, tutarGecerli } from "./girisim-araclari"

describe("nakit ömrü", () => {
  it("nakit tüketimini ve gider azaltma senaryosunu hesaplar", () => {
    expect(nakitOmru(120000, 10000, 30000)).toEqual({ netGider: 20000, ay: 6 })
    expect(nakitOmru(120000, 10000, 30000, 20).ay).toBeCloseTo(8.571428)
  })
  it("denge ve nakit fazlasını sonsuz sayı üretmeden gösterir", () => {
    expect(nakitOmru(0, 100, 100).ay).toBeNull()
    expect(nakitOmru(100, 200, 100)).toEqual({ netGider: -100, ay: null })
    expect(nakitOmru(0, 0, 100).ay).toBe(0)
  })
  it("boş, negatif, aşırı büyük veya hassas tutarları reddeder", () => {
    for (const value of ["", "-1", "NaN", "Infinity", "1.001", "1000000000000", "1e5"]) expect(tutarGecerli(value)).toBe(false)
    for (const value of ["0", "0.01", "120000", "999999999999.99"]) expect(tutarGecerli(value)).toBe(true)
  })
})

describe("hafta geçmişi", () => {
  it("yıl sınırında ve artık yılda haftaları korur", () => {
    expect(haftaKaydir("2026-01-05", -7)).toBe("2025-12-29")
    expect(haftaKaydir("2024-02-26", 7)).toBe("2024-03-04")
  })
})
