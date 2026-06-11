"use client";

import React from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export function toastPermissionDenied(message: string) {
  toast.error(message, {
    icon: <Lock className="size-4" style={{ color: "#DC2626" }} />,
    style: {
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
    },
  });
}
