"use client";

import URL from "@/lib/url";
import { cn, getGqlToken, PublicRandomLink, TUser } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, UIMessage } from "ai";
import { Dot, History, Lightbulb, Loader, Plus } from "lucide-react";
import { useRef } from "react";
import useMeasure from "react-use-measure";
import { v4 as uuid } from "uuid";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent } from "../ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { Response } from "../ai-elements/response";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";

type AskTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  user: TUser;
  height: number;
  pageData: PageData;
  suggestedPrompts: string[];
  isSuggestedPromptsLoading?: boolean;
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

const AskTab = ({
  height,
  suggestedPrompts,
  isSuggestedPromptsLoading,
  pageData,
  user,
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

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${URL}/api/chat`,
      async prepareSendMessagesRequest({ messages }) {
        const gqlToken = await getGqlToken();
        const headers: Record<string, string> = {
          Authorization: `Bearer ${gqlToken}`,
        };
        return {
          body: {
            messages,
            ctx: pageData?.content,
            chatId: chatId,
            userId: user?.id,
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
            metadata: {
              createdAt: message?.createdAt,
            },
          } as UIMessage)
      );
      setMessages(formattedHistoryMessages);
      return chat;
    },
  });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
                      {/* {chat?.id === chatId && (
                        <Dot className="size-6 leading-none inline" />
                      )} */}
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
              {messages?.map((message) => (
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
