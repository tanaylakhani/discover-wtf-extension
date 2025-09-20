import { cn, timeAgo, TUser } from "@/lib/utils";
import {
  Dot,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  SmilePlus,
  Trash2,
} from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Comment } from "./ThreadsTab";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteComment } from "@/hooks/useLikeComment";

type TCommentProps = {
  comment: Comment;
  toReply: Comment | null;
  activeLinkId: string;
  onReplyClick?: (comment: Comment | null) => void;
  sortOption: string;
};

const CommentCard = ({
  comment,
  onReplyClick,
  toReply,
  activeLinkId,
  sortOption,
  isReply = false,
}: TCommentProps & { isReply?: boolean }) => {
  const [showReplies, setShowReplies] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const { toggleLike, isPending } = useLikeComment(
    comment?.id,
    activeLinkId,
    sortOption
  );
  const { mutate: deleteComment } = useDeleteComment(activeLinkId, sortOption);
  const icons = [
    {
      title: "like",
      icon: Heart,
      fill: comment?.liked ? "red" : "none",
      likeCount: Number(comment?.likeCount), // isFetching: isLoading,
      onClick: () => {
        if (isPending) return;
        toggleLike(comment?.liked);
      },
    },
    {
      title: "comment",
      icon: MessageCircle,

      onClick: () => onReplyClick?.(toReply ? null : comment),
    },
    { title: "react", icon: SmilePlus, onClick: () => {} },
  ];
  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<TUser>(["get-user"]);
  const isUsersComment = comment?.userId === userData?.id;
  const commentOptions = [
    { icon: Share2, name: "Share", onClick: () => {} },
    ...(isUsersComment
      ? [
          {
            icon: Trash2,
            name: "Delete",
            onClick: () => {
              deleteComment(comment.id);
              setShow(false);
            },
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-start justify-center w-full px-6 py-4 font-inter",
        isReply
          ? "border border-neutral-200 rounded-xl mt-2 "
          : "border-b border-neutral-200",
        toReply?.id === comment.id && "bg-orange-50"
      )}
    >
      {!isReply && (
        <img
          className="size-8 rounded-full object-cover"
          src={comment?.user?.avatar as string}
        />
      )}
      <div className={cn("flex-1 flex flex-col w-full", !isReply && " ml-3")}>
        <div className="flex mb-2 items-center justify-between w-full">
          <div className=" text-base leading-tight flex flex-col flex-1">
            <div className="flex items-center justify-start">
              <h2 className="font-medium text-neutral-700 tracking-tight text-sm leading-none">
                {comment?.user?.name}
              </h2>
              <Dot className="size-3" />
              <span className="text-sm font-medium text-neutral-600 ">
                {timeAgo(new Date(comment?.commentedAt))}
              </span>
            </div>
          </div>
          <div>
            <Popover open={show} onOpenChange={setShow}>
              <PopoverTrigger asChild>
                <Button size={"icon"} className="" variant="ghost">
                  <MoreHorizontal className="size-4 stroke-neutral-800" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[120px] rounded-xl p-0 bg-white border-neutral-200 border -translate-x-4">
                {/**/}
                {commentOptions.map((option) => {
                  return (
                    <div
                      onClick={option.onClick}
                      className="w-full group border-t first:border-none  cursor-pointer border-neutral-200 flex items-center justify-start px-3 py-1 first:mt-2 last:mb-2"
                    >
                      <option.icon className="size-4 " />
                      <span className="text-sm group-hover:text-neutral-900  font-inter ml-2 font-medium text-neutral-700 ">
                        {option.name}
                      </span>
                    </div>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-sm text-neutral-800 font-medium opacity-90">
          {comment.content?.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
        {comment?.media && (
          <div className=" w-full flex gap-2">
            {comment.media.map((file, i) => (
              <div
                key={i}
                className="mt-2 w-full border border-neutral-300 rounded-xl overflow-hidden bg-neutral-100"
              >
                {file?.type.startsWith("image") ? (
                  <img
                    src={file.url}
                    alt={file.id}
                    className=" h-[250px] w-full  object-cover aspect-square"
                  />
                ) : (
                  <video
                    src={file.url}
                    className="  w-full h-[250px] object-cover aspect-square"
                    controls
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="w-full mt-4 flex items-center justify-between">
          <div className=" flex items-center justify-start space-x-3">
            {!isReply &&
              icons.map(({ title, icon, onClick, fill, likeCount }, i) => (
                <button
                  onClick={onClick}
                  key={title}
                  className="flex items-center justify-center space-x-1"
                >
                  {React.createElement(icon, {
                    fill: fill || "none",
                    className: "size-4 stroke-neutral-900 opacity-70",
                  })}

                  {i === 0 && (
                    <span className="text-neutral-600 text-sm">
                      {typeof likeCount === "number" && !isNaN(likeCount)
                        ? likeCount
                        : 0}
                    </span>
                  )}
                </button>
              ))}
          </div>
          {comment.replies!?.length > 0 && (
            <div
              className="tracking-tight text-sm text-neutral-600 cursor-pointer"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? "Hide Replies" : "Show Replies"}
            </div>
          )}
        </div>

        {showReplies && comment.replies!?.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies!?.map((reply) => (
              <CommentCard
                sortOption={sortOption}
                toReply={toReply}
                key={reply.id}
                comment={reply}
                activeLinkId={activeLinkId}
                isReply={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
