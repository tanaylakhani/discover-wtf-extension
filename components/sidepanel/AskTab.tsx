"use client";

import URL from "@/lib/url";
import { cn, getGqlToken, PublicRandomLink, TUser } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, InferUITool, Tool, UIMessage } from "ai";
import {
  Copy,
  History,
  Lightbulb,
  Loader,
  Loader2,
  Plus,
  RefreshCcw,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import useMeasure from "react-use-measure";
import { v4 as uuid } from "uuid";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent } from "../ai-elements/message";
import { Response } from "../ai-elements/response";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import LinkCard from "./LinkCard";
import RelatedQuestions from "./RelatedQuestions";
import AskChatBox from "./AskChatBox";
import SuggestedPrompts from "./SuggestedPrompts";

type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  userId: string;
  height: number;
  pageData: PageData;
  suggestedPrompts: string[];
  isSuggestedPromptsLoading: boolean;
};

type TChat = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  linkId: string;
  title: string | null;
};

type TMessage = {
  id: string;
  content: unknown;
  createdAt: Date;
  chatId: string;
  role: string;
};

export type ChatTools = {
  getSimilarLinks: InferUITool<
    Tool<{
      name: string;
    }>
  >;
  bookmarkLink: InferUITool<
    Tool<{
      name: string;
    }>
  >;
};

export type CustomUIDataTypes = {
  getSimilarLinks: {
    text?: string;
    links?: PublicRandomLink[];
    status: "fetching" | "found-n-items" | "links-loading" | "complete";
  };
  bookmarkLink: {
    text?: string;
    bookmarked?: boolean;
    status: "fetching" | "complete";
  };
  getRelatedQuestions: {
    status: "generating" | "complete" | "error";
    prompts?: string[];
    error?: string;
  };
};

export type ChatMessage = UIMessage<never, CustomUIDataTypes, ChatTools>;
export type CustomMessage = UIMessage<
  never,
  {
    searchForRelatedLinks: {
      links: PublicRandomLink[];
    };
  }
>;

const AskTab = ({
  height,
  suggestedPrompts,
  isSuggestedPromptsLoading,
  pageData,
  userId,
  activeLink,
}: AskTabProps) => {
  const [ref, bounds] = useMeasure();
  const [input, setInput] = useState("");
  const [openHistory, setOpenHistory] = useState(false);
  const [chatId, setChatId] = useState(uuid());
  const [isPrevChat, setIsPrevChat] = useState(false);
  const [commentOptionsBar, barBounds] = useMeasure();
  const scrollAreaHeight = `calc(100vh - ${
    height + bounds?.height + barBounds?.height
  }px)`;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    regenerate,
    sendMessage,
    status,
    setMessages,
    addToolResult,
  } = useChat<ChatMessage>({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${URL}/api/chat`,
      async prepareSendMessagesRequest({ messages }) {
        if (!userId) {
          throw new Error(
            "User not loaded yet. Please wait for authentication."
          );
        }

        const gqlToken = await getGqlToken();
        const headers: Record<string, string> = {
          Authorization: `Bearer ${gqlToken}`,
        };
        return {
          body: {
            messages,
            ctx: pageData?.content,
            chatId: chatId,
            userId: userId, // Remove optional chaining since we checked above
            linkId: activeLink?.id,
          },
          headers,
        };
      },
    }),
  });
  const handleHistoryClick = (chatId: string) => {
    setIsPrevChat(true);
    setChatId(chatId);
  };

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    enabled: openHistory,
    queryKey: ["get-chat-history", activeLink?.id],
    queryFn: async () => {
      const gqlToken = await getGqlToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${gqlToken}`,
      };
      const params = {
        linkId: activeLink?.id as string,
      };
      const urlSearchParams = new URLSearchParams(params);
      const response = await fetch(
        `${URL}/api/chat/history?${urlSearchParams.toString()}`,
        { headers }
      );

      if (!response?.ok) {
        return [];
      }
      const data = await response.json();

      return data?.chats as TChat[];
    },
  });
  const { data: prevChatMessages, isLoading: isLoadingPrevChat } = useQuery({
    enabled: isPrevChat && !!chatId,
    queryKey: ["get-previous-chat", activeLink?.id, chatId, isPrevChat],
    queryFn: async () => {
      const gqlToken = await getGqlToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${gqlToken}`,
      };
      const params = {
        linkId: activeLink?.id as string,
        chatId,
      };
      const urlSearchParams = new URLSearchParams(params);
      const response = await fetch(
        `${URL}/api/chat/history?${urlSearchParams.toString()}`,
        { headers }
      );

      if (!response?.ok) {
        return [];
      }
      const data = await response.json();

      const chat = data?.chat as TChat;
      const chatMessages = data?.messages as TMessage[];
      const formattedHistoryMessages = chatMessages?.map(
        (message) =>
          ({
            id: message.id,
            parts: message?.content,
            role: message?.role,
          } as ChatMessage)
      );
      setMessages(formattedHistoryMessages);
      return chat;
    },
  });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId) {
      console.warn("Cannot send message: User not loaded yet");
      return;
    }

    sendMessage({ text: input });
    setInput("");
  };

  const startNewChat = () => {
    if (isPrevChat) {
      setIsPrevChat(false);
    }
    if (isLoadingPrevChat) {
      return;
    }
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
          <Popover open={openHistory} onOpenChange={setOpenHistory}>
            <PopoverTrigger asChild>
              <Button
                className="hover:bg-neutral-100"
                size={"icon"}
                variant="ghost"
              >
                <History className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="overflow-hidden bg-white translate-x-5 rounded-xl font-inter  translate-y-2 p-0 ">
              {isHistoryLoading ? (
                <div className="p-3 flex items-center justify-center text-sm">
                  <Loader className="size-4 animate-spin " />
                </div>
              ) : history?.length === 0 ? (
                <div className="p-3 text-sm">No previous chats</div>
              ) : (
                history?.map((chat, i) => {
                  return (
                    <div
                      key={i}
                      onClick={() => handleHistoryClick(chat.id)}
                      className={cn(
                        "px-3 py-1.5 last:mb-2 first:mt-2 group border-b last:border-none cursor-pointer hover:bg-neutral-50 flex items-center justify-between",
                        chat?.id === chatId &&
                          "bg-orange-50 hover:bg-orange-100/70"
                      )}
                    >
                      <span className="text-sm group-hover:text-neutral-900 text-neutral-700 tracking-tight line-clamp-1 ">
                        {chat?.title}
                      </span>
                    </div>
                  );
                })
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Conversation>
        <ConversationContent style={{ height: scrollAreaHeight }}>
          {isPrevChat && isLoadingPrevChat ? (
            <div className="flex justify-center items-center w-full">
              <Loader className="animate-spin size-6 mt-6" />
            </div>
          ) : messages.length === 0 ? (
            <SuggestedPrompts
              isSuggestedPromptsLoading={isSuggestedPromptsLoading}
              sendMessage={sendMessage}
              userId={userId}
              setInput={setInput}
              suggestedPrompts={suggestedPrompts}
            />
          ) : (
            <div className="flex flex-col space-y-4 py-4 max-w-full">
              {messages?.map((message) => (
                <Message className="" from={message?.role} key={message.id}>
                  <MessageContent
                    className={cn(
                      "rounded-xl font-inter",
                      message?.role === "user"
                        ? "bg-neutral-100 tracking-tight max-w-[75%] w-fit font-medium text-neutral-700"
                        : "border-none bg-transparent"
                    )}
                  >
                    {message.role === "assistant" && (
                      <span className="text-sm text-neutral-600 font-medium flex items-center justify-start  leading-tight mb-2">
                        Discover.wtf
                      </span>
                    )}
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <>
                              <Response key={`${message.id}-${i}`}>
                                {part.text}
                              </Response>
                              {message.role === "assistant" && (
                                <div className="flex mt-1 items-center justify-end space-x-1">
                                  <Button
                                    onClick={async () =>
                                      navigator.clipboard.writeText(part.text)
                                    }
                                    size={"icon"}
                                    variant={"ghost"}
                                  >
                                    <Copy className="size-3" />
                                  </Button>
                                  <Button
                                    onClick={async () =>
                                      await regenerate({
                                        messageId: message?.id,
                                      })
                                    }
                                    size={"icon"}
                                    variant={"ghost"}
                                  >
                                    <RefreshCcw className="size-3" />
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                      }
                    })}
                    {(() => {
                      const toolParts = message.parts.filter(
                        (part) => part.type === "data-getSimilarLinks"
                      );
                      const latest = toolParts[toolParts.length - 1];
                      if (!latest) return null;

                      const { data } = latest;

                      switch (data?.status) {
                        case "fetching":
                        case "found-n-items":
                          return (
                            <div className="flex items-center justify-start">
                              <Loader2 className="size-4 text-neutral-700 animate-spin mr-1" />
                              <span className="text-sm font-medium ">
                                {data.text}
                              </span>
                            </div>
                          );

                        case "links-loading":
                          return (
                            <div className="w-full overflow-x-auto py-2 flex items-center justify-start">
                              {[...Array.from({ length: 4 })].map((_, i) => (
                                <div
                                  key={i}
                                  className="flex flex-col h-[180px] shadow-md bg-white max-w-xs flex-shrink-0 w-full py-4 px-6 rounded-2xl border border-neutral-200"
                                >
                                  <div className="flex w-full items-center justify-center">
                                    <Skeleton className="animate-none bg-neutral-200 rounded-full aspect-square size-10" />
                                    <div className="ml-2 flex flex-col w-full pr-4 space-y-1">
                                      <Skeleton className="animate-none w-1/3 bg-neutral-200 rounded-2xl h-4" />
                                      <Skeleton className="animate-none w-full bg-neutral-200 rounded-2xl h-4" />
                                    </div>
                                  </div>
                                  <Skeleton className="animate-none w-full bg-neutral-200 mt-2 rounded-2xl h-28" />
                                </div>
                              ))}
                            </div>
                          );

                        case "complete":
                          return (
                            <div className=" relative">
                              <div className="w-full overflow-x-auto py-2 flex items-center justify-start">
                                {data.links?.map((link, i) => (
                                  <LinkCard key={i} link={link} />
                                ))}
                              </div>
                            </div>
                          );

                        default:
                          return null;
                      }
                    })()}
                    <RelatedQuestions
                      message={message}
                      sendMessage={(text: string) => sendMessage({ text })}
                    />
                  </MessageContent>
                </Message>
              ))}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bg-white" />
      </Conversation>

      <div
        ref={ref}
        className="w-full z-10 px-2 pb-2 flex items-center justify-center"
      >
        <AskChatBox
          handleSubmit={handleSubmit}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          userId={userId}
          status={status}
        />
      </div>
    </div>
  );
};

export default AskTab;
