import { useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Trash2 } from "lucide-react"
import { LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PDF_FONT, createTurkishPdf } from "@/lib/pdf"
import { SunumPaneli } from "@/components/sunum/SunumPaneli"
import { OkumaKutusu } from "@/components/patterns/OkumaKutusu"
import { GirisimAnalizPaneli } from "@/components/analiz/GirisimAnalizPaneli"
import { PuanKarti } from "@/components/patterns/PuanKarti"
import { aylikTrendOkumasi } from "@/lib/rapor-okumasi"
import { PageHeader } from "@/components/patterns/PageHeader"
import { StatusBadge } from "@/components/patterns/StatusBadge"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_URL, api, extractErrorMessage } from "@/lib/api-client"
import type {
  AddBasariRequest,
  AddGelisimAdimiRequest,
  AddSatisKaydiRequest,
  AddYatirimKaydiRequest,
  BasariTuru,
  DashboardStatsDto,
  DokumanTuru,
  GirisimContactDto,
  GirisimDetailDto,
  GuncellemeTalebiDto,
  ItirazDto,
  ItirazKonusuTuru,
  KatilimDurumu,
  MessageResponse,
  SubmitGuncellemeTalebiRequest,
  SubmitItirazRequest,
  UpsertGirisimContactRequest,
  YatirimTuru,
} from "@/lib/types"

const KONU_TURU_LABEL: Record<ItirazKonusuTuru, string> = {
  Satis: "Satış",
  Yatirim: "Yatırım",
  Basari: "Başarı",
  Dokuman: "Doküman",
}

// ---------------------------------------------------------------- helpers

const yatirimTuruOptions: YatirimTuru[] = ["Hibe", "OnTohum", "Tohum", "SeriA", "SeriB", "SeriSonrasi", "Diger"]
const yatirimTuruLabels: Record<YatirimTuru, string> = {
  Hibe: "Hibe",
  OnTohum: "Ön Tohum",
  Tohum: "Tohum",
  SeriA: "Seri A",
  SeriB: "Seri B",
  SeriSonrasi: "Seri Sonrası",
  Diger: "Diğer",
}

const basariTuruOptions: BasariTuru[] = ["Hibe", "Odul", "Sertifika", "Diger"]
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

function fileUrl(dosyaUrl: string) {
  return `${API_URL.replace(/\/api\/?$/, "")}${dosyaUrl}`
}

function ReviewNotuCell({ notu }: { notu: string | null }) {
  if (!notu) return <span className="text-muted-foreground">—</span>
  return <span className="text-xs text-red-700">{notu}</span>
}

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

// -------------------------------------------- güncelleme talebi formu

const guncellemeTalebiSchema = z.object({
  ad: z.string().min(1, "Girişim adı zorunludur."),
  sektor: optionalText,
  kisaTanim: optionalText,
  teknoloji: optionalText,
  websiteUrl: optionalText,
  kurulusYili: optionalNumber,
  ekipBuyuklugu: optionalNumber,
})
type GuncellemeTalebiFormValues = z.input<typeof guncellemeTalebiSchema>

function GuncellemeTalebiForm({
  girisim,
  prefill,
  onClose,
  onSubmitted,
}: {
  girisim: GirisimDetailDto
  prefill?: GuncellemeTalebiDto
  onClose: () => void
  onSubmitted: () => void
}) {
  const source = prefill ?? girisim
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuncellemeTalebiFormValues>({
    resolver: zodResolver(guncellemeTalebiSchema),
    defaultValues: {
      ad: source.ad,
      sektor: source.sektor ?? "",
      kisaTanim: source.kisaTanim ?? "",
      teknoloji: source.teknoloji ?? "",
      websiteUrl: source.websiteUrl ?? "",
      kurulusYili: source.kurulusYili ?? undefined,
      ekipBuyuklugu: source.ekipBuyuklugu ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: async (payload: SubmitGuncellemeTalebiRequest) =>
      (await api.post<MessageResponse>(`/girisimler/${girisim.id}/guncelleme-talebi`, payload)).data,
    onSuccess: (data) => {
      toast.success(data.message)
      onSubmitted()
      onClose()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Güncelleme talebi gönderilemedi.")),
  })

  function onSubmit(values: GuncellemeTalebiFormValues) {
    mutation.mutate(guncellemeTalebiSchema.parse(values))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border-2 border-t3-blue/20 bg-t3-blue-light/40 p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-t3-blue/20 bg-white px-4 py-3">
        <span className="mt-0.5 text-base">💡</span>
        <p className="text-sm text-muted-foreground">
          {prefill
            ? "Önceki talebinizin değerleri yüklendi — düzenleyip tekrar gönderebilirsiniz."
            : "Değişiklikleriniz yönetici onayından geçtikten sonra profilinize yansır."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-ad">Girişim Adı *</Label>
        <Input id="g-ad" {...register("ad")} />
        {errors.ad && <p className="text-xs text-red-600">{errors.ad.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-sektor">Sektör</Label>
        <Input id="g-sektor" {...register("sektor")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-kisaTanim">Kısa Tanım</Label>
        <Textarea id="g-kisaTanim" rows={3} {...register("kisaTanim")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-teknoloji">Teknoloji</Label>
        <Input id="g-teknoloji" {...register("teknoloji")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-websiteUrl">Website URL</Label>
        <Input id="g-websiteUrl" placeholder="https://" {...register("websiteUrl")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="g-kurulusYili">Kuruluş Yılı</Label>
          <Input id="g-kurulusYili" type="number" {...register("kurulusYili")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-ekipBuyuklugu">Ekip Büyüklüğü</Label>
          <Input id="g-ekipBuyuklugu" type="number" {...register("ekipBuyuklugu")} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Vazgeç
        </Button>
        <Button
          type="submit"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? "Gönderiliyor…" : "Onaya Gönder"}
        </Button>
      </div>
    </form>
  )
}

// ------------------------------------------- güncelleme talebi detayı (diff)

function DiffRow({
  label,
  oldValue,
  newValue,
}: {
  label: string
  oldValue: string
  newValue: string
}) {
  const changed = oldValue !== newValue
  return (
    <div className="grid grid-cols-3 gap-3 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={changed ? "text-muted-foreground line-through" : "text-muted-foreground"}>{oldValue}</span>
      <span className={changed ? "font-semibold text-t3-navy" : "text-muted-foreground"}>{newValue}</span>
    </div>
  )
}

function GuncellemeTalebiDetailDialog({ girisim, talep }: { girisim: GirisimDetailDto; talep: GuncellemeTalebiDto }) {
  const rows: { label: string; old: string; yeni: string }[] = [
    { label: "Girişim Adı", old: girisim.ad, yeni: talep.ad },
    { label: "Sektör", old: girisim.sektor ?? "—", yeni: talep.sektor ?? "—" },
    { label: "Kısa Tanım", old: girisim.kisaTanim ?? "—", yeni: talep.kisaTanim ?? "—" },
    { label: "Teknoloji", old: girisim.teknoloji ?? "—", yeni: talep.teknoloji ?? "—" },
    { label: "Website", old: girisim.websiteUrl ?? "—", yeni: talep.websiteUrl ?? "—" },
    { label: "Kuruluş Yılı", old: String(girisim.kurulusYili ?? "—"), yeni: String(talep.kurulusYili ?? "—") },
    { label: "Ekip Büyüklüğü", old: String(girisim.ekipBuyuklugu ?? "—"), yeni: String(talep.ekipBuyuklugu ?? "—") },
  ]

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Güncelleme Talebi Detayı</DialogTitle>
        <DialogDescription>
          {formatDate(talep.createdAt)} tarihinde gönderildi.{" "}
          {talep.onayDurumu === "Beklemede"
            ? "Yönetici onayı bekleniyor."
            : talep.onayDurumu === "Onaylandi"
              ? "Onaylandı ve profilinize yansıdı."
              : "Reddedildi."}
        </DialogDescription>
      </DialogHeader>
      <div>
        <div className="grid grid-cols-3 gap-3 border-b pb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <span>Alan</span>
          <span>Mevcut Profil</span>
          <span>Talep Edilen</span>
        </div>
        {rows.map((r) => (
          <DiffRow key={r.label} label={r.label} oldValue={r.old} newValue={r.yeni} />
        ))}
      </div>
      {talep.reviewNotu && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Ret gerekçesi: </span>
          {talep.reviewNotu}
        </div>
      )}
    </DialogContent>
  )
}

// ------------------------------------------------- satış kaydı formu

const satisSchema = z.object({
  donem: z.string().min(1, "Dönem zorunludur."),
  ciro: z.coerce.number().positive("Ciro pozitif olmalıdır."),
  ihracat: z.coerce.number().nonnegative().optional().or(z.literal("")),
})
type SatisFormValues = z.input<typeof satisSchema>

function AddSatisForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SatisFormValues>({ resolver: zodResolver(satisSchema) })

  const mutation = useMutation({
    mutationFn: async (payload: AddSatisKaydiRequest) =>
      (await api.post<GirisimDetailDto>(`/girisimler/${girisimId}/satis`, payload)).data,
    onSuccess: () => {
      toast.success("Satış kaydı onaya gönderildi.")
      reset()
      onAdded()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Satış kaydı eklenemedi.")),
  })

  function onSubmit(values: SatisFormValues) {
    mutation.mutate({
      donem: values.donem,
      ciro: Number(values.ciro),
      ihracat: values.ihracat !== "" && values.ihracat !== undefined ? Number(values.ihracat) : undefined,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Yeni Satış Kaydı Ekle</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="s-donem">Dönem</Label>
          <Input id="s-donem" placeholder="örn. 2026-Q1" {...register("donem")} />
          {errors.donem && <p className="text-xs text-red-600">{errors.donem.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-ciro">Ciro (TRY)</Label>
          <Input id="s-ciro" type="number" step="0.01" {...register("ciro")} />
          {errors.ciro && <p className="text-xs text-red-600">{errors.ciro.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-ihracat">İhracat (TRY) — opsiyonel</Label>
          <Input id="s-ihracat" type="number" step="0.01" {...register("ihracat")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? "Gönderiliyor…" : "Satış Kaydı Ekle"}
        </Button>
      </div>
    </form>
  )
}

// ----------------------------------------------- yatırım kaydı formu

const yatirimSchema = z.object({
  tur: z.enum(["Hibe", "OnTohum", "Tohum", "SeriA", "SeriB", "SeriSonrasi", "Diger"]),
  tutar: z.coerce.number().positive("Tutar pozitif olmalıdır."),
  paraBirimi: z.string().min(1, "Para birimi zorunludur."),
  tarih: z.string().min(1, "Tarih zorunludur."),
  yatirimciAdi: optionalText,
})
type YatirimFormValues = z.input<typeof yatirimSchema>

function AddYatirimForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<YatirimFormValues>({
    resolver: zodResolver(yatirimSchema),
    defaultValues: { paraBirimi: "TRY" },
  })

  const mutation = useMutation({
    mutationFn: async (payload: AddYatirimKaydiRequest) =>
      (await api.post<GirisimDetailDto>(`/girisimler/${girisimId}/yatirim`, payload)).data,
    onSuccess: () => {
      toast.success("Yatırım kaydı onaya gönderildi.")
      reset({ paraBirimi: "TRY" })
      onAdded()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Yatırım kaydı eklenemedi.")),
  })

  function onSubmit(values: YatirimFormValues) {
    mutation.mutate({
      tur: values.tur as YatirimTuru,
      tutar: Number(values.tutar),
      paraBirimi: values.paraBirimi,
      tarih: new Date(values.tarih).toISOString(),
      yatirimciAdi: values.yatirimciAdi,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Yeni Yatırım Kaydı Ekle</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="y-tur">Yatırım Türü</Label>
          <Controller
            control={control}
            name="tur"
            render={({ field }) => (
              <Select items={yatirimTuruLabels} value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="y-tur" className="w-full">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {yatirimTuruOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {yatirimTuruLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.tur && <p className="text-xs text-red-600">{errors.tur.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="y-tutar">Tutar</Label>
          <Input id="y-tutar" type="number" step="0.01" {...register("tutar")} />
          {errors.tutar && <p className="text-xs text-red-600">{errors.tutar.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="y-paraBirimi">Para Birimi</Label>
          <Input id="y-paraBirimi" {...register("paraBirimi")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="y-tarih">Tarih</Label>
          <Input id="y-tarih" type="date" {...register("tarih")} />
          {errors.tarih && <p className="text-xs text-red-600">{errors.tarih.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="y-yatirimciAdi">Yatırımcı Adı (opsiyonel)</Label>
        <Input id="y-yatirimciAdi" {...register("yatirimciAdi")} />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? "Gönderiliyor…" : "Yatırım Kaydı Ekle"}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------- başarı formu

const basariSchema = z.object({
  tur: z.enum(["Hibe", "Odul", "Sertifika", "Diger"]),
  baslik: z.string().min(1, "Başlık zorunludur."),
  aciklama: optionalText,
  tarih: z.string().min(1, "Tarih zorunludur."),
})
type BasariFormValues = z.input<typeof basariSchema>

function AddBasariForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BasariFormValues>({ resolver: zodResolver(basariSchema) })

  const mutation = useMutation({
    mutationFn: async (payload: AddBasariRequest) =>
      (await api.post<GirisimDetailDto>(`/girisimler/${girisimId}/basari`, payload)).data,
    onSuccess: () => {
      toast.success("Başarı kaydı onaya gönderildi.")
      reset()
      onAdded()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Başarı kaydı eklenemedi.")),
  })

  function onSubmit(values: BasariFormValues) {
    mutation.mutate({
      tur: values.tur as BasariTuru,
      baslik: values.baslik,
      aciklama: values.aciklama,
      tarih: new Date(values.tarih).toISOString(),
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Yeni Başarı Ekle</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="b-tur">Başarı Türü</Label>
          <Controller
            control={control}
            name="tur"
            render={({ field }) => (
              <Select items={basariTuruLabels} value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="b-tur" className="w-full">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {basariTuruOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {basariTuruLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.tur && <p className="text-xs text-red-600">{errors.tur.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-baslik">Başlık</Label>
          <Input id="b-baslik" {...register("baslik")} />
          {errors.baslik && <p className="text-xs text-red-600">{errors.baslik.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-tarih">Tarih</Label>
          <Input id="b-tarih" type="date" {...register("tarih")} />
          {errors.tarih && <p className="text-xs text-red-600">{errors.tarih.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-aciklama">Açıklama (opsiyonel)</Label>
        <Textarea id="b-aciklama" rows={2} {...register("aciklama")} />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? "Gönderiliyor…" : "Başarı Ekle"}
        </Button>
      </div>
    </form>
  )
}

// ------------------------------------------------- gelişim adımı formu

const gelisimAdimiSchema = z.object({
  tarih: z.string().min(1, "Tarih zorunludur."),
  baslik: z.string().min(1, "Başlık zorunludur."),
  aciklama: optionalText,
})
type GelisimAdimiFormValues = z.input<typeof gelisimAdimiSchema>

function AddGelisimAdimiForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GelisimAdimiFormValues>({ resolver: zodResolver(gelisimAdimiSchema) })

  const mutation = useMutation({
    mutationFn: async (payload: AddGelisimAdimiRequest) =>
      (await api.post<GirisimDetailDto>(`/girisimler/${girisimId}/gelisim-adimlari`, payload)).data,
    onSuccess: () => {
      toast.success("Gelişim adımı eklendi.")
      reset()
      onAdded()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Gelişim adımı eklenemedi.")),
  })

  function onSubmit(values: GelisimAdimiFormValues) {
    mutation.mutate({
      tarih: new Date(values.tarih).toISOString(),
      baslik: values.baslik,
      aciklama: values.aciklama,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-2xl border-2 border-dashed border-t3-blue/20 bg-t3-blue-light/40 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-t3-blue">Yeni Gelişim Adımı Ekle</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="space-y-1.5">
          <Label htmlFor="ga-tarih">Tarih</Label>
          <Input id="ga-tarih" type="date" {...register("tarih")} />
          {errors.tarih && <p className="text-xs text-red-600">{errors.tarih.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ga-baslik">Başlık</Label>
          <Input id="ga-baslik" placeholder="örn. İlk müşteri kazanıldı" {...register("baslik")} />
          {errors.baslik && <p className="text-xs text-red-600">{errors.baslik.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ga-aciklama">Açıklama (opsiyonel)</Label>
        <Textarea id="ga-aciklama" rows={2} {...register("aciklama")} />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending ? "Gönderiliyor…" : "Gelişim Adımı Ekle"}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------- logo yükleme

function LogoUploadSection({ girisim, onUpdated }: { girisim: GirisimDetailDto; onUpdated: () => void }) {
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

  const logoSrc = girisim.logoUrl ? fileUrl(girisim.logoUrl) : null

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
    </div>
  )
}

// -------------------------------------------------- iletişim / muhatap kartı

function GirisimContactForm({
  girisimId,
  contact,
  onSaved,
}: {
  girisimId: string
  contact: GirisimContactDto | null
  onSaved: () => void
}) {
  const [adSoyad, setAdSoyad] = useState(contact?.adSoyad ?? "")
  const [unvan, setUnvan] = useState(contact?.unvan ?? "")
  const [telefon, setTelefon] = useState(contact?.telefon ?? "")
  const [email, setEmail] = useState(contact?.email ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(contact?.linkedInUrl ?? "")

  const contactMutation = useMutation({
    mutationFn: async () =>
      (
        await api.put<GirisimDetailDto>(`/girisimler/${girisimId}/iletisim`, {
          adSoyad: adSoyad.trim(),
          unvan: unvan.trim() || null,
          telefon: telefon.trim() || null,
          email: email.trim() || null,
          linkedInUrl: linkedInUrl.trim() || null,
        } satisfies UpsertGirisimContactRequest)
      ).data,
    onSuccess: () => {
      toast.success("İletişim bilgileri kaydedildi.")
      onSaved()
    },
    onError: (error) => toast.error(extractErrorMessage(error, "İletişim bilgileri kaydedilemedi.")),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adSoyad.trim()) {
      toast.error("Ad soyad zorunludur.")
      return
    }
    contactMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="contact-adsoyad">Ad Soyad *</Label>
        <Input id="contact-adsoyad" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-unvan">Unvan</Label>
        <Input id="contact-unvan" value={unvan} onChange={(e) => setUnvan(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-telefon">Telefon</Label>
        <Input id="contact-telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">E-posta</Label>
        <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="contact-linkedin">LinkedIn</Label>
        <Input id="contact-linkedin" value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" size="sm" className="bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={contactMutation.isPending}>
          {contactMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  )
}

// -------------------------------------------------- doküman yükleme formu

function AddDokumanForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const [baslik, setBaslik] = useState("")
  const [tur, setTur] = useState<DokumanTuru>("Genel")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error("Lütfen bir dosya seçin.")
      return
    }
    if (!baslik.trim()) {
      toast.error("Başlık zorunludur.")
      return
    }
    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append("baslik", baslik.trim())
    formData.append("tur", tur)
    formData.append("file", file)
    try {
      await api.post(`/girisimler/${girisimId}/dokuman`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      toast.success("Doküman onaya gönderildi.")
      setBaslik("")
      setTur("Genel")
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      onAdded()
    } catch (error) {
      toast.error(extractErrorMessage(error, "Doküman yüklenemedi."))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Doküman Yükle</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="d-baslik">Başlık</Label>
          <Input
            id="d-baslik"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Doküman başlığı"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-tur">Tür</Label>
          <Select items={{ Genel: "Genel", Sunum: "Tanıtım Sunumu" }} value={tur} onValueChange={(value) => setTur((value as DokumanTuru) ?? "Genel")}>
            <SelectTrigger id="d-tur" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Genel">Genel</SelectItem>
              <SelectItem value="Sunum">Tanıtım Sunumu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-file">Dosya (maks. 20 MB)</Label>
          <Input
            id="d-file"
            type="file"
            ref={fileRef}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={uploading}
        >
          {uploading ? "Yükleniyor…" : "Doküman Yükle"}
        </Button>
      </div>
      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="mt-2" />
          <p className="text-right text-xs text-muted-foreground">{uploadProgress}%</p>
        </div>
      )}
    </form>
  )
}

// ---------------------------------------------------------------- sayfa

// -------------------------------------------------------------- Şirket CV'si (PDF)

async function downloadSirketCv(girisim: GirisimDetailDto) {
  const doc = await createTurkishPdf()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = 50

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

  doc.setFont(PDF_FONT, "bold")
  doc.setFontSize(18)
  doc.setTextColor(45, 63, 71)
  doc.text(girisim.ad, margin, y)
  y += 20
  doc.setFont(PDF_FONT, "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Şirket CV'si — Oluşturulma tarihi: ${new Date().toLocaleDateString("tr-TR")}`, margin, y)
  y += 26
  doc.setTextColor(30, 41, 47)

  sectionTitle("Şirket Özeti")
  keyValueRow("Sektör", girisim.sektor ?? "—")
  keyValueRow("Kuruluş Yılı", girisim.kurulusYili != null ? String(girisim.kurulusYili) : "—")
  keyValueRow("Ekip Büyüklüğü", girisim.ekipBuyuklugu != null ? `${girisim.ekipBuyuklugu} kişi` : "—")
  keyValueRow("Teknoloji", girisim.teknoloji ?? "—")
  keyValueRow("Website", girisim.websiteUrl ?? "—")
  if (girisim.kisaTanim) {
    ensureSpace(16)
    doc.setFont(PDF_FONT, "bold")
    doc.text("Kısa Tanım", margin, y)
    y += 16
    doc.setFont(PDF_FONT, "normal")
    bodyLine(girisim.kisaTanim)
  }
  y += 10

  sectionTitle("İletişim / Muhatap")
  if (girisim.contact) {
    keyValueRow("Ad Soyad", girisim.contact.adSoyad)
    keyValueRow("Unvan", girisim.contact.unvan ?? "—")
    keyValueRow("Telefon", girisim.contact.telefon ?? "—")
    keyValueRow("E-posta", girisim.contact.email ?? "—")
    keyValueRow("LinkedIn", girisim.contact.linkedInUrl ?? "—")
  } else {
    bodyLine("İletişim/muhatap bilgisi girilmemiş.")
  }
  y += 10

  sectionTitle("Program Katılım Geçmişi")
  if (girisim.programKatilimlari.length === 0) {
    bodyLine("Herhangi bir programa katılım bulunmuyor.")
  } else {
    girisim.programKatilimlari.forEach((k) => {
      bodyLine(
        `• ${k.programAdi} — ${katilimDurumuLabels[k.durum] ?? k.durum} (${formatDate(k.baslangicTarihi)} – ${formatDate(k.bitisTarihi)})`,
      )
    })
  }
  y += 10

  sectionTitle("Gelişim Yolculuğu")
  if (girisim.gelisimAdimlari.length === 0) {
    bodyLine("Henüz bir gelişim adımı eklenmemiş.")
  } else {
    ;[...girisim.gelisimAdimlari]
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
      .forEach((g) => {
        bodyLine(`• ${formatDate(g.tarih)} — ${g.baslik}${g.aciklama ? `: ${g.aciklama}` : ""}`)
      })
  }
  y += 10

  const onayliSatis = girisim.satisKayitlari.filter((s) => s.onayDurumu === "Onaylandi")
  sectionTitle("Onaylı Satış Özeti")
  keyValueRow("Toplam Onaylı Ciro", formatCurrency(onayliSatis.reduce((sum, s) => sum + s.ciro, 0), "TRY"))
  if (onayliSatis.length === 0) {
    bodyLine("Onaylı satış kaydı bulunmuyor.")
  } else {
    onayliSatis.forEach((s) => {
      bodyLine(
        `• ${s.donem}: ${formatCurrency(s.ciro, "TRY")}${s.ihracat != null ? ` (İhracat: ${formatCurrency(s.ihracat, "TRY")})` : ""}`,
      )
    })
  }
  y += 10

  const onayliYatirim = girisim.yatirimKayitlari.filter((v) => v.onayDurumu === "Onaylandi")
  sectionTitle("Onaylı Yatırım Özeti")
  if (onayliYatirim.length === 0) {
    bodyLine("Onaylı yatırım kaydı bulunmuyor.")
  } else {
    const toplamlar = onayliYatirim.reduce<Record<string, number>>((map, v) => {
      map[v.paraBirimi] = (map[v.paraBirimi] ?? 0) + v.tutar
      return map
    }, {})
    Object.entries(toplamlar).forEach(([currency, tutar]) => keyValueRow(`Toplam Onaylı Yatırım (${currency})`, formatCurrency(tutar, currency)))
    onayliYatirim.forEach((v) => {
      bodyLine(
        `• ${yatirimTuruLabels[v.tur] ?? v.tur} — ${formatCurrency(v.tutar, v.paraBirimi)} (${formatDate(v.tarih)}${v.yatirimciAdi ? `, ${v.yatirimciAdi}` : ""})`,
      )
    })
  }
  y += 10

  const onayliBasari = girisim.basarilar.filter((b) => b.onayDurumu === "Onaylandi")
  sectionTitle("Başarılar")
  if (onayliBasari.length === 0) {
    bodyLine("Onaylı başarı kaydı bulunmuyor.")
  } else {
    onayliBasari.forEach((b) => {
      bodyLine(`• ${basariTuruLabels[b.tur] ?? b.tur} — ${b.baslik} (${formatDate(b.tarih)})`)
    })
  }

  const safeName = girisim.ad.trim().replace(/\s+/g, "-")
  doc.save(`${safeName}-sirket-cv-${new Date().toISOString().slice(0, 10)}.pdf`)
}

const BOLUMLER = [
  "profil",
  "programlar",
  "gelisim",
  "finansal",
  "basari-dokuman",
  "itirazlarim",
  "sunum",
  "rapor",
]

export default function GirisimimPage() {
  // Bölümler sekme yerine adresten geliyor; sidebar her bölüme doğrudan bağlanabilsin diye.
  const { bolum: bolumParam } = useParams<{ bolum: string }>()
  // Tanınmayan bir adres boş sayfa göstermesin; profile düşülür.
  const bolum = BOLUMLER.includes(bolumParam ?? "") ? bolumParam! : "profil"
  const queryClient = useQueryClient()
  const [showGuncellemeForm, setShowGuncellemeForm] = useState(false)
  const [guncellemePrefill, setGuncellemePrefill] = useState<GuncellemeTalebiDto | undefined>(undefined)
  const [detailTalep, setDetailTalep] = useState<GuncellemeTalebiDto | null>(null)
  const [itirazTarget, setItirazTarget] = useState<{
    konuTuru: ItirazKonusuTuru
    konuId: string
    label: string
  } | null>(null)
  const [itirazAciklama, setItirazAciklama] = useState("")
  const [itirazAciklamaError, setItirazAciklamaError] = useState(false)

  const { data: girisim, isLoading, isError, error } = useQuery({
    queryKey: ["girisimim"],
    queryFn: async () => (await api.get<GirisimDetailDto>("/girisimler/benim")).data,
  })

  const guncellemeTalepleriQuery = useQuery({
    queryKey: ["girisimim-guncelleme-talepleri", girisim?.id],
    queryFn: async () =>
      (await api.get<GuncellemeTalebiDto[]>(`/girisimler/${girisim!.id}/guncelleme-talepleri`)).data,
    enabled: !!girisim?.id,
  })

  const withdrawGuncellemeMutation = useMutation({
    mutationFn: async (talebiId: string) =>
      (await api.delete<MessageResponse>(`/girisimler/${girisim!.id}/guncelleme-talebi/${talebiId}`)).data,
  })

  function handleGeriCek(talep: GuncellemeTalebiDto) {
    if (!window.confirm("Bu güncelleme talebini geri çekmek istediğinize emin misiniz?")) return
    withdrawGuncellemeMutation.mutate(talep.id, {
      onSuccess: (data) => {
        toast.success(data.message)
        queryClient.invalidateQueries({ queryKey: ["girisimim-guncelleme-talepleri"] })
      },
      onError: (error) => toast.error(extractErrorMessage(error, "Talep geri çekilemedi.")),
    })
  }

  function handleDuzenle(talep: GuncellemeTalebiDto) {
    withdrawGuncellemeMutation.mutate(talep.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["girisimim-guncelleme-talepleri"] })
        setGuncellemePrefill(talep)
        setShowGuncellemeForm(true)
      },
      onError: (error) => toast.error(extractErrorMessage(error, "Talep düzenlenemedi.")),
    })
  }

  const itirazlarQuery = useQuery({
    queryKey: ["girisimim-itirazlar", girisim?.id],
    queryFn: async () => (await api.get<ItirazDto[]>(`/girisimler/${girisim!.id}/itirazlar`)).data,
    enabled: !!girisim?.id,
  })

  const [raporBaslangic, setRaporBaslangic] = useState("")
  const [raporBitis, setRaporBitis] = useState("")
  const raporParams = { baslangic: raporBaslangic || undefined, bitis: raporBitis || undefined }
  const raporQuery = useQuery({
    queryKey: ["girisimim-rapor", raporParams],
    queryFn: async () => (await api.get<DashboardStatsDto>("/girisimler/benim/rapor", { params: raporParams })).data,
    enabled: !!girisim?.id,
  })

  const pendingItirazKonuIds = new Set(
    (itirazlarQuery.data ?? []).filter((i) => i.onayDurumu === "Beklemede").map((i) => i.konuId),
  )

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["girisimim"] })
    queryClient.invalidateQueries({ queryKey: ["girisimim-guncelleme-talepleri"] })
  }

  const submitItirazMutation = useMutation({
    mutationFn: async (payload: SubmitItirazRequest) =>
      (await api.post<MessageResponse>(`/girisimler/${girisim!.id}/itiraz`, payload)).data,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["girisimim-itirazlar"] })
      setItirazTarget(null)
    },
    onError: (error) => toast.error(extractErrorMessage(error, "İtiraz gönderilemedi.")),
  })

  function openItiraz(konuTuru: ItirazKonusuTuru, konuId: string, label: string) {
    setItirazTarget({ konuTuru, konuId, label })
    setItirazAciklama("")
    setItirazAciklamaError(false)
  }

  function confirmItiraz() {
    if (!itirazTarget) return
    if (!itirazAciklama.trim()) {
      setItirazAciklamaError(true)
      return
    }
    submitItirazMutation.mutate({
      konuTuru: itirazTarget.konuTuru,
      konuId: itirazTarget.konuId,
      aciklama: itirazAciklama.trim(),
    })
  }

  function ItirazAction({ konuTuru, konuId, label }: { konuTuru: ItirazKonusuTuru; konuId: string; label: string }) {
    if (pendingItirazKonuIds.has(konuId)) {
      return (
        <Badge variant="outline" className="text-xs">
          İtiraz İncelemede
        </Badge>
      )
    }
    return (
      <Button size="sm" variant="outline" onClick={() => openItiraz(konuTuru, konuId, label)}>
        İtiraz Et
      </Button>
    )
  }

  const deleteOnSuccess = { onSuccess: () => { toast.success("Kayıt silindi."); invalidate() } }
  const deleteOnError = { onError: (error: unknown) => toast.error(extractErrorMessage(error, "Kayıt silinemedi.")) }

  const deleteSatisMutation = useMutation({
    mutationFn: async (kayitId: string) => (await api.delete<GirisimDetailDto>(`/girisimler/${girisim?.id}/satis/${kayitId}`)).data,
    ...deleteOnSuccess,
    ...deleteOnError,
  })
  const deleteYatirimMutation = useMutation({
    mutationFn: async (kayitId: string) => (await api.delete<GirisimDetailDto>(`/girisimler/${girisim?.id}/yatirim/${kayitId}`)).data,
    ...deleteOnSuccess,
    ...deleteOnError,
  })
  const deleteBasariMutation = useMutation({
    mutationFn: async (kayitId: string) => (await api.delete<GirisimDetailDto>(`/girisimler/${girisim?.id}/basari/${kayitId}`)).data,
    ...deleteOnSuccess,
    ...deleteOnError,
  })
  const deleteDokumanMutation = useMutation({
    mutationFn: async (kayitId: string) => (await api.delete<GirisimDetailDto>(`/girisimler/${girisim?.id}/dokuman/${kayitId}`)).data,
    ...deleteOnSuccess,
    ...deleteOnError,
  })

  function confirmDelete(mutation: { mutate: (id: string) => void }, id: string) {
    if (window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) mutation.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !girisim) {
    return (
      <EmptyState
        icon="⚠️"
        message={extractErrorMessage(error, "Girişim bilgileriniz yüklenemedi. Lütfen daha sonra tekrar deneyin.")}
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Girişimim"
        title={girisim.ad}
        subtitle={
          <>
            {girisim.sektor ?? "Sektör belirtilmemiş"}
            {girisim.kurulusYili ? ` · Kuruluş ${girisim.kurulusYili}` : ""}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void downloadSirketCv(girisim)}>
              CV'yi İndir (PDF)
            </Button>
            {!showGuncellemeForm && (
              <Button
                variant="outline"
                onClick={() => {
                  setGuncellemePrefill(undefined)
                  setShowGuncellemeForm(true)
                }}
              >
                Profil Güncelleme Talebi
              </Button>
            )}
          </>
        }
      />

      {showGuncellemeForm && (
        <div className="mb-6">
          <GuncellemeTalebiForm
            girisim={girisim}
            prefill={guncellemePrefill}
            onClose={() => {
              setShowGuncellemeForm(false)
              setGuncellemePrefill(undefined)
            }}
            onSubmitted={invalidate}
          />
        </div>
      )}

      {/* Girişimciyi sisteme geri getiren kanca: puanı ve onu yükselten somut adımlar. */}
      <div className="mb-6">
        <PuanKarti girisimId={girisim.id} />
      </div>
      <div className="space-y-4">

        {/* -------------------------------------------------------- Profil */}
        {bolum === "profil" && (
          <div>
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <LogoUploadSection girisim={girisim} onUpdated={invalidate} />
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
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>İletişim / Muhatap</CardTitle>
            </CardHeader>
            <CardContent>
              <GirisimContactForm girisimId={girisim.id} contact={girisim.contact} onSaved={invalidate} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Güncelleme Talebi Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {!guncellemeTalepleriQuery.data || guncellemeTalepleriQuery.data.length === 0 ? (
                <EmptyState icon="📝" message="Henüz bir güncelleme talebi göndermediniz." />
              ) : (
                <div className="space-y-3">
                  {guncellemeTalepleriQuery.data.map((t) => (
                    <div key={t.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-t3-navy">{t.ad}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
                          <StatusBadge status={t.onayDurumu} />
                        </div>
                      </div>
                      {t.reviewNotu && (
                        <p className="mt-1.5 text-xs text-red-700">{t.reviewNotu}</p>
                      )}
                      <div className="mt-2.5 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailTalep(t)}>
                          Detay
                        </Button>
                        {t.onayDurumu === "Beklemede" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={withdrawGuncellemeMutation.isPending}
                              onClick={() => handleDuzenle(t)}
                            >
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              disabled={withdrawGuncellemeMutation.isPending}
                              onClick={() => handleGeriCek(t)}
                            >
                              Geri Çek
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* --------------------------------------------------- Programlar */}
        {bolum === "programlar" && (
          <div>
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
                      <Badge variant="outline">
                        {katilimDurumuLabels[k.durum] ?? k.durum}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* ------------------------------------------------------ Gelişim */}
        {bolum === "gelisim" && (
          <div>
          <Card>
            <CardHeader>
              <CardTitle>Gelişim Yolculuğu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddGelisimAdimiForm girisimId={girisim.id} onAdded={invalidate} />

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
          </div>
        )}

        {/* --------------------------------------------------- Finansal */}
        {bolum === "finansal" && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Satış Kayıtları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddSatisForm girisimId={girisim.id} onAdded={invalidate} />

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
                        <TableHead>Not</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
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
                          <TableCell>
                            <ReviewNotuCell notu={s.reviewNotu} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {s.onayDurumu === "Beklemede" && (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={deleteSatisMutation.isPending}
                                  onClick={() => confirmDelete(deleteSatisMutation, s.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                              {s.onayDurumu === "Reddedildi" && (
                                <ItirazAction konuTuru="Satis" konuId={s.id} label={`${s.donem} dönemi satış kaydı`} />
                              )}
                            </div>
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
            <CardContent className="space-y-4">
              <AddYatirimForm girisimId={girisim.id} onAdded={invalidate} />

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
                        <TableHead>Not</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
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
                          <TableCell>
                            <ReviewNotuCell notu={y.reviewNotu} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {y.onayDurumu === "Beklemede" && (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={deleteYatirimMutation.isPending}
                                  onClick={() => confirmDelete(deleteYatirimMutation, y.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                              {y.onayDurumu === "Reddedildi" && (
                                <ItirazAction
                                  konuTuru="Yatirim"
                                  konuId={y.id}
                                  label={`${yatirimTuruLabels[y.tur] ?? y.tur} yatırım kaydı`}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* --------------------------------------------- Başarı & Doküman */}
        {bolum === "basari-dokuman" && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Başarılar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddBasariForm girisimId={girisim.id} onAdded={invalidate} />

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
                        <TableHead>Not</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
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
                          <TableCell>
                            <ReviewNotuCell notu={b.reviewNotu} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {b.onayDurumu === "Beklemede" && (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={deleteBasariMutation.isPending}
                                  onClick={() => confirmDelete(deleteBasariMutation, b.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                              {b.onayDurumu === "Reddedildi" && (
                                <ItirazAction konuTuru="Basari" konuId={b.id} label={b.baslik} />
                              )}
                            </div>
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
            <CardContent className="space-y-4">
              <AddDokumanForm girisimId={girisim.id} onAdded={invalidate} />

              {girisim.dokumanlar.length === 0 ? (
                <EmptyState icon="📄" message="Doküman bulunmuyor." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tür</TableHead>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Dosya</TableHead>
                        <TableHead>Boyut</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Not</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girisim.dokumanlar.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Badge variant="outline" className={d.tur === "Sunum" ? "border-t3-blue/30 text-t3-blue" : ""}>
                              {d.tur === "Sunum" ? "Tanıtım Sunumu" : "Genel"}
                            </Badge>
                          </TableCell>
                          <TableCell>{d.baslik}</TableCell>
                          <TableCell>
                            <a
                              href={fileUrl(d.dosyaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-t3-blue hover:underline"
                            >
                              {d.dosyaAdi}
                            </a>
                          </TableCell>
                          <TableCell>
                            {d.dosyaBoyutu < 1024 * 1024
                              ? `${(d.dosyaBoyutu / 1024).toFixed(1)} KB`
                              : `${(d.dosyaBoyutu / (1024 * 1024)).toFixed(1)} MB`}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={d.onayDurumu} />
                          </TableCell>
                          <TableCell>
                            <ReviewNotuCell notu={d.reviewNotu} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {d.onayDurumu === "Beklemede" && (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={deleteDokumanMutation.isPending}
                                  onClick={() => confirmDelete(deleteDokumanMutation, d.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                              {d.onayDurumu === "Reddedildi" && (
                                <ItirazAction konuTuru="Dokuman" konuId={d.id} label={d.baslik} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* -------------------------------------------------- İtirazlarım */}
        {bolum === "itirazlarim" && (
          <div>
          <Card>
            <CardHeader>
              <CardTitle>İtiraz Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {!itirazlarQuery.data || itirazlarQuery.data.length === 0 ? (
                <EmptyState icon="⚖️" message="Henüz bir itiraz göndermediniz." />
              ) : (
                <div className="space-y-3">
                  {itirazlarQuery.data.map((i) => (
                    <div key={i.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-t3-navy">
                          {KONU_TURU_LABEL[i.konuTuru] ?? i.konuTuru}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(i.createdAt)}</span>
                          <StatusBadge status={i.onayDurumu} />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{i.aciklama}</p>
                      {i.reviewNotu && <p className="mt-1.5 text-xs text-red-700">{i.reviewNotu}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* -------------------------------------------------------- Sunum */}
        {bolum === "sunum" && (
          <div>
          <SunumPaneli girisim={girisim} />
          </div>
        )}

        {bolum === "rapor" && (
          <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card px-4 py-3">
            <div className="w-40 space-y-1.5">
              <Label
                htmlFor="girisimim-rapor-baslangic"
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Başlangıç
              </Label>
              <Input
                id="girisimim-rapor-baslangic"
                type="date"
                value={raporBaslangic}
                onChange={(e) => setRaporBaslangic(e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1.5">
              <Label
                htmlFor="girisimim-rapor-bitis"
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Bitiş
              </Label>
              <Input id="girisimim-rapor-bitis" type="date" value={raporBitis} onChange={(e) => setRaporBitis(e.target.value)} />
            </div>
            {(raporBaslangic || raporBitis) && (
              <button
                onClick={() => {
                  setRaporBaslangic("")
                  setRaporBitis("")
                }}
                className="mb-2.5 text-xs font-medium text-t3-blue hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
          </div>

          {raporQuery.isLoading ? (
            <Skeleton className="h-52 rounded-2xl" />
          ) : raporQuery.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Onaylı Ciro</p>
                    <p className="mt-1 text-2xl font-bold text-t3-navy">
                      {formatCurrency(raporQuery.data.toplamOnayliCiro, "TRY")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Onaylı Yatırım</p>
                    <p className="mt-1 text-2xl font-bold text-t3-navy">
                      {formatCurrency(raporQuery.data.toplamOnayliYatirim, "TRY")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Bekleyen Onay</p>
                    <p className="mt-1 text-2xl font-bold text-t3-navy">{raporQuery.data.bekleyenOnaySayisi}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ciro / Yatırım Trendi (Son 6 Ay)</CardTitle>
                </CardHeader>
                <CardContent>
                  {raporQuery.data.aylikTrend.every((a) => a.ciro === 0 && a.yatirim === 0) ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Seçilen aralıkta onaylanmış kayıt bulunmuyor.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={raporQuery.data.aylikTrend} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} width={64} />
                        <Tooltip formatter={(value, name) => [formatCurrency(Number(value), "TRY"), name]} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="ciro" name="Ciro" stroke="#0078a8" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="yatirim" name="Yatırım" stroke="#f7941d" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <OkumaKutusu okuma={aylikTrendOkumasi(raporQuery.data.aylikTrend)} />
                </CardContent>
              </Card>

              {/* Kural tabanlı okumanın üstünde, veriye bakan iki AI sorusu. */}
              <div className="grid gap-4 lg:grid-cols-2">
                <GirisimAnalizPaneli
                  girisimId={girisim.id}
                  tur="durum"
                  baslik="Verilerim ne diyor?"
                  aciklama="Girişimin sistemdeki verisi üzerinden tarafsız bir durum okuması."
                  bosDurumMetni="Henüz bir analiz üretilmedi. Verilerinin ne anlattığını görmek için analiz et."
                />
                <GirisimAnalizPaneli
                  girisimId={girisim.id}
                  tur="gelisim"
                  baslik="Nasıl geliştirebilirim?"
                  aciklama="Verine dayanan somut geliştirme önerileri."
                  bosDurumMetni="Henüz bir öneri üretilmedi. Profilini nasıl güçlendirebileceğini görmek için analiz et."
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Onay Durumu Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        { label: "Satış", kayitlar: girisim.satisKayitlari },
                        { label: "Yatırım", kayitlar: girisim.yatirimKayitlari },
                        { label: "Başarı", kayitlar: girisim.basarilar },
                        { label: "Doküman", kayitlar: girisim.dokumanlar },
                      ] as { label: string; kayitlar: { onayDurumu: string }[] }[]
                    ).map(({ label, kayitlar }) => {
                      const beklemede = kayitlar.filter((k) => k.onayDurumu === "Beklemede").length
                      const onaylandi = kayitlar.filter((k) => k.onayDurumu === "Onaylandi").length
                      const reddedildi = kayitlar.filter((k) => k.onayDurumu === "Reddedildi").length
                      return (
                        <div key={label} className="rounded-lg border p-3">
                          <p className="text-sm font-semibold text-t3-navy">{label}</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="text-amber-600">Beklemede: {beklemede}</p>
                            <p className="text-emerald-600">Onaylı: {onaylandi}</p>
                            <p className="text-red-600">Reddedilen: {reddedildi}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
          </div>
        )}
      </div>

      <Dialog open={itirazTarget !== null} onOpenChange={(open) => !open && setItirazTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İtiraz Et</DialogTitle>
            <DialogDescription>
              {itirazTarget?.label} reddedildi. İtirazınız yönetici onayına gönderilecek; kabul edilirse kayıt
              tekrar onaylı duruma döner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="itiraz-aciklama">İtiraz Açıklaması *</Label>
            <Textarea
              id="itiraz-aciklama"
              placeholder="Bu kaydın neden yeniden değerlendirilmesi gerektiğini açıklayın…"
              value={itirazAciklama}
              onChange={(e) => {
                setItirazAciklama(e.target.value)
                if (e.target.value.trim()) setItirazAciklamaError(false)
              }}
              aria-invalid={itirazAciklamaError}
            />
            {itirazAciklamaError && <p className="text-xs text-red-600">İtiraz açıklaması zorunludur.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItirazTarget(null)}>
              Vazgeç
            </Button>
            <Button
              className="bg-t3-blue text-white hover:bg-t3-blue-dark"
              disabled={submitItirazMutation.isPending}
              onClick={confirmItiraz}
            >
              {submitItirazMutation.isPending ? "Gönderiliyor…" : "İtirazı Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailTalep !== null} onOpenChange={(open) => !open && setDetailTalep(null)}>
        {detailTalep && <GuncellemeTalebiDetailDialog girisim={girisim} talep={detailTalep} />}
      </Dialog>
    </div>
  )
}
