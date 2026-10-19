"use client";

import { useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileIdentityFields } from "@/components/organisms/profile/ProfileIdentityFields";
import { isValidWebsiteUrl } from "@/utils/utils";

export function CreateBusinessTemplate({
  form,
  locationsLoading,
  isSubmitting,
  onSubmitCreate,
  onCancel,
  isPitch = false,
  initialFieldsLocked = false,
  websiteLocked = false,
}: {
  form: any;
  locationsLoading: boolean;
  isSubmitting: boolean;
  onSubmitCreate: () => void;
  onCancel: () => void;
  isPitch?: boolean;
  initialFieldsLocked?: boolean;
  websiteLocked?: boolean;
}) {
  const values = useStore(form.store, (state: any) => state.values);
  const disabled =
    isSubmitting ||
    locationsLoading ||
    !isValidWebsiteUrl(values.website) ||
    !values.businessName?.trim() ||
    !values.primaryLocation?.trim() ||
    !values.serviceAreaType;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumbs={
          isPitch
            ? [
                { label: "Home", href: "/" },
                { label: "Pitches", href: "/pitches" },
                { label: "Create pitch" },
              ]
            : [
                { label: "Home", href: "/" },
                { label: "Create business" },
              ]
        }
        showAskMassic={false}
      />
      <div className="flex min-h-0 flex-1 overflow-y-auto p-5">
        <Card className="mx-auto my-auto w-full max-w-[490px] shrink-0 gap-0 py-0 shadow-none">
          <form
            className="flex flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              if (!disabled) onSubmitCreate();
            }}
          >
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <h1 className="text-2xl font-medium">
                {isPitch ? "Create pitch" : "Add a business"}
              </h1>
              <p className="mt-2 text-sm text-general-muted-foreground">
                Add the basics. You can fill in offerings and competitors
                next.
              </p>
            </div>
            <fieldset
              disabled={isSubmitting}
              className="min-w-0 px-5 py-5 sm:px-6"
            >
              <ProfileIdentityFields
                form={form}
                disabled={isSubmitting}
                deriveName
                initialFieldsLocked={initialFieldsLocked}
                websiteLocked={websiteLocked}
              />
            </fieldset>
            <div className="flex gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={disabled}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting
                  ? "Creating…"
                  : isPitch
                    ? "Create pitch"
                    : "Create business"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
