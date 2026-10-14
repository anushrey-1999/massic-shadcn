"use client";

import { useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/molecules/PageHeader";
import { CombinedProfileForm } from "@/components/organisms/profile/CombinedProfileForm";
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
}: {
  form: any;
  locationsLoading: boolean;
  isSubmitting: boolean;
  onSubmitCreate: () => void;
  onCancel: () => void;
  isPitch?: boolean;
  initialFieldsLocked?: boolean;
}) {
  const values = useStore(form.store, (state: any) => state.values);
  const disabled =
    isSubmitting ||
    locationsLoading ||
    !isValidWebsiteUrl(values.website) ||
    !values.businessName?.trim() ||
    !values.primaryLocation?.trim() ||
    !values.serviceAreaType;

  if (!isPitch) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Create business" },
          ]}
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
                <h1 className="text-2xl font-medium">Add a business</h1>
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
                  {isSubmitting ? "Creating…" : "Create business"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }

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
            : [{ label: "Home", href: "/" }, { label: "Create business" }]
        }
      />
      <div className="flex min-h-0 flex-1 p-5">
        <Card className="flex min-h-0 w-full max-w-[1224px] flex-col gap-0 overflow-hidden py-0">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitCreate();
            }}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-general-primary-foreground px-4 py-4 sm:px-6">
              <div>
                <h1 className="text-lg font-medium">
                  {isPitch ? "Create pitch" : "Create business"}
                </h1>
                <p className="mt-1 text-sm text-general-muted-foreground">
                  Add the business details. Offerings and competitors are
                  optional.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={disabled}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {isSubmitting
                    ? "Creating…"
                    : isPitch
                      ? "Create pitch"
                      : "Create business"}
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <CombinedProfileForm
                form={form}
                disabled={isSubmitting}
                deriveName
                initialFieldsLocked={initialFieldsLocked}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
