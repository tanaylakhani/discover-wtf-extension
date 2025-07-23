import React from "react";
import Textarea from "react-textarea-autosize";
import { Button } from "../ui/button";
import { ArrowUp, Paperclip } from "lucide-react";

type ThreadChatBoxProps = {
  onSendMessage?: (message: string) => void;
  value?: string;
  onChange?: (value: string) => void;
};

const ThreadChatBox: React.FC<ThreadChatBoxProps> = ({
  onSendMessage,
  value,
  onChange,
}) => {
  return (
    <div className="border bg-white shadow-xl flex items-end justify-center border-neutral-200 rounded-3xl w-full p-4">
      <form
        className="flex items-end w-full"
        onSubmit={(e) => {
          e.preventDefault();
          onSendMessage?.(value || "");
        }}
      >
        <Textarea
          minRows={3}
          placeholder="Write a message..."
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="resize-none text-base  appearance-none w-full bg-transparent focus:outline-none focus:ring-0"
        />
        <Button
          type="button"
          size={"icon"}
          variant={"outline"}
          className="ml-2 rounded-full"
        >
          <Paperclip className="h-5 w-5 text-neutral-800" />
        </Button>
        <Button
          type="submit"
          size={"icon"}
          variant={"outline"}
          className="ml-2 rounded-full"
        >
          <ArrowUp className="h-5 w-5 text-neutral-800" />
        </Button>
      </form>
    </div>
  );
};

export default ThreadChatBox;
