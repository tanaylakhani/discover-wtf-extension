"use client";
import { User } from "@/lib/graphql/user";
import { cn, fileToBuffer, PublicRandomLink } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListFilter } from "lucide-react";
import React from "react";
import useMeasure from "react-use-measure";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import CommentCard from "./comment";
import ThreadChatBox from "./ThreadChatBox";
import { v4 as uuid } from "uuid";
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
  replyCount: number;
  likeCount: number;
  liked: boolean;
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
    queryKey: ["get-comments", activeLink?.id, sortOption],
    queryFn: async () => {
      const response = await browser.runtime.sendMessage({
        type: "GET_COMMENTS",
        linkId: activeLink?.id as string,
        sort: sortOption,
      });
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
        queryKey: ["get-comments", activeLink?.id as string, sortOption],
      });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "get-comments",
        activeLink?.id,
        sortOption,
      ]);

      const optimisticComment: Comment = {
        id: uuid(),
        linkId: activeLink?.id || "",
        userId: user?.id,
        content: message,
        user,
        isPrivate: false,
        commentedAt: new Date(),
        media: files.length
          ? [
              {
                id: uuid(),
                url: URL.createObjectURL(files[0]),
                type: files[0].type.startsWith("image/") ? "image" : "video",
                createdAt: new Date(),
              },
            ]
          : null,
        parentId: parentId || null,
        replies: [],
        replyCount: 0,
        liked: false,
        likeCount: 0,
      };

      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id, sortOption],
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
      // if (toReply && newComment.parentId !== toReply.id) {
      setToReply(null);
      // }
      queryClient.setQueryData<Comment[]>(
        ["get-comments", activeLink?.id, sortOption],
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
          ["get-comments", activeLink?.id, sortOption],
          context.previousComments
        );
      }
      if (context?.message || context?.files) {
        setInput(context.message);
        setFiles(context.files);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-comments", activeLink?.id, sortOption],
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

  return (
    <div className="">
      <div
        ref={commentOptionsBar}
        className="px-4 py-2 flex items-center text-neutral-800 justify-between border-b border-neutral-200"
      >
        <div>Comments ({data?.length || 0})</div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size={"icon"} variant={"outline"}>
              <ListFilter className="stroke-neutral-900" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-white font-inter text-sm font-medium -translate-x-3 p-0 rounded-xl w-[180px]">
            {SORT_OPTIONS.map((option) => {
              return (
                <div
                  key={option.value}
                  className={cn(
                    " border-t first:border-none px-3 first:mt-2 last:mb-2 py-1 border-neutral-200 cursor-pointer w-full justify-start",
                    sortOption === option.value
                      ? "text-neutral-900"
                      : "text-neutral-700"
                  )}
                  onClick={() => setSortOption(option.value)}
                >
                  {option.label}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      <ScrollArea
        style={{ height: scrollAreaHeight }}
        className=" overflow-y-auto "
      >
        <ScrollAreaPrimitive.Viewport>
          <div ref={viewportRef} className="mb-10">
            {isFetchingComments ? (
              <LoadingSkeleton />
            ) : data!.length === 0 ? (
              <EmptyComments height={scrollAreaHeight} />
            ) : (
              data!.map((comment, index) => (
                <CommentCard
                  sortOption={sortOption}
                  toReply={toReply}
                  onReplyClick={setToReply}
                  comment={comment}
                  isPending={isPending}
                  activeLinkId={activeLink?.id as string}
                  key={comment.id}
                />
              ))
            )}
          </div>
        </ScrollAreaPrimitive.Viewport>
        {/* </ScrollAreaPrimitive.Viewport> */}
      </ScrollArea>
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
            } catch (error) {}
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
