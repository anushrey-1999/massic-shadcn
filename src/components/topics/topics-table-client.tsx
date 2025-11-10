"use client"

import { GenericTable } from "@/components/ui/generic-table"
import { type ColumnDef } from "@tanstack/react-table"
import React from "react"
import { cn } from "@/lib/utils"
import { useApiQuery, type ApiResponse } from "@/hooks/use-api-query"

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

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "title",
    enableSorting: true,
    header: "Product",
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      const thumbnail = row.original.thumbnail
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.brand}
            </span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "category",
    enableSorting: true,
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      return (
        <span className="px-2 py-1 rounded-md bg-muted text-sm">
          {category}
        </span>
      )
    },
  },
  {
    accessorKey: "price",
    enableSorting: true,
    header: "Price",
    cell: ({ row }) => {
      const price = row.getValue("price") as number
      const discount = row.original.discountPercentage
      return (
        <div className="flex flex-col">
          <span className="font-medium">${price.toFixed(2)}</span>
          {discount > 0 && (
            <span className="text-xs text-green-600">
              {discount}% off
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "rating",
    enableSorting: true,
    header: "Rating",
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number
      return (
        <div className="flex items-center gap-1">
          <span className="font-medium">{rating.toFixed(1)}</span>
          <span className="text-yellow-500">★</span>
        </div>
      )
    },
  },
  {
    accessorKey: "stock",
    enableSorting: true,
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.getValue("stock") as number
      const stockColor = stock > 50 ? "text-green-600" : stock > 20 ? "text-yellow-600" : "text-red-600"
      return (
        <span className={cn("font-medium", stockColor)}>
          {stock}
        </span>
      )
    },
  },
]

interface TopicsTableClientProps {
  initialData?: ApiResponse<Product>
}

export function TopicsTableClient({ initialData }: TopicsTableClientProps) {
  const {
    data: flatData,
    search,
    setSearch,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useApiQuery<Product>({
    queryKey: "topics",
    resource: "products",
    initialData,
    defaultLimit: 100, // Show 100 items per page (DummyJSON max per request)
    enableSearch: true,
  })

  return (
    <GenericTable
      columns={columns}
      data={flatData}
      enableSearch={true}
      searchPlaceholder="Search products..."
      serverSideSearch={true}
      onSearchChange={setSearch}
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }}
      isLoading={isFetchingNextPage}
      isInitialLoading={isLoading && flatData.length === 0}
      hasMore={hasNextPage ?? false}
      tableClassName="p-0"
      dataTableClassName="max-h-[600px]"
    />
  )
}

