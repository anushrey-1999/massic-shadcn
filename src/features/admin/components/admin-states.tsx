import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPageLoading() {
  return (
    <div
      className="admin-page-enter space-y-5"
      role="status"
      aria-label="Loading admin dashboard"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[126px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

export function AdminErrorState({
  message,
  onRetry,
  pending,
}: {
  message?: string;
  onRetry: () => void;
  pending?: boolean;
}) {
  return (
    <div
      className="admin-panel flex min-h-72 flex-col items-center justify-center rounded-lg border p-6 text-center"
      role="alert"
    >
      <AlertTriangle className="size-6 text-destructive" />
      <h2 className="mt-3 text-sm font-medium">Unable to load admin data</h2>
      <p className="mt-1 max-w-md text-sm text-general-muted-foreground">
        {message || "The service did not return a usable response."}
      </p>
      <Button
        variant="outline"
        className="mt-4"
        disabled={pending}
        onClick={onRetry}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}

export function AdminEmptyState({
  title = "No data in this range",
  description = "Try another date range or remove a filter.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-general-primary/8 text-general-primary">
        <Inbox className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-general-muted-foreground">
        {description}
      </p>
    </div>
  );
}
