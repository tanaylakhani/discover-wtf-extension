import rabbit from "@/assets/rabbit-hole-icon.gif";
import spiral from "@/assets/spiral.png";
import "@/entrypoints/style.css";
import { useLike } from "@/hooks/useLike";
import { useBookmark } from "@/hooks/useBookmark";
import { cn, PublicRandomLink } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Bookmark,
  Heart,
  X,
  WandSparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Toolbar } from "@betterstacks/toolbar-sdk";
type FloaterProps = {
  activeLink: PublicRandomLink | null;
  urlVisitCount: number;
};


const Floater: React.FC<FloaterProps> = ({
  activeLink: link,
  urlVisitCount,
}) => {
  const [count, setCount] = useState(urlVisitCount || 0);
  const [activeLink, setActiveLink] = useState<PublicRandomLink | null>(link);
  const {
    liked,
    toggleLike,
    count: likeCount,
  } = useLike(link?.id as string);
  const {
    bookmarkQuery,
    toggleBookmark,
  } = useBookmark(link?.id as string);
  const bookmarkData = bookmarkQuery?.data;

  const queryClient = useQueryClient();
  const addToHistory = useMutation({
    mutationFn: async () => {
      // Fetch the latest activeLink from local storage
      const { activeLink: latestActiveLink } = await browser.storage.local.get(
        "activeLink"
      );
      if (!latestActiveLink) throw new Error("No active link found");
      return new Promise((resolve, reject) => {
        // Send message to background script
        browser.runtime.sendMessage(
          {
            type: "MARK_LINK_AS_VISITED",
            data: {
              linkId: latestActiveLink.id,
            },
          },
          (response) => {
            if (browser.runtime.lastError) {
              reject(new Error(browser.runtime.lastError.message));
              return;
            }

            if (!response.success) {
              reject(new Error(response.error || "Unknown error occurred"));
              return;
            }

            resolve(response);
          }
        );
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["get-history", activeLink?.id],
      });

      console.log("Inside useHistory Mutation");
      const previous = queryClient.getQueryData<PublicRandomLink[]>([
        "get-history",
        activeLink?.id,
      ]);
      // Fetch the latest activeLink from local storage synchronously for optimistic update
      const { activeLink: latestActiveLink } = await browser.storage.local.get(
        "activeLink"
      );
      if (latestActiveLink) {
        console.log("Inside useHistory Mutation ", latestActiveLink);

        queryClient.setQueryData<PublicRandomLink[]>(
          ["get-history", activeLink?.id],
          (old) => {
            // Add to the top
            return [latestActiveLink, ...(old || [])];
          }
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["get-history", activeLink?.id],
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["get-history", activeLink?.id],
      });
    },
  });

  useEffect(() => {
    const listener = (
      changes: { [key: string]: globalThis.Browser.storage.StorageChange },
      areaName: globalThis.Browser.storage.AreaName
    ) => {
      if (areaName !== "local")
        if (changes?.urlVisitCount || changes.activeLink) {
          setCount(changes?.urlVisitCount?.newValue);
          setActiveLink(changes?.activeLink?.newValue);
        }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

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
      }
    };

    const listener = (message: any) => {
      console.log("_________Inside Message Handler Floater__________");
      messageHandler(message);
      // no need for return true unless using sendResponse
    };

    browser.runtime.onMessage.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, [addToHistory, activeLink]);

  const handleSidePanelOpen = async (activeTab: string) => {
    const extensionTabId = await browser.storage.local.get("extensionTabId");
    console.log("Opening side panel for tab:", extensionTabId);
    const currentTabId = await browser.runtime.sendMessage({
      type: "GET_CURRENT_TAB_ID",
    });
    const isExtensionTab =
      extensionTabId?.extensionTabId === currentTabId?.tabId;
    console.log({ isExtensionTab });
    await browser.storage.local.set({
      activeSidePanelTab: activeTab,
    });
    await browser.runtime
      .sendMessage({
        type: "OPEN_SIDE_PANEL",
      })
      .catch(console.error);
  };

  const [inRabbitHole, setIsInRabbitHole] = useState(false);

  // Create toolbar buttons with same functionality
  const toolbarButtons = [
    {
      id: "ask-ai",
      icon: <WandSparkles 
        size={16}
        style={{
          fill: "none",
          stroke: "#6b7280",
        }}
      />,
      tooltip: "Ask AI",
      onClick: () => handleSidePanelOpen("ask"),
    },
    {
      id: "like",
      icon: <Heart 
        size={16}
        style={{
          fill: liked ? "#FFD996" : "none",
        }}
      />,
      tooltip: "Like",
      onClick: () => toggleLike(!liked),
      count: Number(likeCount),
      pinned: true,
    },
    {
      id: "comment",
      icon: <MessageCircle 
        size={16}
        style={{
          fill: "none",
          stroke: "#6b7280",
        }}
      />,
      tooltip: "Comment",
      onClick: () => handleSidePanelOpen("comments"),
      pinned: true,
    },
    {
      id: "bookmark",
      icon: <Bookmark 
        size={16}
        style={{
          fill: bookmarkData?.bookmarked ? "#FFD996" : "none",
        }}
      />,
      tooltip: "Save",
      onClick: () => toggleBookmark(!bookmarkData?.bookmarked),
      pinned: false,
    },
  ];

  return (
    <>
      {/* Rabbit hole and discover count UI - keeping the same */}
      <div className={cn("fixed top-32 flex flex-col items-end right-0 ")}>
        <motion.div className="w-fit gap-x-2 flex items-center justify-center">
          <AnimatePresence>
            {inRabbitHole && (
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={
                  "bg-indigo-700 text-white h-12 w-fit px-6  rounded-full flex items-center justify-center "
                }
              >
                <button
                  onClick={() => setIsInRabbitHole(false)}
                  className="flex items-center justify-center mr-2"
                >
                  <X className="stroke-white size-8" />
                </button>
                <img
                  src={spiral}
                  alt="Animated"
                  className="size-8  animate-spin  object-cover"
                />
                <div className="flex flex-col ml-3 items-start">
                  <span className="tracking-tight text-xs font-medium">
                    In Rabbit Hole:
                  </span>
                  <span className="font-semibold tracking-tight">
                    {activeLink?.domain}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            id="discover-count"
            className="bg-purple-500 w-full rounded-l-full h-12 pl-6 pr-4 flex items-center justify-center "
          >
            <span className="text-neutral-200 text-sm font-semibold mr-1">
              Discover Count:
            </span>
            <span className="font-semibold text-sm tracking-tight text-white">
              {count}
            </span>
          </div>
        </motion.div>
        <motion.div
          id="source"
          className={
            "bg-white hover:-translate-x-0 transition-all duration-75 ease-linear translate-x-[65%] border cursor-pointer border-neutral-200 shadow-lg mt-2 h-12 rounded-full flex items-center justify-center  relative overflow-hidden"
          }
        >
          <span className="text-neutral-500 text-sm px-4 font-semibold ">
            Source: "{activeLink?.domain}" from betterstacks
          </span>
          <AnimatePresence initial={false}>
            {!inRabbitHole && (
              <motion.button
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  width: 0,
                  padding: 0,
                  transition: { duration: 0.3, ease: "easeInOut" },
                }}
                className=" size-[10rem] -mr-4 overflow-hidden relative"
                onClick={() => {
                  setIsInRabbitHole(true);
                }}
              >
                <img
                  src={rabbit}
                  alt="Animated"
                  className="  object-cover"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {createPortal(
        <Toolbar
          buttons={toolbarButtons}
          theme={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "rgba(249, 115, 22, 0.2)",
            iconColor: "#6b7280",
            hoverBackgroundColor: "rgba(249, 115, 22, 0.1)",
            tooltipBackgroundColor: "#f97316",
            tooltipTextColor: "#ffffff",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(249, 115, 22, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)",
            badgeBackgroundColor: "#f97316",
            badgeTextColor: "#ffffff",
            badgeBorderColor: "rgba(249, 115, 22, 0.3)",
          }}
        />,
        document.body
      )}
    </>
  );
};

export default Floater;
