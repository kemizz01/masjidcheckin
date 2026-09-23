import { cn } from "@/lib/utils";

/**
 * Skeleton
 *
 * A reusable shimmer placeholder for async content loading states.
 * Drop-in replacement for any rectangular element (text lines, avatars,
 * cards, etc.). Uses the global `.skeleton` utility from `globals.css`.
 *
 * @example
 *   <Skeleton className="h-4 w-48" />       // single line
 *   <Skeleton className="h-20 w-full" />    // card placeholder
 *   <Skeleton className="h-12 w-12 rounded-full" />  // avatar
 */
export default function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("skeleton", className)} />;
}