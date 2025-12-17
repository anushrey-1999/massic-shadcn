import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

// Constants
const SENDER_EMAIL_ID = "no-reply@seedseo.services"; // Based on old UI implicit knowledge or constant
const ENV_URL = "https://seedseo.services"; // Placeholder, should ideally come from env

export interface TeamMember {
  id: number;
  userName: string;
  email: string;
  logo: string;
  unqiueId: string;
  roleName: string;
  roleId: number;
}

interface EncryptPayload {
  encryptedText: string;
}

interface EncryptResponse {
  err: boolean;
  data: string; // The token
  message?: string;
}

interface SendInvitePayload {
  email: string;
  roleId: number;
  url: string;
  inviteToken: string;
}

interface SendInviteResponse {
  success: boolean;
  message?: string;
  data?: any;
}

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  cc: string;
  textbody: string;
  htmlbody: string;
}

interface EmailResponse {
  err: boolean;
  message?: string;
}

interface RemoveMemberResponse {
  success: boolean;
  message: string;
}

export function useTeamSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // --- Fetch Team Members ---
  const {
    data: teamMembers = [],
    isLoading: isLoadingTeamData,
    refetch,
  } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: TeamMember[]; message?: string }>(
        "/get-team-members",
        "node"
      );

      if (response && response.success === true) {
        return response.data;
      }
      throw new Error(response?.message || "Failed to fetch team members");
    },
  });

  // --- Invite Member Flow ---
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ emails }: { emails: string[] }) => {
      // Single Bulk API Call to Node Backend which handles everything (token, db, email)
      const inviteRes = await api.post<SendInviteResponse>(
        "/send-team-invitations",
        "node",
        { emails }
      );

      // The backend returns { success: true, data: [...results] } or fails
      // We need to check response structure. 
      // userctrl.js returns helper.returnAPIResponse('Invitations processed.', results)
      // which usually follows { success: true, message: ..., data: ... } structure

      if (!inviteRes.success) {
        throw new Error(inviteRes.message || "Failed to send invitations");
      }

      // Check for partial failures if any
      const results = inviteRes.data;
      if (Array.isArray(results)) {
        const failed = results.filter((r: any) => r.status !== 'success');
        if (failed.length > 0) {
          const errorMsg = failed.map((f: any) => `${f.email} (${f.message})`).join(', ');
          throw new Error(`Some invites failed: ${errorMsg}`);
        }
      }

      return inviteRes;
    },
    onSuccess: () => {
      toast.success(`Invitations sent successfully`);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: any) => {
      console.error(error);
      const errorMessage = error?.response?.data?.message || (error instanceof Error ? error.message : "Failed to invite members");
      toast.error(errorMessage);
    },
  });

  // --- Remove Member ---
  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: number; email: string }) => {
      const response = await api.get<RemoveMemberResponse>(
        `/remove-team-member?teamId=${teamId}&email=${email}`,
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
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  return {
    teamMembers,
    isLoadingTeamData,
    inviteMember: inviteMemberMutation.mutateAsync,
    isInviting: inviteMemberMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemoving: removeMemberMutation.isPending,
    refetchTeamMembers: refetch,
  };
}
