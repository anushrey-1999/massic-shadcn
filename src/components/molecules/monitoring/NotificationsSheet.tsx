"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ListFilter, Loader2, RefreshCw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { monitoringErrorMessage } from "@/hooks/use-monitoring-screen";
import {
  useMarkAllNotificationsSeen,
  useMarkNotificationSeen,
  useNotificationCount,
  useNotifications,
  type MonitoringNotification,
  type NotificationFilters,
  type NotificationGroup,
  type NotificationPanel,
  type NotificationScope,
} from "@/hooks/use-monitoring-notifications";
import { BusinessFavicon, formatChartDate, NotificationBell } from "./monitoring-ui";

/** Rows a group shows before "Show N more from …". */
const GROUP_PREVIEW = 2;

const EMPTY_FILTERS: NotificationFilters = { businessId: null, types: [], unreadOnly: false };

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: NotificationScope;
}

/** Notifications sheet (Figma 7116:79331): the account bell and the business bell share it. */
export function NotificationsSheet({ open, onOpenChange, scope }: NotificationsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="w-full gap-4 border-general-border p-6 sm:max-w-[520px]"
      >
        <NotificationsBody scope={scope} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

const ACCOUNT_SCOPE: NotificationScope = { kind: "account" };

/** The account bell next to "Massic" in the sidebar: every business on the account. */
export function AccountNotifications({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const count = useNotificationCount(ACCOUNT_SCOPE);

  return (
    <>
      <NotificationBell
        unread={count.data ?? 0}
        bordered={false}
        className={cn("size-8", className)}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      />
      <NotificationsSheet open={open} onOpenChange={setOpen} scope={ACCOUNT_SCOPE} />
    </>
  );
}

/** The sheet unmounts its content when closed, so filters and tabs reset every time. */
function NotificationsBody({ scope, onClose }: { scope: NotificationScope; onClose: () => void }) {
  const router = useRouter();
  const [filters, setFilters] = useState<NotificationFilters>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const query = useNotifications(scope, filters, true);
  const markSeen = useMarkNotificationSeen();
  const markAll = useMarkAllNotificationsSeen();
  const panel = query.data;

  const isAccount = scope.kind === "account";
  const hasFilters = Boolean(filters.businessId) || filters.types.length > 0;
  const businessName = (id: string) => panel?.businesses.find((business) => business.id === id)?.name ?? "Business";
  const typeLabel = (key: string) => panel?.types.find((type) => type.key === key)?.label ?? key;

  const setBusiness = (businessId: string | null) => {
    setFilters((current) => ({ ...current, businessId }));
    setExpanded(new Set());
  };
  const toggleType = (key: string) =>
    setFilters((current) => ({
      ...current,
      types: current.types.includes(key) ? current.types.filter((type) => type !== key) : [...current.types, key],
    }));

  // The business's whole unread count, not the filtered one; unknown when a type filter narrows it.
  const businessUnseen = (group: NotificationGroup) => {
    if (isAccount) return panel?.businesses.find((business) => business.id === group.business.id)?.unseen;
    return filters.types.length ? undefined : panel?.unseen;
  };

  const openNotification = (group: NotificationGroup, item: MonitoringNotification) => {
    if (!item.seen) {
      markSeen.mutate({ businessId: group.business.id, notificationId: item.id, businessUnseen: businessUnseen(group) });
    }
    const params = new URLSearchParams();
    const range = item.cardRef?.range;
    if (range) {
      params.set("range", "custom");
      params.set("start", range.start);
      params.set("end", range.end);
    } else {
      params.set("range", "14");
    }
    if (item.cardRef?.cardId) params.set("card", item.cardRef.cardId);
    onClose();
    router.push(`/business/${group.business.id}/monitoring?${params.toString()}`);
  };

  const pendingId = markSeen.isPending ? markSeen.variables?.notificationId : null;
  const canMarkAll = Boolean(panel && panel.unseen > 0) && !markAll.isPending;

  return (
    <>
      <div className="flex shrink-0 items-center gap-0">
        <SheetTitle className="min-w-0 flex-1 text-xl leading-[1.2] font-semibold tracking-[-0.4px] text-general-foreground">
          Notifications
        </SheetTitle>
        <SheetDescription className="sr-only">
          {isAccount ? "Notifications for every business" : `Notifications for ${scope.name}`}
        </SheetDescription>
        <FilterMenu
          panel={panel}
          filters={filters}
          showBusiness={isAccount}
          active={hasFilters}
          onBusiness={setBusiness}
          onToggleType={toggleType}
        />
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Close">
            <X className="size-4" strokeWidth={1.5} />
          </Button>
        </SheetClose>
      </div>

      {hasFilters ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {filters.businessId ? (
            <FilterChip label={businessName(filters.businessId)} onRemove={() => setBusiness(null)} />
          ) : null}
          {filters.types.map((key) => (
            <FilterChip key={key} label={typeLabel(key)} onRemove={() => toggleType(key)} />
          ))}
          <button
            type="button"
            onClick={() => {
              setFilters((current) => ({ ...EMPTY_FILTERS, unreadOnly: current.unreadOnly }));
              setExpanded(new Set());
            }}
            className="rounded-[4px] px-1 text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Clear
          </button>
        </div>
      ) : null}

      <ReadTabs
        unreadOnly={filters.unreadOnly}
        unseen={panel?.unseen ?? null}
        onChange={(unreadOnly) => setFilters((current) => ({ ...current, unreadOnly }))}
      />

      <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
        {query.isLoading ? (
          <NotificationsSkeleton />
        ) : query.isError && !panel ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
              {monitoringErrorMessage(query.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} strokeWidth={1.5} />
              Try again
            </Button>
          </div>
        ) : panel && panel.groups.length === 0 ? (
          <p className="py-10 text-center text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
            {hasFilters ? panel.empty.filtered : filters.unreadOnly ? panel.empty.unread : panel.empty.all}
          </p>
        ) : panel ? (
          <div className={cn("flex flex-col gap-4 transition-opacity", query.isFetching && query.isPlaceholderData && "opacity-60")}>
            {panel.groups.map((group) => (
              <GroupCard
                key={group.business.id}
                group={group}
                expanded={
                  !isAccount ||
                  (Boolean(filters.businessId) && !query.isPlaceholderData) ||
                  expanded.has(group.business.id)
                }
                onExpand={() => setExpanded((current) => new Set(current).add(group.business.id))}
                onOnlyThis={isAccount && !filters.businessId ? () => setBusiness(group.business.id) : null}
                onOpen={(item) => openNotification(group, item)}
                pendingId={pendingId ?? null}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center pt-4">
        <Button
          variant="outline"
          className="min-h-9 gap-2 px-4"
          disabled={!canMarkAll}
          onClick={() => markAll.mutate({ scope, filters })}
        >
          {markAll.isPending ? (
            <Loader2 className="size-[13.25px] animate-spin" strokeWidth={1.5} />
          ) : (
            <Check className="size-[13.25px]" strokeWidth={1.5} />
          )}
          {panel?.markAll ?? "Mark all as read"}
        </Button>
      </div>
    </>
  );
}

function ReadTabs({
  unreadOnly,
  unseen,
  onChange,
}: {
  unreadOnly: boolean;
  unseen: number | null;
  onChange: (unreadOnly: boolean) => void;
}) {
  const tabs = [
    { key: false, label: "All" },
    { key: true, label: unseen === null ? "Unread" : `Unread · ${unseen}` },
  ];
  return (
    <div role="tablist" aria-label="Show" className="flex shrink-0 gap-1 rounded-[8px] bg-[#f5f5f5] p-1">
      {tabs.map((tab) => {
        const active = tab.key === unreadOnly;
        return (
          <button
            key={String(tab.key)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex min-h-[29px] flex-1 items-center justify-center rounded-[10px] px-2 py-1 text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap text-general-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "bg-white shadow-sm" : "hover:bg-black/5"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-[6px] bg-[#f5f5f5] py-[3px] pr-1.5 pl-2 text-sm leading-[1.5] tracking-[0.07px] text-general-foreground">
      <span className="max-w-[220px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex size-4 items-center justify-center rounded-[4px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-3.5" strokeWidth={1.5} />
      </button>
    </span>
  );
}

function FilterMenu({
  panel,
  filters,
  showBusiness,
  active,
  onBusiness,
  onToggleType,
}: {
  panel: NotificationPanel | undefined;
  filters: NotificationFilters;
  showBusiness: boolean;
  active: boolean;
  onBusiness: (businessId: string | null) => void;
  onToggleType: (key: string) => void;
}) {
  const [search, setSearch] = useState("");
  const businesses = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = panel?.businesses ?? [];
    return term ? list.filter((business) => business.name.toLowerCase().includes(term)) : list;
  }, [panel?.businesses, search]);
  const totalUnseen = (panel?.businesses ?? []).reduce((sum, business) => sum + business.unseen, 0);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setSearch("")}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", active && "bg-[#f5f5f5]")}
          aria-label="Filter notifications"
          disabled={!panel}
        >
          <ListFilter className="size-4" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[136px] rounded-[8px] p-1">
        {showBusiness ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="min-h-8 rounded-[6px] text-sm">Business</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-[260px] rounded-[8px] p-0">
                <div className="flex items-center gap-2 border-b border-general-border px-3 py-2">
                  <Search className="size-4 shrink-0 text-general-muted-foreground" strokeWidth={1.5} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Filter by business"
                    aria-label="Filter by business"
                    className="h-6 min-w-0 flex-1 bg-transparent text-sm leading-[1.5] tracking-[0.07px] text-general-foreground outline-none placeholder:text-general-muted-foreground"
                  />
                </div>
                <div className="max-h-[280px] overflow-y-auto p-1">
                  {search.trim() ? null : (
                    <DropdownMenuItem className="min-h-8 gap-2 rounded-[6px]" onSelect={() => onBusiness(null)}>
                      <ListFilter className="size-4 shrink-0" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate font-medium">{panel?.allBusinesses || "All businesses"}</span>
                      <UnreadCount value={totalUnseen} />
                      <Check className={cn("size-4 shrink-0", filters.businessId ? "invisible" : "")} strokeWidth={1.5} />
                    </DropdownMenuItem>
                  )}
                  {businesses.map((business) => (
                    <DropdownMenuItem
                      key={business.id}
                      className="min-h-8 gap-2 rounded-[6px]"
                      onSelect={() => onBusiness(business.id)}
                    >
                      <BusinessFavicon website={business.website} name={business.name} size={16} />
                      <span className="min-w-0 flex-1 truncate">{business.name}</span>
                      <UnreadCount value={business.unseen} />
                      <Check
                        className={cn("size-4 shrink-0", filters.businessId === business.id ? "" : "invisible")}
                        strokeWidth={1.5}
                      />
                    </DropdownMenuItem>
                  ))}
                  {businesses.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-general-muted-foreground">
                      {search.trim() ? "No businesses match" : "No businesses yet"}
                    </p>
                  ) : null}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="min-h-8 rounded-[6px] text-sm">Type</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-[220px] rounded-[8px] p-1">
              {(panel?.types ?? []).map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.key}
                  className="min-h-8 rounded-[6px]"
                  checked={filters.types.includes(type.key)}
                  onCheckedChange={() => onToggleType(type.key)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UnreadCount({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="shrink-0 text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
      {value} unread
    </span>
  );
}

function GroupCard({
  group,
  expanded,
  onExpand,
  onOnlyThis,
  onOpen,
  pendingId,
}: {
  group: NotificationGroup;
  expanded: boolean;
  onExpand: () => void;
  onOnlyThis: (() => void) | null;
  onOpen: (item: MonitoringNotification) => void;
  pendingId: string | null;
}) {
  const visible = expanded ? group.items : group.items.slice(0, GROUP_PREVIEW);
  const hidden = group.items.length - visible.length;

  return (
    <section className="overflow-hidden rounded-[8px] border border-general-border">
      <header className="flex min-h-[37px] items-center gap-2 bg-[#f5f5f5] px-3 py-1">
        <BusinessFavicon website={group.business.website} name={group.business.name} size={16} />
        <p className="min-w-0 flex-1 truncate text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-foreground">
          {group.business.name}
        </p>
        {onOnlyThis ? (
          <Button
            variant="ghost"
            className="min-h-8 shrink-0 gap-1.5 px-3 text-sm font-medium text-[#404040]"
            onClick={onOnlyThis}
          >
            <ListFilter className="size-[13.25px]" strokeWidth={1.5} />
            Only this business
          </Button>
        ) : null}
      </header>
      {visible.map((item) => (
        <NotificationRow
          key={item.id}
          item={item}
          pending={pendingId === item.id}
          onOpen={() => onOpen(item)}
        />
      ))}
      {hidden > 0 ? (
        <div className="border-t border-general-border px-3 py-2">
          <Button
            variant="ghost"
            className="min-h-8 gap-1.5 px-3 text-sm font-medium text-[#404040]"
            onClick={onExpand}
          >
            Show {hidden} more from {group.business.name}
            <ArrowRight className="size-[13.25px]" strokeWidth={1.5} />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function NotificationRow({
  item,
  pending,
  onOpen,
}: {
  item: MonitoringNotification;
  pending: boolean;
  onOpen: () => void;
}) {
  const unread = !item.seen;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={pending}
      className="flex w-full items-start gap-3 border-t border-general-border p-3 text-left transition-colors hover:bg-black/[0.02] focus-visible:bg-black/[0.03] focus-visible:outline-none disabled:opacity-60"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5]">
        <span
          className={cn(
            "text-sm tracking-[0.07px] text-general-foreground",
            unread ? "font-medium" : "font-normal"
          )}
        >
          {item.title}
        </span>
        <span className="text-xs tracking-[0.18px] text-general-muted-foreground">{item.subtitle}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
          {formatChartDate(item.sentDate)} · {item.tagLabel}
        </span>
        {unread ? <span className="size-2 rounded-full bg-red-500" aria-label="Unread" /> : null}
      </span>
    </button>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((group) => (
        <div key={group} className="overflow-hidden rounded-[8px] border border-general-border">
          <div className="flex items-center gap-2 bg-[#f5f5f5] px-3 py-2.5">
            <Skeleton className="size-4 rounded-[4px]" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-3 border-t border-general-border p-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
