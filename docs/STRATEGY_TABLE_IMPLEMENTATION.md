# Strategy Table Implementation Guide

## 📋 Overview

This document describes the implementation of the Strategy table following the same pattern as the TaskTable component. The Strategy table displays topics, clusters, and keywords for business strategy analysis with server-side filtering, sorting, and pagination.

## 🏗️ Architecture

### Pattern Followed
The implementation follows the **TaskTable pattern**:
- **Client Component** (`strategy-table-client.tsx`) - Handles data fetching with React Query
- **Table Component** (`strategy-table.tsx`) - Renders the table with useDataTable hook
- **Columns Component** (`strategy-table-columns.tsx`) - Defines column structure and metadata
- **Custom Hook** (`use-strategy.ts`) - Wraps use-api for Strategy-specific API logic
- **Types** (`strategy-types.ts`) - TypeScript interfaces for type safety

### File Structure

```
src/
├── types/
│   └── strategy-types.ts              # TypeScript interfaces
├── hooks/
│   └── use-strategy.ts                # Custom hook wrapping use-api
├── components/
│   └── organisms/
│       └── StrategyTable/
│           ├── strategy-table-client.tsx      # Data fetching layer
│           ├── strategy-table.tsx             # Table rendering
│           └── strategy-table-columns.tsx     # Column definitions
└── app/
    └── business/
        └── [id]/
            └── strategy/
                └── page.tsx           # Page using StrategyTableClient
```

## 🔧 Components

### 1. Types (`strategy-types.ts`)

Defines TypeScript interfaces for:
- **StrategyTopic**: Nested API response structure (topics → clusters → keywords)
- **StrategyCluster**: Cluster data with keywords
- **StrategyRow**: Flattened row structure for table display
- **StrategyApiResponse**: Complete API response structure
- **GetStrategySchema**: Parameters for fetching strategy data
- **StrategyCounts**: Filter counts and ranges

### 2. Custom Hook (`use-strategy.ts`)

**Purpose**: Wraps the `use-api` hook to provide Strategy-specific functionality

**Key Features**:
- Uses `api` utility from `use-api.ts` (supports auth tokens, interceptors, platforms)
- Transforms nested API response (topics → clusters → keywords) to flat table rows
- Handles pagination, filtering, sorting at API level
- Provides `fetchStrategy()` and `fetchStrategyCounts()` methods
- Calculates filter counts and ranges from data

**Usage**:
```typescript
const { fetchStrategy, fetchStrategyCounts, loading, error } = useStrategy(businessId);
```

### 3. Strategy Table Client (`strategy-table-client.tsx`)

**Purpose**: Data fetching layer using React Query

**Features**:
- Reads URL query params (page, perPage, sort, filters) using `nuqs`
- Uses React Query for data fetching with caching
- Fetches strategy data and counts in parallel
- Handles loading, error, and refetching states
- Passes data to StrategyTable component

**Props**:
- `businessId`: Business identifier (required)

### 4. Strategy Table (`strategy-table.tsx`)

**Purpose**: Main table component using useDataTable hook

**Features**:
- Uses `useDataTable` hook for table state management
- Enables advanced filtering by default
- Default sort by business relevance (highest first)
- Renders DataTable with toolbar (filters, sorts)
- Supports column resizing, visibility toggling

**Props**:
- `data`: Array of StrategyRow
- `pageCount`: Total number of pages
- `offeringCounts`: Counts for offerings filter
- `businessRelevanceRange`: Range for relevance filter
- `topicCoverageRange`: Range for coverage filter
- `searchVolumeRange`: Range for volume filter
- `isLoading`: Show skeleton while loading

### 5. Strategy Table Columns (`strategy-table-columns.tsx`)

**Purpose**: Defines column structure and metadata

**Columns**:
1. **Topic** - Text filter, sortable
2. **Business Relevance** - Range filter, color-coded (red → yellow → green)
3. **Topic Coverage** - Range filter, displayed as percentage
4. **Cluster** - Text filter, sortable
5. **Keywords** - Shows count + preview of first 2 keywords
6. **Search Volume** - Range filter, formatted with commas
7. **Offerings** - Multi-select filter, displayed as badges

**Filter Types Used**:
- `text` - For topic, cluster search
- `range` - For relevance, coverage, volume
- `multiSelect` - For offerings
- `number` - For keyword count

## 🔌 API Integration

### Backend Endpoint
```
GET /client/topic-strategy-builder
```

### Query Parameters (Supported by Backend)
- `business_id` (required) - Business identifier
- `page` (default: 1) - Page number
- `page_size` (default: 10) - Items per page
- `search` - Search term
- `offerings` - Filter by offering
- `sort_by` - Field to sort by
- `sort_order` - "asc" or "desc"

### API Response Structure
```json
{
  "status": "success",
  "metadata": {
    "language_code": "en",
    "workflow_id": "WF00001"
  },
  "output_data": {
    "items": [
      {
        "topic": "Car Accident Injury Lawyer",
        "business_relevance_score": 0.85,
        "topic_cluster_topic_coverage": 0.75,
        "offerings": ["Legal Services"],
        "clusters": [
          {
            "cluster": "cluster-1",
            "keywords": ["car accident lawyer", "auto injury attorney"],
            "total_search_volume": 5000,
            "intent_cluster_topic_coverage": 0.60
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "fetched": 10,
      "total_count": 100,
      "status": "success"
    }
  }
}
```

### Data Transformation
The hook transforms nested API structure to flattened rows:
- **Input**: Nested (topics → clusters → keywords)
- **Output**: Flat rows (one row per topic-cluster combination)

Example:
```
Topic "Lawyer" with 2 clusters → 2 table rows
```

## 🎯 Usage in Page

```tsx
import { StrategyTableClient } from '@/components/organisms/StrategyTable/strategy-table-client'

export default function BusinessStrategyPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  return (
    <div className="container mx-auto py-8">
      <StrategyTableClient businessId={businessId} />
    </div>
  )
}
```

## ✨ Features

### Server-Side Operations
- ✅ Pagination
- ✅ Sorting (by any column)
- ✅ Filtering (text, range, multi-select)
- ✅ Search (across topics, clusters, keywords)

### UI Features
- ✅ Advanced filter toolbar
- ✅ Sort controls
- ✅ Column resizing
- ✅ Column visibility toggle
- ✅ Loading states (skeleton rows)
- ✅ Error handling with retry
- ✅ URL state sync (shareable links)

### Data Features
- ✅ Nested API response transformation
- ✅ Color-coded relevance scores
- ✅ Keyword preview (first 2 + count)
- ✅ Formatted search volume
- ✅ Offerings as badges

## 🔄 Data Flow

```
1. User visits page
   ↓
2. Page extracts businessId from URL params
   ↓
3. StrategyTableClient reads URL query params (page, filters, sort)
   ↓
4. React Query calls useStrategy.fetchStrategy()
   ↓
5. useStrategy wraps use-api to call backend API
   ↓
6. API returns nested structure (topics → clusters)
   ↓
7. useStrategy transforms to flat rows
   ↓
8. StrategyTableClient passes data to StrategyTable
   ↓
9. StrategyTable uses useDataTable hook
   ↓
10. DataTable renders with toolbar and filters
    ↓
11. User interacts (filter/sort/page)
    ↓
12. URL updates → React Query refetches → Cycle repeats
```

## 📊 Filter System

### Filter Types and Operators

**Text Filters** (topic, cluster):
- Contains
- Does not contain
- Is
- Is not
- Starts with
- Ends with
- Is empty
- Is not empty

**Range Filters** (relevance, coverage, volume):
- Between
- Greater than
- Less than
- Greater than or equal
- Less than or equal

**Multi-Select Filters** (offerings):
- Is (any of selected)
- Is not (any of selected)

### Filter Combination
- AND/OR logic between filters
- Visual filter chips
- Clear individual or all filters

## 🎨 Customization

### Adding New Columns
1. Update `StrategyRow` type in `strategy-types.ts`
2. Add column definition in `strategy-table-columns.tsx`
3. Update transformation logic in `use-strategy.ts` if needed

### Changing Default Sort
Update `initialState` in `strategy-table.tsx`:
```typescript
initialState: {
  sorting: [{ id: "topic", desc: false }], // Sort by topic A-Z
}
```

### Adjusting Page Size
Default is 10. Change in `strategy-table-client.tsx`:
```typescript
const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(20));
```

## 🐛 Error Handling

### Error States
1. **API Error**: Shows error message with retry button
2. **No Business ID**: Shows loading state
3. **Network Error**: Automatic retry (2 attempts)
4. **Timeout**: Exponential backoff retry

### Loading States
1. **Initial Load**: Skeleton rows in table
2. **Refetch**: Small pulsing indicator (top-right)
3. **Placeholder Data**: Shows previous data while refetching

## 🚀 Performance

### Optimizations
- ✅ React Query caching (1 minute stale time)
- ✅ Placeholder data (keeps previous data visible)
- ✅ Memoized query keys
- ✅ Memoized columns
- ✅ Optimistic URL updates (no page reload)
- ✅ Debounced filter inputs (300ms)
- ✅ Separate counts query (5 minute stale time)

### Bundle Size
All filter table components are code-split and tree-shakeable.

## 📝 Notes

### Backend Integration
- Currently uses the existing `/client/topic-strategy-builder` endpoint
- Backend supports `page`, `page_size`, `offerings`, `search`, `sort_by`, `sort_order`
- Advanced filters can be added when backend supports them

### Future Enhancements
- [ ] Export to CSV
- [ ] Bulk actions on selected rows
- [ ] Expandable rows for keyword details
- [ ] Comparison view (compare topics)
- [ ] Saved filter presets

## 📚 References

- [Filter Table Guide](./FILTER_TABLE_GUIDE.md) - Complete filter table documentation
- [Backend API Specification](../BACKEND_API_SPECIFICATION.md) - API contract
- [Task Table Example](../src/components/organisms/TaskTable/) - Reference implementation

## 🤝 Contributing

When making changes:
1. Update types if API structure changes
2. Update column definitions if adding/removing columns
3. Update transformation logic if flattening strategy changes
4. Test with different business IDs
5. Test all filter combinations
6. Update this documentation

## 📞 Support

For issues or questions:
- Check console logs for API errors
- Verify business ID is valid
- Check Network tab for API responses
- Review React Query DevTools for cache state
