import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

export type ReviewSortBy = "recent" | "highest" | "lowest";
export type ReviewReplyFilter = "all" | "needs_reply";

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
  numericRating?: number;
  SuggestedResponse?: string | null;
  EditedResponse?: string | null;
  ReplySource?: string | null;
  ReplySentAt?: string | null;
  ReplySentByUserUniqueId?: string | null;
}

interface UpdateReviewResponseParams {
  businessId: string;
  reviewId: string;
  updatedResponse: string;
}

interface SendReviewReplyParams {
  businessId: string;
  reviewId: string;
  replyText: string;
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

function getApiErrorMessage(error: any, fallbackMessage: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.message ||
    fallbackMessage
  );
}

function updateEditedReviewResponseInCache(
  cachedData: InfiniteData<ReviewsResponse> | undefined,
  reviewId: string,
  updatedResponse: string
) {
  if (!cachedData) {
    return cachedData;
  }

  let hasChanges = false;

  const pages = cachedData.pages.map((page) => {
    let pageChanged = false;

    const reviews = page.data.reviews.map((review) => {
      if (review.ReviewId !== reviewId || review.EditedResponse === updatedResponse) {
        return review;
      }

      pageChanged = true;
      hasChanges = true;

      return {
        ...review,
        EditedResponse: updatedResponse,
      };
    });

    if (!pageChanged) {
      return page;
    }

    return {
      ...page,
      data: {
        ...page.data,
        reviews,
      },
    };
  });

  if (!hasChanges) {
    return cachedData;
  }

  return {
    ...cachedData,
    pages,
  };
}

function updateSentReviewReplyInCache(
  cachedData: InfiniteData<ReviewsResponse> | undefined,
  payload: {
    reviewId: string;
    replyText: string;
    reviewReplyUpdateTime: string | null;
    replySource: string | null;
    replySentAt: string | null;
    replySentByUserUniqueId: string | null;
  }
) {
  if (!cachedData) {
    return cachedData;
  }

  let hasChanges = false;

  const pages = cachedData.pages.map((page) => {
    let pageChanged = false;

    const reviews = page.data.reviews.map((review) => {
      if (review.ReviewId !== payload.reviewId) {
        return review;
      }

      pageChanged = true;
      hasChanges = true;

      return {
        ...review,
        ReviewReplyComment: payload.replyText,
        ReviewReplyUpdateTime: payload.reviewReplyUpdateTime ?? review.ReviewReplyUpdateTime,
        EditedResponse: payload.replyText,
        ReplySource: payload.replySource,
        ReplySentAt: payload.replySentAt,
        ReplySentByUserUniqueId: payload.replySentByUserUniqueId,
      };
    });

    if (!pageChanged) {
      return page;
    }

    return {
      ...page,
      data: {
        ...page.data,
        reviews,
      },
    };
  });

  if (!hasChanges) {
    return cachedData;
  }

  return {
    ...cachedData,
    pages,
  };
}

interface UseReviewsParams {
  locationId: string | null;
  sortBy?: ReviewSortBy;
  replyStatus?: ReviewReplyFilter;
  search?: string;
  limit?: number;
}

export function useReviews({
  locationId,
  sortBy = "recent",
  replyStatus = "all",
  search = "",
  limit = 10,
}: UseReviewsParams) {
  const query = useInfiniteQuery<ReviewsResponse>({
    queryKey: ["reviews", locationId, sortBy, replyStatus, search],
    queryFn: async ({ pageParam = 1 }) => {
      if (!locationId) {
        throw new Error("Location ID is required");
      }

      const params = new URLSearchParams({
        locationId,
        page: String(pageParam),
        limit: String(limit),
        sortBy,
        replyStatus,
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
    refetchOnWindowFocus: false,
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

export function useUpdateReviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateReviewResponseParams) => {
      const response = await api.put<{
        err: boolean;
        message: string;
        data: { reviewId: string; updatedResponse: string };
      }>(
        "/reviews/response",
        "node",
        params
      );

      if (response.err) {
        throw new Error(response.message || "Failed to update review response");
      }

      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueriesData<InfiniteData<ReviewsResponse>>(
        { queryKey: ["reviews"] },
        (cachedData) =>
          updateEditedReviewResponseInCache(
            cachedData,
            variables.reviewId,
            variables.updatedResponse
          )
      );
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to save review response"));
    },
  });
}

export function useSendReviewReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendReviewReplyParams) => {
      const response = await api.put<{
        err: boolean;
        message: string;
        data: {
          reviewId: string;
          replyText: string;
          reviewReplyComment: string;
          reviewReplyUpdateTime: string;
          replySource: string | null;
          replySentAt: string | null;
          replySentByUserUniqueId: string | null;
        };
      }>(
        "/reviews/send-reply",
        "node",
        params
      );

      if (response.err) {
        throw new Error(response.message || "Failed to send review reply");
      }

      return response;
    },
    onSuccess: (response) => {
      const payload = response.data;

      queryClient.setQueriesData<InfiniteData<ReviewsResponse>>(
        { queryKey: ["reviews"] },
        (cachedData) =>
          updateSentReviewReplyInCache(cachedData, {
            reviewId: payload.reviewId,
            replyText: payload.reviewReplyComment || payload.replyText,
            reviewReplyUpdateTime: payload.reviewReplyUpdateTime || null,
            replySource: payload.replySource,
            replySentAt: payload.replySentAt,
            replySentByUserUniqueId: payload.replySentByUserUniqueId,
          })
      );

      queryClient.invalidateQueries({
        queryKey: ["reviews"],
        type: "active",
      });

      toast.success("Reply sent to Google successfully");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to send review reply"));
    },
  });
}
