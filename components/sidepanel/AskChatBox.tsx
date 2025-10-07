import { getFaviconFromDomain } from "@/lib/utils";
import { AtSign, Attachment01 } from "@untitled-ui/icons-react";
import { ChatStatus } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { FormEventHandler, useEffect, useState } from "react";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

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
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Browser.tabs.Tab>();
  const [isTabLoading, setIsTabLoading] = useState(false);
  useEffect(() => {
    const fetchActiveTab = async () => {
      const tab = await browser.tabs
        .query({ currentWindow: true, active: true })
        .then((tabs) => tabs[0]);
      setActiveTab(tab);
    };

    // Initial fetch
    fetchActiveTab();

    // Listen for tab activation events
    const handleTabActivated = (activeInfo: {
      tabId: number;
      windowId: number;
    }) => {
      browser.tabs.get(activeInfo.tabId).then((tab) => {
        setActiveTab(tab);
      });
    };

    // Listen for tab updates (URL changes, etc.)
    const handleTabUpdated = (
      tabId: number,
      changeInfo: any,
      tab: Browser.tabs.Tab
    ) => {
      if (changeInfo.status === "complete" && tab.active) {
        setActiveTab(tab);
        setIsTabLoading(false);
      } else if (changeInfo.status === "loading" && tab.active) {
        setIsTabLoading(true);
      }
    };

    // Add listeners
    browser.tabs.onActivated.addListener(handleTabActivated);
    browser.tabs.onUpdated.addListener(handleTabUpdated);

    // Cleanup listeners on unmount
    return () => {
      browser.tabs.onActivated.removeListener(handleTabActivated);
      browser.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);
  const getDomainFromUrl = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return "";
    }
  };
  return (
    <motion.div
      animate={{
        height: isMenuOpen ? "auto" : "auto",
      }}
      className="p-1 bg-neutral-50 shadow-md border border-neutral-200 w-full rounded-2xl flex flex-col justify-end"
      style={{ transformOrigin: "bottom" }}
    >
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center justify-start text-sm text-neutral-600 px-2 pt-2">
              {activeTab && typeof activeTab.index === "number" ? (
                <TabCard
                  isLoading={isTabLoading}
                  activeTab={{
                    ...activeTab,
                    favIconUrl: getFaviconFromDomain(
                      getDomainFromUrl(activeTab.url as string)
                    ) as string,
                    index: activeTab.index,
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PromptInput
        className="bg-white rounded-2xl border-neutral-200/50"
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea
          className="p-4 "
          onChange={(e) => setInput(e?.target?.value)}
          value={input}
        />
        <PromptInputToolbar className="border-none px-3 pb-2">
          <div>
            <Button
              className="rounded-full hover:bg-neutral-100 cursor-pointer"
              variant={"ghost"}
              size={"icon"}
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              // disabled
            >
              <AtSign className="size-4" />
            </Button>
            <Button
              className="rounded-full hover:bg-neutral-100 cursor-pointer"
              variant={"ghost"}
              size={"icon"}
              type="button"
              // disabled
            >
              <Attachment01 className="size-4" />
            </Button>
          </div>
          <PromptInputSubmit
            className="rounded-full bg-orange-500 text-white"
            status={status}
            disabled={
              (status !== "streaming" && input.trim() === "") ||
              status === "streaming" ||
              !userId
            }
          />
        </PromptInputToolbar>
      </PromptInput>
    </motion.div>
  );
};

const TabCard = ({
  activeTab,
  isLoading,
}: {
  isLoading: boolean;
  activeTab: Browser.tabs.Tab | undefined;
}) => {
  return (
    <div className="border  border-neutral-200 rounded-lg bg-white px-2 py-1 flex items-center justify-start w-[120px] cursor-pointer">
      {isLoading ? (
        <Skeleton className="size-4 bg-neutral-200 rounded-full mr-2" />
      ) : (
        <img
          src={activeTab?.favIconUrl}
          className="size-4 border border-neutral-200 rounded-full mr-2"
          alt=""
        />
      )}
      {isLoading ? (
        <Skeleton className="w-full bg-neutral-200 h-4 rounded-md" />
      ) : (
        <span className="line-clamp-1 truncate">{activeTab?.title}</span>
      )}
    </div>
  );
};

export default AskChatBox;
