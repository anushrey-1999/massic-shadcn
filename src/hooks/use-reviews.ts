import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

export type ReviewSortBy = "recent" | "highest" | "lowest";

export interface Review {
  ReviewId: string;
  LocationId: string;
  ReviewerDisplayName: string;
  StarRating: string;
  Comment: string;
  CreateTime: string;
  UpdateTime: string;
  Name: string;
  ReviewReplyComment?: string | null;
  ReviewReplyUpdateTime: string;
  ReviewerProfilePhotoUrl?: string | null;
  IsIgnored?: boolean;
  numericRating?: number;
}

interface ReviewsResponse {
  err: boolean;
  message: string;
  data: {
    reviews: Review[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

interface UseReviewsParams {
  locationId: string | null;
  sortBy?: ReviewSortBy;
  search?: string;
  limit?: number;
}

export function useReviews({
  locationId,
  sortBy = "recent",
  search = "",
  limit = 10,
}: UseReviewsParams) {
  const query = useInfiniteQuery<ReviewsResponse>({
    queryKey: ["reviews", locationId, sortBy, search],
    queryFn: async ({ pageParam = 1 }) => {
      if (!locationId) {
        throw new Error("Location ID is required");
      }

      const params = new URLSearchParams({
        locationId,
        page: String(pageParam),
        limit: String(limit),
        sortBy,
        _t: String(Date.now()), // Cache busting
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await api.get<ReviewsResponse>(
        `/reviews/list?${params.toString()}`,
        "node",
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        }
      );

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.data.pagination.hasNextPage) {
        return undefined;
      }
      return lastPage.data.pagination.nextPage ?? undefined;
    },
    enabled: !!locationId,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
  });

  const allReviews =
    query.data?.pages.flatMap((page) => page.data.reviews) ?? [];
  const totalReviews = query.data?.pages[0]?.data.pagination.totalCount ?? 0;

  return {
    reviews: allReviews,
    totalReviews,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useIgnoreReview(locationId: string | null, sortBy: ReviewSortBy, search: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await api.post<{ err: boolean; message: string; data: Review }>(
        "/reviews/ignore",
        "node",
        { reviewId }
      );
      return response;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["reviews", locationId, sortBy, search],
        type: 'active'
      });
      toast.success("Review ignored successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to ignore review");
    },
  });
}
