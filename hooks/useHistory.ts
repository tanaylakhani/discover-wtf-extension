import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeCall, PublicRandomLink } from "@/lib/utils";

export function useHistory(activeLink: PublicRandomLink | null) {
  const queryClient = useQueryClient();

  // Query for history
  const historyQuery = useQuery<PublicRandomLink[]>({
    queryKey: ["get-history"],
    queryFn: async () => {
      const response = await makeCall("/track-visit");
      const arr = (response?.data || []) as PublicRandomLink[];
      // Deduplicate by id
      const deduped = Array.from(
        new Map(arr.map((item) => [item.id, item])).values()
      );
      console.log({ deduped });
      return deduped;
    },
  });

  // Mutation for optimistic update
  const addToHistory = useMutation({
    mutationFn: async (link: PublicRandomLink) => {
      return { link };
    },
    onMutate: async (link) => {
      await queryClient.cancelQueries({
        queryKey: ["get-history"],
      });

      console.log("Inside useHistory Mutation");
      const previous = queryClient.getQueryData<PublicRandomLink[]>([
        "get-history",
      ]);
      // Fetch the latest activeLink from local storage synchronously for optimistic update
      // const { activeLink: latestActiveLink } = await browser.storage.local.get(
      //   "activeLink"
      // );
      // if (latestActiveLink) {
      console.log("Inside useHistory Mutation ", link);

      queryClient.setQueryData<PublicRandomLink[]>(["get-history"], (old) => {
        // Add to the top
        return [link, ...(old || [])];
      });
      // }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["get-history"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-history"],
      });
    },
  });

  return { ...historyQuery, addToHistoryMutation: addToHistory };
}
