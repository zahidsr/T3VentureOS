/**
 * AI çıktısı madde işaretli düz metin döner ve kalın vurgu için ** kullanır. Markdown motoru
 * kurmak yerine satırları listeye çeviririz; aksi hâlde ekranda ham "* **Başlık:**" görünür.
 */
export function aiMaddeleriniAyir(metin: string): string[] {
  return metin
    .split("\n")
    .map((satir) => satir.trim().replace(/^[*\-•]\s*/, "").replace(/\*\*/g, ""))
    .filter(Boolean)
}
