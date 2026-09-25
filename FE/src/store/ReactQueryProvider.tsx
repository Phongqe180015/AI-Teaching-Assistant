import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Create a singleton QueryClient instance
 * Configuration: https://tanstack.com/query/latest/docs/react/guides/important-defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long until a query is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes default
      // Garbage collection time: how long to keep unused data in memory
      gcTime: 10 * 60 * 1000, // 10 minutes default
      // Retry logic
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default (can override per-query)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations once by default
      retry: 1,
    },
  },
})

/**
 * Provider component that wraps the app with React Query
 */
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

/**
 * Export queryClient for manual invalidation if needed
 */
export { queryClient }
