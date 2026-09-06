import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GirisimAraclari } from "./GirisimAraclari"
import { api } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  api: { get: vi.fn(), put: vi.fn() },
  extractErrorMessage: (_e: unknown, fallback: string) => fallback,
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const week = { haftaBaslangici: "2026-09-07", buHafta: "2026-09-07", hedefler: [{ baslik: "", tamamlandi: false }, { baslik: "", tamamlandi: false }, { baslik: "", tamamlandi: false }] }
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><GirisimAraclari girisimId="startup-one" /></QueryClientProvider>)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.get).mockImplementation(async url => ({ data: url?.endsWith("/nakit") ? {} : week }))
})
afterEach(cleanup)

describe("Girişimci araçları", () => {
  it("nakit değerlerini kaydeder ve sonucu gösterir", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { plan: { kasadakiPara: 120000, aylikGelir: 10000, aylikGider: 30000, version: "v1", updatedAt: "2026-09-07T09:00:00Z" } } })
    mount()
    fireEvent.change(await screen.findByLabelText("Kasadaki para"), { target: { value: "120000" } })
    fireEvent.change(screen.getByLabelText("Aylık gelir"), { target: { value: "10000" } })
    fireEvent.change(screen.getByLabelText("Aylık gider"), { target: { value: "30000" } })
    expect(screen.getByText("6 ay")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Gideri %0 azaltırsam"), { target: { value: "20" } })
    expect(screen.getByText(/8,6 ay/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Nakit planını kaydet" }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/girisimler/benim/araclar/nakit", { kasadakiPara: 120000, aylikGelir: 10000, aylikGider: 30000, version: null }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Nakit planını kaydet" })).toBeDisabled())
  })

  it("boş hedefin tamamlanmasını engeller, düzenlerken haftayı kilitler, kaydeder", async () => {
    vi.mocked(api.put).mockImplementation(async (_url, body) => ({ data: { ...week, hedefler: (body as { hedefler: typeof week.hedefler }).hedefler, version: "v1" } }))
    mount()
    const input = await screen.findByLabelText("1. hedef")
    const checkbox = screen.getByRole("checkbox", { name: "1. hedef tamamlandı" })
    expect(checkbox).toBeDisabled()
    fireEvent.change(input, { target: { value: "Müşteri görüşmesi" } })
    fireEvent.click(checkbox)
    expect(screen.getByText("1/3 tamamlandı")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Önceki hafta" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Hedefleri kaydet" }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/girisimler/benim/araclar/hedefler/2026-09-07", { hedefler: [{ baslik: "Müşteri görüşmesi", tamamlandi: true }, { baslik: "", tamamlandi: false }, { baslik: "", tamamlandi: false }], version: null }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Önceki hafta" })).toBeEnabled())
  })

  it("kayıt hatasında girilen değerleri korur", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("offline"))
    mount()
    fireEvent.change(await screen.findByLabelText("1. hedef"), { target: { value: "Demo hazırla" } })
    fireEvent.click(screen.getByRole("button", { name: "Hedefleri kaydet" }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getByLabelText("1. hedef")).toHaveValue("Demo hazırla")
    expect(screen.getByRole("button", { name: "Hedefleri kaydet" })).toBeEnabled()
  })
})
