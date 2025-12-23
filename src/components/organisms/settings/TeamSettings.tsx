"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Loader2, UserPlus } from "lucide-react";
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
import { useTeamSettings, TeamMember } from "@/hooks/use-team-settings";

// Removed unused schema
// const inviteFormSchema = z.object({ ... });
// type InviteFormData = ...

export function TeamSettings() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  const { teamMembers, isLoadingTeamData, inviteMember, isInviting, removeMember, isRemoving } = useTeamSettings();

  const [emailChips, setEmailChips] = React.useState<string[]>([]);
  const [emailInput, setEmailInput] = React.useState("");

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed) && !emailChips.includes(trimmed)) {
      setEmailChips([...emailChips, trimmed]);
    }
    setEmailInput("");
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && emailChips.length > 0) {
      setEmailChips(emailChips.slice(0, -1));
    }
  };

  const handleEmailBlur = () => {
    if (emailInput.trim()) {
      addEmail(emailInput);
    }
  };

  const removeEmailChip = (emailToRemove: string) => {
    setEmailChips(emailChips.filter(e => e !== emailToRemove));
  };

  const resetInviteState = () => {
    setEmailChips([]);
    setEmailInput("");
  };

  const handleSendInvites = async () => {
    if (emailChips.length === 0) return;
    try {
      await inviteMember({ emails: emailChips });
      resetInviteState();
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null);

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await removeMember({ teamId: memberToDelete.id, email: memberToDelete.email });
      setMemberToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  const columns = useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        accessorKey: "userName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="User" disableHide />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.logo ? (
              <img src={row.original.logo} alt={row.getValue("userName")} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {(row.getValue("userName") as string)?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="font-medium">{row.getValue("userName")}</div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Email" disableHide />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-muted-foreground">{row.getValue("email")}</div>
        ),
      },
      {
        accessorKey: "roleName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Role" disableHide />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.getValue("roleName") || "Member"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setMemberToDelete(row.original)}
              disabled={isRemoving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          );
        },
        enableSorting: false,
      },
    ],
    [isRemoving]
  );

  const table = useReactTable({
    data: teamMembers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const userName = row.original.userName?.toLowerCase() || "";
      const email = row.original.email?.toLowerCase() || "";
      const roleName = row.original.roleName?.toLowerCase() || "";
      return userName.includes(search) || email.includes(search) || roleName.includes(search);
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
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

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
            <DialogDescription>
              Type an email address and press Enter, Space, or comma to add.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div
              className="flex flex-wrap gap-1.5 p-2 min-h-[80px] border rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
              onClick={() => document.getElementById('email-input')?.focus()}
            >
              {emailChips.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-xs font-normal">
                  {email}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeEmailChip(email); }}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </button>
                </Badge>
              ))}

              <input
                id="email-input"
                type="text"
                className="flex-1 bg-transparent outline-none min-w-[120px] placeholder:text-muted-foreground text-sm"
                placeholder={emailChips.length === 0 ? "john@example.com" : ""}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onBlur={handleEmailBlur}
                autoComplete="off"
              />
            </div>

            {emailInput && !isValidEmail(emailInput) && (
              <p className="text-xs text-destructive mt-1.5">Please enter a valid email address</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetInviteState();
                setIsInviteDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendInvites}
              disabled={isInviting || emailChips.length === 0}
            >
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : `Send Invites${emailChips.length > 0 ? ` (${emailChips.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{memberToDelete?.userName}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberToDelete(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
