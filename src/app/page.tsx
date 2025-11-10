import { TopicsTableClient } from "@/components/topics/topics-table-client"
import type { ApiResponse } from "@/hooks/use-api-query"

const DUMMYJSON_BASE_URL = "https://dummyjson.com"

// Product type from DummyJSON API
type Product = {
  id: number
  title: string
  description: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  brand: string
  category: string
  thumbnail: string
}

/**
 * Server Component - Fetches initial data on the server for faster page load
 * This improves:
 * - Initial page load speed (data fetched on server)
 * - SEO (content available on first render)
 * - User experience (no loading spinner on first render)
 */
export default async function Page() {
  // Fetch initial page of data directly from DummyJSON on the server
  const url = `${DUMMYJSON_BASE_URL}/products?limit=100&skip=0`

  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  })

  if (!response.ok) {
    throw new Error("Failed to fetch products")
  }

  const productsData = await response.json()
  const products = productsData.products || []
  const total = productsData.total || 0

  const initialData: ApiResponse<Product> = {
    data: products,
    hasMore: products.length < total,
    total,
    page: 1,
    limit: products.length,
  }

  return (
    <div className="bg-muted p-8 flex flex-col gap-8 min-h-full">
      {/* Pass initialData to client component for hydration */}
      <TopicsTableClient initialData={initialData} />
    </div>
  )
}

