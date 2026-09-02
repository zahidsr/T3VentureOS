import { type ReactNode, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  OnayBekleyenBasariDto,
  OnayBekleyenDokumanDto,
  OnayBekleyenGuncellemeDto,
  OnayBekleyenSatisDto,
  OnayBekleyenYatirimDto,
  OnayKararRequest,
  OnayKuyruguDto,
} from "@/lib/types"

type OnayKategori = "satis" | "yatirim" | "basari" | "dokuman" | "guncelleme"

const YATIRIM_TUR_LABEL: Record<string, string> = {
  Hibe: "Hibe",
  OnTohum: "Ön Tohum",
  Tohum: "Tohum",
  SeriA: "Seri A",
  SeriB: "Seri B",
  SeriSonrasi: "Seri Sonrası",
  Diger: "Diğer",
}

const BASARI_TUR_LABEL: Record<string, string> = {
  Hibe: "Hibe",
  Odul: "Ödül",
  Sertifika: "Sertifika",
  Diger: "Diğer",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR")
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR")
}

function fileUrl(dosyaUrl: string) {
  return `${API_URL.replace(/\/api\/?$/, "")}${dosyaUrl}`
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  )
}

function ItemCard({
  girisimId,
  girisimAdi,
  createdAt,
  fields,
  actions,
  selected,
  onSelectedChange,
}: {
  girisimId: string
  girisimAdi: string
  createdAt: string
  fields: ReactNode
  actions: ReactNode
  selected: boolean
  onSelectedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
          aria-label={`${girisimAdi} kaydını seç`}
          className="mt-1"
        />
        <div className="space-y-1.5">
          <Link
            to={`/girisimler/${girisimId}`}
            className="font-heading text-sm font-semibold text-t3-navy hover:text-t3-blue hover:underline"
          >
            {girisimAdi}
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{fields}</div>
          <div className="text-xs text-muted-foreground">Gönderim: {formatDate(createdAt)}</div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">{actions}</div>
    </div>
  )
}

function SelectionHeader({
  ids,
  selectedIds,
  onToggleAll,
  onBulkApprove,
  onBulkReject,
  isBulkPending,
}: {
  ids: string[]
  selectedIds: Set<string>
  onToggleAll: (checked: boolean) => void
  onBulkApprove: () => void
  onBulkReject: () => void
  isBulkPending: boolean
}) {
  const count = selectedIds.size
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={allSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} />
        Tümünü Seç
      </label>
      {count > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-t3-navy">{count} kayıt seçildi</span>
          <Button
            size="sm"
            className="bg-t3-blue text-white hover:bg-t3-blue-dark"
            disabled={isBulkPending}
            onClick={onBulkApprove}
          >
            Seçilenleri Onayla
          </Button>
          <Button size="sm" variant="outline" disabled={isBulkPending} onClick={onBulkReject}>
            Seçilenleri Reddet
          </Button>
        </div>
      )}
    </div>
  )
}

function emptySelection(): Record<OnayKategori, Set<string>> {
  return {
    satis: new Set(),
    yatirim: new Set(),
    basari: new Set(),
    dokuman: new Set(),
    guncelleme: new Set(),
  }
}

export default function OnaylarIndexPage() {
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<{
    kategori: OnayKategori
    ids: string[]
    label: string
  } | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectNoteError, setRejectNoteError] = useState(false)
  const [selected, setSelected] = useState<Record<OnayKategori, Set<string>>>(emptySelection)

  function toggleSelected(kategori: OnayKategori, id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev[kategori])
      if (checked) next.add(id)
      else next.delete(id)
      return { ...prev, [kategori]: next }
    })
  }

  function toggleSelectAll(kategori: OnayKategori, ids: string[], checked: boolean) {
    setSelected((prev) => ({ ...prev, [kategori]: checked ? new Set(ids) : new Set() }))
  }

  const onaylarQuery = useQuery({
    queryKey: ["onaylar"],
    queryFn: async () => (await api.get<OnayKuyruguDto>("/onaylar")).data,
  })

  const kararMutation = useMutation({
    mutationFn: async ({
      kategori,
      id,
      body,
    }: {
      kategori: OnayKategori
      id: string
      body: OnayKararRequest
    }) => (await api.post(`/onaylar/${kategori}/${id}`, body)).data,
    onSuccess: (_data, variables) => {
      toast.success(variables.body.onayla ? "Kayıt onaylandı." : "Kayıt reddedildi.")
      queryClient.invalidateQueries({ queryKey: ["onaylar"] })
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "İşlem gerçekleştirilemedi."))
    },
  })

  const bulkDecideMutation = useMutation({
    mutationFn: async ({
      kategori,
      ids,
      onayla,
      not,
    }: {
      kategori: OnayKategori
      ids: string[]
      onayla: boolean
      not?: string | null
    }) => {
      await Promise.all(ids.map((id) => api.post(`/onaylar/${kategori}/${id}`, { onayla, not })))
      return { kategori, count: ids.length, onayla }
    },
    onSuccess: ({ kategori, count, onayla }) => {
      toast.success(`${count} kayıt ${onayla ? "onaylandı" : "reddedildi"}.`)
      setSelected((prev) => ({ ...prev, [kategori]: new Set() }))
      queryClient.invalidateQueries({ queryKey: ["onaylar"] })
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Bazı kayıtlar işlenemedi."))
    },
  })

  function handleBulkApprove(kategori: OnayKategori) {
    const ids = Array.from(selected[kategori])
    if (ids.length === 0) return
    bulkDecideMutation.mutate({ kategori, ids, onayla: true })
  }

  function handleApprove(kategori: OnayKategori, id: string) {
    kararMutation.mutate({ kategori, id, body: { onayla: true } })
  }

  function openReject(kategori: OnayKategori, id: string, girisimAdi: string) {
    setRejectTarget({ kategori, ids: [id], label: girisimAdi })
    setRejectNote("")
    setRejectNoteError(false)
  }

  function openBulkReject(kategori: OnayKategori) {
    const ids = Array.from(selected[kategori])
    if (ids.length === 0) return
    setRejectTarget({ kategori, ids, label: `${ids.length} kayıt` })
    setRejectNote("")
    setRejectNoteError(false)
  }

  function confirmReject() {
    if (!rejectTarget) return
    if (!rejectNote.trim()) {
      setRejectNoteError(true)
      return
    }
    if (rejectTarget.ids.length === 1) {
      kararMutation.mutate(
        {
          kategori: rejectTarget.kategori,
          id: rejectTarget.ids[0],
          body: { onayla: false, not: rejectNote.trim() },
        },
        { onSuccess: () => setRejectTarget(null) },
      )
    } else {
      bulkDecideMutation.mutate(
        { kategori: rejectTarget.kategori, ids: rejectTarget.ids, onayla: false, not: rejectNote.trim() },
        { onSuccess: () => setRejectTarget(null) },
      )
    }
  }

  function actionsFor(kategori: OnayKategori, id: string, girisimAdi: string) {
    return (
      <>
        <Button
          size="sm"
          className="bg-t3-blue text-white hover:bg-t3-blue-dark"
          disabled={kararMutation.isPending}
          onClick={() => handleApprove(kategori, id)}
        >
          Onayla
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={kararMutation.isPending}
          onClick={() => openReject(kategori, id, girisimAdi)}
        >
          Reddet
        </Button>
      </>
    )
  }

  const data = onaylarQuery.data
  const satislar = data?.satislar ?? []
  const yatirimlar = data?.yatirimlar ?? []
  const basarilar = data?.basarilar ?? []
  const dokumanlar = data?.dokumanlar ?? []
  const guncellemeler = data?.guncellemeler ?? []

  const tabs: { value: string; label: string; count: number }[] = [
    { value: "satis", label: "Satış", count: satislar.length },
    { value: "yatirim", label: "Yatırım", count: yatirimlar.length },
    { value: "basari", label: "Başarı", count: basarilar.length },
    { value: "dokuman", label: "Doküman", count: dokumanlar.length },
    { value: "guncelleme", label: "Profil Güncellemesi", count: guncellemeler.length },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Onay Kuyruğu"
        title="Onaylar"
        subtitle="Girişimlerin gönderdiği veriler burada yönetici onayına sunulur."
      />

      {onaylarQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="satis">
          <TabsList className="h-auto flex-wrap">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.label}
                <Badge variant="secondary" className="h-4.5 px-1.5 text-[0.7rem]">
                  {t.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="satis" className="mt-4 space-y-3">
            {satislar.length === 0 ? (
              <EmptyState icon="🎉" message="Bekleyen satış kaydı yok." />
            ) : (
              <>
                <SelectionHeader
                  ids={satislar.map((s) => s.id)}
                  selectedIds={selected.satis}
                  onToggleAll={(checked) =>
                    toggleSelectAll(
                      "satis",
                      satislar.map((s) => s.id),
                      checked,
                    )
                  }
                  onBulkApprove={() => handleBulkApprove("satis")}
                  onBulkReject={() => openBulkReject("satis")}
                  isBulkPending={bulkDecideMutation.isPending}
                />
                {satislar.map((s: OnayBekleyenSatisDto) => (
                  <ItemCard
                    key={s.id}
                    girisimId={s.girisimId}
                    girisimAdi={s.girisimAdi}
                    createdAt={s.createdAt}
                    fields={
                      <>
                        <Field label="Dönem" value={s.donem} />
                        <Field label="Ciro" value={formatNumber(s.ciro)} />
                        <Field label="İhracat" value={s.ihracat != null ? formatNumber(s.ihracat) : "—"} />
                      </>
                    }
                    actions={actionsFor("satis", s.id, s.girisimAdi)}
                    selected={selected.satis.has(s.id)}
                    onSelectedChange={(checked) => toggleSelected("satis", s.id, checked)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="yatirim" className="mt-4 space-y-3">
            {yatirimlar.length === 0 ? (
              <EmptyState icon="🎉" message="Bekleyen yatırım kaydı yok." />
            ) : (
              <>
                <SelectionHeader
                  ids={yatirimlar.map((y) => y.id)}
                  selectedIds={selected.yatirim}
                  onToggleAll={(checked) =>
                    toggleSelectAll(
                      "yatirim",
                      yatirimlar.map((y) => y.id),
                      checked,
                    )
                  }
                  onBulkApprove={() => handleBulkApprove("yatirim")}
                  onBulkReject={() => openBulkReject("yatirim")}
                  isBulkPending={bulkDecideMutation.isPending}
                />
                {yatirimlar.map((y: OnayBekleyenYatirimDto) => (
                  <ItemCard
                    key={y.id}
                    girisimId={y.girisimId}
                    girisimAdi={y.girisimAdi}
                    createdAt={y.createdAt}
                    fields={
                      <>
                        <Field label="Tür" value={YATIRIM_TUR_LABEL[y.tur] ?? y.tur} />
                        <Field label="Tutar" value={`${formatNumber(y.tutar)} ${y.paraBirimi}`} />
                        <Field label="Tarih" value={formatDate(y.tarih)} />
                        <Field label="Yatırımcı" value={y.yatirimciAdi ?? "—"} />
                      </>
                    }
                    actions={actionsFor("yatirim", y.id, y.girisimAdi)}
                    selected={selected.yatirim.has(y.id)}
                    onSelectedChange={(checked) => toggleSelected("yatirim", y.id, checked)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="basari" className="mt-4 space-y-3">
            {basarilar.length === 0 ? (
              <EmptyState icon="🎉" message="Bekleyen başarı kaydı yok." />
            ) : (
              <>
                <SelectionHeader
                  ids={basarilar.map((b) => b.id)}
                  selectedIds={selected.basari}
                  onToggleAll={(checked) =>
                    toggleSelectAll(
                      "basari",
                      basarilar.map((b) => b.id),
                      checked,
                    )
                  }
                  onBulkApprove={() => handleBulkApprove("basari")}
                  onBulkReject={() => openBulkReject("basari")}
                  isBulkPending={bulkDecideMutation.isPending}
                />
                {basarilar.map((b: OnayBekleyenBasariDto) => (
                  <ItemCard
                    key={b.id}
                    girisimId={b.girisimId}
                    girisimAdi={b.girisimAdi}
                    createdAt={b.createdAt}
                    fields={
                      <>
                        <Field label="Tür" value={BASARI_TUR_LABEL[b.tur] ?? b.tur} />
                        <Field label="Başlık" value={b.baslik} />
                        <Field label="Tarih" value={formatDate(b.tarih)} />
                      </>
                    }
                    actions={actionsFor("basari", b.id, b.girisimAdi)}
                    selected={selected.basari.has(b.id)}
                    onSelectedChange={(checked) => toggleSelected("basari", b.id, checked)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="dokuman" className="mt-4 space-y-3">
            {dokumanlar.length === 0 ? (
              <EmptyState icon="🎉" message="Bekleyen doküman yok." />
            ) : (
              <>
                <SelectionHeader
                  ids={dokumanlar.map((d) => d.id)}
                  selectedIds={selected.dokuman}
                  onToggleAll={(checked) =>
                    toggleSelectAll(
                      "dokuman",
                      dokumanlar.map((d) => d.id),
                      checked,
                    )
                  }
                  onBulkApprove={() => handleBulkApprove("dokuman")}
                  onBulkReject={() => openBulkReject("dokuman")}
                  isBulkPending={bulkDecideMutation.isPending}
                />
                {dokumanlar.map((d: OnayBekleyenDokumanDto) => (
                  <ItemCard
                    key={d.id}
                    girisimId={d.girisimId}
                    girisimAdi={d.girisimAdi}
                    createdAt={d.createdAt}
                    fields={
                      <>
                        <Field label="Başlık" value={d.baslik} />
                        <Field
                          label="Dosya"
                          value={
                            <a
                              href={fileUrl(d.dosyaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-t3-blue hover:underline"
                            >
                              İndir
                            </a>
                          }
                        />
                      </>
                    }
                    actions={actionsFor("dokuman", d.id, d.girisimAdi)}
                    selected={selected.dokuman.has(d.id)}
                    onSelectedChange={(checked) => toggleSelected("dokuman", d.id, checked)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="guncelleme" className="mt-4 space-y-3">
            {guncellemeler.length === 0 ? (
              <EmptyState icon="🎉" message="Bekleyen profil güncellemesi yok." />
            ) : (
              <>
                <SelectionHeader
                  ids={guncellemeler.map((g) => g.id)}
                  selectedIds={selected.guncelleme}
                  onToggleAll={(checked) =>
                    toggleSelectAll(
                      "guncelleme",
                      guncellemeler.map((g) => g.id),
                      checked,
                    )
                  }
                  onBulkApprove={() => handleBulkApprove("guncelleme")}
                  onBulkReject={() => openBulkReject("guncelleme")}
                  isBulkPending={bulkDecideMutation.isPending}
                />
                {guncellemeler.map((g: OnayBekleyenGuncellemeDto) => (
                  <ItemCard
                    key={g.id}
                    girisimId={g.girisimId}
                    girisimAdi={g.girisimAdi}
                    createdAt={g.createdAt}
                    fields={
                      <>
                        <Field label="Yeni Ad" value={g.yeniAd} />
                        <Field label="Yeni Sektör" value={g.yeniSektor ?? "—"} />
                      </>
                    }
                    actions={actionsFor("guncelleme", g.id, g.girisimAdi)}
                    selected={selected.guncelleme.has(g.id)}
                    onSelectedChange={(checked) => toggleSelected("guncelleme", g.id, checked)}
                  />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectTarget && rejectTarget.ids.length > 1 ? "Kayıtları Reddet" : "Kaydı Reddet"}</DialogTitle>
            <DialogDescription>
              {rejectTarget?.label}
              {rejectTarget && rejectTarget.ids.length > 1 ? "" : " girişimine ait bu kaydı"} reddetmek üzeresiniz.
              Girişimin ne düzeltmesi gerektiğini anlayabilmesi için bir sebep yazmanız zorunludur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Reddetme Sebebi *</Label>
            <Textarea
              id="reject-note"
              placeholder="Reddetme sebebini yazın…"
              value={rejectNote}
              onChange={(e) => {
                setRejectNote(e.target.value)
                if (e.target.value.trim()) setRejectNoteError(false)
              }}
              aria-invalid={rejectNoteError}
            />
            {rejectNoteError && <p className="text-xs text-red-600">Reddetme sebebi zorunludur.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              disabled={kararMutation.isPending || bulkDecideMutation.isPending}
              onClick={confirmReject}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
