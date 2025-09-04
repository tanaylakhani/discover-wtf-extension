"use client";

import { PublicRandomLink, TUser } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useState, useRef, useEffect } from "react";
import useMeasure from "react-use-measure";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { ScrollArea } from "../ui/scroll-area";
import { UIMessage } from "ai";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  user?: TUser;
  height: number;
};

const AskTab = ({ user, height }: AskTabProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [ref, bounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${height + bounds?.height}px)`;
  const viewportRef = useRef<HTMLDivElement>(null);

  const portRef = useRef<Browser.runtime.Port | null>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === "chat_chunk") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];

          if (last && last.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                parts: [
                  {
                    ...last.parts[0],
                    text:
                      last.parts[0].type === "text"
                        ? last.parts[0].text + msg.data
                        : msg.data,
                  },
                ],
              },
            ];
          }

          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              parts: [{ text: msg.data, type: "text" }],
            },
          ];
        });
      } else if (msg.type === "chat_done") {
        console.log("Stream finished");
      } else if (msg.type === "chat_error") {
        console.error("Chat error:", msg.error);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const initialPrompts = [
    "Summarize the page I’m currently viewing",
    "List the key takeaways from this content",
    "Explain this article in simple terms",
    "Give me a quick 2-sentence summary",
  ];
  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [
        {
          text: input,
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

  return (
    <div className="flex flex-col">
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
              <div className="flex flex-col space-y-4 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-2 ${
                      m.role === "user" ? "text-blue-600" : "text-green-600"
                    }`}
                  >
                    <strong>{m.role}:</strong>{" "}
                    {m.parts.map((p, i) =>
                      p.type === "text" ? <span key={i}>{p.text}</span> : null
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
          onSubmit={sendMessage}
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
