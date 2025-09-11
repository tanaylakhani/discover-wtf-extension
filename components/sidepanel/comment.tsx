import { cn, timeAgo } from "@/lib/utils";
import { Dot, Heart, MessageCircle, SmilePlus } from "lucide-react";
import React from "react";
import { Comment } from "./ThreadsTab";
import { Skeleton } from "../ui/skeleton";

type TCommentProps = {
  comment: Comment;
  toReply: Comment | null;
  onReplyClick?: (comment: Comment) => void;
};

const CommentCard = ({
  comment,
  onReplyClick,
  toReply,
  isReply = false,
}: TCommentProps & { isReply?: boolean }) => {
  const [showReplies, setShowReplies] = React.useState(false);
  const { liked, likeCount, toggleLike, isLoading } = useLikeComment(
    comment.id
  );
  const icons = [
    {
      title: "like",
      icon: Heart,
      fill: liked ? "red" : "none",
      likeCount: likeCount,
      isFetching: isLoading,
      onClick: () => {
        toggleLike();
      },
    },
    {
      title: "comment",
      icon: MessageCircle,

      onClick: () => onReplyClick?.(comment),
    },
    { title: "react", icon: SmilePlus, onClick: () => {} },
  ];

  return (
    <div
      className={cn(
        "flex items-start justify-center w-full px-6 py-4",
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
        <div className="flex mb-2 items-center justify-center w-full">
          <div className=" text-base leading-tight flex flex-col flex-1">
            <div className="flex items-center justify-start">
              <h2 className="font-medium tracking-tight text-sm leading-none">
                {comment?.user?.name}
              </h2>
              <Dot className="size-3" />
              <span className="text-sm font-medium text-neutral-600 ">
                {timeAgo(new Date(comment?.commentedAt))}
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm  font-medium opacity-90">
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
            {icons.map(
              ({ title, icon, onClick, fill, likeCount, isFetching }, i) => (
                <button
                  onClick={onClick}
                  key={title}
                  className="flex items-center justify-center space-x-1"
                >
                  {React.createElement(icon, {
                    fill: fill || "none",
                    className: "size-4 opacity-70",
                  })}

                  {i === 0 &&
                    (isFetching ? (
                      <Skeleton className="h-4 w-3 bg-neutral-300 rounded-lg" />
                    ) : (
                      <span className="text-neutral-600 text-sm">
                        {Number(likeCount)}
                      </span>
                    ))}
                </button>
              )
            )}
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
                toReply={toReply}
                key={reply.id}
                comment={reply}
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
