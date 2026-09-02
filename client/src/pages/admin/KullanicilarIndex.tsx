import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { StatusBadge } from "@/components/patterns/StatusBadge"
import { Pagination } from "@/components/patterns/Pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { api, extractErrorMessage } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { GirisimSummaryDto, InviteUserRequest, PagedResultDto, UserDto, UserRole } from "@/lib/types"

const ROLE_LABEL: Record<UserRole, string> = {
  SuperAdmin: "Süper Admin",
  ProgramYoneticisi: "Program Yöneticisi",
  StartupKullanicisi: "Startup Kullanıcısı",
  KararVerici: "Karar Verici",
}

const ROLE_OPTIONS: UserRole[] = ["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi", "KararVerici"]
const ALL_ROLES = "__all__"

const schema = z
  .object({
    email: z.string().email("Geçerli bir e-posta girin."),
    fullName: z.string().min(1, "Ad soyad zorunludur."),
    role: z.enum(["SuperAdmin", "ProgramYoneticisi", "StartupKullanicisi", "KararVerici"], {
      message: "Rol seçin.",
    }),
    girisimId: z.string().optional(),
  })
  .refine((data) => data.role !== "StartupKullanicisi" || !!data.girisimId, {
    message: "Startup kullanıcısı için girişim seçilmelidir.",
    path: ["girisimId"],
  })

type FormValues = z.infer<typeof schema>

export default function KullanicilarIndexPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
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

  const users = usersQuery.data?.items ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Kullanıcı Yönetimi"
        title="Kullanıcılar"
        subtitle="Program yöneticileri, startup kullanıcıları ve karar vericiler için hesap davet edin."
        actions={
          <Button className="bg-t3-blue text-white hover:bg-t3-blue-dark" onClick={() => setDialogOpen(true)}>
            Kullanıcı Davet Et
          </Button>
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
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? ALL_ROLES)}>
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
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Girişim</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-t3-navy">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell>{u.girisimAdi ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {u.status === "Invited" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resendInviteMutation.isPending}
                          onClick={() => resendInviteMutation.mutate(u.id)}
                        >
                          Daveti Yeniden Gönder
                        </Button>
                      )}
                      {u.id !== currentUser?.id && u.status !== "Invited" && (
                        <Button
                          size="sm"
                          variant={u.status === "Disabled" ? "outline" : "destructive"}
                          disabled={setDisabledMutation.isPending}
                          onClick={() =>
                            setDisabledMutation.mutate({ userId: u.id, disable: u.status !== "Disabled" })
                          }
                        >
                          {u.status === "Disabled" ? "Aktifleştir" : "Devre Dışı Bırak"}
                        </Button>
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
                  <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value ?? undefined)}>
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
                    <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value ?? undefined)}>
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
    </div>
  )
}
