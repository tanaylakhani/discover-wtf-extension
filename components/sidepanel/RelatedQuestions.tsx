import { CornerDownRight, Lightbulb } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ChatMessage } from "@/lib/types";
import { ChatStatus } from "ai";

const RelatedQuestions = ({
  message,
  sendMessage,
  status,
  setIsSubmitting,
}: {
  message: ChatMessage;
  status: ChatStatus;
  sendMessage: (text: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
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
                  if (status === "streaming") return;
                  setIsSubmitting(true);
                  sendMessage(prompt);
                }}
                className="w-full h-12 cursor-pointer p-2 flex items-center justify-between border border-neutral-200/60 text-neutral-700 hover:text-black rounded-xl hover:bg-neutral-50 transition-all"
              >
                <CornerDownRight className="size-3 ml-2 stroke-neutral-900 " />
                <span className="tracking-tight line-clamp-1 truncate flex-1 ml-2 text-sm ">
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
