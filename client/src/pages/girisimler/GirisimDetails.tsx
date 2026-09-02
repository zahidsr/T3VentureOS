import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2 } from "lucide-react"
import { BackLink } from "@/components/patterns/BackLink"
import { PageHeader } from "@/components/patterns/PageHeader"
import { StatusBadge } from "@/components/patterns/StatusBadge"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { API_URL, api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type {
  AddGelisimAdimiRequest,
  BasariTuru,
  GirisimDetailDto,
  KatilimDurumu,
  UpdateGirisimRequest,
  YatirimTuru,
} from "@/lib/types"

const yatirimTuruLabels: Record<YatirimTuru, string> = {
  Hibe: "Hibe",
  OnTohum: "Ön Tohum",
  Tohum: "Tohum",
  SeriA: "Seri A",
  SeriB: "Seri B",
  SeriSonrasi: "Seri Sonrası",
  Diger: "Diğer",
}

const basariTuruLabels: Record<BasariTuru, string> = {
  Hibe: "Hibe",
  Odul: "Ödül",
  Sertifika: "Sertifika",
  Diger: "Diğer",
}

const katilimDurumuLabels: Record<KatilimDurumu, string> = {
  Basvuru: "Başvuru",
  KabulEdildi: "Kabul Edildi",
  DevamEdiyor: "Devam Ediyor",
  Mezun: "Mezun",
  Ayrildi: "Ayrıldı",
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

// ------------------------------------------------------------ profil formu

const optionalText = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : undefined
  })

const profileSchema = z.object({
  ad: z.string().min(1, "Girişim adı zorunludur."),
  sektor: optionalText,
  kisaTanim: optionalText,
  teknoloji: optionalText,
  websiteUrl: optionalText,
  kurulusYili: optionalNumber,
  ekipBuyuklugu: optionalNumber,
})

type ProfileFormValues = z.input<typeof profileSchema>

function ProfileEditForm({
  girisim,
  onCancel,
  onSaved,
}: {
  girisim: GirisimDetailDto
  onCancel: () => void
  onSaved: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ad: girisim.ad,
      sektor: girisim.sektor ?? "",
      kisaTanim: girisim.kisaTanim ?? "",
      teknoloji: girisim.teknoloji ?? "",
      websiteUrl: girisim.websiteUrl ?? "",
      kurulusYili: girisim.kurulusYili ?? undefined,
      ekipBuyuklugu: girisim.ekipBuyuklugu ?? undefined,
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateGirisimRequest) =>
      (await api.put<GirisimDetailDto>(`/girisimler/${girisim.id}`, payload)).data,
    onSuccess: () => {
      toast.success("Girişim güncellendi.")
      onSaved()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Girişim güncellenemedi.")),
  })

  function onSubmit(values: ProfileFormValues) {
    const payload = profileSchema.parse(values)
    updateMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ad">Girişim Adı *</Label>
        <Input id="ad" {...register("ad")} />
        {errors.ad && <p className="text-xs text-red-600">{errors.ad.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sektor">Sektör</Label>
        <Input id="sektor" {...register("sektor")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kisaTanim">Kısa Tanım</Label>
        <Textarea id="kisaTanim" rows={3} {...register("kisaTanim")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teknoloji">Teknoloji</Label>
        <Input id="teknoloji" {...register("teknoloji")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input id="websiteUrl" placeholder="https://" {...register("websiteUrl")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="kurulusYili">Kuruluş Yılı</Label>
          <Input id="kurulusYili" type="number" {...register("kurulusYili")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ekipBuyuklugu">Ekip Büyüklüğü</Label>
          <Input id="ekipBuyuklugu" type="number" {...register("ekipBuyuklugu")} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Vazgeç
        </Button>
        <Button type="submit" className="bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  )
}

// -------------------------------------------------------- gelişim adımı formu

const gelisimSchema = z.object({
  tarih: z.string().min(1, "Tarih zorunludur."),
  baslik: z.string().min(1, "Başlık zorunludur."),
  aciklama: optionalText,
})

type GelisimFormValues = z.input<typeof gelisimSchema>

function AddGelisimAdimiForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GelisimFormValues>({ resolver: zodResolver(gelisimSchema) })

  const addMutation = useMutation({
    mutationFn: async (payload: AddGelisimAdimiRequest) =>
      (await api.post<GirisimDetailDto>(`/girisimler/${girisimId}/gelisim-adimlari`, payload)).data,
    onSuccess: () => {
      toast.success("Gelişim adımı eklendi.")
      reset({ tarih: "", baslik: "", aciklama: "" })
      onAdded()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Gelişim adımı eklenemedi.")),
  })

  function onSubmit(values: GelisimFormValues) {
    const payload = gelisimSchema.parse(values)
    addMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="tarih">Tarih</Label>
          <Input id="tarih" type="date" {...register("tarih")} />
          {errors.tarih && <p className="text-xs text-red-600">{errors.tarih.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="baslik">Başlık</Label>
          <Input id="baslik" {...register("baslik")} />
          {errors.baslik && <p className="text-xs text-red-600">{errors.baslik.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="aciklama">Açıklama</Label>
        <Textarea id="aciklama" rows={2} {...register("aciklama")} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
          {isSubmitting ? "Ekleniyor…" : "Gelişim Adımı Ekle"}
        </Button>
      </div>
    </form>
  )
}

// -------------------------------------------------------------------- logo

function logoSrcFor(girisim: GirisimDetailDto) {
  return girisim.logoUrl ? `${API_URL.replace(/\/api\/?$/, "")}${girisim.logoUrl}` : null
}

function LogoUploadSection({
  girisim,
  canEdit,
  onUpdated,
}: {
  girisim: GirisimDetailDto
  canEdit: boolean
  onUpdated: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return (await api.post<GirisimDetailDto>(`/girisimler/${girisim.id}/logo`, formData)).data
    },
    onSuccess: () => {
      toast.success("Logo güncellendi.")
      onUpdated()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Logo yüklenemedi.")),
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) logoMutation.mutate(file)
    e.target.value = ""
  }

  const logoSrc = logoSrcFor(girisim)

  return (
    <div className="mb-6 flex items-center gap-4">
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={`${girisim.ad} logosu`}
          className="size-20 rounded-2xl border object-cover"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-2xl border bg-muted">
          <Building2 className="size-8 text-muted-foreground" />
        </div>
      )}
      {canEdit && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={logoMutation.isPending}
          >
            {logoMutation.isPending ? "Yükleniyor…" : "Logo Yükle"}
          </Button>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------- sayfa

export default function GirisimDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const canEdit = user?.role === "SuperAdmin" || user?.role === "ProgramYoneticisi"
  const backTo = user?.role === "StartupKullanicisi" ? "/girisimim" : "/girisimler"
  const backLabel = user?.role === "StartupKullanicisi" ? "Girişimime dön" : "Girişimlere dön"

  const girisimQuery = useQuery({
    queryKey: ["girisim", id],
    queryFn: async () => (await api.get<GirisimDetailDto>(`/girisimler/${id}`)).data,
    enabled: !!id,
  })

  useEffect(() => {
    setIsEditing(false)
  }, [id])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["girisim", id] })
  }

  if (girisimQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (girisimQuery.isError || !girisimQuery.data) {
    return (
      <div>
        <BackLink to={backTo} label={backLabel} />
        <EmptyState icon="⚠️" message="Girişim bulunamadı veya yüklenirken bir hata oluştu." />
      </div>
    )
  }

  const girisim = girisimQuery.data

  return (
    <div>
      <BackLink to={backTo} label={backLabel} />
      <PageHeader
        eyebrow="Girişim Ekosistemi"
        title={girisim.ad}
        subtitle={
          <>
            {girisim.sektor ?? "Sektör belirtilmemiş"}
            {girisim.kurulusYili ? ` · Kuruluş ${girisim.kurulusYili}` : ""}
          </>
        }
        actions={
          canEdit && !isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Düzenle
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="programlar">Program Geçmişi</TabsTrigger>
          <TabsTrigger value="gelisim">Gelişim Yolculuğu</TabsTrigger>
          <TabsTrigger value="finansal">Satış &amp; Yatırım</TabsTrigger>
          <TabsTrigger value="basari-dokuman">Başarı &amp; Doküman</TabsTrigger>
        </TabsList>

        {/* -------------------------------------------------------- Profil */}
        <TabsContent value="profil" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <LogoUploadSection girisim={girisim} canEdit={canEdit} onUpdated={invalidate} />
              {isEditing ? (
                <ProfileEditForm
                  girisim={girisim}
                  onCancel={() => setIsEditing(false)}
                  onSaved={() => {
                    setIsEditing(false)
                    invalidate()
                  }}
                />
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sektör</dt>
                    <dd className="mt-0.5 text-sm">{girisim.sektor ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Teknoloji</dt>
                    <dd className="mt-0.5 text-sm">{girisim.teknoloji ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Website</dt>
                    <dd className="mt-0.5 text-sm">
                      {girisim.websiteUrl ? (
                        <a
                          href={girisim.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-t3-blue hover:underline"
                        >
                          {girisim.websiteUrl}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Ekip Büyüklüğü
                    </dt>
                    <dd className="mt-0.5 text-sm">{girisim.ekipBuyuklugu ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Kuruluş Yılı
                    </dt>
                    <dd className="mt-0.5 text-sm">{girisim.kurulusYili ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Kısa Tanım
                    </dt>
                    <dd className="mt-0.5 text-sm whitespace-pre-wrap">{girisim.kisaTanim ?? "—"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------- Programlar */}
        <TabsContent value="programlar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {girisim.programKatilimlari.length === 0 ? (
                <EmptyState icon="📋" message="Bu girişim henüz bir programa katılmamış." />
              ) : (
                <div className="space-y-3">
                  {girisim.programKatilimlari.map((k) => (
                    <div
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-t3-navy">{k.programAdi}</p>
                        <p className="text-xs text-muted-foreground">
                          {k.donem ?? "Dönem belirtilmemiş"} · {formatDate(k.baslangicTarihi)} –{" "}
                          {formatDate(k.bitisTarihi)}
                        </p>
                      </div>
                      <Badge variant="outline">{katilimDurumuLabels[k.durum] ?? k.durum}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------ Gelişim */}
        <TabsContent value="gelisim" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gelişim Yolculuğu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit && <AddGelisimAdimiForm girisimId={girisim.id} onAdded={invalidate} />}

              {girisim.gelisimAdimlari.length === 0 ? (
                <EmptyState icon="🗺️" message="Henüz bir gelişim adımı eklenmemiş." />
              ) : (
                <ol className="space-y-4 border-l-2 border-t3-blue-light pl-4">
                  {[...girisim.gelisimAdimlari]
                    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
                    .map((g) => (
                      <li key={g.id} className="relative">
                        <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-t3-blue" />
                        <p className="text-xs font-medium text-muted-foreground">{formatDate(g.tarih)}</p>
                        <p className="text-sm font-semibold text-t3-navy">{g.baslik}</p>
                        {g.aciklama && <p className="mt-0.5 text-sm text-muted-foreground">{g.aciklama}</p>}
                      </li>
                    ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------------- Finansal */}
        <TabsContent value="finansal" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Satış Kayıtları</CardTitle>
            </CardHeader>
            <CardContent>
              {girisim.satisKayitlari.length === 0 ? (
                <EmptyState icon="💰" message="Satış kaydı bulunmuyor." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dönem</TableHead>
                        <TableHead>Ciro</TableHead>
                        <TableHead>İhracat</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girisim.satisKayitlari.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.donem}</TableCell>
                          <TableCell>{formatCurrency(s.ciro, "TRY")}</TableCell>
                          <TableCell>{s.ihracat != null ? formatCurrency(s.ihracat, "TRY") : "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={s.onayDurumu} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yatırım Kayıtları</CardTitle>
            </CardHeader>
            <CardContent>
              {girisim.yatirimKayitlari.length === 0 ? (
                <EmptyState icon="📈" message="Yatırım kaydı bulunmuyor." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Yatırımcı</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girisim.yatirimKayitlari.map((y) => (
                        <TableRow key={y.id}>
                          <TableCell>
                            <Badge variant="outline">{yatirimTuruLabels[y.tur] ?? y.tur}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(y.tutar, y.paraBirimi)}</TableCell>
                          <TableCell>{formatDate(y.tarih)}</TableCell>
                          <TableCell>{y.yatirimciAdi ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={y.onayDurumu} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------------------- Başarı & Doküman */}
        <TabsContent value="basari-dokuman" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Başarılar</CardTitle>
            </CardHeader>
            <CardContent>
              {girisim.basarilar.length === 0 ? (
                <EmptyState icon="🏆" message="Başarı kaydı bulunmuyor." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girisim.basarilar.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <Badge variant="outline">{basariTuruLabels[b.tur] ?? b.tur}</Badge>
                          </TableCell>
                          <TableCell>{b.baslik}</TableCell>
                          <TableCell>{formatDate(b.tarih)}</TableCell>
                          <TableCell>
                            <StatusBadge status={b.onayDurumu} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokümanlar</CardTitle>
            </CardHeader>
            <CardContent>
              {girisim.dokumanlar.length === 0 ? (
                <EmptyState icon="📄" message="Doküman bulunmuyor." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Dosya</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girisim.dokumanlar.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.baslik}</TableCell>
                          <TableCell>
                            <a
                              href={d.dosyaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-t3-blue hover:underline"
                            >
                              {d.dosyaAdi}
                            </a>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={d.onayDurumu} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
