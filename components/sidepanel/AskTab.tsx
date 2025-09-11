"use client";

import { cn, PublicRandomLink, TUser } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { UIMessage } from "ai";
import hardenReactMarkdown from "harden-react-markdown";
import { useRef, useState } from "react";
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
import { PageData } from "../Sidebar";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { v4 as uuid } from "uuid";
type Message = {
  role: "user" | "assistant";
  content: string;
};

type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  user?: TUser;
  height: number;
  messages: UIMessage[];
  pageData: PageData;
  setMessages: (messages: UIMessage[]) => void;
  suggestedPrompts: string[];
  isSuggestedPromptsLoading?: boolean;
};

const AskTab = ({
  height,
  messages,
  setMessages,
  suggestedPrompts,
  isSuggestedPromptsLoading,
  pageData,
}: AskTabProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Show loading when last message is from user and waiting for assistant
  const isAwaitingAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "user" &&
    loading;
  const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);
  const [ref, bounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${height + bounds?.height}px)`;
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = (msg: string) => {
    if (!input.trim()) return;
    if (!pageData) {
      alert("Page data is not available.");
      return;
    }
    const newMessage: UIMessage = {
      id: uuid(),
      role: "user",
      parts: [
        {
          text: msg,
          type: "text",
        },
      ],
    };

    // Add user message to state
    const updated = [...messages, newMessage] as UIMessage[];
    setMessages(updated);

    // Set loading state to true (waiting for assistant)
    setLoading(true);

    // Reset input
    setInput("");

    // Send to background
    browser.runtime.sendMessage({
      type: "chat_request",
      payload: { messages: updated, pageData: pageData },
    });
  };
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Set loading to false when assistant responds
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === "assistant"
    ) {
      setLoading(false);
    }
  }, [messages]);

  const components = {
    ol: ({ node, children, className, ...props }: any) => (
      <ol
        className={cn("ml-4 list-outside list-decimal", className)}
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ node, children, className, ...props }: any) => (
      <li className={cn("py-1", className)} {...props}>
        {children}
      </li>
    ),
    ul: ({ node, children, className, ...props }: any) => (
      <ul
        className={cn("ml-4 list-outside list-decimal", className)}
        {...props}
      >
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
        className={cn(
          "mt-6 mb-2 font-medium tracking-tight text-3xl",
          className
        )}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ node, children, className, ...props }: any) => (
      <h2
        className={cn(
          "mt-6 mb-2 font-medium tracking-tight text-2xl",
          className
        )}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ node, children, className, ...props }: any) => (
      <h3
        className={cn(
          "mt-6 mb-2 font-medium tracking-tight text-xl",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ node, children, className, ...props }: any) => (
      <h4
        className={cn(
          "mt-6 mb-2 font-medium tracking-tight text-lg",
          className
        )}
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ node, children, className, ...props }: any) => (
      <h5
        className={cn("mt-6 mb-2 font-medium text-base", className)}
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ node, children, className, ...props }: any) => (
      <h6
        className={cn("mt-6 mb-2 font-semibold text-sm", className)}
        {...props}
      >
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

  return (
    <div className="flex font-inter flex-col">
      <ScrollArea
        style={{ height: scrollAreaHeight }}
        className="w-full relative overflow-y-auto"
      >
        <ScrollAreaPrimitive.Viewport>
          <div ref={viewportRef} className="w-full relative">
            {messages.length === 0 ? (
              <div className="mx-auto px-6 flex w-full flex-col items-center justify-center mb-12 pt-10">
                <h3 className="text-lg font-medium tracking-tight">
                  Discover.wtf AI
                </h3>
                <span className="text-neutral-700 text-sm">
                  Ask anything about this page
                </span>
                <div className="mt-10 flex flex-col space-y-3 w-full">
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
                            setInput(prompt);
                          }}
                          className="bg-white z-[2] p-4 leading-tight cursor-pointer hover:bg-neutral-50 rounded-xl border border-neutral-300 font-medium tracking-tight text-sm text-neutral-700"
                        >
                          {prompt}
                        </div>
                      ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col px-4 space-y-4 py-4 max-w-full">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-2 ${
                      m.role === "user"
                        ? "bg-orange-100 max-w-[80%] break-words overflow-wrap break-word whitespace-pre-wrap py-2 px-4 rounded-xl text-orange-800 self-end"
                        : "self-start max-w-[95%] break-words overflow-wrap break-word whitespace-pre-wrap"
                    }`}
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {m.parts.map((p, i) =>
                      p.type === "text" ? (
                        <HardenedMarkdown
                          components={components}
                          remarkPlugins={[remarkGfm]}
                          key={i}
                        >
                          {p.text}
                        </HardenedMarkdown>
                      ) : null
                    )}
                  </div>
                ))}
                {isAwaitingAssistant && (
                  <div className="mb-2 self-start max-w-[95%] p-2 rounded-xl bg-neutral-100 animate-pulse">
                    <span className="text-neutral-400">
                      Assistant is typing…
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollAreaPrimitive.Viewport>
      </ScrollArea>

      <div
        ref={ref}
        className="w-full z-10 px-2 pb-2 flex items-center justify-center"
      >
        <PromptInput
          className="bg-white border-neutral-300"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputSubmit disabled={input.trim() === "" || loading} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default AskTab;
