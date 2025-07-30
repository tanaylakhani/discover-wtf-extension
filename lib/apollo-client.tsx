import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { getGqlToken } from "./utils";

// GraphQL API endpoint
const httpLink = createHttpLink({
  uri: "https://api.betterstacks.com/graphql",
  // Browser extension specific configurations
  credentials: "omit",
  // Custom headers for browser extension
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});  

// Enhanced error handling for browser extensions
const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          extensions
        );

        // Handle specific GraphQL errors
        if (extensions?.code === "UNAUTHENTICATED") {
          console.warn("Authentication required - redirecting to login");
          // Could trigger login flow here
        }
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError.message}`, {
        name: networkError.name,
        ...("statusCode" in networkError && {
          statusCode: networkError.statusCode,
        }),
        ...("result" in networkError && { result: networkError.result }),
      });

      // Handle specific network errors
      if ("statusCode" in networkError && networkError.statusCode === 401) {
        console.warn("Unauthorized - clearing auth data");
        // Could clear auth data and redirect to login
      }
    }
  }
);

// Enhanced retry logic for browser extensions
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 5000, // Increased max delay for better UX
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Don't retry on authentication errors
      if (
        error?.message?.includes("UNAUTHENTICATED") ||
        error?.message?.includes("Not authenticated") ||
        error?.statusCode === 401
      ) {
        return false;
      }

      // Retry on network errors and server errors (5xx)
      return (
        !!error &&
        (!error.statusCode ||
          error.statusCode >= 500 ||
          error.name === "NetworkError")
      );
    },
  },
});

// Enhanced auth link with better error handling
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await getGqlToken();

    console.log("Apollo Client: Setting auth context", {
      hasToken: !!token?.gqlToken,
      tokenLength: token?.gqlToken?.length,
    });

    return {
      headers: {
        ...headers,
        // Use standard Authorization header format
        ...(token ? { Authorization: `Bearer ${token?.gqlToken}` } : {}),
        // Also keep X-Authorization for backward compatibility
        "X-Authorization": token?.gqlToken || "",
      },
    };
  } catch (error) {
    console.error("Apollo Client: Failed to get auth token:", error);
    return {
      headers: {
        ...headers,
        "X-Authorization": "",
      },
    };
  }
});

// Enhanced cache configuration for browser extensions
const cache = new InMemoryCache({
  // Optimize for browser extension memory constraints
  resultCaching: false, // Disable result caching to save memory
  typePolicies: {
    Query: {
      fields: {
        user: {
          merge: true,
        },
      },
    },
  },
});

// Create the Apollo Client instance with enhanced configuration
export const apolloClient = new ApolloClient({
  link: from([retryLink, errorLink, authLink, httpLink]),
  cache,
  // Optimized default options for browser extensions
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network", // Better UX with cache-first approach
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: "cache-first", // Use cache when available
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
  // Browser extension optimizations
  ssrMode: false, // We're definitely in browser
  connectToDevTools: process.env.NODE_ENV === "development",

  // Optional: Add client name and version for Apollo Studio
  name: "Stacks Browser Extension",
  version: "3.0.0",
});

// Helper function to clear cache (useful for logout)
export const clearApolloCache = () => {
  return apolloClient.clearStore();
};

// Helper function to reset store (cache + local state)
export const resetApolloStore = () => {
  return apolloClient.resetStore();
};

export default apolloClient;
