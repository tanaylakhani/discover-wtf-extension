"use client";
import { makeCall, makeCommentsCall, PublicRandomLink } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import useMeasure from "react-use-measure";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import ThreadChatBox from "./ThreadChatBox";
import { User } from "@/lib/graphql/user";
import CommentCard from "./comment";

export type TCommentAuthor = {
  id: string;
  name: string | null | undefined;
  username: string | null | undefined;
  email: string;
  avatar: string | null | undefined;
};

export type Comment = {
  linkId: string;
  id: string;
  userId: string;
  content: string;
  user: TCommentAuthor;
  isPrivate: boolean;
  commentedAt: Date;
  media: { id: string; url: string; type: string; createdAt: Date }[] | null;
};

type ThreadsTabProps = {
  activeLink: PublicRandomLink | null;
  activeTab: string;
  user?: User;
  height: number;
};

const ThreadsTab: React.FC<ThreadsTabProps> = ({
  activeLink,
  user,
  height,
}) => {
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
      const response = await browser.runtime.sendMessage({
        type: "GET_COMMENTS",
        linkId: activeLink?.id as string,
      });
      console.log("fetching comments", response);
      return (response?.comments || []) as Comment[];
    },
    // enabled: !!activeLink?.id,
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async ({
      files,
      message,
      user,
    }: {
      message: string;
      files: File[];
      user: TCommentAuthor;
    }) => {
      // Convert files to base64 or send as needed, or just send metadata if not supported
      // For simplicity, we'll skip file upload in this refactor, but you can adapt as needed
      const response = await browser.runtime.sendMessage({
        type: "POST_COMMENT",
        linkId: activeLink?.id as string,
        message,
        files,
        user,
        // Optionally: files
      });
      return response.comment;
    },

    // Optimistic update
    onMutate: async ({ message, files, user }) => {
      setInput("");
      setFiles([]);

      await queryClient.cancelQueries({
        queryKey: ["get-comments", activeLink?.id as string],
      });
      const previousComments = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLink?.id,
      ]);

      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        linkId: activeLink?.id || "",
        userId: user?.id,
        content: message,
        user: user,
        isPrivate: false,
        commentedAt: new Date(),
        media: files.length
          ? [
              {
                id: `temp-${Date.now()}-${files[0].name}`,
                url: URL.createObjectURL(files[0]),
                type: files[0].type.startsWith("image/") ? "image" : "video",
                createdAt: new Date(),
              },
            ]
          : null,
      };

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id],
        (old) => [optimisticComment, ...(old || [])]
      );

      return { previousComments, optimisticComment, message, files };
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
      if (context?.message || context?.files) {
        setInput(context.message); // Repopulate input with failed message
        setFiles(context.files); // Repopulate files with failed files
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

  const [ref, bounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${height + bounds?.height}px)`;
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [data?.length]);
  console.log(data?.length);
  return (
    <div className="">
      {isFetchingComments ? (
        <LoadingSkeleton />
      ) : data!.length === 0 ? (
        <EmptyComments height={scrollAreaHeight} />
      ) : (
        <ScrollArea
          style={{ height: scrollAreaHeight }}
          className=" overflow-y-auto "
        >
          <ScrollAreaPrimitive.Viewport>
            <div ref={viewportRef} className="mb-10">
              {data!.map((comment, index) => (
                <CommentCard comment={comment} key={index} />
              ))}
            </div>
          </ScrollAreaPrimitive.Viewport>
          {/* </ScrollAreaPrimitive.Viewport> */}
        </ScrollArea>
      )}
      <div
        ref={ref}
        className="pb-2 px-2 flex items-center justify-center gap-2"
      >
        <ThreadChatBox
          input={input}
          files={files}
          setFiles={setFiles}
          isLoading={isPending}
          setInput={setInput}
          onSubmit={async (msg: string, files: File[]) => {
            try {
              await mutateAsync({
                message: msg,
                files,
                user: {
                  id: user!.id,
                  name: user!.name,
                  avatar: user!.profile_image_url,
                  email: user!.email,
                  username: user!.username,
                },
              });
            } catch (error) {
              console.error("Failed to submit comment:", error);
            }
          }}
        />
      </div>
    </div>
  );
};

export const LoadingSkeleton = () => {
  return (
    <div className="flex flex-col p-2">
      {[...Array.from({ length: 10 })].map((_, index) => (
        <div
          key={index}
          className="px-2 bg-white shadow-sm pt-2 pb-4 border last:mb-24 border-neutral-200 first:mt-0 mt-2 rounded-xl"
        >
          <Skeleton className="border h-[160px] w-full object-cover overflow-hidden bg-neutral-200 border-neutral-200 rounded-xl" />
          <div className="mt-2 space-y-2">
            <Skeleton className="bg-neutral-200 flex flex-col items-start justify-center px-4 h-8 w-full" />
            <Skeleton className="bg-neutral-200 h-6 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyComments = ({ height }: { height: string }) => {
  return (
    <div
      style={{
        height: height,
      }}
      className="flex flex-col items-center justify-center px-6 "
    >
      <div className="relative flex  flex-col space-y-2">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 opacity-60 blur-xl"></div>
        {[...Array.from({ length: 3 })].map((_, index) => (
          <div
            key={index}
            className="w-[280px] bg-white h-20 rounded-xl z-[2] p-4 border border-neutral-300 flex items-center justify-center"
          >
            <Skeleton className="size-10 rounded-full animate-none bg-neutral-200/90" />
            <div className="flex flex-col ml-3 w-full flex-1">
              <Skeleton className="h-4 w-3/4 animate-none bg-neutral-200/90" />
              <Skeleton className="h-4 mt-1 w-full animate-none bg-neutral-200/90" />
            </div>
          </div>
        ))}
      </div>
      <span className="text-base mt-6 font-medium tracking-tight text-center">
        No Comments Yet
      </span>
      <span className="mt-2 text-neutral-600 text-center  text-base">
        Get Started by adding a comment <br /> or asking a question
      </span>
    </div>
  );
};

export default ThreadsTab;
