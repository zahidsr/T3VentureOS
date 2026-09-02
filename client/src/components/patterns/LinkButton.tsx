import { Link, type LinkProps } from "react-router-dom"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The installed Button primitive (Base UI) doesn't support Radix-style `asChild`, so
 * this renders `buttonVariants()` directly onto a router `<Link>` instead of `<Button asChild>`.
 */
type LinkButtonProps = LinkProps & VariantProps<typeof buttonVariants> & { className?: string }

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
