import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Ban, CheckCircle2, Mail, MoreVertical, Search, Upload } from "lucide-react"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { StatusBadge } from "@/components/patterns/StatusBadge"
import { Pagination } from "@/components/patterns/Pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RoleBadge, ROLE_LABEL } from "@/components/patterns/RoleBadge"
import { api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { cn } from "@/lib/utils"
import type {
  BulkInviteRequest,
  BulkInviteResponseDto,
  BulkInviteRowRequest,
  ChangeGirisimRequest,
  ChangeRoleRequest,
  GirisimSummaryDto,
  IslemKaydiDto,
  InviteUserRequest,
  PagedResultDto,
  UserDto,
  UserRole,
} from "@/lib/types"

const EYLEM_LABEL: Record<string, string> = {
  KullaniciDavetEdildi: "Kullanıcı davet edildi",
  DavetYenidenGonderildi: "Davet yeniden gönderildi",
  KullaniciDevreDisiBirakildi: "Kullanıcı devre dışı bırakıldı",
  KullaniciAktiflestirildi: "Kullanıcı aktifleştirildi",
  RolDegistirildi: "Rol değiştirildi",
  GirisimAtamasiDegistirildi: "Girişim ataması değiştirildi",
  TopluDavetTamamlandi: "Toplu davet tamamlandı",
}

const ROLE_OPTIONS: UserRole[] = ["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi"]
const ALL_ROLES = "__all__"

function formatLastLogin(value: string | null): string {
  if (!value) return "Hiç giriş yapmadı"
  return new Date(value).toLocaleString("tr-TR")
}

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
  "bg-indigo-50 text-indigo-700",
  "bg-teal-50 text-teal-700",
]

/** Deterministic hue from the name so each avatar gets a stable, distinct color. */
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR")
}

const schema = z
  .object({
    email: z.string().email("Geçerli bir e-posta girin."),
    fullName: z.string().min(1, "Ad soyad zorunludur."),
    role: z.enum(["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi"], {
      message: "Rol seçin.",
    }),
    girisimId: z.string().optional(),
  })
  .refine((data) => data.role !== "StartupKullanicisi" || !!data.girisimId, {
    message: "Startup kullanıcısı için girişim seçilmelidir.",
    path: ["girisimId"],
  })

type FormValues = z.infer<typeof schema>

function parseCsv(text: string): BulkInviteRowRequest[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const startIndex = lines[0]?.toLowerCase().startsWith("email") ? 1 : 0
  const rows: BulkInviteRowRequest[] = []
  for (let i = startIndex; i < lines.length; i++) {
    const [email, fullName, role, girisimAdi] = lines[i].split(",").map((c) => c.trim())
    if (!email) continue
    rows.push({ email, fullName: fullName ?? "", role: (role ?? "") as UserRole, girisimAdi: girisimAdi || null })
  }
  return rows
}

export default function KullanicilarIndexPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkInviteRowRequest[]>([])
  const [bulkResults, setBulkResults] = useState<BulkInviteResponseDto | null>(null)
  const [detailUser, setDetailUser] = useState<UserDto | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter])

  const usersQuery = useQuery({
    queryKey: ["admin-users", debouncedSearch, roleFilter, page],
    queryFn: async () =>
      (
        await api.get<PagedResultDto<UserDto>>("/admin/users", {
          params: {
            ara: debouncedSearch || undefined,
            role: roleFilter === ALL_ROLES ? undefined : roleFilter,
            page,
          },
        })
      ).data,
  })

  const girisimlerQuery = useQuery({
    queryKey: ["girisimler-all"],
    queryFn: async () =>
      (await api.get<PagedResultDto<GirisimSummaryDto>>("/girisimler", { params: { pageSize: 100 } })).data.items,
  })

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", fullName: "", role: undefined, girisimId: undefined },
  })

  const selectedRole = watch("role")

  useEffect(() => {
    if (selectedRole !== "StartupKullanicisi") {
      setValue("girisimId", undefined)
    }
  }, [selectedRole, setValue])

  const inviteMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: InviteUserRequest = {
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        girisimId: values.role === "StartupKullanicisi" ? values.girisimId : null,
      }
      return (await api.post<UserDto>("/admin/users/invite", body)).data
    },
    onSuccess: () => {
      toast.success("Davet gönderildi.")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setDialogOpen(false)
      reset({ email: "", fullName: "", role: undefined, girisimId: undefined })
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Davet gönderilemedi."))
    },
  })

  function onSubmit(values: FormValues) {
    inviteMutation.mutate(values)
  }

  const resendInviteMutation = useMutation({
    mutationFn: async (userId: string) =>
      (await api.post<{ message: string }>(`/admin/users/${userId}/resend-invite`)).data,
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(extractErrorMessage(error, "Davet e-postası gönderilemedi.")),
  })

  const setDisabledMutation = useMutation({
    mutationFn: async ({ userId, disable }: { userId: string; disable: boolean }) =>
      (await api.post<{ message: string }>(`/admin/users/${userId}/${disable ? "disable" : "enable"}`)).data,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, "İşlem gerçekleştirilemedi.")),
  })

  const bulkInviteMutation = useMutation({
    mutationFn: async (rows: BulkInviteRowRequest[]) =>
      (await api.post<BulkInviteResponseDto>("/admin/users/bulk-invite", { rows } satisfies BulkInviteRequest)).data,
    onSuccess: (data) => {
      setBulkResults(data)
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      if (data.hataliSayisi === 0) toast.success(`${data.basariliSayisi} kullanıcı davet edildi.`)
      else toast.warning(`${data.basariliSayisi} başarılı, ${data.hataliSayisi} hatalı.`)
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Toplu davet gönderilemedi.")),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setBulkRows(parseCsv(String(reader.result ?? "")))
      setBulkResults(null)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function closeBulkDialog() {
    setBulkDialogOpen(false)
    setBulkRows([])
    setBulkResults(null)
  }

  const users = usersQuery.data?.items ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Kullanıcı Yönetimi"
        title="Kullanıcılar"
        subtitle="Program yöneticileri, startup kullanıcıları ve karar vericiler için hesap davet edin."
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Upload className="size-4" />
              Toplu Davet Et (CSV)
            </Button>
            <Button className="bg-t3-blue text-white hover:bg-t3-blue-dark" onClick={() => setDialogOpen(true)}>
              Kullanıcı Davet Et
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad soyad veya e-posta ara…"
            className="pl-9"
          />
        </div>
        {/* Base UI, items verilmezse ham enum adını basar. */}
        <Select
          items={{ [ALL_ROLES]: "Tüm roller", ...ROLE_LABEL }}
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value ?? ALL_ROLES)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tüm roller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES}>Tüm roller</SelectItem>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usersQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon="👥" message="Henüz kullanıcı bulunmuyor." />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Kullanıcı
                </TableHead>
                <TableHead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Rol
                </TableHead>
                <TableHead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Durum
                </TableHead>
                <TableHead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Girişim
                </TableHead>
                <TableHead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Son Giriş
                </TableHead>
                <TableHead className="bg-muted/40 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  İşlem
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-t3-blue-light/30">
                  <TableCell className="py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none",
                          avatarColor(u.fullName),
                        )}
                      >
                        {getInitials(u.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-t3-navy">{u.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.girisimAdi ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          u.lastLoginAt ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      />
                      {formatLastLogin(u.lastLoginAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setDetailUser(u)}>
                        Detay
                      </Button>
                      {(u.status === "Invited" || (u.id !== currentUser?.id && u.status !== "Invited")) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Daha fazla işlem" />}
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {u.status === "Invited" && (
                              <DropdownMenuItem
                                disabled={resendInviteMutation.isPending}
                                onClick={() => resendInviteMutation.mutate(u.id)}
                              >
                                <Mail className="size-4" />
                                Daveti Yeniden Gönder
                              </DropdownMenuItem>
                            )}
                            {u.id !== currentUser?.id && u.status !== "Invited" && (
                              <DropdownMenuItem
                                variant={u.status === "Disabled" ? "default" : "destructive"}
                                disabled={setDisabledMutation.isPending}
                                onClick={() =>
                                  setDisabledMutation.mutate({ userId: u.id, disable: u.status !== "Disabled" })
                                }
                              >
                                {u.status === "Disabled" ? (
                                  <>
                                    <CheckCircle2 className="size-4" />
                                    Aktifleştir
                                  </>
                                ) : (
                                  <>
                                    <Ban className="size-4" />
                                    Devre Dışı Bırak
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={usersQuery.data?.page ?? 1}
        totalPages={usersQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Davet Et</DialogTitle>
            <DialogDescription>
              Davet edilen kişiye parola belirleme bağlantısı içeren bir e-posta gönderilir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-posta</Label>
              <Input id="invite-email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-fullName">Ad Soyad</Label>
              <Input id="invite-fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rol</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select items={ROLE_LABEL} value={field.value ?? ""} onValueChange={(value) => field.onChange(value ?? undefined)}>
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue placeholder="Rol seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
            </div>
            {selectedRole === "StartupKullanicisi" && (
              <div className="space-y-1.5">
                <Label htmlFor="invite-girisim">Girişim</Label>
                <Controller
                  control={control}
                  name="girisimId"
                  render={({ field }) => (
                    <Select
                      items={Object.fromEntries((girisimlerQuery.data ?? []).map((g) => [g.id, g.ad]))}
                      value={field.value ?? ""}
                      onValueChange={(value) => field.onChange(value ?? undefined)}
                    >
                      <SelectTrigger id="invite-girisim" className="w-full">
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
                  )}
                />
                {errors.girisimId && <p className="text-xs text-red-600">{errors.girisimId.message}</p>}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                className="bg-t3-blue text-white hover:bg-t3-blue-dark"
                disabled={isSubmitting || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Gönderiliyor…" : "Davet Gönder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={(open) => (open ? setBulkDialogOpen(true) : closeBulkDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Toplu Davet Et (CSV)</DialogTitle>
            <DialogDescription>
              Başlıklar: <code className="rounded bg-muted px-1">email,fullName,role,girisimAdi</code>. Roller:{" "}
              {ROLE_OPTIONS.join(", ")}. <code className="rounded bg-muted px-1">girisimAdi</code> yalnızca Startup
              Kullanıcısı satırları için zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            {bulkRows.length > 0 && !bulkResults && (
              <p className="text-sm text-muted-foreground">{bulkRows.length} satır okundu.</p>
            )}
            {bulkResults && (
              <div className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satır</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkResults.sonuclar.map((r) => (
                      <TableRow key={r.satirNo}>
                        <TableCell>{r.satirNo}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>
                          {r.basarili ? (
                            <Badge className="bg-emerald-50 text-emerald-700">Başarılı</Badge>
                          ) : (
                            <Badge variant="destructive">{r.hata}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBulkDialog}>
              Kapat
            </Button>
            <Button
              type="button"
              className="bg-t3-blue text-white hover:bg-t3-blue-dark"
              disabled={bulkRows.length === 0 || bulkInviteMutation.isPending}
              onClick={() => bulkInviteMutation.mutate(bulkRows)}
            >
              {bulkInviteMutation.isPending ? "İçe aktarılıyor…" : `İçe Aktar (${bulkRows.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailUser !== null} onOpenChange={(open) => !open && setDetailUser(null)}>
        {detailUser && (
          <UserDetailDialog
            key={detailUser.id}
            user={detailUser}
            currentUserId={currentUser?.id}
            girisimler={girisimlerQuery.data ?? []}
          />
        )}
      </Dialog>
    </div>
  )
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}

function UserDetailDialog({
  user,
  currentUserId,
  girisimler,
}: {
  user: UserDto
  currentUserId: string | undefined
  girisimler: GirisimSummaryDto[]
}) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<UserRole>(user.role)
  const [girisimId, setGirisimId] = useState<string | undefined>(user.girisimId ?? undefined)

  const historyQuery = useQuery({
    queryKey: ["islem-gecmisi", "kullanici", user.id],
    queryFn: async () =>
      (
        await api.get<PagedResultDto<IslemKaydiDto>>("/admin/islem-gecmisi", {
          params: { hedefKullaniciId: user.id, pageSize: 5 },
        })
      ).data.items,
  })

  const roleMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<UserDto>(`/admin/users/${user.id}/role`, {
          role,
          girisimId: role === "StartupKullanicisi" ? girisimId : null,
        } satisfies ChangeRoleRequest)
      ).data,
    onSuccess: () => {
      toast.success("Rol güncellendi.")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["islem-gecmisi", "kullanici", user.id] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Rol değiştirilemedi.")),
  })

  const girisimMutation = useMutation({
    mutationFn: async () => {
      if (!girisimId) throw new Error("Girişim seçilmelidir.")
      return (
        await api.post<UserDto>(`/admin/users/${user.id}/girisim`, { girisimId } satisfies ChangeGirisimRequest)
      ).data
    },
    onSuccess: () => {
      toast.success("Girişim ataması güncellendi.")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["islem-gecmisi", "kullanici", user.id] })
    },
    onError: (error) => toast.error(extractErrorMessage(error, "Girişim ataması değiştirilemedi.")),
  })

  const roleChanged = role !== user.role
  const girisimChanged = role === "StartupKullanicisi" && girisimId !== (user.girisimId ?? undefined)
  const canSave = roleChanged || girisimChanged

  function handleSave() {
    if (roleChanged) roleMutation.mutate()
    else if (girisimChanged) girisimMutation.mutate()
  }

  const isSelf = user.id === currentUserId
  const isPending = roleMutation.isPending || girisimMutation.isPending

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-t3-blue text-sm font-bold text-white select-none">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0">
            <DialogTitle className="truncate">{user.fullName}</DialogTitle>
            <DialogDescription className="truncate">{user.email}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
          {isSelf && <Badge variant="secondary">Bu sizsiniz</Badge>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Son Giriş</Label>
          <p className="text-sm">{formatLastLogin(user.lastLoginAt)}</p>
        </div>

        <div className="space-y-3 rounded-xl border-2 border-t3-blue/15 bg-t3-blue-light/30 p-4">
          <p className="text-sm font-semibold text-t3-navy">Rol ve Girişim</p>
          <div className="space-y-1.5">
            <Label htmlFor="detail-role">Rol</Label>
            <Select items={ROLE_LABEL} value={role} onValueChange={(v) => v && setRole(v as UserRole)}>
              <SelectTrigger id="detail-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "StartupKullanicisi" && (
            <div className="space-y-1.5">
              <Label htmlFor="detail-girisim">Girişim</Label>
              <Select items={Object.fromEntries(girisimler.map((g) => [g.id, g.ad]))} value={girisimId ?? ""} onValueChange={(v) => v && setGirisimId(v)}>
                <SelectTrigger id="detail-girisim" className="w-full">
                  <SelectValue placeholder="Girişim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {girisimler.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" disabled={!canSave || isPending} onClick={handleSave}>
            {isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Son İşlemler</p>
          {historyQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (historyQuery.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Bu kullanıcıyla ilgili henüz işlem yok.</p>
          ) : (
            <ul className="space-y-2">
              {historyQuery.data!.map((h) => (
                <li key={h.id} className="rounded-lg bg-muted/40 p-2.5 text-xs">
                  <p className="font-medium text-t3-navy">{EYLEM_LABEL[h.eylem] ?? h.eylem}</p>
                  {h.detay && <p className="mt-0.5 text-muted-foreground">{h.detay}</p>}
                  <p className="mt-1 text-muted-foreground">
                    {formatDateTime(h.createdAt)} · {h.actorAdSoyad}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
