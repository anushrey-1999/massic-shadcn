"use client";

// Hallmark · component: connection panel · genre: modern-minimal · theme: Massic · v2.0.0
import { useId, useState } from "react";
import { Check, Loader2, LockKeyhole } from "lucide-react";

import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { GoogleIcon } from "@/components/organisms/access-request/GoogleIcon";
import {
  SIGNUP_PROGRESS_STEPS,
  SignupStepHeader,
} from "@/components/organisms/signup/FreeBusinessSignupSteps";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoogleAccountAvatar } from "@/components/molecules/GoogleAccountAvatar";
import { CustomSelect } from "@/components/molecules/settings/CustomSelect";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { useAgencyInfo } from "@/hooks/use-agency-settings";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { useUnlinkGoogleAccount } from "@/hooks/use-unlink-google-account";
import {
  type GA4Property,
  type GBPLocation,
  type GoogleAccountOption,
  type LinkedBusiness,
  useCreateAgencyBusiness,
  useFetchBusinesses,
  useLinkPropertyId,
} from "@/hooks/use-linked-businesses";
import { apiErrorMessage } from "@/lib/api-error";
import { gbpLocationId, gbpLocations } from "@/lib/business-locations";
import { normalizeDomainForFavicon } from "@/utils/utils";
import { hasRequiredGscAccess } from "@/utils/gsc-permissions";
import type { SignupDataSource } from "@/store/signup-store";

const SOURCES: SignupDataSource[] = ["gsc", "ga4", "gbp"];
const NO_LOCATION = "no-location-exist";

type Selections = { gsc: string; ga4: string; gbp: string[] };

function selectionId(authId: string | null | undefined, resourceId: string) {
  return JSON.stringify([authId ?? "", resourceId]);
}

function selectionAuthId(value: string) {
  return value && value !== NO_LOCATION ? (JSON.parse(value) as [string, string])[0] : "";
}

export function FreeBusinessConnectionPanel({
  businessId,
  website,
  onContinue,
  onSaved,
  googleReturnPath = "/signup",
}: {
  businessId: string;
  website: string;
  onContinue?: () => void;
  onSaved?: () => void;
  googleReturnPath?: string;
}) {
  const isOnboarding = Boolean(onContinue);
  const panelId = useId();
  const { connectGoogleAccountFrom } = useGoogleAccounts();
  const { agencyDetails } = useAgencyInfo();
  const linkedBusinesses = useFetchBusinesses();
  const { profileData, profileDataLoading, profileDataError, refetchProfile } =
    useBusinessProfileById(businessId);
  const createBusiness = useCreateAgencyBusiness();
  const linkProperty = useLinkPropertyId();
  const unlinkGoogleAccount = useUnlinkGoogleAccount();
  const [draft, setDraft] = useState<Selections | null>(null);
  const [disconnectAccount, setDisconnectAccount] = useState<GoogleAccountOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [disconnectError, setDisconnectError] = useState("");
  const [status, setStatus] = useState("");

  const data = linkedBusinesses.data;
  const googleAccounts = data?.googleAccounts ??
    (Array.isArray(agencyDetails) ? agencyDetails.filter(account => account.AuthId).map(account => ({
      authId: account.AuthId,
      emailId: account.EmailId || account.DisplayName || null,
      profilePictureUrl: null,
    })) : []);
  const accountEmails = new Map(googleAccounts.map(account => [account.authId, account.emailId]));
  const accountLabel = (asset: { authId?: string; emailId?: string | null }) =>
    asset.emailId || accountEmails.get(asset.authId ?? "") || "Google account";

  const currentRow = data?.businesses.find(row => row.businessProfile?.UniqueId === businessId);
  const savedProfile = profileData ?? currentRow?.businessProfile;
  const siteUrl = savedProfile?.Website || website;
  const domain = normalizeDomainForFavicon(siteUrl);
  const gscById = new Map<string, LinkedBusiness>();
  for (const row of data?.allGSC ?? data?.businesses ?? []) {
    if (row.authId && row.siteUrl && hasRequiredGscAccess(row.permissionLevel)) {
      gscById.set(selectionId(row.authId, row.siteUrl), row);
    }
  }
  const savedGsc = savedProfile?.LinkedAuthId && savedProfile.GscIngestionStatus !== "disconnected"
    ? selectionId(savedProfile.LinkedAuthId, siteUrl)
    : "";
  const suggestedGsc = [...gscById].find(([, row]) => row.siteUrl === siteUrl)?.[0] ??
    [...gscById].find(([, row]) => normalizeDomainForFavicon(row.siteUrl) === domain)?.[0] ?? "";
  if (savedGsc && !gscById.has(savedGsc)) {
    gscById.set(savedGsc, { siteUrl, displayName: siteUrl, authId: savedProfile?.LinkedAuthId ?? "" });
  }

  const ga4ById = new Map<string, GA4Property>();
  for (const property of data?.allGA4 ?? []) {
    if (property.authId) ga4ById.set(selectionId(property.authId, property.propertyId), property);
  }
  const savedPropertyId = String(profileData?.PropertyId ?? currentRow?.selectedGa4?.propertyId ?? "");
  const savedGa4AuthId = savedProfile?.Ga4AuthId;
  const savedGa4 = savedGa4AuthId && savedPropertyId ? selectionId(savedGa4AuthId, savedPropertyId) : "";
  if (savedGa4 && !ga4ById.has(savedGa4)) {
    const selected = currentRow?.selectedGa4;
    ga4ById.set(savedGa4, {
      displayName: selected?.authId === savedGa4AuthId ? selected?.displayName || savedPropertyId : savedPropertyId,
      propertyId: savedPropertyId,
      authId: savedGa4AuthId ?? undefined,
      accountName: selected?.accountName || "",
      accountId: selected?.accountId || "",
    });
  }

  const gbpById = new Map<string, GBPLocation>();
  for (const location of data?.allGBP ?? []) {
    if (location.authId) gbpById.set(selectionId(location.authId, location.locationId), location);
  }
  const savedGbp = gbpLocations(savedProfile?.Locations).flatMap(location => {
    if (!location.AuthId) return [];
    const locationId = gbpLocationId(location);
    const key = selectionId(location.AuthId, locationId);
    const live = gbpById.get(key);
    gbpById.set(key, {
      authId: location.AuthId,
      emailId: live?.emailId,
      title: live?.title || location.DisplayName || locationId,
      locationId,
      location: location.Name,
      account: location.AccountName || live?.account,
      websiteUri: location.Url ?? undefined,
    });
    return [key];
  });
  const savedLocations = savedProfile?.NoLocationExist === true ? [NO_LOCATION] : savedGbp;
  const selection = draft ?? {
    gsc: savedGsc || (isOnboarding ? suggestedGsc : ""),
    ga4: savedGa4,
    gbp: savedLocations,
  };

  const gscChanged = selection.gsc !== savedGsc;
  const changes = {
    ga4: selection.ga4 !== savedGa4,
    gbp: selection.gbp.length !== savedLocations.length ||
      selection.gbp.some(key => !savedLocations.includes(key)),
  };
  const draftDirty = gscChanged || changes.ga4 || changes.gbp;
  const loading = linkedBusinesses.isLoading || profileDataLoading;
  const loadFailed = linkedBusinesses.isError || Boolean(profileDataError);
  const pending = saving || unlinkGoogleAccount.isPending;

  async function saveDraft() {
    if (!draftDirty) {
      onContinue?.();
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const gsc = gscById.get(selection.gsc);
      const selectedGa4 = ga4ById.get(selection.ga4);
      const noLocation = selection.gbp.includes(NO_LOCATION);
      const selectedGbp = selection.gbp.flatMap(key => {
        const location = gbpById.get(key);
        return location ? [location] : [];
      });
      if ((selection.ga4 && !selectedGa4) ||
          (!noLocation && selectedGbp.length !== selection.gbp.length)) {
        throw new Error("A selected Google source is unavailable. Choose it again.");
      }

      const connections = {
        selectedGa4,
        ga4Cleared: !selection.ga4,
        selectedGbp,
        noLocation,
        gbpCleared: !noLocation && !selectedGbp.length,
      };

      if (gscChanged && selection.gsc) {
        if (!gsc) throw new Error("Choose a Search Console property.");
        await createBusiness.mutateAsync({
          businesses: [{ ...gsc, title: gsc.title || gsc.displayName, ...connections }],
          mergeExisting: true,
          mergeTargetUniqueId: businessId,
          changes,
          suppressDuplicateToast: true,
          suppressErrorToast: true,
          suppressSuccessToast: true,
        });
      } else {
        await linkProperty.mutateAsync({
          business: {
            siteUrl,
            displayName: currentRow?.displayName || siteUrl,
            authId: "",
            businessProfile: { Id: String(savedProfile?.Id ?? ""), UniqueId: businessId, IsActive: savedProfile?.IsActive !== false },
            gscCleared: gscChanged && !selection.gsc,
            ...connections,
          },
          changes,
          suppressSuccessToast: true,
          suppressErrorToast: true,
        });
      }

      await Promise.all([linkedBusinesses.refetch(), refetchProfile()]);
      setDraft(null);
      setStatus("Data connections saved.");
      onSaved?.();
      onContinue?.();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Couldn’t save data connections. Try again."));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!disconnectAccount) return;
    const { authId } = disconnectAccount;
    setDisconnectError("");
    setStatus("");
    try {
      await unlinkGoogleAccount.mutateAsync({ authId });
      setDraft(previous => previous && {
        gsc: selectionAuthId(previous.gsc) === authId ? "" : previous.gsc,
        ga4: selectionAuthId(previous.ga4) === authId ? "" : previous.ga4,
        gbp: previous.gbp.filter(key => selectionAuthId(key) !== authId),
      });
      setStatus("Google account disconnected.");
      setDisconnectAccount(null);
    } catch (disconnectFailure) {
      setDisconnectError(apiErrorMessage(disconnectFailure, "Couldn’t disconnect this account. Try again."));
    }
  }

  function renderSourceSelector(source: SignupDataSource, lockReasonId?: string) {
    const label = PRODUCT_CONFIG[source].label;
    if (lockReasonId) {
      return (
        <Button
          type="button"
          variant="outline"
          disabled
          aria-label={label}
          aria-describedby={lockReasonId}
          className="min-h-10 w-full justify-between px-2 text-xs font-normal transition-none disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-general-border disabled:bg-muted/70 disabled:text-general-unofficial-foreground-alt disabled:opacity-100 disabled:shadow-none"
        >
          <span>Choose {label}</span>
          <LockKeyhole className="size-3.5 text-general-muted-foreground" aria-hidden="true" />
        </Button>
      );
    }

    const value = source === "gbp" ? selection.gbp : selection[source] ? [selection[source]] : [];
    const options = source === "gsc"
      ? [...gscById].map(([key, row]) => ({ value: key, label: `${row.displayName || row.siteUrl} (${accountLabel(row)})` }))
      : source === "ga4"
        ? [...ga4ById].map(([key, property]) => ({ value: key, label: `${property.displayName || property.propertyId} (${accountLabel(property)})` }))
        : [
            { value: NO_LOCATION, label: "No locations exist" },
            ...[...gbpById].map(([key, location]) => ({ value: key, label: `${location.title} (${accountLabel(location)})` })),
          ];
    const canSelect = source === "gsc" || Boolean(selection.gsc);
    return (
      <CustomSelect
        ariaLabel={label}
        options={canSelect ? options : options.filter(option => value.includes(option.value))}
        value={value}
        onChange={values => {
          setError("");
          setStatus("");
          if (source !== "gbp") {
            setDraft({ ...selection, [source]: values.at(-1) ?? "" });
            return;
          }
          const last = gbpById.get(values.at(-1) ?? "");
          setDraft({
            ...selection,
            gbp: last ? values.filter((key, index) =>
              index === values.length - 1 || gbpById.get(key)?.locationId !== last.locationId
            ) : values,
          });
        }}
        placeholder={`Choose ${label}`}
        searchPlaceholder={`Search ${label}`}
        emptyMessage={`No ${label} options available`}
        maxWidth="100%"
        disabled={pending || loading || loadFailed || !googleAccounts.length || (!canSelect && !value.length)}
        loading={loading}
        modal={!isOnboarding}
      />
    );
  }

  const savedBySource = { gsc: savedGsc, ga4: savedGa4, gbp: savedGbp.length > 0 };
  return (
    <>
      {isOnboarding && (
        <SignupStepHeader
          step={SIGNUP_PROGRESS_STEPS.connectData}
          title="Connect your data"
          description={selection.gsc
            ? "Add Analytics and Business Profile now, or later from Analytics."
            : "Choose Search Console to unlock Analytics and Business Profile."}
        />
      )}

      <div className="min-w-0 rounded-lg border border-general-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg bg-muted px-4 py-3">
          <h3 className="text-sm font-medium">Google accounts</h3>
          <Button
            type="button"
            variant={googleAccounts.length ? "outline" : "default"}
            className="min-h-11 focus-visible:ring-2 focus-visible:ring-general-foreground active:opacity-80 disabled:cursor-not-allowed"
            onClick={() => connectGoogleAccountFrom(googleReturnPath)}
            disabled={pending || loading}
          >
            <GoogleIcon className="size-4" />
            Add account
          </Button>
        </div>
        {googleAccounts.length ? (
          <ul className="max-h-52 divide-y divide-general-border overflow-y-auto border-t border-general-border">
            {googleAccounts.map(account => (
              <li key={account.authId} className="flex items-center gap-2 px-4 py-1 sm:gap-3">
                <GoogleAccountAvatar email={account.emailId} pictureUrl={account.profilePictureUrl} />
                <span className="min-w-0 flex-1 break-words text-xs sm:text-sm">{account.emailId || "Google account"}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-general-border-three text-general-unofficial-foreground-alt transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
                  onClick={() => {
                    setDisconnectError("");
                    setDisconnectAccount(account);
                  }}
                  disabled={pending || loading}
                  aria-label={`Disconnect ${account.emailId || "Google account"}`}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-general-border px-4 py-3 text-sm text-muted-foreground">
            {loading ? "Loading Google accounts…" : "Add the Google account that has your Search Console property."}
          </p>
        )}
        {SOURCES.map(source => {
          const locked = !loading && !loadFailed && !selection.gsc &&
            (source === "ga4" ? !selection.ga4 : source === "gbp" && !selection.gbp.length);
          const lockReasonId = locked ? `${panelId}-${source}-lock-reason` : undefined;
          return (
            <div
              key={source}
              className="grid min-w-0 items-center gap-2 border-t border-general-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,280px)]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <ProductIcon product={source} size={20} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{PRODUCT_CONFIG[source].label}</p>
                  {locked ? (
                    <p id={lockReasonId} className="text-xs text-muted-foreground">Choose Search Console first</p>
                  ) : savedBySource[source] ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3" aria-hidden="true" />
                      Connected
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">{renderSourceSelector(source, lockReasonId)}</div>
            </div>
          );
        })}
      </div>

      {(error || loadFailed) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error || "Couldn’t load Google connections."}
          {loadFailed && (
            <Button type="button" variant="link" onClick={() => void Promise.all([linkedBusinesses.refetch(), refetchProfile()])}>
              Try again
            </Button>
          )}
        </p>
      )}
      {status && <p role="status" className="mt-3 text-sm text-muted-foreground">{status}</p>}
      <div className={`flex items-center gap-2 ${isOnboarding ? "justify-between p-4" : "justify-end pt-4"}`}>
        {isOnboarding && (
          <Button type="button" variant="ghost" onClick={onContinue} disabled={pending}>
            Skip for now
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void saveDraft()}
          disabled={pending || loading || loadFailed || (isOnboarding ? !selection.gsc : !draftDirty)}
        >
          {saving && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : isOnboarding ? "Continue" : "Save changes"}
        </Button>
      </div>

      <AlertDialog open={Boolean(disconnectAccount)} onOpenChange={open => {
        if (!open && !unlinkGoogleAccount.isPending) setDisconnectAccount(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the data connections that use {disconnectAccount?.emailId || "this Google account"}.
              Your business profile stays in Massic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disconnectError && <p role="alert" className="text-sm text-destructive">{disconnectError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkGoogleAccount.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlinkGoogleAccount.isPending}
              onClick={event => {
                event.preventDefault();
                void disconnect();
              }}
            >
              {unlinkGoogleAccount.isPending ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
