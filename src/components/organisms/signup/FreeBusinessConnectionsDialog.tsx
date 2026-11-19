"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FreeBusinessConnectionPanel } from "./FreeBusinessConnectionPanel";

const CONNECTIONS_PARAM = "connections";
const CONNECTIONS_OPEN = "open";

/**
 * Open state for the connections dialog. Google OAuth returns to the page with
 * `?connections=open`, so the dialog reopens where the user left off.
 */
export function useFreeBusinessConnectionsDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(
    () => searchParams.get(CONNECTIONS_PARAM) === CONNECTIONS_OPEN,
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next || !searchParams.has(CONNECTIONS_PARAM)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete(CONNECTIONS_PARAM);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return { open, onOpenChange };
}

interface FreeBusinessConnectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  website: string;
}

export function FreeBusinessConnectionsDialog({
  open,
  onOpenChange,
  businessId,
  website,
}: FreeBusinessConnectionsDialogProps) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl [&>button]:focus-visible:ring-general-foreground">
        <DialogHeader>
          <DialogTitle>Data connections</DialogTitle>
          <DialogDescription>
            Choose the optional Google sources used by Analytics.
          </DialogDescription>
        </DialogHeader>
        <FreeBusinessConnectionPanel
          businessId={businessId}
          website={website}
          googleReturnPath={`${pathname}?${CONNECTIONS_PARAM}=${CONNECTIONS_OPEN}`}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
