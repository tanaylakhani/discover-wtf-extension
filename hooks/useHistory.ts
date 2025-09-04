import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicRandomLink } from "@/lib/utils";

export function useHistory(activeLink: PublicRandomLink | null) {
  const queryClient = useQueryClient();

  // Query for history via background
  const historyQuery = useQuery<PublicRandomLink[]>({
    queryKey: ["get-history"],
    queryFn: async () => {
      const response = await browser.runtime.sendMessage({
        type: "GET_HISTORY",
      });
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
      await browser.runtime.sendMessage({ type: "ADD_TO_HISTORY", link });
      return { link };
    },
    onMutate: async (link) => {
      await queryClient.cancelQueries({ queryKey: ["get-history"] });
      const previous = queryClient.getQueryData<PublicRandomLink[]>([
        "get-history",
      ]);
      queryClient.setQueryData<PublicRandomLink[]>(["get-history"], (old) => [
        link,
        ...(old || []),
      ]);
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

  return { ...historyQuery, addToHistoryMutation: addToHistory };
}
