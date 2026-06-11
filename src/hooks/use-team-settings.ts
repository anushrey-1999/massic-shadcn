import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

export interface TeamMember {
  id: number;
  userId?: number;
  userName: string;
  email: string;
  logo: string;
  unqiueId: string;
  roleName: string;
  role?: "OWNER" | "ADMIN" | "ANALYST";
  roleId?: number;
  status?: "active" | "pending";
  invitedAt?: string;
}

export interface InviteResult {
  email: string;
  status: "success" | "failed" | "error";
  message: string;
}

interface RemoveMemberResponse {
  success: boolean;
  message: string;
}

function getApiErrorMessage(error: any, fallback: string) {
  const responseData = error?.response?.data;
  return responseData?.message || error?.message || fallback;
}

export function useTeamSettings() {
  const queryClient = useQueryClient();

  // --- Fetch Team Members ---
  const {
    data: teamMembers = [],
    isLoading: isLoadingTeamData,
    refetch,
  } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
	      const response = await api.get<{ success: boolean; data: TeamMember[]; message?: string }>(
	        "/users/team/members",
	        "node"
	      );

      if (response && response.success === true) {
        return response.data;
      }
      throw new Error(response?.message || "Failed to fetch team members");
    },
  });

  // --- Invite Member Flow ---
  // Always resolves with InviteResult[] — never throws for business-logic failures.
  // Only throws for unexpected network/server errors.
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ emails, role }: { emails: string[]; role: "ADMIN" | "ANALYST" }): Promise<InviteResult[]> => {
      try {
        const inviteRes = await api.post<{ success: boolean; message?: string; data?: InviteResult[] }>(
          "/users/team/invitations",
          "node",
          { emails, role }
        );
        // Both success and partial/full business-logic failures come here (HTTP 200)
        return Array.isArray(inviteRes.data) ? inviteRes.data : [];
      } catch (error: any) {
        // HTTP 400: all failed — backend includes per-email results in error.response.data.data
        const results: InviteResult[] | undefined = error?.response?.data?.data;
        if (Array.isArray(results) && results.length > 0) {
          return results;
        }
        // Unexpected error (network, 500, etc.)
        throw new Error(getApiErrorMessage(error, "Failed to send invitations"));
      }
    },
    onSuccess: (results) => {
      const sentCount = results.filter((r) => r.status === "success").length;
      if (sentCount > 0) {
        toast.success(sentCount === 1 ? "Invitation sent" : `${sentCount} invitations sent`);
        queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      }
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to send invitations"));
    },
  });

  // --- Remove Member ---
	  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, email, status }: { teamId: number; email: string; status?: "active" | "pending" }) => {
      const endpoint = status === "pending"
        ? `/users/team/invite/${teamId}`
        : `/users/team/member?membershipId=${teamId}&email=${encodeURIComponent(email)}`;
      const response = await api.delete<RemoveMemberResponse>(
        endpoint,
        "node"
      );

      if (response.success !== true) {
        throw new Error(response.message || "Failed to remove member");
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Team member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to remove member"));
    },
  });

  // --- Update Member Role ---
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: number; role: "ADMIN" | "ANALYST" }) => {
      const response = await api.put<{ success: boolean; message: string; data?: any }>(
        "/users/team/member/role",
        "node",
        { membershipId, role }
      );
      if (response.success !== true) {
        throw new Error(response.message || "Failed to update role");
      }
      return response;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to update role"));
    },
  });

  return {
    teamMembers,
    isLoadingTeamData,
    inviteMember: inviteMemberMutation.mutateAsync,
    isInviting: inviteMemberMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemoving: removeMemberMutation.isPending,
    updateMemberRole: updateMemberRoleMutation.mutateAsync,
    isUpdatingRole: updateMemberRoleMutation.isPending,
    refetchTeamMembers: refetch,
  };
}
