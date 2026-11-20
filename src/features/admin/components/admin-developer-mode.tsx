"use client";

import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getAdminDeveloperMode,
  setAdminDeveloperMode,
  type DeveloperModeTarget,
} from "../api/admin-api";

export function AdminDeveloperMode({
  target,
  id,
}: {
  target: DeveloperModeTarget;
  id: string;
}) {
  const descriptionId = useId();
  const switchId = useId();
  const client = useQueryClient();
  const queryKey = ["admin", "developer-mode", target, id];
  const query = useQuery({
    queryKey,
    queryFn: () => getAdminDeveloperMode(target, id),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      setAdminDeveloperMode(target, id, enabled),
    retry: false,
    onSuccess: async (settings) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, settings);
      if (target === "agencies") {
        void client.invalidateQueries({
          queryKey: ["admin", "developer-mode", "businesses"],
        });
      }
    },
  });

  let description =
    target === "agencies"
      ? "Show the Requests drawer across this account and all its businesses."
      : "Show the Requests drawer in this business.";
  if (target === "businesses" && query.data?.accountEnabled) {
    description =
      "Enabled by the account. This switch controls the separate business setting.";
  }

  return (
    <section className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-general-border bg-background px-4 py-3">
      <div className="min-w-0 space-y-1">
        <label htmlFor={switchId} className="text-sm font-medium">
          Developer Mode
        </label>
        <p id={descriptionId} className="text-xs text-general-muted-foreground">
          {description}
        </p>
        {mutation.isError && (
          <p role="alert" className="text-xs text-destructive">
            Couldn’t save the setting.
          </p>
        )}
        {query.isError && (
          <p role="alert" className="text-xs text-destructive">
            Couldn’t load the setting.
          </p>
        )}
        <p
          aria-live="polite"
          className="text-xs text-general-muted-foreground empty:hidden"
        >
          {mutation.isPending ? "Saving…" : mutation.isSuccess ? "Saved." : ""}
        </p>
      </div>
      {query.isError || mutation.isError ? (
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching || mutation.isPending}
          onClick={() =>
            query.isError
              ? void query.refetch()
              : mutation.mutate(mutation.variables!)
          }
        >
          {query.isFetching ? "Loading…" : "Retry"}
        </Button>
      ) : (
        <Switch
          id={switchId}
          aria-describedby={descriptionId}
          checked={
            mutation.isPending
              ? mutation.variables
              : (query.data?.enabled ?? false)
          }
          disabled={!query.data || mutation.isPending}
          onCheckedChange={(enabled) => mutation.mutate(enabled)}
        />
      )}
      {query.isPending && (
        <span className="sr-only" role="status">
          Loading Developer Mode…
        </span>
      )}
    </section>
  );
}
