import { ChatMessage } from "@/lib/types";
import URL from "@/lib/url";
import {
  capitalizeFirstLetter,
  cn,
  getGqlToken,
  makeCall,
  PublicRandomLink,
  TUser,
} from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, HeartRounded } from "@untitled-ui/icons-react";
import { DefaultChatTransport, UIMessage } from "ai";
import { motion } from "framer-motion";
import {
  History,
  Info,
  MessageCircle,
  PanelRight,
  Sparkles,
} from "lucide-react";
import React, { useEffect } from "react";
import useMeasure from "react-use-measure";
import { v4 as uuid } from "uuid";
import AskTab from "./sidepanel/AskTab";
import AvatarMenu from "./sidepanel/AvatarMenu";
import HistoryTab from "./sidepanel/HistoryTab";
import InfoTab from "./sidepanel/InfoTab";
import ThreadsTab from "./sidepanel/ThreadsTab";
import { PageData } from "./Toolbar";

export const tabsIcon = {
  history: History,
  comments: MessageCircle,
  ask: Sparkles,
  // usage: BarChart01,
  info: Info,
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  activeTab: keyof typeof tabsIcon;
  activeLink: PublicRandomLink | null;
  setActiveTab: (tab: keyof typeof tabsIcon) => void;
  pageData: PageData | null;
};

const Sidebar = ({
  onClose,
  activeTab,
  setActiveTab,
  activeLink,
  pageData,
}: SidebarProps) => {
  const [ref, bounds] = useMeasure();
  const [chatId, setChatId] = useState(uuid());

  const [isPrevChat, setIsPrevChat] = useState(false);
  const { data: suggestedPromptsData, isLoading: suggestedPromptsLoading } =
    useQuery({
      queryKey: ["suggested-prompts", pageData, activeLink?.id],
      queryFn: async () => {
        const resp = await browser.runtime.sendMessage({
          type: "GET_SUGGESTED_PROMPTS",
          payload: {
            pageData: pageData,
          },
        });
        if (resp?.success && Array.isArray(resp.prompts)) {
          return resp.prompts;
        }
        return [];
      },
      enabled: !!pageData,
    });

  const { data, isLoading } = useQuery({
    queryKey: ["get-user"],
    queryFn: async () => {
      const resp = await makeCall("/user", {}, 10000);
      console.log({ data: resp?.data });
      return resp?.data as TUser;
    },
  });
  const suggestedPrompts = suggestedPromptsData || [];
  const { messages, regenerate, sendMessage, status, setMessages } =
    useChat<ChatMessage>({
      id: chatId,
      transport: new DefaultChatTransport({
        api: `${URL}/api/chat`,
        async prepareSendMessagesRequest({ messages }) {
          if (!data?.id) {
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
              userId: data?.id, // Remove optional chaining since we checked above
              linkId: activeLink?.id,
            },
            headers,
          };
        },
      }),
    });

  useEffect(() => {
    setMessages([]);
  }, [activeLink?.id]);
  const regenerateMessage = async (messageId?: string) => {
    await regenerate({ messageId });
  };

  const handleHistoryClick = (chatId: string) => {
    setIsPrevChat(true);
    setChatId(chatId);
  };

  const tabs = {
    history: (
      <HistoryTab
        height={bounds?.height}
        activeLink={activeLink}
        activeTab={activeTab}
      />
    ),
    comments: (
      <ThreadsTab
        height={bounds?.height}
        activeLink={activeLink}
        user={data as TUser}
        activeTab={activeTab}
      />
    ),
    ask: (
      <AskTab
        height={bounds?.height}
        userId={data?.id as string}
        activeLink={activeLink}
        activeTab={activeTab}
        pageData={pageData as PageData}
        suggestedPrompts={suggestedPrompts}
        messages={messages}
        setMessages={setMessages}
        chatId={chatId}
        setChatId={setChatId}
        handleHistoryClick={handleHistoryClick}
        isPrevChat={isPrevChat}
        setIsPrevChat={setIsPrevChat}
        regenerateMessage={regenerateMessage}
        status={status}
        sendMessage={sendMessage}
        isSuggestedPromptsLoading={suggestedPromptsLoading}
      />
    ),
    // usage: <>Usage</>,
    info: <InfoTab activeTab={activeTab} />,
  };

  useEffect(() => {
    const getInitialActiveSidePanelTabState = async () => {
      browser.storage.local.get("activeSidePanelTab").then((res) => {
        setActiveTab(res.activeSidePanelTab ?? "history");
      });
    };
    getInitialActiveSidePanelTabState();

    const listener = (
      changes: Record<string, Browser.storage.StorageChange>,
      area: string
    ) => {
      if (area === "local" && changes.activeSidePanelTab) {
        setActiveTab(changes.activeSidePanelTab.newValue ?? "history");
      }
    };

    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);
  const options = [{ icon: HeartRounded }, { icon: Bookmark }];

  // <AnimatePresence>
  //   {isOpen && (
  //     <motion.div
  //       initial={{ x: "100%" }}
  //       animate={{ x: 0 }}
  //       exit={{ x: "100%" }}
  //       style={{
  //         zIndex: 2147483647,
  //         right: "0px",
  //       }}
  //       transition={{ type: "tween", ease: "easeIn", duration: 0.3 }}
  //       className="overflow-hidden fixed top-0 bottom-0 h-screen  bg-white border-l shadow-xl rounded-l-xl border-neutral-200 max-w-md w-full flex flex-col "
  //     >
  return (
    <>
      <div ref={ref} className="w-full  flex  flex-col">
        <div className="w-full flex px-6 pt-3 py-1 items-center justify-between">
          <div
            onClick={() => onClose()}
            className="group group:bg-neutral-100 rounded-lg flex items-center justify-center"
          >
            <PanelRight className="size-5 group-hover:stroke-black stroke-neutral-700" />
          </div>
          <div className="flex items-center justify-center">
            {/* <div className="flex items-center gap-x-4 mr-4 justify-center">
              {options.map((option, i) => {
                return (
                  <>
                    {option.icon({
                      className: "size-5 stroke-neutral-700",
                    })}
                  </>
                );
              })}
              <div className="border-r border-neutral-200 h-6" />
            </div> */}
            <AvatarMenu>
              {isLoading ? (
                <div className="size-8 rounded-full animate-pulse bg-neutral-200" />
              ) : (
                <img
                  src={data?.profile_image_url!}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
                />
              )}
            </AvatarMenu>
          </div>
        </div>
        <div className="px-2 w-full flex flex-row mt-2 items-center justify-center  border-b border-neutral-200 ">
          {Object.keys(tabs).map((tab) => {
            const icon = tabsIcon[tab as keyof typeof tabsIcon];
            return (
              <div
                key={tab}
                className={cn(
                  "cursor-pointer flex-1 w-full py-3 mx-2 px-2 flex relative items-center justify-center"
                )}
                onClick={async () => {
                  await browser.storage.local.set({
                    activeSidePanelTab: tab,
                  });
                  setActiveTab(tab as keyof typeof tabs);
                }}
              >
                {React.createElement(icon, {
                  className: cn(
                    "size-5 ",
                    activeTab === tab ? "text-orange-600" : "text-neutral-700"
                  ),
                })}

                <span
                  className={cn(
                    "ml-2 font-medium tracking-tight text-base",
                    activeTab === tab ? "text-orange-600" : "text-neutral-700"
                  )}
                >
                  {capitalizeFirstLetter(tab)}
                </span>
                {activeTab === tab && (
                  <motion.div
                    layoutId="underline"
                    className="absolute left-0 inset-x-0 -bottom-[1.5px] h-[3px] bg-orange-600 rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-full overflow-hidden flex flex-col w-full ">
        {tabs[activeTab]}
      </div>
    </>
    // </motion.div>
    //   )}
    // </AnimatePresence>
  );
};

export default Sidebar;
