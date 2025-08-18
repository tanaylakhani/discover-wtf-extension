"use client";

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Paperclip, Plus, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import TextArea from "react-textarea-autosize";
import { cn } from "@/lib/utils";
type TChatBoxProps = {
  onSubmit: (message: string, files: File[]) => void;
  input: string;
  files: File[];
  setInput: (value: string) => void;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isLoading: boolean;
};

export default function ThreadChatBox({
  onSubmit,
  input,
  isLoading,
  setInput,
  files,
  setFiles,
}: TChatBoxProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (input.trim() || files.length > 0) {
      onSubmit(input, files);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full flex relative flex-col">
      {files?.length > 0 && (
        <div className="flex-wrap absolute -top-10 flex gap-2 px-2 pb-2">
          {files.map((file, i) => (
            <div
              className="border w-fit  flex items-center justify-center border-neutral-300 bg-white rounded-lg  p-1 text-sm"
              key={i}
            >
              <div className="ml-2 truncate w-[100px]">{file.name}</div>
              <Button
                type="button"
                size={"icon"}
                variant={"outline"}
                onClick={() => handleRemoveFile(i)}
                className="ml-2 size-6 cursor-pointer "
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="w-full shadow-xl py-2 px-2 flex items-end justify-center border border-neutral-300 overflow-hidden rounded-full"
      >
        <label
          className={cn(
            "rounded-full  size-12 flex items-center justify-center border border-neutral-300  aspect-square  cursor-pointer ",
            files.length >= 1 && "opacity-50"
          )}
          htmlFor="file-upload"
        >
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={files.length === 1}
            id="file-upload"
          />
          <Plus />
        </label>

        <TextArea
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Leave a Message..."
          className="appearance-none self-center focus-visible:outline-none resize-none w-full px-2 py-2  text-base"
          value={input}
          minRows={1}
          maxRows={1}
          onChange={(e) => setInput(e.target.value)}
        />

        <Button
          variant={"outline"}
          size={"icon"}
          disabled={isLoading || input.trim() === ""}
          className="size-12 bg-neutral-100 p-1  border-neutral-300 rounded-full flex items-center justify-center"
        >
          <div className="bg-white w-full border border-neutral-300 h-full rounded-full flex items-center justify-center">
            {isLoading ? <Square /> : <ArrowUp />}
          </div>
        </Button>
      </form>
    </div>
  );
}
// <PromptInput
//   value={input}
//   onValueChange={setInput}
//   isLoading={isLoading}
//   onSubmit={handleSubmit}
//   className="w-full h-fit rounded-full bg-white border-neutral-300 max-w-(--breakpoint-md)"
// >
//   {files.length > 0 && (
//     <div className="flex flex-wrap gap-2 pb-2">
//       {files.map((file, index) => (
//         <div
//           key={index}
//           className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <Paperclip className="size-4" />
//           <span className="max-w-[120px] truncate">{file.name}</span>
//           <button
//             onClick={() => handleRemoveFile(index)}
//             className="hover:bg-secondary/50 rounded-full p-1"
//           >
//             <X className="size-4" />
//           </button>
//         </div>
//       ))}
//     </div>
//   )}

//   <PromptInputTextarea placeholder="Leave a Message..." />

//   <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
//     <PromptInputAction tooltip="Attach files">
//       <label
//         htmlFor="file-upload"
//         className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
//       >
//         <input
//           type="file"
//           multiple
//           onChange={handleFileChange}
//           className="hidden"
//           id="file-upload"
//         />
//         <Plus className="text-primary size-5" />
//       </label>
//     </PromptInputAction>

//     <PromptInputAction
//       tooltip={isLoading ? "Stop generation" : "Send message"}
//     >
//       <Button
//         variant="outline"
//         size="icon"
//         className="h-8 w-8 rounded-full"
//         onClick={handleSubmit}
//       >
//         <div className="">
//           {isLoading ? (
//             <Square className="size-5 fill-current" />
//           ) : (
//             <ArrowUp className="size-5" />
//           )}
//         </div>
//       </Button>
//     </PromptInputAction>
//   </PromptInputActions>
// </PromptInput>
