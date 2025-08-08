"use client";
import { makeCall, makeCommentsCall, PublicRandomLink } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import ThreadChatBox from "./ThreadChatBox";
import { ScrollArea } from "../ui/scroll-area";
import { Loader } from "lucide-react";

type Comment = {
  linkId: string;
  id: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  commentedAt: Date;
  media: { id: string; url: string; type: string; createdAt: Date }[] | null;
};

type ThreadsTabProps = {
  activeLink: PublicRandomLink | null;
  activeTab: string;
};

const ThreadsTab: React.FC<ThreadsTabProps> = ({ activeLink, activeTab }) => {
  const queryClient = useQueryClient();

  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);

  const {
    data,
    isLoading: isFetchingComments,
    refetch,
  } = useQuery({
    queryKey: ["get-comments", activeLink?.id],
    queryFn: async () => {
      const stringifiedParams = new URLSearchParams({
        linkId: activeLink?.id as string,
      }).toString();

      const response = await makeCall(`/comment?${stringifiedParams}`);
      console.log("fetching comments", response);
      return (response?.comments || []) as Comment[];
    },
    // enabled: !!activeLink?.id,
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async ({
      files,
      message,
    }: {
      message: string;
      files: File[];
    }) => {
      const params = {
        linkId: activeLink?.id as string,
      };
      const stringifiedParams = new URLSearchParams(params).toString();
      console.log("Posting comment with params:", stringifiedParams);
      const formData = new FormData();
      formData.append("content", message);
      if (files.length > 0) {
        formData.append("file", files[0]);
      }
      console.log({ formData: Array.from(formData.entries()) });
      const response = await makeCommentsCall(`/comment?${stringifiedParams}`, {
        method: "POST",
        body: formData,
      });

      return response.comment;
    },

    // Optimistic update
    onMutate: async ({
      message,
      files,
    }: {
      message: string;
      files: File[];
    }) => {
      console.log("🚀 onMutate called with:", { message, files });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["get-comments", activeLink?.id],
      });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLink?.id,
      ]);

      console.log("📸 Previous comments:", previousComments);

      // Create optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`, // Temporary ID
        linkId: activeLink?.id || "",
        userId: "current-user", // You might want to get this from auth context
        content: message,
        isPrivate: false,
        commentedAt: new Date(),
        media:
          files.length > 0
            ? [
                {
                  id: `temp-${Date.now()}-${files[0]?.name}`, // Temporary ID for media
                  url: URL.createObjectURL(files[0]), // Create a local URL for the file
                  type: files[0]?.type.startsWith("image/") ? "image" : "video",
                  createdAt: new Date(),
                },
              ]
            : null,
      };

      console.log("✨ Optimistic comment created:", optimisticComment);

      // Optimistically update the cache
      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id],
        (oldComments) => {
          const newComments = [...(oldComments || []), optimisticComment];
          console.log("💾 Setting new comments:", newComments);
          return newComments;
        }
      );

      // Verify the data was set
      const updatedComments = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLink?.id,
      ]);
      console.log("✅ Comments after update:", updatedComments);

      // Return context with snapshot
      return { previousComments, optimisticComment };
    },

    // On success, replace optimistic comment with real data
    onSuccess: (newComment, variables, context) => {
      console.log("🎉 onSuccess called with:", newComment);

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id],
        (oldComments) => {
          if (!oldComments || !context?.optimisticComment) return oldComments;

          // Replace the optimistic comment with the real one
          const updatedComments = oldComments.map((comment) =>
            comment.id === context.optimisticComment.id ? newComment : comment
          );
          console.log(
            "🔄 Replacing optimistic with real comment:",
            updatedComments
          );
          return updatedComments;
        }
      );

      // Clear the input on success
      setInput("");
      setFiles([]);
    },

    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.log("❌ onError called:", error);

      if (context?.previousComments) {
        queryClient.setQueryData(
          ["get-comments", activeLink?.id],
          context.previousComments
        );
        console.log("🔙 Rolled back to previous comments");
      }
      console.error("Failed to post comment:", error);
    },

    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      console.log("🔄 onSettled called, invalidating queries");
      queryClient.invalidateQueries({
        queryKey: ["get-comments", activeLink?.id],
      });
    },
  });

  return (
    <div>
      {isFetchingComments ? (
        <div className="flex items-center justify-center px-6 mt-5">
          <Loader className="animate-spin size-6 " />
        </div>
      ) : data!.length === 0 ? (
        <div className="flex items-center justify-center px-6 mt-5">
          <span>No Comment yet. Be the first to comment!</span>
        </div>
      ) : (
        <div className="mb-36">
          {data!.map((comment, index) => (
            <div
              key={comment.id || index} // Use comment ID as key, fallback to index
              className="border-b w-full px-6 border-neutral-200 py-2"
            >
              <p className="text-sm">{comment.content}</p>
              {comment?.media && (
                <div className="mt-2 w-full flex gap-2">
                  {comment.media.map((file, i) => (
                    <div key={i} className="mt-2">
                      {file?.type.startsWith("image") ? (
                        <img
                          src={file.url}
                          alt={file.id}
                          className="border border-neutral-200 rounded-xl  w-full h-[250px] object-cover aspect-square"
                        />
                      ) : (
                        <video
                          src={file.url}
                          className="border border-neutral-200 rounded-xl max-w-sm w-full h-[250px] object-cover aspect-square"
                          controls
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {comment.id.startsWith("temp-") && (
                <span className="text-xs text-gray-500 italic">Sending...</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="bottom-16 flex items-center justify-center w-full absolute ">
        <ThreadChatBox
          input={input}
          files={files}
          setFiles={setFiles}
          isLoading={isPending}
          setInput={setInput}
          onSubmit={async (msg: string, files: File[]) => {
            try {
              await mutateAsync({ message: msg, files });
            } catch (error) {
              console.error("Failed to submit comment:", error);
            }
          }}
        />
      </div>
    </div>
  );
};

export default ThreadsTab;
