# AITA Frontend Architecture Guide

## Overview

This frontend uses a modern, enterprise-grade React architecture with the following key patterns:

1. **Service Layer Pattern**: All API calls abstracted into services
2. **React Query (TanStack Query)**: Data fetching, caching, and synchronization
3. **Custom Hooks**: Easy data access with automatic caching
4. **TypeScript**: Full type safety throughout
5. **Form Management**: React Hook Form + Zod for validation
6. **Error Handling**: Global error boundaries + component-level error states
7. **Responsive Design**: Mobile-first approach with Tailwind CSS

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (Button, Card, Input, etc.)
│   ├── common/          # Shared components (ErrorBoundary, LoadingSpinner)
│   ├── layout/          # Layout wrappers
│   ├── modules/         # Feature-specific components
│   ├── forms/           # Form components
│   └── icons/           # Icon system
├── hooks/               # Custom React Query hooks
├── services/            # API service layer
├── providers/           # Context providers (QueryClientProvider)
├── context/             # React Context (AuthContext)
├── pages/               # Route components
├── types/               # TypeScript definitions
├── lib/
│   ├── api.ts          # HTTP client setup
│   └── schemas/        # Zod validation schemas
├── constants/           # App constants
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

---

## Service Layer Pattern

### Creating a New Service

Services encapsulate all API calls for a specific domain:

```typescript
// src/services/exampleService.ts

import { api } from '@/lib/api'

export const exampleService = {
  // Fetch operation
  getItems: async () => {
    return api.getItems()
  },

  // Create operation
  createItem: async (data: unknown) => {
    return api.createItem(data)
  },

  // Update operation
  updateItem: async (id: string, data: unknown) => {
    return api.updateItem(id, data)
  },

  // Delete operation
  deleteItem: async (id: string) => {
    return api.deleteItem(id)
  },
}
```

### Add to Services Index

```typescript
// src/services/index.ts
export * from './exampleService'
```

---

## React Query Hooks Pattern

### Creating Query Hooks

Query hooks provide automatic caching, background refetching, and error handling:

```typescript
// src/hooks/useExamples.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { exampleService } from '@/services'
import type { ExampleRow } from '@/lib/api'

const EXAMPLES_QUERY_KEY = ['examples']

// Fetch data
export function useExamples(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...EXAMPLES_QUERY_KEY, filters],
    queryFn: () => exampleService.getItems(filters),
    staleTime: 5 * 60 * 1000,      // Data stale after 5 minutes
    gcTime: 10 * 60 * 1000,        // Keep in memory for 10 minutes
  })
}

// Create with automatic cache update
export function useCreateExample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: unknown) => exampleService.createItem(data),
    onSuccess: (newItem) => {
      // Option 1: Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: EXAMPLES_QUERY_KEY })

      // Option 2: Optimistically update cache
      queryClient.setQueryData<ExampleRow[]>(EXAMPLES_QUERY_KEY, (old) =>
        old ? [...old, newItem] : [newItem]
      )
    },
  })
}
```

### Using Hooks in Components

```typescript
import { useExamples, useCreateExample } from '@/hooks'
import { LoadingSpinner, ErrorState } from '@/components/common'

export function ExamplesPage() {
  const { data, isLoading, error, refetch } = useExamples()
  const { mutate: createExample } = useCreateExample()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState message={error.message} onRetry={refetch} />

  return (
    <div>
      {data?.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

---

## Form Handling with React Hook Form + Zod

### Define Validation Schema

```typescript
// src/lib/schemas/exampleSchemas.ts

import { z } from 'zod'

export const createExampleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0, 'Age must be positive'),
})

export type CreateExampleFormData = z.infer<typeof createExampleSchema>
```

### Use Form in Component

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExampleSchema, type CreateExampleFormData } from '@/lib/schemas'
import { useCreateExample } from '@/hooks'

export function CreateExampleForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateExampleFormData>({
    resolver: zodResolver(createExampleSchema),
  })

  const { mutate, isPending } = useCreateExample()

  const onSubmit = (data: CreateExampleFormData) => {
    mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input type="email" {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Create'}
      </button>
    </form>
  )
}
```

---

## Error Handling

### Error Boundary (Component-Level)

```typescript
import { ErrorBoundary } from '@/components/common'

export function MyPage() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  )
}
```

### Error State (Data Fetching)

```typescript
import { useExamples } from '@/hooks'
import { ErrorState } from '@/components/common'

export function ExamplesPage() {
  const { data, error, refetch } = useExamples()

  if (error) {
    return (
      <ErrorState
        title="Failed to load examples"
        message={error.message}
        onRetry={refetch}
      />
    )
  }

  return <div>{/* content */}</div>
}
```

---

## Loading States

### Query Loading State

```typescript
import { LoadingSpinner, SkeletonLoader } from '@/components/common'

export function DataList() {
  const { data, isLoading } = useExamples()

  if (isLoading) {
    return <SkeletonLoader rows={5} />
  }

  return <div>{/* content */}</div>
}
```

---

## Adding New Features

### Step 1: Add API Endpoint (Backend)

```typescript
// Backend API endpoint
GET /api/examples
POST /api/examples
```

### Step 2: Create Service

```typescript
// src/services/exampleService.ts
export const exampleService = {
  getExamples: () => api.getExamples(),
  createExample: (data) => api.createExample(data),
}
```

### Step 3: Create Hooks

```typescript
// src/hooks/useExamples.ts
export function useExamples() {
  return useQuery({
    queryKey: ['examples'],
    queryFn: exampleService.getExamples,
  })
}
```

### Step 4: Create Component

```typescript
// src/pages/ExamplesPage.tsx
import { useExamples } from '@/hooks'

export function ExamplesPage() {
  const { data, isLoading, error } = useExamples()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState message={error.message} />

  return <div>{/* render data */}</div>
}
```

### Step 5: Add Route

```typescript
// src/App.tsx
<Route path="/examples" element={<ExamplesPage />} />
```

---

## Best Practices

### 1. Use Constant Query Keys

```typescript
// Good
const QUERY_KEY = ['items']
const QUERY_KEY_BY_ID = ['items', id]

// Avoid
useQuery({ queryKey: ['items'] })
```

### 2. Set Appropriate Stale Times

```typescript
// Rarely changes - long stale time
useQuery({
  queryFn: getSettings,
  staleTime: 30 * 60 * 1000, // 30 minutes
})

// Changes frequently - short stale time
useQuery({
  queryFn: getSubmissions,
  staleTime: 2 * 60 * 1000, // 2 minutes
})
```

### 3. Invalidate Cache After Mutations

```typescript
useMutation({
  mutationFn: createItem,
  onSuccess: () => {
    // Refetch list after creating item
    queryClient.invalidateQueries({ queryKey: ['items'] })
  },
})
```

### 4. Handle Loading and Error States

```typescript
const { data, isLoading, error, refetch } = useQuery({...})

if (isLoading) return <Loader />
if (error) return <Error onRetry={refetch} />

return <div>{data}</div>
```

### 5. Use Zod for Validation

```typescript
// Type-safe validation
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

type FormData = z.infer<typeof schema>
```

---

## Debugging Tips

### 1. React Query DevTools

```typescript
// Install: npm install @tanstack/react-query-devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
```

### 2. Check Query Status

```typescript
const { status, data, error, isFetching } = useQuery({...})

console.log({
  status,        // 'pending' | 'success' | 'error'
  data,
  error,
  isFetching,    // true while refetching
})
```

### 3. Monitor API Calls

```typescript
// Use browser DevTools Network tab
// Check for duplicate requests (use staleTime to prevent)
// Monitor cache hits
```

---

## Common Patterns

### Refetching Data

```typescript
const { refetch } = useQuery({...})

// Manual refetch
<button onClick={() => refetch()}>Refresh</button>

// Automatic refetch on window focus
useQuery({
  queryFn: getData,
  refetchOnWindowFocus: true,
})
```

### Dependent Queries

```typescript
const { data: user } = useUser(userId)
const { data: posts } = usePosts(user?.id, {
  enabled: !!user?.id, // Only fetch when user exists
})
```

### Pagination

```typescript
const [page, setPage] = useState(1)

const { data } = useQuery({
  queryKey: ['items', page],
  queryFn: () => getItems({ page }),
})
```

### Infinite Queries

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: ({ pageParam = 1 }) => getItems({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
})
```

---

## Performance Tips

1. **Code Splitting**: Lazy load pages by route
2. **Memoization**: Use `React.memo()` for pure components
3. **Query Keys**: Use stable query keys to prevent unnecessary refetches
4. **Stale Time**: Set appropriate stale times per domain
5. **Images**: Optimize and lazy load images
6. **Bundle Size**: Monitor with `webpack-bundle-analyzer`

---

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zod Docs](https://zod.dev)
- [React Hook Form Docs](https://react-hook-form.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

