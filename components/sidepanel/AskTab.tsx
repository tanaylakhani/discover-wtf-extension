"use client";

import { cn, PublicRandomLink, TUser } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { UIMessage } from "ai";
import HardenReactMarkdown from "harden-react-markdown";
import { useRef, useState } from "react";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { ScrollArea } from "../ui/scroll-area";
import useMeasure from "react-use-measure";
import hardenReactMarkdown from "harden-react-markdown";
import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock, CodeBlockCopyButton } from "../ai-elements/code-block";

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
  setMessages: (messages: UIMessage[]) => void;
};

const AskTab = ({ user, height, messages, setMessages }: AskTabProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);
  const [ref, bounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${height + bounds?.height}px)`;
  const viewportRef = useRef<HTMLDivElement>(null);

  const initialPrompts = [
    "Summarize the page I’m currently viewing",
    "List the key takeaways from this content",
    "Explain this article in simple terms",
    "Give me a quick 2-sentence summary",
  ];
  const sendMessage = (msg: string) => {
    if (!input.trim()) return;

    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
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

    // Reset input
    setInput("");

    // Send to background
    browser.runtime.sendMessage({
      type: "chat_request",
      payload: { messages: updated },
    });
  };
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages?.length]);
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
          <div ref={viewportRef} className="px-2 w-full relative">
            {messages.length === 0 ? (
              <div className="mx-auto flex w-full flex-col items-center justify-center py-20">
                <h3 className="text-2xl font-medium tracking-tight">
                  Hi, {user?.name?.split(" ")[0]}
                </h3>
                <span className="text-lg font-medium tracking-tight text-neutral-500">
                  How can I assist you today?
                </span>
                <div className="grid relative px-6 grid-cols-1 gap-2 mt-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 opacity-60 blur-xl"></div>
                  {initialPrompts.map((prompt, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        sendMessage(prompt);
                      }}
                      className="bg-white z-[2] p-4 leading-tight cursor-pointer hover:bg-neutral-50 rounded-xl border border-neutral-300 font-medium tracking-tight text-sm text-neutral-700"
                    >
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col px-3 space-y-4 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-2 ${
                      m.role === "user"
                        ? "bg-orange-100 p-2 rounded-xl text-orange-800 self-start"
                        : " self-end"
                    }`}
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
