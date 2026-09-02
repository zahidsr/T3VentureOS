import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function InitialsAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"

  return (
    <Avatar className="size-8">
      <AvatarFallback className="bg-t3-blue-light text-xs font-bold text-t3-blue">{initials}</AvatarFallback>
    </Avatar>
  )
}
