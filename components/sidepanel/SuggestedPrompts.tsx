import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { TSendMessage } from "@/lib/types";

type SuggestedPromptsProps = {
  suggestedPrompts: string[];
  isSuggestedPromptsLoading: boolean;
  userId: string | null;
  setInput: (text: string) => void;
  handlePromptClick: (prompt: string) => void;
};

const SuggestedPrompts = ({
  suggestedPrompts,
  isSuggestedPromptsLoading,
  userId,
  setInput,
  handlePromptClick,
}: SuggestedPromptsProps) => {
  return (
    <div className="mx-auto  font-inter px-4 flex w-full flex-col items-center justify-end mb-6 pt-10">
      <div className="flex items-center justify-start w-full">
        <div className="flex-1 flex flex-col ml-4">
          <span className="text-sm text-neutral-600 font-medium leading-tight mb-2">
            Discover.wtf
          </span>
          <span className="font-medium text-neutral-900 text-sm leading-tight">
            {!userId
              ? "Loading user authentication..."
              : "Welcome to Discover.wtf! Here are some suggestions to get started."}
          </span>
          <div className="mt-4 grid sm:grid-cols-2 grid-cols-1 gap-3 w-full">
            {isSuggestedPromptsLoading || !userId
              ? [...Array(4)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-full bg-neutral-200 rounded-xl h-14 "
                  />
                ))
              : suggestedPrompts.map((prompt, i) => (
                  <div
                    key={i}
                    onClick={() => handlePromptClick(prompt)}
                    className={cn(
                      "bg-white z-[2] py-2 px-4 cursor-pointer rounded-lg border border-neutral-200 flex items-start justify-start font-medium text-sm text-neutral-800",
                      !userId && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Lightbulb className="size-5 mr-2 stroke-orange-500 fill-orange-500" />
                    {prompt}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestedPrompts;
