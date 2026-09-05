import { describe, expect, it } from "vitest"
import { aylikTrendOkumasi, sayiEki, sektorDagilimiOkumasi, yatirimTuruOkumasi } from "@/lib/rapor-okumasi"

describe("sayiEki", () => {
  it.each([
    [69, "'u"], // altmış dokuz
    [9, "'u"], // dokuz
    [75, "'i"], // yetmiş beş
    [2, "'si"], // iki
    [6, "'sı"], // altı
    [3, "'ü"], // üç
    [10, "'u"], // on
    [20, "'si"], // yirmi
    [40, "'ı"], // kırk
    [50, "'si"], // elli
    [90, "'ı"], // doksan
    [100, "'ü"], // yüz
    [0, "'ı"], // sıfır
  ])("%i sayısının eki %s olur", (sayi, ek) => {
    expect(sayiEki(sayi)).toBe(ek)
  })
})

const ay = (ad: string, ciro: number, yatirim = 0) => ({ ay: ad, ciro, yatirim })

describe("aylikTrendOkumasi", () => {
  it("veri yoksa null döner", () => {
    expect(aylikTrendOkumasi([])).toBeNull()
  })

  it("tüm aylar boşsa veri girilmediğini söyler", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 0), ay("Şub", 0)])
    expect(okuma?.ton).toBe("uyari")
    expect(okuma?.baslik).toContain("hiç ciro ya da yatırım kaydı girilmemiş")
  })

  it("ikinci yarıdaki artışı yüzdesiyle bildirir", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 100), ay("Şub", 100), ay("Mar", 300), ay("Nis", 300)])
    expect(okuma?.baslik).toContain("%200 arttı")
    expect(okuma?.ton).toBe("olumlu")
  })

  it("gerilemeyi uyarı tonuyla bildirir", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 400), ay("Şub", 400), ay("Mar", 100), ay("Nis", 100)])
    expect(okuma?.baslik).toContain("geriledi")
    expect(okuma?.ton).toBe("uyari")
  })

  it("küçük dalgalanmayı artış saymaz", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 100), ay("Şub", 100), ay("Mar", 102), ay("Nis", 101)])
    expect(okuma?.baslik).toContain("yatay")
    expect(okuma?.ton).toBe("notr")
  })

  it("hareketsiz ayları düzenlilik sorunu olarak işaretler", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 100), ay("Şub", 0), ay("Mar", 0), ay("Nis", 300)])
    expect(okuma?.detaylar.join(" ")).toContain("veri girişi düzenli değil")
    // Ayların yarısı boşsa artış olsa bile uyarıya döner.
    expect(okuma?.ton).toBe("uyari")
  })

  it("en yüksek ciro ayını belirtir", () => {
    const okuma = aylikTrendOkumasi([ay("Oca", 100), ay("Şub", 900), ay("Mar", 200), ay("Nis", 300)])
    expect(okuma?.detaylar.join(" ")).toContain("Şub")
  })
})

describe("sektorDagilimiOkumasi", () => {
  it("veri yoksa null döner", () => {
    expect(sektorDagilimiOkumasi([])).toBeNull()
  })

  it("her girişim ayrı sektördeyse dağınıklığı söyler", () => {
    const okuma = sektorDagilimiOkumasi([
      { sektor: "AgriTech", sayi: 1 },
      { sektor: "Sağlık", sayi: 1 },
    ])
    expect(okuma?.baslik).toContain("tam dağınık")
    expect(okuma?.ton).toBe("olumlu")
  })

  it("tek sektörde yoğunlaşmayı uyarı olarak verir", () => {
    const okuma = sektorDagilimiOkumasi([
      { sektor: "Yapay Zekâ", sayi: 6 },
      { sektor: "Sağlık", sayi: 2 },
    ])
    expect(okuma?.baslik).toContain("%75'i")
    expect(okuma?.ton).toBe("uyari")
  })

  it("dengeli dağılımda en büyük sektörü ve payını verir", () => {
    const okuma = sektorDagilimiOkumasi([
      { sektor: "Yapay Zekâ", sayi: 2 },
      { sektor: "Sağlık", sayi: 2 },
      { sektor: "Lojistik", sayi: 1 },
    ])
    expect(okuma?.baslik).toContain("5 girişim 3 sektöre")
    expect(okuma?.ton).toBe("olumlu")
  })
})

describe("yatirimTuruOkumasi", () => {
  it("veri yoksa null döner", () => {
    expect(yatirimTuruOkumasi([])).toBeNull()
  })

  it("tutarların tamamı sıfırsa null döner", () => {
    expect(yatirimTuruOkumasi([{ tur: "Tohum", toplamTutar: 0 }])).toBeNull()
  })

  it("erken aşama ağırlığını bildirir", () => {
    const okuma = yatirimTuruOkumasi([
      { tur: "Tohum", toplamTutar: 800 },
      { tur: "SeriA", toplamTutar: 200 },
    ])
    expect(okuma?.baslik).toContain("erken aşamada")
    // "%80'i" — seksen "i" ile biter.
    expect(okuma?.baslik).toContain("%80'i")
  })

  it("olgun girişimlerde yoğunlaşmayı uyarı olarak verir", () => {
    const okuma = yatirimTuruOkumasi([
      { tur: "Tohum", toplamTutar: 100 },
      { tur: "SeriB", toplamTutar: 900 },
    ])
    expect(okuma?.baslik).toContain("olgun girişimlerde")
    expect(okuma?.ton).toBe("uyari")
  })

  it("dengeli dağılımı olumlu okur", () => {
    const okuma = yatirimTuruOkumasi([
      { tur: "Tohum", toplamTutar: 400 },
      { tur: "SeriA", toplamTutar: 600 },
    ])
    expect(okuma?.ton).toBe("olumlu")
    expect(okuma?.baslik).toContain("dengeli")
  })
})
