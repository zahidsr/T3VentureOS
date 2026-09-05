import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Banknote, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { SeviyeRozeti } from "@/components/patterns/SeviyeRozeti"
import { LinkButton } from "@/components/patterns/LinkButton"
import { api } from "@/lib/api-client"
import type { ProgramKohortuDto } from "@/lib/types"
import { cn } from "@/lib/utils"

function paraKisa(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} B ₺`
  return `${value.toLocaleString("tr-TR")} ₺`
}

function Metrik({
  ikon,
  deger,
  etiket,
  tonNotr,
}: {
  ikon: React.ReactNode
  deger: string
  etiket: string
  tonNotr?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <div className={cn("flex size-9 items-center justify-center rounded-lg", tonNotr ? "bg-muted text-muted-foreground" : "bg-role-accent-soft text-role-accent")}>
        {ikon}
      </div>
      <div className="min-w-0">
        <div className="font-heading text-xl font-extrabold text-t3-navy">{deger}</div>
        <div className="text-xs text-muted-foreground">{etiket}</div>
      </div>
    </div>
  )
}

/**
 * Programın kohortu: katılan girişimlerin program başlangıcından bugüne değişimi. Program
 * yöneticisinin "bu program ne yaptı" sorusunun cevabı ve fon raporlarına dayanak.
 */
export function ProgramKohortu({ programId }: { programId: string }) {
  const kohortQuery = useQuery({
    queryKey: ["program-kohort", programId],
    queryFn: async () => (await api.get<ProgramKohortuDto>(`/programs/${programId}/kohort`)).data,
  })

  if (kohortQuery.isLoading) return <Skeleton className="h-64 w-full" />
  const k = kohortQuery.data
  if (!k) return null

  if (k.girisimSayisi === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Program Etkisi</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon="👥" message="Bu programa henüz girişim eklenmemiş." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Program Etkisi</CardTitle>
        <p className="text-xs text-muted-foreground">
          Program başlangıcından bugüne, katılan {k.girisimSayisi} girişimin ürettiği değer. Programın
          başladığı çeyrek dahil edilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrik ikon={<TrendingUp className="size-4" />} deger={paraKisa(k.toplamProgramSirasindaCiro)} etiket="Program süresince ciro" />
          <Metrik ikon={<Banknote className="size-4" />} deger={paraKisa(k.toplamProgramSirasindaYatirim)} etiket="Çekilen yatırım" />
          <Metrik
            ikon={<Users className="size-4" />}
            deger={`${k.toplamIstihdamArtisi >= 0 ? "+" : ""}${k.toplamIstihdamArtisi} kişi`}
            etiket="Net istihdam artışı"
          />
        </div>

        {k.veriGirmeyenGirisimSayisi > 0 && (
          // Yöneticinin peşine düşeceği liste: programa girmiş ama hiç veri üretmemiş girişimler.
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-amber-900 dark:text-amber-200">
              {k.veriGirmeyenGirisimSayisi} girişim programa katıldığından beri hiç ciro, yatırım ya da
              istihdam verisi girmemiş. Bu girişimlerin etkisi raporda görünmez.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Girişim</TableHead>
                <TableHead>Program Öncesi Ciro</TableHead>
                <TableHead>Program Süresince Ciro</TableHead>
                <TableHead>Çalışan</TableHead>
                <TableHead>Çekilen Yatırım</TableHead>
                <TableHead>Puan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {k.satirlar.map((s) => {
                const istihdamArtisi = s.guncelCalisan - s.programBasindaCalisan
                return (
                  <TableRow key={s.girisimId}>
                    <TableCell>
                      <LinkButton to={`/girisimler/${s.girisimId}`} variant="link" className="h-auto p-0 font-medium">
                        {s.ad}
                      </LinkButton>
                      <div className="text-xs text-muted-foreground">{s.sektor ?? "Sektör girilmemiş"}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{paraKisa(s.programOncesiCiro)}</TableCell>
                    <TableCell className="font-medium">{paraKisa(s.programSirasindaCiro)}</TableCell>
                    <TableCell>
                      <span className="tabular-nums">
                        {s.programBasindaCalisan} → {s.guncelCalisan}
                      </span>
                      {istihdamArtisi > 0 && (
                        <span className="ml-1.5 text-xs font-semibold text-emerald-600">+{istihdamArtisi}</span>
                      )}
                    </TableCell>
                    <TableCell>{paraKisa(s.programSirasindaYatirim)}</TableCell>
                    <TableCell>
                      <SeviyeRozeti seviye={s.seviye} puan={s.puan} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
