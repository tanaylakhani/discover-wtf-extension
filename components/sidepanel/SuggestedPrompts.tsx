import { cn, TUser } from "@/lib/utils";
import { CornerDownRight, Lightbulb } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

type SuggestedPromptsProps = {
  suggestedPrompts: string[];
  isSuggestedPromptsLoading: boolean;
  user: TUser | null;
  setInput: (text: string) => void;
  handlePromptClick: (prompt: string) => void;
};

const SuggestedPrompts = ({
  suggestedPrompts,
  isSuggestedPromptsLoading,
  user,
  handlePromptClick,
}: SuggestedPromptsProps) => {
  return (
    <div className="mx-auto  font-inter px-4 flex w-full flex-col items-center justify-center mb-6 pt-10">
      <div className="flex items-center justify-start w-full">
        <div className="flex-1 flex flex-col ">
          <span className="text-sm text-neutral-600 font-medium leading-tight mb-2">
            Discover.wtf
          </span>
          <span className="font-medium text-neutral-900 text-sm leading-tight">
            Welcome to Discover.wtf! Here are some suggestions to get started.
          </span>
          {/* <h2 className="text-2xl font-medium">
            Hi {user?.name?.split(" ")[0] || "there"}
          </h2>
          <h3 className="text-2xl text-neutral-500 font-medium">
            How can I assist you today?
          </h3> */}
          <div className="mt-4 mb-4 grid sm:grid-cols-2 grid-cols-1 w-full">
            {isSuggestedPromptsLoading || !user?.id
              ? [...Array(4)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-full bg-neutral-200 rounded-xl h-12 mt-2 first:mt-0 "
                  />
                ))
              : suggestedPrompts.map((prompt, i) => (
                  <div
                    key={i}
                    onClick={() => handlePromptClick(prompt)}
                    className={cn(
                      "w-full h-12 cursor-pointer p-2 flex items-center justify-between border border-neutral-200/60 text-neutral-700 hover:text-black rounded-xl hover:bg-neutral-50 transition-all mt-2 first:mt-0",
                      !user?.id && "cursor-not-allowed opacity-80"
                    )}
                  >
                    <CornerDownRight className="size-3 ml-2 stroke-neutral-900 " />
                    <span className="tracking-tight line-clamp-1 truncate flex-1 ml-2 text-sm ">
                      {prompt}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestedPrompts;
