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
        if (!old) return [link];
        // Only add if not already present
        if (old.some((item) => item.id === link.id)) return old;
        return [link, ...old];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["get-history"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get-history"] });
    },
  });

  // Listen for activeLink changes in storage and optimistically add
  useEffect(() => {
    const handleStorage = (changes: any, area: string) => {
      if (area === "local" && changes.activeLink) {
        const newLink = changes.activeLink.newValue;
        if (newLink && newLink.id !== prevActiveLinkId.current) {
          prevActiveLinkId.current = newLink.id;
          addToHistory.mutate(newLink);
        }
      }
    };
    browser.storage.onChanged.addListener(handleStorage);
    return () => browser.storage.onChanged.removeListener(handleStorage);
  }, [addToHistory]);

  // Also handle initial mount if activeLink is present
  useEffect(() => {
    if (activeLink && activeLink.id !== prevActiveLinkId.current) {
      prevActiveLinkId.current = activeLink.id;
      addToHistory.mutate(activeLink);
    }
  }, [activeLink, addToHistory]);

  return { ...historyQuery, addToHistoryMutation: addToHistory };
}
