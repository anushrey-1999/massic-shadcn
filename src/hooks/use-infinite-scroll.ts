"use client";

import { useEffect, useRef } from "react";

type InfiniteScrollOptions = {
  enabled: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootRef?: React.RefObject<Element | null>;
  rootMargin?: string;
};

export function useInfiniteScroll({ enabled, loading, onLoadMore, rootRef, rootMargin = "160px 0px" }: InfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(onLoadMore);

  useEffect(() => { loadMoreRef.current = onLoadMore; }, [onLoadMore]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || loading || !sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMoreRef.current();
    }, { root: rootRef?.current ?? null, rootMargin });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, loading, rootMargin, rootRef]);

  return sentinelRef;
}
