import { QueryClient } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();
export default queryClient;
export type QueryClientType = typeof queryClient;
