import { FormEventHandler } from "react";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { ChatStatus } from "ai";

type AskChatBoxProps = {
  handleSubmit: FormEventHandler<HTMLFormElement>;
  input: string;
  setInput: (text: string) => void;
  userId: string;
  isLoading: boolean;
  status: ChatStatus;
};

const AskChatBox = ({
  handleSubmit,
  setInput,
  input,
  isLoading,
  userId,
  status,
}: AskChatBoxProps) => {
  return (
    <PromptInput
      className="bg-white border-neutral-300"
      onSubmit={handleSubmit}
    >
      <PromptInputTextarea
        onChange={(e) => setInput(e?.target?.value)}
        value={input}
      />
      <PromptInputToolbar>
        <PromptInputSubmit
          status={status}
          disabled={input.trim() === "" || isLoading || !userId}
        />
      </PromptInputToolbar>
    </PromptInput>
  );
};

export default AskChatBox;
