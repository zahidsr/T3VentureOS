import { aiMaddeleriniAyir } from "@/lib/ai-metni"

/** AI analiz metnini madde listesi olarak gösterir. */
export function AiMetni({ metin }: { metin: string }) {
  return (
    <ul className="space-y-2">
      {aiMaddeleriniAyir(metin).map((madde, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-role-accent" />
          <span>{madde}</span>
        </li>
      ))}
    </ul>
  )
}
