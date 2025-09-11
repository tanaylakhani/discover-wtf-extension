import {
  capitalizeFirstLetter,
  cn,
  PublicRandomLink,
  TUser,
} from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  Info,
  MessageCircle,
  PanelRightClose,
  Sparkles,
} from "lucide-react";
import React from "react";
import useMeasure from "react-use-measure";
import AskTab from "./sidepanel/AskTab";
import HistoryTab from "./sidepanel/HistoryTab";
import InfoTab from "./sidepanel/InfoTab";
import ThreadsTab from "./sidepanel/ThreadsTab";
import { useEffect } from "react";

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
};

export interface PageData {
  url: string;
  title: string;
  content: string;
  metaDescription: string;
}

const Sidebar = ({
  isOpen,
  onClose,
  messages,
  setMessages,
  activeTab,
  setActiveTab,
  activeLink,
}: SidebarProps) => {
  const [pageData, setPageData] = React.useState<PageData | null>(null);
  const [ref, bounds] = useMeasure();
  const [suggestedPromptsLoading, setSuggestedPromptsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = React.useState<string[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: ["get-user"],
    queryFn: async () => {
      // Ask background script to fetch user data
      const resp = await browser.runtime.sendMessage({ type: "GET_USER" });
      console.log({ userData: resp });
      return resp?.data as TUser;
    },
  });

  const extractPageData = () => {
    try {
      const url = window.location.href;
      const title = document.title;
      const metaDescription =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") || "";

      // Function to clean and extract text content
      const cleanTextContent = (element: Element): string => {
        const clone = element.cloneNode(true) as Element;

        // Remove script, style, noscript tags and their content
        const unwantedTags = [
          "script",
          "style",
          "noscript",
          "nav",
          "header",
          "footer",
          "aside",
        ];
        unwantedTags.forEach((tag) => {
          const elements = clone.querySelectorAll(tag);
          elements.forEach((el) => el.remove());
        });

        // Remove elements that are likely navigation or non-content
        const unwantedSelectors = [
          '[class*="nav"]',
          '[class*="menu"]',
          '[class*="sidebar"]',
          '[class*="footer"]',
          '[class*="header"]',
          '[class*="banner"]',
          '[class*="advertisement"]',
          '[class*="ads"]',
          '[role="navigation"]',
          '[role="banner"]',
          '[role="complementary"]',
        ];

        unwantedSelectors.forEach((selector) => {
          try {
            const elements = clone.querySelectorAll(selector);
            elements.forEach((el) => el.remove());
          } catch (e) {
            // Continue if selector is invalid
          }
        });

        // Get text content and clean it up
        let text = clone.textContent || "";

        // Clean up whitespace
        text = text
          .replace(/\s+/g, " ") // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
          .trim();

        return text;
      };

      // Extract main content - try various selectors in order of preference
      const contentSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".content",
        "#content",
        ".post-content",
        ".entry-content",
        ".page-content",
        ".article-content",
        ".blog-content",
        ".story-content",
        ".text-content",
        "body",
      ];

      let content = "";
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = cleanTextContent(element);
          // If we found substantial content, use it
          if (content.length > 100) {
            break;
          }
        }
      }

      // If still no good content, try to get all visible text from body
      if (!content || content.length < 100) {
        const bodyElement = document.body;
        if (bodyElement) {
          content = cleanTextContent(bodyElement);
        }
      }

      console.log(`📄 Extracted page data:`, {
        url,
        title,
        contentLength: content.length,
        metaDescription,
        contentPreview: content.substring(0, 200) + "...",
      });

      const newPageData = { url, title, content, metaDescription };
      setPageData(newPageData);
    } catch (err) {
      console.error("Error extracting page data:", err);
    }
  };

  useEffect(() => {
    extractPageData();
  }, []);

  useEffect(() => {
    if (!pageData) return;
    const fetchSuggestedPrompts = async () => {
      try {
        setSuggestedPromptsLoading(true);
        const resp = await browser.runtime.sendMessage({
          type: "GET_SUGGESTED_PROMPTS",
          payload: {
            pageData: pageData,
          },
        });
        if (resp?.success && Array.isArray(resp.prompts)) {
          setSuggestedPromptsLoading(false);
          const promptsToSave = resp.prompts;
          setSuggestedPrompts(promptsToSave);
          // await browser.storage.local.set({ suggestedPrompts: promptsToSave });
        }
      } catch (err) {
        setSuggestedPromptsLoading(false);
        console.error("Error fetching suggested prompts:", err);
      }
    };
    fetchSuggestedPrompts();
  }, [pageData]);

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
        messages={messages}
        setMessages={setMessages}
        height={bounds?.height}
        user={data as TUser}
        activeLink={activeLink}
        activeTab={activeTab}
        pageData={pageData as PageData}
        suggestedPrompts={suggestedPrompts}
        isSuggestedPromptsLoading={suggestedPromptsLoading}
      />
    ),
    // usage: <>Usage</>,
    info: <InfoTab activeLink={activeLink} activeTab={activeTab} />,
  };

  useEffect(() => {
    const getInitialActiveSidePanelTabState = async () => {
      browser.storage.local.get("activeSidePanelTab").then((res) => {
        console.log({ activeSidePanelTab: res.activeSidePanelTab });
        setActiveTab(res.activeSidePanelTab ?? "history");
      });
    };
    getInitialActiveSidePanelTabState();

    const listener = (
      changes: Record<string, Browser.storage.StorageChange>,
      area: string
    ) => {
      if (area === "local" && changes.activeSidePanelTab) {
        console.log({ changes: changes?.activeSidePanelTab });
        setActiveTab(changes.activeSidePanelTab.newValue ?? "history");
      }
    };

    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          style={{
            zIndex: 2147483647,
            right: "0px",
          }}
          transition={{ type: "tween", ease: "easeIn", duration: 0.3 }}
          className="overflow-hidden fixed top-0 bottom-0 h-screen  bg-white border-l shadow-xl rounded-l-xl border-neutral-200 max-w-md w-full flex flex-col "
        >
          <div ref={ref} className="w-full  flex flex-col">
            <div className="w-full flex px-6 pt-3 py-1 items-center justify-between">
              <div
                onClick={() => onClose()}
                className="group group:bg-neutral-100 rounded-lg flex items-center justify-center"
              >
                <PanelRightClose className="size-5 group-hover:stroke-black stroke-neutral-700" />
              </div>
              {isLoading ? (
                <div className="size-8 rounded-full animate-pulse bg-neutral-200" />
              ) : (
                <img
                  src={data?.profile_image_url!}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
                />
              )}
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
                        activeTab === tab
                          ? "text-orange-600"
                          : "text-neutral-700"
                      ),
                    })}

                    <span
                      className={cn(
                        "ml-2 font-medium tracking-tight text-base",
                        activeTab === tab
                          ? "text-orange-600"
                          : "text-neutral-700"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
