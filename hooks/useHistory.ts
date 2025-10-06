import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { makeCall, PublicRandomLink } from "@/lib/utils";

export function useHistory(activeLink: PublicRandomLink | null) {
  const queryClient = useQueryClient();
  const prevActiveLinkId = useRef<string | null>(null);

  // Query for history via direct fetch
  const historyQuery = useQuery<PublicRandomLink[]>({
    queryKey: ["get-history"],
    queryFn: async () => {
      const response = await makeCall("/track-visit", {}, 15000);
      const arr = (response?.data || []) as PublicRandomLink[];
      // Deduplicate by id
      const deduped = Array.from(
        new Map(arr.map((item) => [item.id, item])).values()
      );
      return deduped;
    },
  });

  // Mutation for optimistic update
  const addToHistory = useMutation({
    mutationFn: async (link: PublicRandomLink) => {
      return { link };
    },
    onMutate: async (link) => {
      await queryClient.cancelQueries({ queryKey: ["get-history"] });
      const previous = queryClient.getQueryData<PublicRandomLink[]>([
        "get-history",
      ]);

      queryClient.setQueryData<PublicRandomLink[]>(["get-history"], (old) => {
        // If query is still loading and we don't have data yet, wait for it
        if (!old && historyQuery.isLoading) {
          return undefined; // Don't update yet, let the query finish first
        }

        // If we have no data and query isn't loading, start with empty array
        const currentData = old || [];

        // Only add if not already present
        if (currentData.some((item) => item.id === link.id)) {
          return currentData;
        }

        return [link, ...currentData];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["get-history"], context.previous);
      }
    },
    onSettled: () => {
      // Only invalidate if the initial query has completed
      if (!historyQuery.isLoading) {
        queryClient.invalidateQueries({ queryKey: ["get-history"] });
      }
    },
  });

  // Listen for activeLink changes in storage and optimistically add
  useEffect(() => {
    const handleStorage = (changes: any, area: string) => {
      if (area === "local" && changes.activeLink) {
        const newLink = changes.activeLink.newValue;
        if (newLink && newLink.id !== prevActiveLinkId.current) {
          prevActiveLinkId.current = newLink.id;

          // Wait for initial history query to complete before adding optimistically
          if (!historyQuery.isLoading) {
            addToHistory.mutate(newLink);
          } else {
            // If still loading, defer the mutation until query completes
            const unsubscribe = queryClient
              .getQueryCache()
              .subscribe((event) => {
                if (
                  event?.query?.queryKey?.[0] === "get-history" &&
                  event.type === "updated"
                ) {
                  const query = event.query;
                  if (
                    query.state.status === "success" ||
                    query.state.status === "error"
                  ) {
                    unsubscribe();
                    addToHistory.mutate(newLink);
                  }
                }
              });
          }
        }
      }
    };
    browser.storage.onChanged.addListener(handleStorage);
    return () => browser.storage.onChanged.removeListener(handleStorage);
  }, [addToHistory, historyQuery.isLoading, queryClient]);

  // Also handle initial mount if activeLink is present
  useEffect(() => {
    if (activeLink && activeLink.id !== prevActiveLinkId.current) {
      prevActiveLinkId.current = activeLink.id;

      // Wait for initial history query to complete before adding optimistically
      if (!historyQuery.isLoading) {
        addToHistory.mutate(activeLink);
      } else {
        // If still loading, defer the mutation until query completes
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
          if (
            event?.query?.queryKey?.[0] === "get-history" &&
            event.type === "updated"
          ) {
            const query = event.query;
            if (
              query.state.status === "success" ||
              query.state.status === "error"
            ) {
              unsubscribe();
              addToHistory.mutate(activeLink);
            }
          }
        });
      }
    }
  }, [activeLink, addToHistory, historyQuery.isLoading, queryClient]);

  return { ...historyQuery, addToHistoryMutation: addToHistory };
}
