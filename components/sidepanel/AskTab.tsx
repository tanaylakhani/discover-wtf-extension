import { cn, PublicRandomLink, TUser } from "@/lib/utils";

import { useChat } from "@ai-sdk/react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import useMeasure from "react-use-measure";
import { Message, MessageContent } from "../ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { Response } from "../ai-elements/response";
import { ScrollArea } from "../ui/scroll-area";
import { Conversation, ConversationContent } from "../ai-elements/conversation";
import URL from "@/lib/url";
type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  user?: TUser;
  height: number;
};

const AskTab = ({ user, height }: AskTabProps) => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${URL}/api/chat`,
    }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  const initialPrompts = [
    "Summarize the page I’m currently viewing",
    "List the key takeaways from this content",
    "Explain this article in simple terms",
    "Give me a quick 2-sentence summary",
  ];

  const [ref, bounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${height + bounds?.height}px)`;
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages?.length]);

  console.log({ messages: messages?.length });
  return (
    <div className=" flex flex-col">
      <ScrollArea
        style={{
          height: scrollAreaHeight,
        }}
        className="w-full relative overflow-y-auto "
      >
        <ScrollAreaPrimitive.Viewport>
          <div ref={viewportRef} className="px-2 w-full relative">
            {messages.length === 0 ? (
              <div
                // style={{
                //   height: scrollAreaHeight,
                // }}
                className="mx-auto flex w-full flex-col items-center justify-center py-20"
              >
                <h3 className="text-2xl font-medium tracking-tight">
                  Hi, {user!?.name?.split(" ")[0]}
                </h3>
                <span className="text-lg font-medium tracking-tight text-neutral-500">
                  How can I assist you today?
                </span>
                <div className="grid relative px-6 grid-cols-1 gap-2 mt-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 opacity-60 blur-xl"></div>

                  {initialPrompts.map((prompt, i) => {
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          sendMessage({ text: prompt });
                          setInput("");
                        }}
                        className="bg-white z-[2] p-4 leading-tight  cursor-pointer hover:bg-neutral-50 rounded-xl border border-neutral-300 font-medium tracking-tight text-sm text-neutral-700"
                      >
                        {prompt}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Conversation>
                <ConversationContent>
                  {messages.map((message) => (
                    <Message className="" from={message?.role} key={message.id}>
                      <MessageContent
                        className={cn(
                          "rounded-xl",
                          message?.role === "user"
                            ? "bg-purple-100  text-purple-800"
                            : "border  bg-neutral-50 border-neutral-200"
                        )}
                      >
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "text":
                              return (
                                <Response key={`${message.id}-${i}`}>
                                  {part.text}
                                </Response>
                              );
                          }
                        })}
                      </MessageContent>
                    </Message>
                  ))}
                </ConversationContent>
              </Conversation>
            )}
          </div>
        </ScrollAreaPrimitive.Viewport>
      </ScrollArea>
      {/* </ConversationContent>
          </Conversation> */}
      {/* </ScrollArea> */}
      <div
        ref={ref}
        className="w-full z-10 px-2 pb-2 flex items-center justify-center "
      >
        <PromptInput
          className=" bg-white border-neutral-300 "
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            onChange={(e) => {
              setInput(e.target.value);
            }}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputSubmit
              // className="absolute right-1 bottom-1"
              disabled={input.trim() === ""}
              status={status}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default AskTab;
