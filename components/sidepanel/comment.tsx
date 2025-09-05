import { Dot } from "lucide-react";
import { Comment } from "./ThreadsTab";

type TCommentProps = {
  comment: Comment;
};

const CommentCard = ({ comment }: TCommentProps) => {
  return (
    <div
      key={comment.id} // Use comment ID as key, fallback to index
      className="border-b flex items-start justify-center w-full px-6 border-neutral-200 py-4"
    >
      <img
        className="size-10 rounded-full object-cover"
        src={comment?.user?.avatar as string}
      />
      <div className="flex-1 ml-3 flex flex-col w-full">
        <div className="flex mb-2 items-center justify-center w-full">
          <div className=" text-base leading-tight flex flex-col flex-1">
            <h2 className="font-medium leading-none text-sm">
              {comment?.user?.name}
            </h2>
            <div className="flex items-center justify-start">
              <span className="text-sm text-neutral-700 font-medium">
                {comment?.user?.username
                  ? `@${comment?.user?.username}`
                  : comment?.user?.email}
              </span>
              <Dot className="size-3" />
              <span className="text-sm font-medium text-neutral-700 ">
                {new Date(comment?.commentedAt).toDateString()}
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
        {/* {comment.id.startsWith("temp-") && (
                <span className="text-xs text-gray-500 italic">Sending...</span>
                )} */}
      </div>
    </div>
  );
};

export default CommentCard;
