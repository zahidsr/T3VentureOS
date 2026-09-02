import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { BackLink } from "@/components/patterns/BackLink"
import { PageHeader } from "@/components/patterns/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, extractErrorMessage } from "@/lib/api-client"
import type { GirisimDetailDto } from "@/lib/types"

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

const schema = z.object({
  ad: z.string().min(1, "Girişim adı zorunludur."),
  sektor: optionalText,
  kisaTanim: optionalText,
  teknoloji: optionalText,
  websiteUrl: optionalText,
  kurulusYili: optionalNumber,
  ekipBuyuklugu: optionalNumber,
})

type FormValues = z.input<typeof schema>

export default function GirisimCreatePage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const payload = schema.parse(values)
      const res = await api.post<GirisimDetailDto>("/girisimler", payload)
      toast.success("Girişim oluşturuldu.")
      navigate(`/girisimler/${res.data.id}`)
    } catch (error) {
      toast.error(extractErrorMessage(error, "Girişim oluşturulamadı."))
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to="/girisimler" label="Girişimlere dön" />
      <PageHeader eyebrow="Girişim Ekosistemi" title="Yeni Girişim" subtitle="Yeni bir girişim profili oluşturun." />

      <Card>
        <CardContent>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" className="bg-t3-blue text-white hover:bg-t3-blue-dark" disabled={isSubmitting}>
                {isSubmitting ? "Kaydediliyor…" : "Girişimi Oluştur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
