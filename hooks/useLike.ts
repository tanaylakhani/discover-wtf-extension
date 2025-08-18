import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

async function bgFetch<T>(
  type: string,
  payload: Record<string, any>
): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage({ type, ...payload }, (response) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}

export function useLike(linkId: string) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const lastAction = useRef<null | boolean>(null);

  const likeQuery = useQuery({
    queryKey: ["like-status", linkId],
    queryFn: async () => {
      const result = await bgFetch<{
        data: { liked: boolean; count: number };
      }>("GET_LIKE_STATUS", { linkId });
      return result?.data;
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (liked: boolean) => {
      setPending(true);
      lastAction.current = liked;
      return bgFetch<{
        success: boolean;
        error?: string;
        data?: { liked: boolean; count: number };
      }>("TOGGLE_LIKE", { linkId, liked });
    },
    onMutate: async (liked: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["like-status", linkId] });

      const previous = queryClient.getQueryData<{
        liked: boolean;
        count: number;
      }>(["like-status", linkId]);

      if (previous) {
        queryClient.setQueryData(["like-status", linkId], {
          liked,
          count: liked ? previous.count + 1 : previous.count - 1,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["like-status", linkId], context.previous);
      }
    },
    onSuccess: (result, liked, context) => {
      // ⬅ Change: Merge server response with optimistic state to avoid snap-back
      const optimistic = queryClient.getQueryData(["like-status", linkId]);
      queryClient.setQueryData(["like-status", linkId], {
        ...(optimistic || {}),
        ...(result?.data || {}),
      });
    },
  });

  const safeToggleLike = (liked: boolean) => {
    if (pending && lastAction.current === liked) return;
    toggleLikeMutation.mutate(liked);
  };

  return {
    liked: likeQuery.data?.liked ?? false,
    count: likeQuery.data?.count ?? 0,
    toggleLike: safeToggleLike,
    pending: pending || toggleLikeMutation.isPending,
    isLoading: likeQuery.isPending,
  };
}
