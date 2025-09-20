"use client";

import { cn, getGqlToken, PublicRandomLink, TUser } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import hardenReactMarkdown from "harden-react-markdown";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import useMeasure from "react-use-measure";
import remarkGfm from "remark-gfm";
import { CodeBlock, CodeBlockCopyButton } from "../ai-elements/code-block";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Message, MessageContent } from "../ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Response } from "../ai-elements/response";
import URL from "@/lib/url";
import { Button } from "../ui/button";
import { History, Lightbulb, Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  user?: TUser;
  height: number;
  pageData: PageData;
  suggestedPrompts: string[];
  isSuggestedPromptsLoading?: boolean;
};

const components = {
  ol: ({ node, children, className, ...props }: any) => (
    <ol className={cn("ml-4 list-outside list-decimal", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, className, ...props }: any) => (
    <li className={cn("py-1", className)} {...props}>
      {children}
    </li>
  ),
  ul: ({ node, children, className, ...props }: any) => (
    <ul className={cn("ml-4 list-outside list-decimal", className)} {...props}>
      {children}
    </ul>
  ),
  strong: ({ node, children, className, ...props }: any) => (
    <span className={cn("font-medium font-inter", className)} {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, className, ...props }: any) => (
    <a
      className={cn("font-medium text-primary underline", className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ node, children, className, ...props }: any) => (
    <h1
      className={cn("mt-6 mb-2 font-medium tracking-tight text-3xl", className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, children, className, ...props }: any) => (
    <h2
      className={cn("mt-6 mb-2 font-medium tracking-tight text-2xl", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, className, ...props }: any) => (
    <h3
      className={cn("mt-6 mb-2 font-medium tracking-tight text-xl", className)}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ node, children, className, ...props }: any) => (
    <h4
      className={cn("mt-6 mb-2 font-medium tracking-tight text-lg", className)}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ node, children, className, ...props }: any) => (
    <h5 className={cn("mt-6 mb-2 font-medium text-base", className)} {...props}>
      {children}
    </h5>
  ),
  h6: ({ node, children, className, ...props }: any) => (
    <h6 className={cn("mt-6 mb-2 font-semibold text-sm", className)} {...props}>
      {children}
    </h6>
  ),
  pre: ({ node, className, children }: any) => {
    let language = "javascript";

    if (typeof node?.properties?.className === "string") {
      language = node.properties.className.replace("language-", "");
    }

    const childrenIsCode =
      typeof children === "object" &&
      children !== null &&
      "type" in children &&
      children.type === "code";

    if (!childrenIsCode) {
      return <pre>{children}</pre>;
    }

    return (
      <CodeBlock
        className={cn("my-4 h-auto", className)}
        code={(children.props as { children: string }).children}
        language={language}
      >
        <CodeBlockCopyButton
          onCopy={() => console.log("Copied code to clipboard")}
          onError={() => console.error("Failed to copy code to clipboard")}
        />
      </CodeBlock>
    );
  },
};
const AskTab = ({
  height,
  suggestedPrompts,
  isSuggestedPromptsLoading,
  pageData,
}: AskTabProps) => {
  const [ref, bounds] = useMeasure();
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState(uuid());
  const [commentOptionsBar, barBounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${
    height + bounds?.height + barBounds?.height
  }px)`;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${URL}/api/chat`,
      async prepareSendMessagesRequest({ messages }) {
        const gqlToken = await getGqlToken();
        const headers: Record<string, string> = {
          Authorization: `Bearer ${gqlToken}`,
        };
        return { body: { messages, ctx: pageData?.content }, headers };
      },
    }),
  });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  const startNewChat = () => {
    const newChatId = uuid();
    setChatId(newChatId);
  };

  useEffect(() => {
    if (status === "streaming") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status, messages.length]);
  const isLoading = status === "streaming";

  return (
    <div
      className={cn(
        "flex font-inter  flex-col",
        messages.length === 0 && "bg-neutral-50/60"
      )}
    >
      <div
        ref={commentOptionsBar}
        className="px-4 py-1 bg-white flex items-center text-neutral-800 justify-between border-b border-neutral-200"
      >
        <div className="space-x-2 flex">
          <Button
            className="hover:bg-neutral-100"
            size={"icon"}
            variant="ghost"
            onClick={startNewChat}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            className="hover:bg-neutral-100"
            size={"icon"}
            variant="ghost"
          >
            <History className="size-4" />
          </Button>
        </div>
      </div>
      <Conversation>
        <ConversationContent style={{ height: scrollAreaHeight }}>
          {messages.length === 0 ? (
            <div className="mx-auto  font-inter px-4 flex w-full flex-col items-center justify-end mb-6 pt-10">
              <div className="flex items-center justify-start w-full">
                <div className="flex-1 flex flex-col ml-4">
                  <span className="text-sm text-neutral-600 font-medium leading-tight mb-2">
                    Discover.wtf
                  </span>
                  <span className="font-medium text-neutral-900 text-sm leading-tight">
                    Welcome to Discover.wtf! Here are some suggestions to get
                    started.
                  </span>
                  <div className="mt-4 grid sm:grid-cols-2 grid-cols-1 gap-3 w-full">
                    {isSuggestedPromptsLoading
                      ? [...Array(4)].map((_, i) => (
                          <Skeleton
                            key={i}
                            className="w-full bg-neutral-200 rounded-xl h-14 "
                          />
                        ))
                      : suggestedPrompts.map((prompt, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              sendMessage({ text: prompt });
                              setInput("");
                            }}
                            className="bg-white z-[2] py-2 px-4 cursor-pointer rounded-lg border border-neutral-200 flex items-start justify-start font-medium text-sm text-neutral-800"
                          >
                            <Lightbulb className="size-5 mr-2 stroke-orange-500 fill-orange-500" />
                            {prompt}
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 py-4 max-w-full">
              {messages.map((message) => (
                <Message className="" from={message?.role} key={message.id}>
                  <MessageContent
                    className={cn(
                      "rounded-xl font-inter",
                      message?.role === "user"
                        ? "bg-neutral-100 tracking-tight font-medium text-neutral-700"
                        : "border-none bg-transparent"
                    )}
                  >
                    {message.role === "assistant" && (
                      <span className="text-sm text-neutral-600 font-medium leading-tight mb-2">
                        Discover.wtf
                      </span>
                    )}
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

              {/* <div ref={messagesEndRef} /> */}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div
        ref={ref}
        className="w-full z-10 px-2 pb-2 flex items-center justify-center"
      >
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
              disabled={input.trim() === "" || isLoading}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default AskTab;
