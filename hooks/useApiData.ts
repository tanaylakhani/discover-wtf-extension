import { useQuery } from "@tanstack/react-query";

// Define the type for our API response
interface ApiResponse<T = any> {
  data: T;
  error?: string;
  success: boolean;
}

// Define the type for our query options
interface UseApiDataOptions {
  enabled?: boolean;
  retry?: number;
  staleTime?: number;
  cacheTime?: number;
}

// Define the type for fetch options
interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Custom hook to fetch data from Next.js API routes via background script
 * @param endpoint - The API endpoint path (e.g., '/api/users')
 * @param options - Query options for TanStack Query
 * @param fetchOptions - Fetch options for the API request
 * @returns TanStack Query result with data, loading, and error states
 */
export function useApiData<T = any>(
  keys: string[],
  endpoint: string,
  options: UseApiDataOptions = {},
  fetchOptions: FetchOptions = {}
) {
  return useQuery<ApiResponse<T>, Error>({
    queryKey: [...keys, endpoint, fetchOptions],
    queryFn: async () => {
      return new Promise((resolve, reject) => {
        // Send message to background script
        browser.runtime.sendMessage(
          {
            type: "FETCH_API_DATA",
            payload: {
              endpoint,
              options: fetchOptions,
            },
          },
          (response) => {
            if (browser.runtime.lastError) {
              reject(new Error(browser.runtime.lastError.message));
              return;
            }

            if (!response.success) {
              reject(new Error(response.error || "Unknown error occurred"));
              return;
            }

            resolve(response?.data);
          }
        );
      });
    },
    ...options,
  });
}
