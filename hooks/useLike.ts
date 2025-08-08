import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function bgFetch<T>(
  type: string,
  payload: Record<string, any>
): Promise<T> {
  return new Promise((resolve, reject) => {
    console.log("📤 Sending message:", { type, ...payload });

    browser.runtime.sendMessage({ type, ...payload }, (response) => {
      console.log("📥 Received response:", response);

      if (browser.runtime.lastError) {
        console.error("❌ Runtime error:", browser.runtime.lastError);
        reject(new Error(browser.runtime.lastError.message));
        return;
      }

      if (response?.error) {
        console.error("❌ Response error:", response.error);
        reject(new Error(response.error));
        return;
      }

      resolve(response);
    });
  });
}

export function useLike(linkId: string) {
  const queryClient = useQueryClient();

  const likeQuery = useQuery({
    queryKey: ["like-status", linkId],
    queryFn: async () => {
      console.log("🔍 Fetching like status for linkId:", linkId);
      try {
        const result = await bgFetch<{
          data: { liked: boolean; count: number };
        }>("GET_LIKE_STATUS", {
          linkId,
        });
        console.log("✅ Like status result:", result);
        return result?.data;
      } catch (error) {
        console.error("❌ Error fetching like status:", error);
        throw error;
      }
    },
    // enabled: !!linkId, // Only run if linkId exists
    // retry: 2, // Retry failed requests
    // staleTime: 30000, // Cache for 30 seconds
  });

  console.log("📊 Like query state:", {
    status: likeQuery.status,
    data: likeQuery.data,
    error: likeQuery.error,
    isPending: likeQuery.isPending,
    isError: likeQuery.isError,
    linkId,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (liked: boolean) => {
      console.log("🔍 Fetching like status for linkId:", linkId);
      try {
        const result = await bgFetch<{ success: boolean; error: number }>(
          "TOGGLE_LIKE",
          {
            linkId,
            liked,
          }
        );
        return result;
      } catch (error) {
        console.error("❌ Error fetching like status:", error);
        throw error;
      }
    },
    onMutate: async (liked: boolean) => {
      await queryClient.cancelQueries({
        queryKey: ["like-status", linkId],
      });

      const previous = queryClient.getQueryData<{
        liked: boolean;
        count: number;
      }>(["like-status", linkId]);

      if (previous) {
        queryClient.setQueryData(["like-status", linkId], {
          liked,
          count: previous.count + (liked ? 1 : -1),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["like-status", linkId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["like-status", linkId] });
    },
  });

  return { likeQuery, toggleLike: toggleLikeMutation.mutate };
}
