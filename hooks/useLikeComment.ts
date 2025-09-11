import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

export function useLikeComment(commentId: string) {
  const queryClient = useQueryClient();

  // Query for like status and count
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["comment-like-status", commentId],
    queryFn: async () => {
      // Ask background for like status and count
      const response = await browser.runtime.sendMessage({
        type: "GET_COMMENT_LIKE_STATUS",
        commentId,
      });
      // Response: { liked: boolean, likeCount: number }
      return response;
    },
    enabled: !!commentId,
  });

  // Mutation for toggling like
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await browser.runtime.sendMessage({
        type: "LIKE_COMMENT",
        commentId,
        liked: data?.liked,
      });
      return response;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["comment-like-status", commentId],
      });
      const previous = queryClient.getQueryData([
        "comment-like-status",
        commentId,
      ]);
      // Optimistically update
      queryClient.setQueryData(
        ["comment-like-status", commentId],
        (old: any) => {
          if (!old) return old;
          const liked = !old.liked;
          const likeCount = old.likeCount ?? 0;
          return {
            ...old,
            liked,
            likeCount: liked ? likeCount + 1 : Math.max(likeCount - 1, 0),
          };
        }
      );
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["comment-like-status", commentId],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["comment-like-status", commentId],
      });
      queryClient.invalidateQueries({ queryKey: ["get-comments"] });
    },
  });

  return {
    liked: data?.liked ?? false,
    likeCount: data?.likeCount ?? 0,
    isLoading,
    refetch,
    toggleLike: mutation.mutate,
    ...mutation,
  };
}
