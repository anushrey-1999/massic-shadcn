import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";

export type DashboardTag = {
  id: string;
  name: string;
  businessIds: string[];
  businessCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardTagInput = {
  name: string;
  businessIds: string[];
};

type DashboardTagsResponse = { tags: DashboardTag[] };
type DashboardTagResponse = { tag: DashboardTag };

const dashboardTagsKey = (accountId: string | undefined) => [
  "dashboardTags",
  accountId,
];

function errorMessage(error: unknown) {
  const apiMessage = (error as any)?.response?.data?.message;
  return apiMessage || (error as Error)?.message || "Please try again.";
}

function sortTags(tags: DashboardTag[]) {
  return [...tags].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export function useDashboardTags() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const accountId =
    user?.accountUniqueId || user?.uniqueId || user?.UniqueId || user?.id;
  const queryKey = dashboardTagsKey(accountId);

  const query = useQuery<DashboardTag[]>({
    queryKey,
    queryFn: async () => {
      const response = await api.get<DashboardTagsResponse>(
        "/dashboard-tags",
        "node"
      );
      return response.tags || [];
    },
    enabled: isAuthenticated && Boolean(accountId),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation<DashboardTag, Error, DashboardTagInput>({
    mutationFn: async input => {
      const response = await api.post<DashboardTagResponse>(
        "/dashboard-tags",
        "node",
        input
      );
      return response.tag;
    },
    onSuccess: tag => {
      queryClient.setQueryData<DashboardTag[]>(queryKey, current =>
        sortTags([...(current || []), tag])
      );
      toast.success("Tag created");
    },
    onError: error => {
      toast.error("Couldn't create tag", { description: errorMessage(error) });
    },
  });

  const updateMutation = useMutation<
    DashboardTag,
    Error,
    { tagId: string; input: DashboardTagInput }
  >({
    mutationFn: async ({ tagId, input }) => {
      const response = await api.put<DashboardTagResponse>(
        `/dashboard-tags/${tagId}`,
        "node",
        input
      );
      return response.tag;
    },
    onSuccess: tag => {
      queryClient.setQueryData<DashboardTag[]>(queryKey, current =>
        sortTags((current || []).map(item => (item.id === tag.id ? tag : item)))
      );
      toast.success("Tag updated");
    },
    onError: error => {
      toast.error("Couldn't update tag", { description: errorMessage(error) });
    },
  });

  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async tagId => {
      await api.delete(`/dashboard-tags/${tagId}`, "node");
      return tagId;
    },
    onSuccess: tagId => {
      queryClient.setQueryData<DashboardTag[]>(queryKey, current =>
        (current || []).filter(tag => tag.id !== tagId)
      );
      toast.success("Tag deleted");
    },
    onError: error => {
      toast.error("Couldn't delete tag", { description: errorMessage(error) });
    },
  });

  return {
    tags: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createTag: createMutation.mutateAsync,
    updateTag: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
