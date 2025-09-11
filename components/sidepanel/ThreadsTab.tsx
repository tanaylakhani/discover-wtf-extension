"use client";
import {
  fileToBuffer,
  makeCall,
  makeCommentsCall,
  PublicRandomLink,
} from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import useMeasure from "react-use-measure";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import ThreadChatBox from "./ThreadChatBox";
import { User } from "@/lib/graphql/user";
import CommentCard from "./comment";
import { Button } from "../ui/button";
import { ListFilter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
  parentId?: string | null; // 👈 parent reference
  replies?: Comment[];
};

type ThreadsTabProps = {
  activeLink: PublicRandomLink | null;
  activeTab: string;
  user?: User;
  height: number;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_replied", label: "Most Replied" },
  { value: "least_replied", label: "Least Replied" },
];

const ThreadsTab: React.FC<ThreadsTabProps> = ({
  activeLink,
  user,
  height,
}) => {
  const queryClient = useQueryClient();
  const [toReply, setToReply] = React.useState<Comment | null>(null);
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [sortOption, setSortOption] = React.useState(SORT_OPTIONS[0].value);
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
      const flatComments = (response?.comments || []) as Comment[];
      return flatComments; // 👈 return nested tree
    },
    // enabled: !!activeLink?.id,
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async ({
      files,
      message,
      user,
      parentId,
    }: {
      message: string;
      files: File[];
      user: TCommentAuthor;
      parentId?: string | null;
    }) => {
      let filePayload = undefined;
      if (files[0]) {
        const buffer = await fileToBuffer(files[0]);
        const uint8Array = new Uint8Array(buffer);
        filePayload = {
          buffer: Array.from(uint8Array),
          type: files[0]?.type,
          name: files[0]?.name,
        };
      }

      const response = await browser.runtime.sendMessage({
        type: "POST_COMMENT",
        linkId: activeLink?.id as string,
        message,
        file: filePayload,
        user,
        parentId: parentId || null,
      });
      return response.comment;
    },

    onMutate: async ({ message, files, user, parentId }) => {
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
        user,
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
        parentId: parentId || null,
        replies: [],
      };

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id],
        (old) => {
          if (!old) return [optimisticComment];

          if (!parentId) {
            // Top-level comment → prepend
            return [optimisticComment, ...old];
          }

          // Reply → insert into parent
          const insertReply = (comments: Comment[]): Comment[] =>
            comments.map((c) => {
              if (c.id === parentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), optimisticComment],
                };
              }
              return {
                ...c,
                replies: c.replies ? insertReply(c.replies) : [],
              };
            });

          return insertReply(old);
        }
      );

      return { previousComments, optimisticComment, parentId, message, files };
    },

    onSuccess: (newComment, _, context) => {
      if (toReply && newComment.parentId !== toReply.id) {
        setToReply(null);
      }
      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id],
        (old) => {
          if (!old || !context?.optimisticComment) return old;

          const replaceOptimistic = (comments: Comment[]): Comment[] =>
            comments.map((c) => {
              if (c.id === context.optimisticComment.id) return newComment;
              return {
                ...c,
                replies: c.replies ? replaceOptimistic(c.replies) : [],
              };
            });

          return replaceOptimistic(old);
        }
      );
    },

    onError: (error, _, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["get-comments", activeLink?.id],
          context.previousComments
        );
      }
      if (context?.message || context?.files) {
        setInput(context.message);
        setFiles(context.files);
      }
      console.error("Failed to post comment:", error);
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-comments", activeLink?.id],
      });
    },
  });

  const [ref, bounds] = useMeasure();
  const [commentOptionsBar, barBounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${
    height + bounds?.height + barBounds.height
  }px)`;
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [data?.length]);

  // Prefetch like status/count for all comments and replies
  React.useEffect(() => {
    if (!data) return;
    // Helper to recursively collect all comment IDs
    const collectIds = (comments: Comment[]): string[] => {
      let ids: string[] = [];
      for (const c of comments) {
        ids.push(c.id);
        if (c.replies && c.replies.length > 0) {
          ids = ids.concat(collectIds(c.replies));
        }
      }
      return ids;
    };
    const allIds = collectIds(data);
    allIds.forEach((commentId) => {
      queryClient.prefetchQuery({
        queryKey: ["comment-like-status", commentId],
        queryFn: async () => {
          const response = await browser.runtime.sendMessage({
            type: "GET_COMMENT_LIKE_STATUS",
            commentId,
          });
          return response;
        },
      });
    });
  }, [data, queryClient]);

  return (
    <div className="">
      <div
        ref={commentOptionsBar}
        className="px-4 py-2 flex items-center justify-between border-b border-neutral-200"
      >
        <div>Comments ({data?.length || 0})</div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size={"icon"} variant={"outline"}>
              <ListFilter />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            {SORT_OPTIONS.map((option) => {
              return (
                <Button
                  key={option.value}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setSortOption(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
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
                <CommentCard
                  toReply={toReply}
                  onReplyClick={setToReply}
                  comment={comment}
                  key={index}
                />
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
                parentId: toReply?.id || null,
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
          className="px-2 bg-white py-2 last:mb-24 first:mt-0 mt-2 flex items-center justify-center"
        >
          <Skeleton className="border size-14 object-cover overflow-hidden bg-neutral-200 border-neutral-200 rounded-xl" />
          <div className="ml-2 flex-1 flex flex-col w-full space-y-2">
            <Skeleton className="bg-neutral-200 flex flex-col items-start justify-center px-4 h-6 w-full" />
            <Skeleton className="bg-neutral-200 h-4 w-full" />
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
