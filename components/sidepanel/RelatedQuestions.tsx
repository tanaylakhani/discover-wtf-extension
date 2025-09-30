import { Lightbulb } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ChatMessage } from "./AskTab";

const RelatedQuestions = ({
  message,
  sendMessage,
}: {
  message: ChatMessage;
  sendMessage: (text: string) => void;
}) => {
  const toolParts = message.parts.filter(
    (part) => part.type === "data-getRelatedQuestions"
  );
  const latest = toolParts[toolParts.length - 1];
  if (!latest) return null;
  const { data } = latest;

  switch (data?.status) {
    case "generating":
      return (
        <div className="w-full mt-4">
          <h2 className="text-lg tracking-tight font-medium mb-2 text-neutral-900">
            Related Questions
          </h2>
          <div className="flex flex-col border-t border-neutral-200 pt-3 items-center justify-center gap-y-2">
            {[...Array.from({ length: 5 })].map((_, i) => (
              <Skeleton className="w-full h-12 bg-neutral-200  " key={i} />
            ))}
          </div>
        </div>
      );

    case "complete":
      return (
        <div className="w-full mt-4">
          <h2 className="text-lg tracking-tight font-medium mb-2 text-neutral-900">
            Related Questions
          </h2>
          <div className="flex flex-col border-t border-neutral-200 pt-3 items-center justify-center gap-y-2">
            {data?.prompts?.map((prompt, i) => (
              <div
                key={i}
                onClick={() => {
                  sendMessage(prompt);
                }}
                className="w-full h-12 cursor-pointer group p-2 flex items-center justify-between border border-neutral-200/60 rounded-xl"
              >
                <Lightbulb className="size-5 ml-2 stroke-orange-500 fill-orange-500" />
                <span className="tracking-tight line-clamp-1 truncate flex-1 ml-2 text-sm text-neutral-700 group-hover:text-black">
                  {prompt}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default RelatedQuestions;
