// Util function to request extraction via background script
import { useBookmark } from "@/hooks/useBookmark";
import { useLike } from "@/hooks/useLike";
import { PublicRandomLink } from "@/lib/utils";
import { Toolbar } from "@betterstacks/toolbar-sdk";
import { UseMutationResult } from "@tanstack/react-query";
import { HeartRounded } from "@untitled-ui/icons-react";
import { UIMessage } from "ai";
import {
  Bookmark,
  Brain,
  MessageCircle,
  SidebarIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
type ToolbarProps = {
  activeLink?: PublicRandomLink | null;
  addToHistory: UseMutationResult<
    unknown,
    Error,
    void,
    {
      previous: PublicRandomLink[] | undefined;
    }
  >;
};

function ToolbarApp({ activeLink, addToHistory }: ToolbarProps) {
  const [isBrowserAgentOpen, setIsBrowserAgentOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [activeTab, setActiveTab] = useState<keyof typeof tabsIcon>("history");
  const {
    liked,
    toggleLike,
    count: likeCount,
    pending: isLikePending,
  } = useLike(activeLink?.id as string);
  const {
    bookmarkQuery,
    toggleBookmark,
    pending: isBookmarkPending,
  } = useBookmark(activeLink?.id as string);
  const bookmarkData = bookmarkQuery?.data;

  useEffect(() => {
    const messageHandler = async (message: any) => {
      console.log("Received message:", message);

      switch (message.type) {
        case "MARK_AS_VISITED": {
          const linkId = message?.data?.linkId as string;
          console.log("inside markAsVisited floater:", linkId);

          addToHistory.mutate(undefined, {
            onSuccess: () => {
              console.log("✅ Successfully added to history:", linkId);
            },
            onError: (error: any) => {
              console.error("❌ Error adding to history:", error);
            },
          });
          break;
        }
        case "CHAT_CHUNK": {
          console.log({ chatChunk: message.data });
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
                          ? last.parts[0].text + message.data
                          : message.data,
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
                parts: [{ text: message?.data, type: "text" }],
              },
            ];
          });
          break;
        }
        case "CHAT_DONE": {
          console.log("Stream finished");
          break;
        }
        case "CHAT_ERROR": {
          console.error("Chat error:", message.error);
          break;
        }
        default:
          break;
      }
    };

    const listener = (message: any) => {
      console.log("_________Inside Message Handler Sidebar__________");
      messageHandler(message);
      // no need for return true unless using sendResponse
    };

    browser.runtime.onMessage.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, [addToHistory, activeLink]);

  const toolbarButtons = [
    {
      id: "browser-agent",
      icon: <Brain size={16} />,
      tooltip: "Browser Agent",
      pinned: true,
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsBrowserAgentOpen(true);
      },
    },
    {
      id: "like",
      icon: (
        <HeartRounded fill={liked ? "white" : "none"} width={16} height={16} />
      ),
      tooltip: "Like",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        toggleLike(!liked);
      },
    },

    {
      id: "comments",
      icon: <MessageCircle size={16} />,
      tooltip: "Comments",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setActiveTab("comments");
        setIsBrowserAgentOpen(true);
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
    {
      id: "bookmark",

      icon: (
        <Bookmark
          fill={bookmarkData?.bookmarked ? "white" : "none"}
          size={16}
        />
      ),
      tooltip: "Bookmark",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        toggleBookmark(!bookmarkData?.bookmarked);
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
    {
      id: "ask",
      icon: <SparklesIcon size={16} />,
      tooltip: "Ask",

      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setActiveTab("ask");
        setIsBrowserAgentOpen(true);
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
    {
      id: "sidebar-toggle",
      icon: <SidebarIcon size={16} />,
      tooltip: "Sidebar",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsBrowserAgentOpen((prev) => !prev);
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
  ];
  return (
    <>
      <Toolbar
        className="bg-white"
        buttons={toolbarButtons}
        defaultIcon={<Brain size={16} />}
        theme={{
          backgroundColor: "white",
          borderColor: "lightgray",
          textColor: "black",
        }}
      />{" "}
      <Sidebar
        isOpen={isBrowserAgentOpen}
        messages={messages}
        activeLink={activeLink as PublicRandomLink}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setMessages={setMessages}
        onClose={() => setIsBrowserAgentOpen(false)}
      />
    </>
  );
}

export default ToolbarApp;
