"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Loader2,
  UserPlus,
  X,
  Plus,
  ShieldCheck,
  BarChart3,
  Pencil,
  User,
  Mail,
  Clock,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useTeamSettings, TeamMember, type InviteResult } from "@/hooks/use-team-settings";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleOptions: Array<{
  value: "ANALYST" | "ADMIN";
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: "ANALYST",
    label: "Analyst",
    description: "Reports, snapshots, access requests",
    icon: BarChart3,
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Full account and billing access",
    icon: ShieldCheck,
  },
];

function MemberAvatar({ logo, name, email, size = 32 }: { logo?: string; name?: string; email?: string; size?: number }) {
  const [imgError, setImgError] = React.useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || email?.trim()?.charAt(0)?.toUpperCase() || "?";

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name || email || "avatar"}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0 text-xs"
    >
      {initial}
    </div>
  );
}

function RoleSelector({
  value,
  onChange,
  disabled,
}: {
  value: "ANALYST" | "ADMIN";
  onChange: (role: "ANALYST" | "ADMIN") => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {roleOptions.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "flex min-h-[76px] items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-general-border bg-white hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status?: "active" | "pending" }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
        <Clock className="h-3 w-3" />
        Invite Sent
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700 text-xs font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
      Active
    </Badge>
  );
}

export function TeamSettings() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "ANALYST">("ANALYST");

  const { user } = useAuthStore();
  const currentUserEmail = (user?.email || "").trim().toLowerCase();
  const {
    teamMembers,
    isLoadingTeamData,
    inviteMember,
    isInviting,
    removeMember,
    isRemoving,
    updateMemberRole,
    isUpdatingRole,
  } = useTeamSettings();

  // Invite state
  const [emailChips, setEmailChips] = React.useState<string[]>([]);
  const [emailInput, setEmailInput] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [inviteResults, setInviteResults] = React.useState<InviteResult[]>([]);
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  // Delete state
  const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null);

  // Edit role state
  const [memberToEdit, setMemberToEdit] = React.useState<TeamMember | null>(null);
  const [editRole, setEditRole] = React.useState<"ADMIN" | "ANALYST">("ANALYST");

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmails = (value: string) => {
    const candidates = value
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const invalidEmail = candidates.find((e) => !isValidEmail(e));
    if (invalidEmail) { setEmailError("Please enter a valid email address"); return; }

    const selfEmail = candidates.find((e) => e === currentUserEmail);
    if (selfEmail) { setEmailError("You cannot invite your own email address."); return; }

    const nextEmails = [...emailChips];
    const duplicate = candidates.find((e) => nextEmails.includes(e));
    candidates.forEach((e) => { if (!nextEmails.includes(e)) nextEmails.push(e); });

    if (duplicate && nextEmails.length === emailChips.length) {
      setEmailError("This email is already added");
      return;
    }
    setEmailChips(nextEmails);
    setEmailInput("");
    setEmailError("");
    if (inviteResults.length > 0) setInviteResults([]);
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key)) {
      if (emailInput.trim()) { e.preventDefault(); addEmails(emailInput); }
    } else if (e.key === "Backspace" && !emailInput && emailChips.length > 0) {
      setEmailChips(emailChips.slice(0, -1));
      setEmailError("");
    }
  };

  const handleEmailBlur = () => { if (emailInput.trim()) addEmails(emailInput); };
  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[,\s]/.test(pasted)) return;
    e.preventDefault();
    addEmails(`${emailInput} ${pasted}`);
  };
  const removeEmailChip = (email: string) => {
    setEmailChips(emailChips.filter((e) => e !== email));
    setEmailError("");
    setInviteResults((prev) => prev.filter((r) => r.email !== email));
  };

  const resetInviteState = () => {
    setEmailChips([]);
    setEmailInput("");
    setEmailError("");
    setInviteResults([]);
    setInviteRole("ANALYST");
  };

  const handleSendInvites = async () => {
    if (emailChips.length === 0) return;
    const selfInvite = emailChips.find((e) => e.trim().toLowerCase() === currentUserEmail);
    if (selfInvite) { toast.error("You cannot invite your own email address."); return; }

    setInviteResults([]);
    try {
      const results = await inviteMember({ emails: emailChips, role: inviteRole });

      const failed = results.filter((r) => r.status !== "success");
      const succeeded = results.filter((r) => r.status === "success");

      if (failed.length > 0) {
        // Keep only failed chips, show per-email errors
        const failedEmails = new Set(failed.map((r) => r.email));
        setEmailChips((prev) => prev.filter((e) => failedEmails.has(e)));
        setInviteResults(failed);
      } else {
        // All succeeded — close dialog and reset
        resetInviteState();
        setIsInviteDialogOpen(false);
      }

      // If partial success, remove the successful chips
      if (succeeded.length > 0 && failed.length > 0) {
        const succeededEmails = new Set(succeeded.map((r) => r.email));
        setEmailChips((prev) => prev.filter((e) => !succeededEmails.has(e)));
      }
    } catch { /* unexpected error: handled by mutation onError toast */ }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await removeMember({ teamId: memberToDelete.id, email: memberToDelete.email, status: memberToDelete.status });
      setMemberToDelete(null);
    } catch { /* handled by mutation */ }
  };

  const handleOpenEditRole = (member: TeamMember) => {
    setMemberToEdit(member);
    setEditRole((member.role as "ADMIN" | "ANALYST") || "ANALYST");
  };

  const handleSaveRole = async () => {
    if (!memberToEdit) return;
    try {
      await updateMemberRole({ membershipId: memberToEdit.id, role: editRole });
      setMemberToEdit(null);
    } catch { /* handled by mutation */ }
  };

  const columns = useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        accessorKey: "userName",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Member" disableHide />,
        enableSorting: true,
        cell: ({ row }) => {
          const member = row.original;
          const isPending = member.status === "pending";
          return (
            <div className="flex items-center gap-2.5">
              <MemberAvatar logo={member.logo} name={member.userName} email={member.email} />
              <div className="min-w-0">
                {isPending ? (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">{member.email}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium truncate leading-tight">
                      {member.userName || member.email}
                    </div>
                    {member.userName && (
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "roleName",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Role" disableHide />,
        enableSorting: true,
        cell: ({ row }) => {
          const role = row.original.role || row.original.roleName;
          if (role === "OWNER") {
            return (
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">Owner</span>
              </div>
            );
          }
          const Icon = role === "ADMIN" ? ShieldCheck : BarChart3;
          return (
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm capitalize">{role?.toLowerCase() || "Analyst"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Status" disableHide />,
        enableSorting: true,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="text-xs text-muted-foreground">Actions</span>,
        cell: ({ row }) => {
          const member = row.original;
          const isOwner = member.role === "OWNER" || member.roleName === "OWNER";
          const isPending = member.status === "pending";
          return (
            <div className="flex items-center gap-1">
              {!isOwner && !isPending && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenEditRole(member)}
                  disabled={isUpdatingRole}
                  title="Edit role"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {!isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setMemberToDelete(member)}
                  disabled={isRemoving}
                  title={isPending ? "Cancel invite" : "Remove member"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [isRemoving, isUpdatingRole]
  );

  const table = useReactTable({
    data: teamMembers,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row) => `${row.status ?? "active"}-${row.id}-${row.email}`,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        (row.original.userName?.toLowerCase() || "").includes(search) ||
        (row.original.email?.toLowerCase() || "").includes(search) ||
        (row.original.roleName?.toLowerCase() || "").includes(search)
      );
    },
    initialState: { pagination: { pageSize: 100 } },
  });

  return (
    <div className="flex gap-5 bg-white p-4 rounded-lg h-[calc(100vh-12rem)]">
      <div className="flex-1 h-full overflow-auto">
        <Card className="border-none shadow-none py-0">
          <CardContent className="p-0">
            {isLoadingTeamData && teamMembers.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                table={table}
                isLoading={isLoadingTeamData}
                emptyMessage="No team members found."
                disableHorizontalScroll={true}
                className="h-[calc(100vh-14rem)]"
              >
                <div
                  role="toolbar"
                  aria-orientation="horizontal"
                  className="flex w-full items-start justify-between gap-2 p-1"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <DataTableSearch
                      value={globalFilter}
                      onChange={setGlobalFilter}
                      placeholder="Search members, emails, roles..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </div>
                </div>
              </DataTable>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Invite Dialog ── */}
      <Dialog
        open={isInviteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isInviting) resetInviteState();
          if (!isInviting) setIsInviteDialogOpen(open);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b bg-white px-5 py-4">
            <DialogTitle className="text-xl tracking-[-0.01em]">Invite team members</DialogTitle>
            <DialogDescription>
              Invitations are sent by email and accepted with Google sign-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 bg-white px-5 py-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Role</p>
              <RoleSelector value={inviteRole} onChange={setInviteRole} disabled={isInviting} />
            </div>

            <div className="rounded-lg bg-[#FAFAFA] p-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Email addresses</p>
                <p className="text-xs text-muted-foreground">{emailChips.length} added</p>
              </div>

              {emailChips.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {emailChips.map((email) => (
                    <span
                      key={email}
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-general-border bg-white px-2 py-1 text-xs text-foreground shadow-xs"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeEmailChip(email); }}
                        disabled={isInviting}
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {email}</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={emailInputRef}
                  id="team-invite-email-input"
                  type="email"
                  className="h-10 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(""); }}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={handleEmailBlur}
                  onPaste={handleEmailPaste}
                  disabled={isInviting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { addEmails(emailInput); emailInputRef.current?.focus(); }}
                  disabled={isInviting || !emailInput.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add email</span>
                </button>
              </div>

              {emailError ? (
                <p className="mt-2 text-xs text-destructive">{emailError}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Paste multiple emails or add them one by one.</p>
              )}
            </div>
          </div>

          {inviteResults.length > 0 && (
            <div className="border-t bg-white px-5 pt-4 pb-0">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-800 mb-2">
                  {inviteResults.length === 1 ? "1 invite couldn't be sent:" : `${inviteResults.length} invites couldn't be sent:`}
                </p>
                <div className="space-y-1">
                  {inviteResults.map((result) => (
                    <div key={result.email} className="flex items-start gap-2 text-xs text-red-700">
                      <span className="font-medium shrink-0">{result.email}</span>
                      <span className="text-red-400">—</span>
                      <span>{result.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t bg-white px-5 py-4">
            <Button type="button" variant="outline" onClick={() => { resetInviteState(); setIsInviteDialogOpen(false); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendInvites} disabled={isInviting || emailChips.length === 0}>
              {isInviting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                `Send Invite${emailChips.length !== 1 ? "s" : ""}${emailChips.length > 0 ? ` (${emailChips.length})` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={!!memberToEdit} onOpenChange={(open) => !open && setMemberToEdit(null)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-white px-5 py-4">
            <DialogTitle className="text-lg">Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for{" "}
              <span className="font-medium text-foreground">
                {memberToEdit?.userName || memberToEdit?.email}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="bg-white px-5 py-5">
            <RoleSelector
              value={editRole}
              onChange={setEditRole}
              disabled={isUpdatingRole}
            />
          </div>

          <DialogFooter className="border-t bg-white px-5 py-4">
            <Button variant="outline" onClick={() => setMemberToEdit(null)} disabled={isUpdatingRole}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isUpdatingRole || editRole === (memberToEdit?.role as string)}
            >
              {isUpdatingRole ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm Dialog ── */}
      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {memberToDelete?.status === "pending" ? "Cancel Invitation" : "Remove Team Member"}
            </DialogTitle>
            <DialogDescription>
              {memberToDelete?.status === "pending" ? (
                <>Cancel the invitation sent to <span className="font-semibold text-foreground">{memberToDelete?.email}</span>? They will no longer be able to use their invite link.</>
              ) : (
                <>Are you sure you want to remove <span className="font-semibold text-foreground">{memberToDelete?.userName || memberToDelete?.email}</span>? This action cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToDelete(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isRemoving}>
              {isRemoving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{memberToDelete?.status === "pending" ? "Cancelling..." : "Removing..."}</>
              ) : memberToDelete?.status === "pending" ? "Cancel Invite" : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
