/**
 * Frontend mirror of the backend index-bucket classification.
 * Keep in sync with seedseo.services.main/src/utils/gscIndexBucket.util.js
 */

export type IndexBucket =
  | "indexed"
  | "crawled_not_indexed"
  | "discovered_not_indexed"
  | "unknown"
  | "excluded"
  | "error"
  | "other"

export interface IndexBucketMeta {
  key: IndexBucket
  label: string
  color: string
}

// Order used for the stacked history chart (indexed at the bottom).
export const INDEX_BUCKET_META: IndexBucketMeta[] = [
  { key: "indexed", label: "Indexed", color: "#16a34a" },
  { key: "crawled_not_indexed", label: "Crawled - not indexed", color: "#f59e0b" },
  { key: "discovered_not_indexed", label: "Discovered - not indexed", color: "#f97316" },
  { key: "excluded", label: "Excluded", color: "#64748b" },
  { key: "error", label: "Error", color: "#dc2626" },
  { key: "unknown", label: "Unknown to Google", color: "#94a3b8" },
  { key: "other", label: "Other", color: "#cbd5e1" },
]

const META_BY_KEY: Record<string, IndexBucketMeta> = INDEX_BUCKET_META.reduce(
  (acc, meta) => {
    acc[meta.key] = meta
    return acc
  },
  {} as Record<string, IndexBucketMeta>
)

export function getBucketMeta(bucket?: string | null): IndexBucketMeta {
  if (bucket && META_BY_KEY[bucket]) return META_BY_KEY[bucket]
  return META_BY_KEY.other
}

export function getBucketLabel(bucket?: string | null): string {
  return getBucketMeta(bucket).label
}

export function getBucketColor(bucket?: string | null): string {
  return getBucketMeta(bucket).color
}

export function isIndexedBucket(bucket?: string | null): boolean {
  return bucket === "indexed"
}
