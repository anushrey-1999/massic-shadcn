"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDollarSign,
  Factory,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdminAuthBoundary } from "../auth/admin-auth-boundary";
import { useAdminAuthStore } from "../auth/admin-auth-store";
import { logoutAdminSession } from "../api/admin-api";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  {
    href: "/admin/network-performance",
    label: "Network performance",
    icon: Network,
  },
  { href: "/admin/growth", label: "Growth", icon: ChartNoAxesCombined },
  { href: "/admin/api-cost", label: "API cost", icon: CircleDollarSign },
  { href: "/admin/industry", label: "Industry", icon: Factory },
  { href: "/admin/category-insights", label: "Category insights", icon: Boxes },
  {
    href: "/admin/platform-totals",
    label: "Platform totals",
    icon: UsersRound,
  },
  { href: "/admin/subscription", label: "Subscription", icon: BarChart3 },
];

function NavContent({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAdminAuthStore((state) => state.user);
  const clearAdminAuth = useAdminAuthStore((state) => state.clear);
  const logout = useMutation({
    mutationFn: logoutAdminSession,
    onSettled: () => {
      clearAdminAuth();
      queryClient.removeQueries({ queryKey: ["admin"] });
      router.replace("/admin/login");
    },
  });

  return (
    <div className="admin-sidebar-surface flex h-full flex-col overflow-hidden text-white">
      <div
        className={cn(
          "flex h-[52px] items-center border-b border-white/10 transition-[padding] duration-300",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link
          href="/admin"
          aria-label={collapsed ? "Massic admin overview" : undefined}
          className={cn(
            "group flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
            collapsed ? "justify-center" : "gap-2",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-white/40 bg-white shadow-xs transition-transform duration-200 group-hover:scale-[1.03]">
            <Image
              src="/massic-icon-green.svg"
              alt=""
              width={19}
              height={20}
              className="h-5 w-auto shrink-0"
              priority
            />
          </span>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-sm font-medium text-white transition-all duration-200",
              collapsed
                ? "max-w-0 -translate-x-1 opacity-0"
                : "max-w-16 opacity-100",
            )}
          >
            Massic
          </span>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap rounded border border-white/15 bg-white/10 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70 transition-all duration-200",
              collapsed
                ? "max-w-0 border-0 px-0 py-0 opacity-0"
                : "max-w-14 px-1.5 py-0.5 opacity-100",
            )}
          >
            Admin
          </span>
        </Link>
      </div>
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-4 transition-[padding] duration-300",
          collapsed ? "px-2" : "px-3",
        )}
        aria-label="Admin navigation"
      >
        <p
          className={cn(
            "overflow-hidden px-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white/50 transition-all duration-200",
            collapsed ? "mb-0 h-0 opacity-0" : "mb-2 h-4 opacity-100",
          )}
        >
          Network
        </p>
        <div className="space-y-1">
          {navigation.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2 rounded-md border border-transparent px-3 text-sm text-white/72 transition-all duration-200 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  collapsed && "justify-center gap-0 px-0",
                  active &&
                    "border-white/12 bg-white/14 font-medium text-white shadow-xs",
                )}
              >
                <Icon
                  className="size-4 transition-transform duration-200 group-hover:scale-105"
                  strokeWidth={1.5}
                />
                <span
                  className={cn(
                    "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200",
                    collapsed
                      ? "max-w-0 opacity-0"
                      : "max-w-40 flex-1 opacity-100",
                  )}
                >
                  {item.label}
                </span>
                {active && !collapsed && (
                  <ChevronRight className="size-3.5 text-white/70" />
                )}
              </Link>
            );
            if (!collapsed) return navLink;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
      <div
        className={cn(
          "border-t border-white/10 transition-[padding] duration-300",
          collapsed ? "p-2" : "p-3",
        )}
      >
        {onToggle && (
          <Button
            variant="ghost"
            className={cn(
              "h-8 w-full font-normal text-white/65 transition-all hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center px-0" : "justify-start px-3",
            )}
            aria-label={
              collapsed
                ? "Expand admin navigation"
                : "Collapse admin navigation"
            }
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-200",
                collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100",
              )}
            >
              Collapse menu
            </span>
          </Button>
        )}
        <p
          className={cn(
            "truncate text-xs text-white/55 transition-all duration-200",
            collapsed ? "h-0 px-0 opacity-0" : "mt-2 h-4 px-3 opacity-100",
          )}
        >
          {user?.email || "Super admin"}
        </p>
        <Button
          variant="ghost"
          className={cn(
            "mt-1 h-8 w-full font-normal text-white/65 transition-all hover:bg-white/10 hover:text-white",
            collapsed ? "justify-center px-0" : "justify-start px-3",
          )}
          disabled={logout.isPending}
          aria-label={
            collapsed
              ? logout.isPending
                ? "Signing out"
                : "Sign out"
              : undefined
          }
          title={collapsed ? "Sign out" : undefined}
          onClick={() => logout.mutate()}
        >
          {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-200",
              collapsed ? "max-w-0 opacity-0" : "max-w-28 opacity-100",
            )}
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </span>
        </Button>
      </div>
    </div>
  );
}

function humanizeSegment(segment: string) {
  return segment
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOpaqueIdentifier(segment: string) {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(segment);
}

function breadcrumbItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  if (!segments.length) return [{ label: "Overview" }];
  if (segments[0] === "businesses" && segments[1]) {
    return [
      { label: "Businesses", href: "/admin/businesses" },
      { label: "Business snapshot" },
    ];
  }
  if (segments[0] === "agencies" && segments[1]) {
    return [
      { label: "Businesses", href: "/admin/businesses" },
      { label: "Agency snapshot" },
    ];
  }
  const finalSegment = segments.at(-1) || "admin";
  return [
    {
      label: isOpaqueIdentifier(finalSegment)
        ? "Details"
        : humanizeSegment(finalSegment),
    },
  ];
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem("massic-admin-sidebar-collapsed") === "true",
    );
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        "massic-admin-sidebar-collapsed",
        String(next),
      );
      return next;
    });
  };

  const crumbs = breadcrumbItems(pathname);
  return (
    <AdminAuthBoundary>
      <div className="admin-page-surface flex min-h-screen max-w-[100vw] overflow-x-hidden text-general-foreground">
        <aside
          className={cn(
            "admin-sidebar-frame fixed inset-y-0 left-0 z-30 hidden border-r border-general-primary/20 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
            collapsed ? "w-16" : "w-[216px]",
          )}
        >
          <NavContent collapsed={collapsed} onToggle={toggleSidebar} />
        </aside>
        <div
          className={cn(
            "admin-content-frame w-0 min-w-0 max-w-full flex-1 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            collapsed ? "lg:pl-16" : "lg:pl-[216px]",
          )}
        >
          <header className="sticky top-0 z-20 flex h-[52px] items-center border-b border-general-border/80 bg-white/80 px-4 shadow-[0_1px_0_rgba(10,10,10,0.02)] backdrop-blur-xl sm:px-5 lg:px-7">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mr-2 lg:hidden"
                  aria-label="Open admin navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] gap-0 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Admin navigation</SheetTitle>
                  <SheetDescription>
                    Navigate the Massic admin portal.
                  </SheetDescription>
                </SheetHeader>
                <NavContent />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm">
              <Link
                href="/admin"
                className="shrink-0 text-general-muted-foreground transition-colors hover:text-general-primary"
              >
                Admin
              </Link>
              {crumbs.map((crumb) => (
                <span
                  key={`${crumb.href || "current"}-${crumb.label}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="text-general-border-four">/</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="truncate text-general-muted-foreground transition-colors hover:text-general-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-general-muted-foreground">
              <span className="hidden sm:inline">Read-only</span>
              <span
                className="admin-live-dot size-2 rounded-full bg-emerald-500"
                aria-label="Admin access active"
              />
            </div>
          </header>
          <main className="admin-page-surface min-h-[calc(100vh-52px)] w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-5 lg:p-7">
            <div
              key={pathname}
              className="admin-page-enter w-full min-w-0 max-w-full overflow-x-clip"
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminAuthBoundary>
  );
}

export function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login")
    return <AdminAuthBoundary>{children}</AdminAuthBoundary>;
  return <AdminShell>{children}</AdminShell>;
}
