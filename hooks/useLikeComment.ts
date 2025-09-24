import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Comment } from "@/components/sidepanel/ThreadsTab";
import { makeCall } from "@/lib/utils";

// ...existing code...

export function useDeleteComment(activeLinkId: string, sortOption: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const paramsStingified = new URLSearchParams({ commentId });
      const response = await makeCall(
        `/comment?${paramsStingified.toString()}`,
        {
          method: "DELETE",
        }
      );
      if (!response?.success) {
        throw new Error(response.error || "Failed to delete comment");
      }
      return commentId;
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({
        queryKey: ["get-comments", activeLinkId, sortOption],
      });
      const previous = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLinkId,
        sortOption,
      ]);

      function removeComment(comments: Comment[]): Comment[] {
        return comments
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? removeComment(c.replies) : [],
          }));
      }

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLinkId, sortOption],
        (old) => (old ? removeComment(old) : old)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["get-comments", activeLinkId, sortOption],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-comments", activeLinkId, sortOption],
      });
    },
  });
}

export function useLikeComment(
  commentId: string,
  activeLinkId: string,
  sortOption: string
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (liked: boolean) => {
      // Send to background (or API) with the intended new liked value
      await browser.runtime.sendMessage({
        type: "LIKE_COMMENT",
        commentId,
        liked,
      });
      return liked;
    },
    onMutate: async (liked: boolean) => {
      await queryClient.cancelQueries({
        queryKey: ["get-comments", activeLinkId, sortOption],
      });
      const previous = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLinkId,
        sortOption,
      ]);

      // Helper to update the comment and its replies recursively
      function updateComments(comments: Comment[]): Comment[] {
        return comments.map((c) => {
          if (c.id === commentId) {
            const newLikeCount = liked
              ? c.likeCount + 1
              : Math.max(c.likeCount - 1, 0);
            const newReplyCount = c.replyCount; // Update if your logic changes replyCount on like
            return {
              ...c,
              liked,
              likeCount: newLikeCount,
              replyCount: newReplyCount,
            };
          }
          return {
            ...c,
            replies: c.replies ? updateComments(c.replies) : [],
          };
        });
      }

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLinkId, sortOption],
        (old) => (old ? updateComments(old) : old)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["get-comments", activeLinkId, sortOption],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-comments", activeLinkId, sortOption],
      });
    },
  });

  return {
    toggleLike: (currentLiked: boolean) => mutation.mutate(!currentLiked),
    ...mutation,
  };
}
