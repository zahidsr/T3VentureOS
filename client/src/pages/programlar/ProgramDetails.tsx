import { useRef, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ImagePlus, Layers, Users } from "lucide-react"
import { BackLink } from "@/components/patterns/BackLink"
import { PageHeader } from "@/components/patterns/PageHeader"
import { ProgramKohortu } from "@/components/patterns/ProgramKohortu"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KartBasligi } from "@/components/patterns/KartBasligi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { API_URL, api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { programIlerlemesi } from "@/lib/program-progress"
import { cn } from "@/lib/utils"
import type {
  AddKatilimRequest,
  GirisimSummaryDto,
  KatilimDurumu,
  MessageResponse,
  PagedResultDto,
  ProgramDetailDto,
  ProgramDurumu,
  UpdateProgramRequest,
} from "@/lib/types"

const programDurumOptions: ProgramDurumu[] = ["Taslak", "Aktif", "Tamamlandi", "Arsivlendi"]
const programDurumLabels: Record<ProgramDurumu, string> = {
  Taslak: "Taslak",
  Aktif: "Aktif",
  Tamamlandi: "Tamamlandı",
  Arsivlendi: "Arşivlendi",
}
const programDurumClasses: Record<ProgramDurumu, string> = {
  Taslak: "bg-slate-100 text-slate-600 border-slate-200",
  Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Tamamlandi: "bg-t3-blue-light text-t3-blue border-blue-200",
  Arsivlendi: "bg-red-50 text-red-700 border-red-200",
}

const katilimDurumOptions: KatilimDurumu[] = ["Basvuru", "KabulEdildi", "DevamEdiyor", "Mezun", "Ayrildi"]
const katilimDurumLabels: Record<KatilimDurumu, string> = {
  Basvuru: "Başvuru",
  KabulEdildi: "Kabul Edildi",
  DevamEdiyor: "Devam Ediyor",
  Mezun: "Mezun",
  Ayrildi: "Ayrıldı",
}
const katilimDurumClasses: Record<KatilimDurumu, string> = {
  Basvuru: "bg-slate-100 text-slate-600 border-slate-200",
  KabulEdildi: "bg-t3-blue-light text-t3-blue border-blue-200",
  DevamEdiyor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Mezun: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Ayrildi: "bg-red-50 text-red-700 border-red-200",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("tr-TR")
}

function toDateInputValue(value: string | null) {
  if (!value) return ""
  return value.slice(0, 10)
}

function ProgramDurumBadge({ durum }: { durum: ProgramDurumu }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", programDurumClasses[durum])}>
      {programDurumLabels[durum]}
    </Badge>
  )
}

function KatilimDurumBadge({ durum }: { durum: KatilimDurumu }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", katilimDurumClasses[durum])}>
      {katilimDurumLabels[durum]}
    </Badge>
  )
}

const editSchema = z.object({
  name: z.string().min(1, "Program adı zorunludur."),
  description: z.string().optional(),
  durum: z.enum(["Taslak", "Aktif", "Tamamlandi", "Arsivlendi"]),
  baslangicTarihi: z.string().optional(),
  bitisTarihi: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

// -------------------------------------------------------------------- kapak fotoğrafı

function kapakSrcFor(program: ProgramDetailDto) {
  return program.kapakGorseliUrl ? `${API_URL.replace(/\/api\/?$/, "")}${program.kapakGorseliUrl}` : null
}

function KapakGorseliSection({
  program,
  canEdit,
  onUpdated,
}: {
  program: ProgramDetailDto
  canEdit: boolean
  onUpdated: (updated: ProgramDetailDto) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const kapakMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return (await api.post<ProgramDetailDto>(`/programs/${program.id}/kapak`, formData)).data
    },
    onSuccess: (data) => {
      toast.success("Kapak fotoğrafı güncellendi.")
      onUpdated(data)
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Kapak fotoğrafı yüklenemedi.")),
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) kapakMutation.mutate(file)
    e.target.value = ""
  }

  const kapakSrc = kapakSrcFor(program)
  const ilerleme = program.durum === "Aktif" ? programIlerlemesi(program.baslangicTarihi, program.bitisTarihi) : null

  return (
    <div className="relative mb-6 h-40 overflow-hidden rounded-2xl border bg-gradient-to-br from-t3-navy to-t3-navy-soft sm:h-56">
      {kapakSrc && <img src={kapakSrc} alt="" className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

      {ilerleme && (
        <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${ilerleme.yuzde}%` }} />
          </div>
          <p className="mt-1 text-xs font-medium text-white/80">{ilerleme.durumText}</p>
        </div>
      )}

      {canEdit && (
        <div className="absolute right-4 top-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-white/40 bg-white/90 text-t3-navy backdrop-blur hover:bg-white"
            onClick={() => fileRef.current?.click()}
            disabled={kapakMutation.isPending}
          >
            <ImagePlus className="size-3.5" />
            {kapakMutation.isPending ? "Yükleniyor…" : kapakSrc ? "Kapak Fotoğrafını Değiştir" : "Kapak Fotoğrafı Ekle"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ProgramDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = user?.role === "SuperAdmin" || user?.role === "ProgramYoneticisi"
  const isStartup = user?.role === "StartupKullanicisi"
  const [isEditing, setIsEditing] = useState(false)

  const programQuery = useQuery({
    queryKey: ["programs", id],
    queryFn: async () => (await api.get<ProgramDetailDto>(`/programs/${id}`)).data,
    enabled: !!id,
  })

  const girisimlerQuery = useQuery({
    queryKey: ["girisimler-all"],
    queryFn: async () =>
      (await api.get<PagedResultDto<GirisimSummaryDto>>("/girisimler", { params: { pageSize: 100 } })).data.items,
    enabled: canWrite,
  })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) })

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateProgramRequest) =>
      (await api.put<ProgramDetailDto>(`/programs/${id}`, payload)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["programs", id], data)
      queryClient.invalidateQueries({ queryKey: ["programs"] })
      toast.success("Program güncellendi.")
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Program güncellenemedi."))
    },
  })

  function startEditing() {
    if (!programQuery.data) return
    resetEdit({
      name: programQuery.data.name,
      description: programQuery.data.description ?? "",
      durum: programQuery.data.durum,
      baslangicTarihi: toDateInputValue(programQuery.data.baslangicTarihi),
      bitisTarihi: toDateInputValue(programQuery.data.bitisTarihi),
    })
    setIsEditing(true)
  }

  function onEditSubmit(values: EditFormValues) {
    updateMutation.mutate({
      name: values.name,
      description: values.description || undefined,
      durum: values.durum,
      baslangicTarihi: values.baslangicTarihi ? new Date(values.baslangicTarihi).toISOString() : undefined,
      bitisTarihi: values.bitisTarihi ? new Date(values.bitisTarihi).toISOString() : undefined,
    })
  }

  const katilimDurumMutation = useMutation({
    mutationFn: async ({ katilimId, durum }: { katilimId: string; durum: KatilimDurumu }) =>
      (await api.put<MessageResponse>(`/programs/katilimlar/${katilimId}/durum`, { durum })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", id] })
      toast.success("Katılım durumu güncellendi.")
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Katılım durumu güncellenemedi."))
    },
  })

  const [selectedKatilimIds, setSelectedKatilimIds] = useState<Set<string>>(new Set())
  const [bulkDurum, setBulkDurum] = useState<KatilimDurumu>("DevamEdiyor")

  const bulkKatilimDurumMutation = useMutation({
    mutationFn: async ({ katilimIds, durum }: { katilimIds: string[]; durum: KatilimDurumu }) => {
      await Promise.all(
        katilimIds.map((katilimId) => api.put(`/programs/katilimlar/${katilimId}/durum`, { durum })),
      )
      return { count: katilimIds.length }
    },
    onSuccess: ({ count }) => {
      toast.success(`${count} katılımcının durumu güncellendi.`)
      setSelectedKatilimIds(new Set())
      queryClient.invalidateQueries({ queryKey: ["programs", id] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Bazı katılımcılar güncellenemedi.")),
  })

  function toggleKatilimSelected(katilimId: string, checked: boolean) {
    setSelectedKatilimIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(katilimId)
      else next.delete(katilimId)
      return next
    })
  }

  const [addGirisimId, setAddGirisimId] = useState("")
  const [addDonem, setAddDonem] = useState("")
  const [addDurum, setAddDurum] = useState<KatilimDurumu>("Basvuru")

  const addKatilimMutation = useMutation({
    mutationFn: async () => {
      const payload: AddKatilimRequest = { girisimId: addGirisimId, donem: addDonem || undefined, durum: addDurum }
      return (await api.post<ProgramDetailDto>(`/programs/${id}/katilimlar`, payload)).data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["programs", id], data)
      queryClient.invalidateQueries({ queryKey: ["programs"] })
      toast.success("Katılımcı eklendi.")
      setAddGirisimId("")
      setAddDonem("")
      setAddDurum("Basvuru")
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Katılımcı eklenemedi."))
    },
  })

  const basvuruMutation = useMutation({
    mutationFn: async () => (await api.post<MessageResponse>(`/programs/${id}/basvuru`)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["programs", id] })
      toast.success(data.message)
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Başvuru gönderilemedi.")),
  })

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!addGirisimId) {
      toast.error("Lütfen bir girişim seçin.")
      return
    }
    addKatilimMutation.mutate()
  }

  if (programQuery.isLoading) {
    return (
      <div>
        <BackLink to="/programlar" label="Programlara dön" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (programQuery.isError || !programQuery.data) {
    return (
      <div>
        <BackLink to="/programlar" label="Programlara dön" />
        <p className="text-sm text-red-600">{extractErrorMessage(programQuery.error, "Program yüklenemedi.")}</p>
      </div>
    )
  }

  const program = programQuery.data
  const alreadyApplied = isStartup && program.katilimcilar.some((k) => k.girisimId === user?.girisimId)
  const canApply = isStartup && program.durum === "Aktif" && !alreadyApplied

  return (
    <div>
      <BackLink to="/programlar" label="Programlara dön" />
      <KapakGorseliSection
        program={program}
        canEdit={canWrite}
        onUpdated={(updated) => queryClient.setQueryData(["programs", id], updated)}
      />
      <PageHeader
        eyebrow="T3 Girişim Ekosistemi"
        title={program.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ProgramDurumBadge durum={program.durum} />
            <span>
              {formatDate(program.baslangicTarihi)} – {formatDate(program.bitisTarihi)}
            </span>
          </span>
        }
        actions={
          canWrite && !isEditing ? (
            <Button variant="outline" onClick={startEditing}>
              Düzenle
            </Button>
          ) : isStartup ? (
            alreadyApplied ? (
              <Badge variant="outline" className="font-semibold bg-t3-blue-light text-t3-blue border-blue-200">
                Başvurunuz alındı
              </Badge>
            ) : canApply ? (
              <Button
                className="bg-role-accent text-white hover:bg-role-accent-dark"
                onClick={() => basvuruMutation.mutate()}
                disabled={basvuruMutation.isPending}
              >
                {basvuruMutation.isPending ? "Gönderiliyor…" : "Programa Başvur"}
              </Button>
            ) : undefined
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* Yöneticinin "bu program ne yaptı" sorusu, program bilgilerinin hemen üstünde. */}
        {canWrite && <ProgramKohortu programId={program.id} />}

        <Card>
          <KartBasligi ikon={<Layers className="size-4" />} baslik="Program Bilgileri" ton="accent" />
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Program Adı</Label>
                  <Input id="edit-name" {...registerEdit("name")} />
                  {editErrors.name && <p className="text-xs text-red-600">{editErrors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-description">Açıklama</Label>
                  <Textarea id="edit-description" rows={4} {...registerEdit("description")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-durum">Durum</Label>
                  <Controller
                    control={editControl}
                    name="durum"
                    render={({ field }) => (
                      <Select items={programDurumLabels} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="edit-durum" className="w-full">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {programDurumOptions.map((d) => (
                            <SelectItem key={d} value={d}>
                              {programDurumLabels[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-baslangic">Başlangıç Tarihi</Label>
                    <Input id="edit-baslangic" type="date" {...registerEdit("baslangicTarihi")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bitis">Bitiş Tarihi</Label>
                    <Input id="edit-bitis" type="date" {...registerEdit("bitisTarihi")} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-role-accent text-white hover:bg-role-accent-dark"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    İptal
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-foreground">{program.description || "Açıklama girilmemiş."}</p>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Durum</dt>
                    <dd className="mt-1">
                      <ProgramDurumBadge durum={program.durum} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Başlangıç Tarihi</dt>
                    <dd className="mt-1">{formatDate(program.baslangicTarihi)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Bitiş Tarihi</dt>
                    <dd className="mt-1">{formatDate(program.bitisTarihi)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Katılımcılar ({program.katilimcilar.length})</CardTitle>
              {(() => {
                const bekleyen = program.katilimcilar.filter((k) => k.durum === "Basvuru").length
                return bekleyen > 0 ? (
                  <Badge variant="outline" className="font-semibold bg-amber-50 text-amber-700 border-amber-200">
                    {bekleyen} bekleyen başvuru
                  </Badge>
                ) : null
              })()}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {program.katilimcilar.length === 0 ? (
              <EmptyState icon="👥" message="Bu programa henüz katılımcı eklenmemiş." />
            ) : (
              <>
                {canWrite && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={
                          program.katilimcilar.length > 0 &&
                          program.katilimcilar.every((k) => selectedKatilimIds.has(k.katilimId))
                        }
                        onCheckedChange={(checked) =>
                          setSelectedKatilimIds(
                            checked === true ? new Set(program.katilimcilar.map((k) => k.katilimId)) : new Set(),
                          )
                        }
                      />
                      Tümünü Seç
                    </label>
                    {selectedKatilimIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-t3-navy">
                          {selectedKatilimIds.size} katılımcı seçildi
                        </span>
                        <Select items={katilimDurumLabels} value={bulkDurum} onValueChange={(value) => setBulkDurum(value as KatilimDurumu)}>
                          <SelectTrigger size="sm" className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {katilimDurumOptions.map((d) => (
                              <SelectItem key={d} value={d}>
                                {katilimDurumLabels[d]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="bg-role-accent text-white hover:bg-role-accent-dark"
                          disabled={bulkKatilimDurumMutation.isPending}
                          onClick={() =>
                            bulkKatilimDurumMutation.mutate({
                              katilimIds: Array.from(selectedKatilimIds),
                              durum: bulkDurum,
                            })
                          }
                        >
                          Uygula
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canWrite && <TableHead className="w-10" />}
                      <TableHead>Girişim</TableHead>
                      <TableHead>Dönem</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Başlangıç</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {program.katilimcilar.map((k) => (
                      <TableRow key={k.katilimId} className={k.durum === "Basvuru" ? "bg-amber-50/50" : undefined}>
                        {canWrite && (
                          <TableCell>
                            <Checkbox
                              checked={selectedKatilimIds.has(k.katilimId)}
                              onCheckedChange={(checked) => toggleKatilimSelected(k.katilimId, checked === true)}
                              aria-label={`${k.girisimAdi} katılımını seç`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Link
                            to={`/girisimler/${k.girisimId}`}
                            className="font-medium text-t3-navy hover:text-t3-blue hover:underline"
                          >
                            {k.girisimAdi}
                          </Link>
                        </TableCell>
                        <TableCell>{k.donem || "—"}</TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Select
                              value={k.durum}
                              onValueChange={(value) =>
                                katilimDurumMutation.mutate({ katilimId: k.katilimId, durum: value as KatilimDurumu })
                              }
                            >
                              <SelectTrigger size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {katilimDurumOptions.map((d) => (
                                  <SelectItem key={d} value={d}>
                                    {katilimDurumLabels[d]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <KatilimDurumBadge durum={k.durum} />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(k.baslangicTarihi)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {canWrite && (
          <Card>
            <KartBasligi ikon={<Users className="size-4" />} baslik="Katılımcı Ekle" ton="accent" />
            <CardContent>
              <form onSubmit={handleAddSubmit} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="add-girisim">Girişim</Label>
                  <Select items={Object.fromEntries((girisimlerQuery.data ?? []).map((g) => [g.id, g.ad]))} value={addGirisimId} onValueChange={(v) => setAddGirisimId(v ?? "")}>
                    <SelectTrigger id="add-girisim" className="w-full">
                      <SelectValue placeholder="Girişim seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {(girisimlerQuery.data ?? []).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.ad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-donem">Dönem</Label>
                  <Input
                    id="add-donem"
                    placeholder="örn. 2026 Güz"
                    value={addDonem}
                    onChange={(e) => setAddDonem(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-durum">Durum</Label>
                  <Select items={katilimDurumLabels} value={addDurum} onValueChange={(value) => setAddDurum(value as KatilimDurumu)}>
                    <SelectTrigger id="add-durum" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {katilimDurumOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {katilimDurumLabels[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="bg-role-accent text-white hover:bg-role-accent-dark"
                  disabled={addKatilimMutation.isPending}
                >
                  {addKatilimMutation.isPending ? "Ekleniyor…" : "Ekle"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
