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
import type { CreateProgramRequest, ProgramDetailDto } from "@/lib/types"

const schema = z.object({
  name: z.string().min(1, "Program adı zorunludur."),
  description: z.string().optional(),
  baslangicTarihi: z.string().optional(),
  bitisTarihi: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ProgramCreatePage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const payload: CreateProgramRequest = {
        name: values.name,
        description: values.description || undefined,
        baslangicTarihi: values.baslangicTarihi ? new Date(values.baslangicTarihi).toISOString() : undefined,
        bitisTarihi: values.bitisTarihi ? new Date(values.bitisTarihi).toISOString() : undefined,
      }
      const res = await api.post<ProgramDetailDto>("/programs", payload)
      toast.success("Program oluşturuldu.")
      navigate(`/programlar/${res.data.id}`)
    } catch (error) {
      setError("root", { message: extractErrorMessage(error, "Program oluşturulamadı.") })
    }
  }

  return (
    <div>
      <BackLink to="/programlar" label="Programlara dön" />
      <PageHeader
        eyebrow="T3 Girişim Ekosistemi"
        title="Yeni Program"
        subtitle="T3 Vakfı ekosistemi için yeni bir girişimcilik programı oluşturun."
      />

      <Card className="max-w-xl">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Program Adı</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" rows={4} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="baslangicTarihi">Başlangıç Tarihi</Label>
                <Input id="baslangicTarihi" type="date" {...register("baslangicTarihi")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bitisTarihi">Bitiş Tarihi</Label>
                <Input id="bitisTarihi" type="date" {...register("bitisTarihi")} />
              </div>
            </div>

            <Button type="submit" className="bg-role-accent text-white hover:bg-role-accent-dark" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor…" : "Programı Oluştur"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
