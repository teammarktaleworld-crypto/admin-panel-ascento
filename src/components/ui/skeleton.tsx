import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-md bg-zinc-200/80 dark:bg-zinc-800/70", className)} {...props} />;
}
