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

export function useBookmark(linkId: string) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const lastAction = useRef<null | boolean>(null);

  const bookmarkQuery = useQuery({
    queryKey: ["bookmark-status", linkId],
    queryFn: async () => {
      const result = await bgFetch<{ bookmarked: boolean }>(
        "GET_BOOKMARK_STATUS",
        { linkId }
      );
      return result;
    },
    staleTime: 30000,
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (bookmarked: boolean) => {
      setPending(true);
      lastAction.current = bookmarked;

      const result = await bgFetch<{
        success: boolean;
        error: string | null;
        data?: { bookmarked: boolean };
      }>("TOGGLE_BOOKMARK", {
        linkId,
        bookmarked,
      });

      if (!result?.success && result?.error) {
        throw new Error(result.error || "Failed to toggle bookmark");
      }

      return result?.data || { bookmarked };
    },
    onMutate: async (bookmarked: boolean) => {
      await queryClient.cancelQueries({
        queryKey: ["bookmark-status", linkId],
      });

      const previous = queryClient.getQueryData<{ bookmarked: boolean }>([
        "bookmark-status",
        linkId,
      ]);

      queryClient.setQueryData(["bookmark-status", linkId], { bookmarked });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["bookmark-status", linkId], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["bookmark-status", linkId], (prev) => ({
        ...(prev || {}),
        ...(data || {}),
      }));
    },
    // onSettled: () => {
    //   setPending(false);
    //   // Delay or skip invalidation to avoid snap-back
    //   setTimeout(() => {
    //     queryClient.invalidateQueries({
    //       queryKey: ["bookmark-status", linkId],
    //     });
    //   }, 500); // small buffer to let DB update
    // },
  });

  const safeToggleBookmark = (bookmarked: boolean) => {
    if (pending && lastAction.current === bookmarked) return;
    toggleBookmarkMutation.mutate(bookmarked);
  };

  return { bookmarkQuery, toggleBookmark: safeToggleBookmark, pending };
}
