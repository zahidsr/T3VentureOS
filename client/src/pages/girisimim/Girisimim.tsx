import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Trash2 } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  GirisimDetailDto,
  GuncellemeTalebiDto,
  ItirazDto,
  ItirazKonusuTuru,
  KatilimDurumu,
  MessageResponse,
  SubmitGuncellemeTalebiRequest,
  SubmitItirazRequest,
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
  onClose,
  onSubmitted,
}: {
  girisim: GirisimDetailDto
  onClose: () => void
  onSubmitted: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuncellemeTalebiFormValues>({
    resolver: zodResolver(guncellemeTalebiSchema),
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
          Değişiklikleriniz yönetici onayından geçtikten sonra profilinize yansır.
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
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
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

// -------------------------------------------------- doküman yükleme formu

function AddDokumanForm({ girisimId, onAdded }: { girisimId: string; onAdded: () => void }) {
  const [baslik, setBaslik] = useState("")
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
      <div className="grid gap-3 sm:grid-cols-2">
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

export default function GirisimimPage() {
  const queryClient = useQueryClient()
  const [showGuncellemeForm, setShowGuncellemeForm] = useState(false)
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

  const itirazlarQuery = useQuery({
    queryKey: ["girisimim-itirazlar", girisim?.id],
    queryFn: async () => (await api.get<ItirazDto[]>(`/girisimler/${girisim!.id}/itirazlar`)).data,
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
          !showGuncellemeForm ? (
            <Button
              variant="outline"
              onClick={() => setShowGuncellemeForm(true)}
            >
              Profil Güncelleme Talebi
            </Button>
          ) : undefined
        }
      />

      {showGuncellemeForm && (
        <div className="mb-6">
          <GuncellemeTalebiForm
            girisim={girisim}
            onClose={() => setShowGuncellemeForm(false)}
            onSubmitted={invalidate}
          />
        </div>
      )}

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="programlar">Program Geçmişi</TabsTrigger>
          <TabsTrigger value="gelisim">Gelişim</TabsTrigger>
          <TabsTrigger value="finansal">Satış &amp; Yatırım</TabsTrigger>
          <TabsTrigger value="basari-dokuman">Başarı &amp; Doküman</TabsTrigger>
          <TabsTrigger value="itirazlarim">İtirazlarım</TabsTrigger>
        </TabsList>

        {/* -------------------------------------------------------- Profil */}
        <TabsContent value="profil" className="mt-4">
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
                    </div>
                  ))}
                </div>
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
                      <Badge variant="outline">
                        {katilimDurumuLabels[k.durum] ?? k.durum}
                      </Badge>
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
        </TabsContent>

        {/* --------------------------------------------------- Finansal */}
        <TabsContent value="finansal" className="mt-4 space-y-4">
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
        </TabsContent>

        {/* --------------------------------------------- Başarı & Doküman */}
        <TabsContent value="basari-dokuman" className="mt-4 space-y-4">
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
        </TabsContent>

        {/* -------------------------------------------------- İtirazlarım */}
        <TabsContent value="itirazlarim" className="mt-4">
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
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
