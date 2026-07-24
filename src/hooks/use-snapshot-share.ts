"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { copyToClipboard } from "@/utils/clipboard";

const shareResponseSchema = z
  .object({
    sharePath: z.string().startsWith("/snapshot#"),
  })
  .strict();

async function copyShareUrl(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (!(await copyToClipboard(value))) {
    throw new Error("Clipboard unavailable");
  }
}

export function useSnapshotShare() {
  return useMutation<string, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      const response = await fetch("/api/snapshot-shares", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error("Unable to create share link");
      }

      const payload: unknown = await response.json();
      const { sharePath } = shareResponseSchema.parse(payload);
      const shareUrl = new URL(sharePath, window.location.origin).toString();
      await copyShareUrl(shareUrl);
      return shareUrl;
    },
    onSuccess: () => {
      toast.success("Share link copied");
    },
    onError: () => {
      toast.error("Could not create share link", {
        description: "Please try again.",
      });
    },
  });
}
