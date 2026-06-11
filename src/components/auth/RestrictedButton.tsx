"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUserRole, usePermissions } from "@/hooks/use-permissions";
import { ANALYST_RESTRICTED_MESSAGE, type Permission } from "@/lib/permissions";
import { toastPermissionDenied } from "@/lib/toast-permission-denied";
import {
  canPerformFeatureAction,
  getFeatureActionConfig,
  getFeatureActionRestrictedMessage,
  type FeatureActionKey,
} from "@/lib/role-feature-actions";

interface RestrictedButtonProps extends React.ComponentProps<typeof Button> {
  permission?: Permission;
  featureAction?: FeatureActionKey;
  restrictedMessage?: string;
}

export const RestrictedButton = React.forwardRef<HTMLButtonElement, RestrictedButtonProps>(
  ({ permission, featureAction, restrictedMessage, onClick, disabled, ...props }, ref) => {
    const permissions = usePermissions();
    const role = useCurrentUserRole();
    const resolvedPermission = permission || (featureAction ? getFeatureActionConfig(featureAction).permission : null);
    const can = featureAction
      ? canPerformFeatureAction({ actionKey: featureAction, permissions, role })
      : resolvedPermission
        ? Boolean(permissions[resolvedPermission])
        : true;
    const message =
      restrictedMessage ||
      (featureAction ? getFeatureActionRestrictedMessage(featureAction) : ANALYST_RESTRICTED_MESSAGE);

    return (
      <Button
        ref={ref}
        disabled={disabled}
        onClick={(event) => {
          if (!can) {
            event.preventDefault();
            toastPermissionDenied(message);
            return;
          }
          onClick?.(event);
        }}
        {...props}
      />
    );
  }
);

RestrictedButton.displayName = "RestrictedButton";
