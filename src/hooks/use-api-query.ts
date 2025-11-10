import React, { useMemo } from "react"
import { useInfiniteQuery, UseInfiniteQueryOptions, InfiniteData } from "@tanstack/react-query"

export interface ApiQueryParams {
  page?: number
  limit?: number
  search?: string
  [key: string]: any // Allow additional params
}

export interface ApiResponse<T> {
  data: T[]
  hasMore: boolean
  total: number
  page: number
  limit: number
}

export interface UseApiQueryOptions<T> {
  // Query key prefix (e.g., "products", "users")
  queryKey: string
  // DummyJSON resource name (e.g., "products", "users", "posts")
  // OR custom fetch function for non-DummyJSON APIs
  resource?: string
  // Custom fetch function (for APIs without pagination/search)
  fetchFn?: (params: ApiQueryParams) => Promise<T[]>
  // Initial data (for SSR hydration)
  initialData?: ApiResponse<T>
  // Default limit per page (for client-side pagination)
  defaultLimit?: number
  // Enable search
  enableSearch?: boolean
  // Client-side mode: fetch all data once, paginate/search client-side
  clientSideMode?: boolean
  // Maximum items to fetch when searching (safety limit, default: 10000)
  // Set to null/undefined to fetch all available data
  maxSearchItems?: number | null
  // Additional React Query options
  queryOptions?: Omit<
    UseInfiniteQueryOptions<ApiResponse<T>, Error>,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
}

const DUMMYJSON_BASE_URL = "https://dummyjson.com"

/**
 * Generic hook for API calls with pagination, search, and infinite scroll
 * 
 * Supports two modes:
 * 1. Server-side mode (default): API handles pagination/search
 * 2. Client-side mode: Fetch all data once, paginate/search in browser
 * 
 * @example Server-side (DummyJSON):
 * ```tsx
 * const { data, search, setSearch, fetchNextPage, isLoading } = useApiQuery({
 *   queryKey: "products",
 *   resource: "products",
 *   defaultLimit: 100,
 *   enableSearch: true,
 * })
 * ```
 * 
 * @example Client-side (API without pagination):
 * ```tsx
 * const { data, search, setSearch, fetchNextPage, isLoading } = useApiQuery({
 *   queryKey: "users",
 *   fetchFn: async () => {
 *     const res = await fetch("https://api.example.com/users")
 *     return res.json() // Returns all users
 *   },
 *   defaultLimit: 50,
 *   enableSearch: true,
 *   clientSideMode: true,
 * })
 * ```
 */
export function useApiQuery<T>({
  queryKey,
  resource,
  fetchFn,
  initialData,
  defaultLimit = 100,
  enableSearch = false,
  clientSideMode = false,
  maxSearchItems = 10000, // Safety limit: fetch up to 10k items for search
  queryOptions = {},
}: UseApiQueryOptions<T>) {
  const [search, setSearch] = React.useState("")
  // Store all data in a ref for client-side mode (accessible across pages)
  const allDataRef = React.useRef<T[]>([])
  const searchKeyRef = React.useRef<string>("")
  // Store fetched data for server-side search mode (to avoid refetching on pagination)
  const serverSearchDataRef = React.useRef<{ data: T[]; searchTerm: string } | null>(null)

  const queryResult = useInfiniteQuery({
    queryKey: [queryKey, search, clientSideMode ? "client" : "server"],
    queryFn: async ({ pageParam = 1 }) => {
      const page = pageParam as number
      const limit = Math.min(defaultLimit, 100)
      const skip = (page - 1) * limit

      // CLIENT-SIDE MODE: Fetch all data once, paginate client-side
      if (clientSideMode) {
        // Fetch all data only on first page or when search changes
        if (page === 1 || searchKeyRef.current !== search) {
          let allData: T[]

          if (fetchFn) {
            // Use custom fetch function
            allData = await fetchFn({ page, limit, search })
          } else if (resource) {
            // Fallback to DummyJSON
            const url = `${DUMMYJSON_BASE_URL}/${resource}`
            const response = await fetch(url)
            if (!response.ok) {
              throw new Error(`API error: ${response.statusText}`)
            }
            const data = await response.json()
            allData = data[resource] || data.products || data.users || data.posts || []
          } else {
            throw new Error("Either 'resource' or 'fetchFn' must be provided")
          }

          // Performance warning for large datasets
          if (process.env.NODE_ENV === "development" && allData.length > 10000) {
            console.warn(
              `[useApiQuery] Large dataset detected (${allData.length} items). ` +
              `Client-side mode may impact performance. Consider using server-side mode.`
            )
          }

          // Apply client-side search if enabled
          let filteredData = allData
          if (enableSearch && search && search.trim()) {
            const searchLower = search.toLowerCase().trim()
            // Deep search function to search through all properties including nested objects/arrays
            const deepSearch = (obj: any, searchTerm: string): boolean => {
              if (obj == null) return false
              
              // Handle primitives
              if (typeof obj === "string") {
                return obj.toLowerCase().includes(searchTerm)
              }
              if (typeof obj === "number") {
                return obj.toString().includes(searchTerm)
              }
              if (typeof obj === "boolean") {
                return obj.toString().toLowerCase().includes(searchTerm)
              }
              
              // Handle arrays - search through each element
              if (Array.isArray(obj)) {
                return obj.some((item) => deepSearch(item, searchTerm))
              }
              
              // Handle objects - search through all values
              if (typeof obj === "object") {
                return Object.values(obj).some((value) => deepSearch(value, searchTerm))
              }
              
              return false
            }
            
            // Filter data by searching through ALL properties
            filteredData = allData.filter((item) => deepSearch(item, searchLower))
          }

          // Store in ref for subsequent pages
          allDataRef.current = filteredData
          searchKeyRef.current = search
        }

        // Paginate from stored data
        const filteredData = allDataRef.current
        const total = filteredData.length
        const startIndex = skip
        const endIndex = Math.min(startIndex + limit, total)
        const paginatedItems = filteredData.slice(startIndex, endIndex)

        return {
          data: paginatedItems,
          hasMore: endIndex < total,
          total,
          page,
          limit: paginatedItems.length,
        } as ApiResponse<T>
      }

      // SERVER-SIDE MODE: API handles pagination/search
      if (!resource) {
        throw new Error("'resource' is required for server-side mode")
      }

      // When search is active, fetch all data and do client-side filtering
      // This ensures we can search ALL fields including numeric ones (price, rating, stock, etc.)
      if (enableSearch && search && search.trim()) {
        const searchLower = search.toLowerCase().trim()
        
        // Clear cache if search term changed
        if (serverSearchDataRef.current?.searchTerm !== searchLower) {
          serverSearchDataRef.current = null
        }
        
        // Check if we already have cached data for this search term
        if (serverSearchDataRef.current?.searchTerm === searchLower && page > 1) {
          // Use cached filtered data for subsequent pages
          const filteredItems = serverSearchDataRef.current.data
          const total = filteredItems.length
          const startIndex = skip
          const endIndex = Math.min(startIndex + limit, total)
          const paginatedItems = filteredItems.slice(startIndex, endIndex)
          
          return {
            data: paginatedItems,
            hasMore: endIndex < total,
            total,
            page,
            limit: paginatedItems.length,
          } as ApiResponse<T>
        }
        
        // First, fetch one request to get the total count
        const fetchLimit = 100 // DummyJSON max per request
        const firstResponse = await fetch(`${DUMMYJSON_BASE_URL}/${resource}?limit=${fetchLimit}&skip=0`)
        if (!firstResponse.ok) {
          throw new Error(`DummyJSON API error: ${firstResponse.statusText}`)
        }
        const firstData = await firstResponse.json()
        const totalAvailable = firstData.total || 0
        
        // Determine how many items to fetch (respect maxSearchItems limit if set)
        const itemsToFetch = maxSearchItems !== null && maxSearchItems !== undefined
          ? Math.min(totalAvailable, maxSearchItems)
          : totalAvailable
        
        // Fetch ALL available data (up to limit) to search through everything
        // Calculate how many requests we need
        const totalRequests = Math.ceil(itemsToFetch / fetchLimit)
        
        // Fetch all data in parallel
        const fetchPromises = []
        for (let i = 0; i < totalRequests; i++) {
          const skip = i * fetchLimit
          const url = `${DUMMYJSON_BASE_URL}/${resource}?limit=${fetchLimit}&skip=${skip}`
          fetchPromises.push(fetch(url))
        }
        
        const responses = await Promise.all(fetchPromises)
        const allItems: T[] = []
        
        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`DummyJSON API error: ${response.statusText}`)
          }
          const data = await response.json()
          const items = data[resource] || data.products || data.users || data.posts || []
          allItems.push(...items)
        }
        
        // Apply client-side search on ALL fields (including numeric)
        const deepSearch = (obj: any, searchTerm: string): boolean => {
          if (obj == null) return false
          
          if (typeof obj === "string") {
            return obj.toLowerCase().includes(searchTerm)
          }
          if (typeof obj === "number") {
            return obj.toString().includes(searchTerm)
          }
          if (typeof obj === "boolean") {
            return obj.toString().toLowerCase().includes(searchTerm)
          }
          
          if (Array.isArray(obj)) {
            return obj.some((item) => deepSearch(item, searchTerm))
          }
          
          if (typeof obj === "object") {
            return Object.values(obj).some((value) => deepSearch(value, searchTerm))
          }
          
          return false
        }
        
        const filteredItems = allItems.filter((item) => deepSearch(item, searchLower))
        
        // Cache the filtered results for this search term
        serverSearchDataRef.current = {
          data: filteredItems,
          searchTerm: searchLower,
        }
        
        const total = filteredItems.length
        
        // Paginate the filtered results
        const startIndex = skip
        const endIndex = Math.min(startIndex + limit, total)
        const paginatedItems = filteredItems.slice(startIndex, endIndex)
        
        return {
          data: paginatedItems,
          hasMore: endIndex < total,
          total,
          page,
          limit: paginatedItems.length,
        } as ApiResponse<T>
      } else {
        // Use regular endpoint: /RESOURCE?limit=10&skip=0
        const url = `${DUMMYJSON_BASE_URL}/${resource}?limit=${limit}&skip=${skip}`
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`DummyJSON API error: ${response.statusText}`)
        }

        const data = await response.json()
        // DummyJSON returns items in a property matching the resource name, or "products"
        const items = data[resource] || data.products || data.users || data.posts || []
        const total = data.total || 0
        const currentSkip = data.skip || skip

        return {
          data: items,
          hasMore: currentSkip + items.length < total,
          total,
          page,
          limit: items.length,
        } as ApiResponse<T>
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length + 1
      }
      return undefined
    },
    // Use initialData for hydration only when search is empty
    ...(initialData && !search && {
      initialData: {
        pages: [initialData],
        pageParams: [1],
      },
    }),
    // Default options
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // In client-side mode, cache longer since we fetch all data at once
    // In server-side mode, don't cache search results
    staleTime: clientSideMode 
      ? 5 * 60 * 1000 // 5 minutes for client-side (data fetched once)
      : search 
        ? 0 // No cache for server-side search
        : 30 * 1000, // 30 seconds for server-side regular queries
    // Merge with custom options
    ...queryOptions,
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = queryResult

  // Flatten all pages into a single array
  const flatData = useMemo(() => {
    const infiniteData = data as InfiniteData<ApiResponse<T>> | undefined
    if (!infiniteData?.pages) return []
    return infiniteData.pages.flatMap((page) => page.data)
  }, [data])

  // Calculate total count across all pages
  const totalCount = useMemo(() => {
    const infiniteData = data as InfiniteData<ApiResponse<T>> | undefined
    if (!infiniteData?.pages || infiniteData.pages.length === 0) return 0
    return infiniteData.pages[0]?.total ?? 0
  }, [data])

  return {
    // Data
    data: flatData,
    // Pagination
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isLoading,
    isFetchingNextPage,
    // Search (only if enabled)
    ...(enableSearch && {
      search,
      setSearch,
    }),
    // Metadata
    totalCount,
    // Error handling
    error,
    // Utilities
    refetch,
  }
}

