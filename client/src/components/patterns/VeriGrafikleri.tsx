import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/patterns/EmptyState"
import type { GirisimDetailDto } from "@/lib/types"

const RENKLER = {
  ciro: "#0078a8",
  ihracat: "#7c3aed",
  yatirim: "#f7941d",
  istihdam: "#1a7f5a",
} as const

function kisaTutar(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B`
  return value.toLocaleString("tr-TR")
}

function tamTutar(value: number) {
  return `₺${value.toLocaleString("tr-TR")}`
}

function GrafikKarti({
  baslik,
  aciklama,
  bosMesaj,
  veriVar,
  children,
}: {
  baslik: string
  aciklama: string
  bosMesaj: string
  veriVar: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{baslik}</CardTitle>
        <p className="text-xs text-muted-foreground">{aciklama}</p>
      </CardHeader>
      <CardContent>
        {veriVar ? (
          <ResponsiveContainer width="100%" height={220}>
            {children as React.ReactElement}
          </ResponsiveContainer>
        ) : (
          <EmptyState icon="📊" message={bosMesaj} />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Girişimin sisteme girdiği sayısal verilerin her biri kendi grafiğinde. Tek bir birleşik grafik,
 * farklı birimleri (TL ve kişi) aynı eksende ezip küçük değerleri görünmez kılıyordu; ayrıca
 * girişimci hangi veriyi güncellemesi gerektiğini ancak kendi grafiğini boş görünce anlıyor.
 */
export function VeriGrafikleri({ girisim }: { girisim: GirisimDetailDto }) {
  const onayliSatis = girisim.satisKayitlari
    .filter((s) => s.onayDurumu === "Onaylandi")
    .slice()
    .sort((a, b) => a.donem.localeCompare(b.donem))

  const ciro = onayliSatis.map((s) => ({ donem: s.donem, deger: s.ciro }))
  const ihracat = onayliSatis.map((s) => ({ donem: s.donem, deger: s.ihracat ?? 0 }))

  const yatirim = girisim.yatirimKayitlari
    .filter((y) => y.onayDurumu === "Onaylandi")
    .slice()
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .map((y) => ({ donem: new Date(y.tarih).toLocaleDateString("tr-TR", { month: "short", year: "numeric" }), deger: y.tutar }))

  const istihdam = girisim.istihdamKayitlari
    .filter((i) => i.onayDurumu === "Onaylandi")
    .slice()
    .sort((a, b) => a.donem.localeCompare(b.donem))
    .map((i) => ({ donem: i.donem, deger: i.calisanSayisi, yeniIseAlim: i.yeniIseAlim ?? 0 }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GrafikKarti
        baslik="Ciro"
        aciklama="Onaylı satış kayıtlarının dönem bazında seyri."
        bosMesaj="Onaylı satış kaydın yok."
        veriVar={ciro.length > 0}
      >
        <BarChart data={ciro} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
          <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
          <Tooltip formatter={(v) => tamTutar(Number(v))} />
          <Bar dataKey="deger" name="Ciro" fill={RENKLER.ciro} radius={[6, 6, 0, 0]} maxBarSize={64} />
        </BarChart>
      </GrafikKarti>

      <GrafikKarti
        baslik="İhracat"
        aciklama="Satış kayıtlarında bildirilen ihracat tutarı."
        bosMesaj="Henüz ihracat bildirmedin."
        veriVar={ihracat.some((i) => i.deger > 0)}
      >
        <AreaChart data={ihracat} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
          <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
          <Tooltip formatter={(v) => tamTutar(Number(v))} />
          <Area dataKey="deger" name="İhracat" stroke={RENKLER.ihracat} fill={RENKLER.ihracat} fillOpacity={0.15} strokeWidth={2.5} />
        </AreaChart>
      </GrafikKarti>

      <GrafikKarti
        baslik="Yatırım"
        aciklama="Onaylı yatırım turlarının zaman içindeki dağılımı."
        bosMesaj="Onaylı yatırım kaydın yok."
        veriVar={yatirim.length > 0}
      >
        <BarChart data={yatirim} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
          <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={kisaTutar} tick={{ fontSize: 11 }} width={56} />
          <Tooltip formatter={(v) => tamTutar(Number(v))} />
          {/* Tek kayıt varsa çubuk tüm genişliği kaplamasın. */}
          <Bar dataKey="deger" name="Yatırım" fill={RENKLER.yatirim} radius={[6, 6, 0, 0]} maxBarSize={64} />
        </BarChart>
      </GrafikKarti>

      <GrafikKarti
        baslik="İstihdam"
        aciklama="Dönem sonu çalışan sayısı; noktalar yeni işe alım yapılan dönemleri gösterir."
        bosMesaj="Henüz istihdam kaydın yok."
        veriVar={istihdam.length > 0}
      >
        <LineChart data={istihdam} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
          <XAxis dataKey="donem" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v, _ad, item) => {
              const alim = (item?.payload as { yeniIseAlim?: number } | undefined)?.yeniIseAlim ?? 0
              return [`${Number(v)} kişi${alim > 0 ? ` (+${alim} işe alım)` : ""}`, "Çalışan"]
            }}
          />
          <Line
            dataKey="deger"
            name="Çalışan"
            stroke={RENKLER.istihdam}
            strokeWidth={2.5}
            // İşe alım yapılan dönemler büyük nokta ile işaretlenir: istihdamın hangi çeyrekte
            // sıçradığı ciro grafiğiyle yan yana okunabilsin.
            dot={(props) => {
              const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { yeniIseAlim: number }; index: number }
              const alimVar = (payload?.yeniIseAlim ?? 0) > 0
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={alimVar ? 6 : 3}
                  fill={alimVar ? RENKLER.istihdam : "#ffffff"}
                  stroke={RENKLER.istihdam}
                  strokeWidth={2}
                />
              )
            }}
          />
        </LineChart>
      </GrafikKarti>
    </div>
  )
}
