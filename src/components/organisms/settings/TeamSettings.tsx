"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GenericInput } from "@/components/ui/generic-input";
import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Inactive";
  role: string;
};

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Vasanth Kumar",
    email: "vasanth@kanahiku.com",
    status: "Active",
    role: "Admin",
  },
  {
    id: "2",
    name: "Vasanth K",
    email: "vasanthhavanagi9597@gmail.com",
    status: "Active",
    role: "Editor",
  },
];

const inviteFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export function TeamSettings() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);

  const inviteForm = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: inviteFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Handle send invites
        console.log("Send invites to:", value.email);
        
        // Simulate API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Show success toast
        toast.success("Invitation sent successfully!", {
          description: `Invitation has been sent to ${value.email}`,
        });
        
        // Reset form and close dialog
        inviteForm.reset();
        setIsInviteDialogOpen(false);
      } catch (error) {
        console.error("Error sending invites:", error);
        // Show error toast
        toast.error("Failed to send invitation", {
          description: error instanceof Error ? error.message : "Please try again later.",
        });
        // Re-throw to let TanStack Form handle the error state
        throw error;
      }
    },
  });

  const columns: ColumnDef<TeamMember>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("name")}</div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="text-muted-foreground">{row.getValue("email")}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <div>{row.getValue("role")}</div>
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
              onClick={() => {
                // Handle delete action
                console.log("Delete", row.original);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          );
        },
        enableSorting: false,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their permissions.
          </CardDescription>
          <CardAction>
            <Button onClick={() => setIsInviteDialogOpen(true)}>Invite Member</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={teamMembers} />
        </CardContent>
      </Card>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
            <DialogDescription>
              Type an email address and press Enter, Space, or comma to add.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inviteForm.handleSubmit();
            }}
          >
            <div className="py-4">
              <inviteForm.Field
                name="email"
                children={(field) => (
                  <GenericInput<InviteFormData>
                    formField={field}
                    type="email"
                    placeholder="john@example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " " || e.key === ",") {
                        e.preventDefault();
                        // Handle adding email (you can implement tag/chip functionality here)
                        const currentValue = field.state.value;
                        if (currentValue && typeof currentValue === "string" && currentValue.trim()) {
                          console.log("Add email:", currentValue.trim());
                          // Reset input after adding
                          field.handleChange("");
                        }
                      }
                    }}
                  />
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  inviteForm.reset();
                  setIsInviteDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteForm.state.isSubmitting}
              >
                {inviteForm.state.isSubmitting ? "Sending..." : "Send Invites"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

