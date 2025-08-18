import rabbit from "@/assets/rabbit-hole-icon.gif";
import spiral from "@/assets/spiral.png";
import "@/entrypoints/style.css";
import { useLike } from "@/hooks/useLike";
import { cn, PublicRandomLink } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AnnotationDots,
  Bookmark,
  HeartRounded,
  MagicWand01,
  Plus,
  X,
} from "@untitled-ui/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
type FloaterProps = {
  activeLink: PublicRandomLink | null;
  urlVisitCount: number;
};

type GetLinksPayload = {
  count: number;
  data: {
    userId: string;
    linkId: string;
    likedAt: Date;
  }[];
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
    pending: isLikePending,
  } = useLike(link?.id as string);
  const {
    bookmarkQuery,
    toggleBookmark,
    pending: isBookmarkPending,
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

  const options = [
    {
      handleClick: async () => {
        toggleLike(!liked);
      },
      name: "Like",
      icon: HeartRounded,
      disabled: isLikePending,

      fill: liked ? "black" : "none",
    },
    {
      handleClick: async () => {
        await handleSidePanelOpen("comments");
      },
      disabled: false,

      name: "Comment",
      icon: AnnotationDots,
      fill: "none",
    },
    {
      handleClick: async () => {
        await handleSidePanelOpen("ask");
      },
      name: "Ask AI",
      icon: MagicWand01,
      fill: "none",
      disabled: false,
    },
    {
      handleClick: async () => {
        toggleBookmark(!bookmarkData?.bookmarked);
      },
      name: "Save",
      icon: Bookmark,
      disabled: isBookmarkPending,
      fill: bookmarkData?.bookmarked ? "black" : "none",
    },
    // {name:"Share", icon: <Share/>},
  ];
  const [inRabbitHole, setIsInRabbitHole] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const containerVariants = {
    open: {
      height: 200,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.08,
        duration: 0.3,
      },
    },
    closed: {
      height: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: 0.05,
        staggerDirection: -1,
        duration: 0.2,
      },
    },
  };
  const itemVariants = {
    open: { opacity: 1, y: 0, scale: 1 },
    closed: { opacity: 0, y: 10, scale: 0.95 },
  };

  const { data: userData, isLoading } = useApiData(
    ["get-current-user"],
    "/user"
  );
  console.log({ userData });

  return (
    <>
      {" "}
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
                // onClick={() => {
                //   setIsInRabbitHole(true);
                // }}
              >
                <button
                  onClick={() => setIsInRabbitHole(false)}
                  className="flex items-center justify-center mr-2"
                >
                  <X className="stroke-white size-8" />
                </button>
                <img
                  src={spiral} // force reload by changing URL
                  alt="Animated"
                  className="size-8  animate-spin  object-cover"
                />{" "}
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
            className={
              "bg-neutral-100 border border-neutral-200 h-12 w-fit py-1 pl-1 rounded-l-full flex items-center justify-center"
            }
          >
            <div className="bg-white w-full border border-neutral-200 rounded-l-full h-full pl-6 pr-4 flex items-center justify-center ">
              <span className="text-neutral-800 text-sm font-semibold mr-1">
                Discover Count:
              </span>
              <span className="font-semibold text-sm tracking-tight text-neutral-800">
                {count}
              </span>
            </div>
          </div>
        </motion.div>
        <motion.div
          id="source"
          className={
            "bg-white hover:-translate-x-0 transition-all duration-75 ease-linear translate-x-[65%] border cursor-pointer border-neutral-200 shadow-lg mt-2 h-12 rounded-full flex items-center justify-center  relative overflow-hidden"
          }
          // className="bg-neutral-50 border border-neutral-200  mb-4 size-10 font-medium flex items-center justify-center rounded-l-full text-neutral-900"
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
                  // margin: 0,
                  padding: 0,
                  transition: { duration: 0.3, ease: "easeInOut" },
                }}
                className=" size-[10rem] -mr-4 overflow-hidden relative"
                onClick={() => {
                  setIsInRabbitHole(true);
                }}
              >
                <img
                  src={rabbit} // force reload by changing URL
                  alt="Animated"
                  className="  object-cover"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* <motion.div className="h-fit fixed bottom-20  right-4  px-2 py-2.5  rounded-lg flex flex-col items-center  justify-center gap-y-4 transition-all duration-200 cursor-pointer">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={option.handleClick}
            className=" p-2 size-14 rounded-full flex items-center justify-center relative group border border-neutral-200 bg-neutral-100"
            // title={option?.name}
            disabled={isPending}
          >
            <div className="group-hover:opacity-100 absolute -translate-x-20 opacity-0 bg-neutral-900 border-neutral-700 text-neutral-100 text-xs transition-all duration-75   font-medium px-2 py-1 rounded-lg">
              {option.name}
            </div>

            {index === 0 && (
              <div className="p-1.5 rounded-full border border-neutral-200  absolute -top-2  flex items-center justify-center -right-2 bg-white ">
                <span className="text-xs font-semibold">20</span>
              </div>
            )}
            <option.icon
              style={{
                fill: option.fill || "none",
                stroke: "#404040",
                strokeWidth: 1.4,
              }}
              className="size-6  "
            />
          </button>
        ))}
      </motion.div> */}
      <div className="fixed rounded-full bottom-20 right-4 flex flex-col items-center border border-neutral-200 bg-neutral-100 ">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className=" flex flex-col pt-2 items-center "
              initial="closed"
              animate="open"
              exit="closed"
              variants={containerVariants}
            >
              {options.map((option, index) => (
                <motion.button
                  key={index}
                  variants={itemVariants}
                  onClick={option.handleClick}
                  disabled={option?.disabled}
                  className="p-2 size-12 rounded-full flex items-center justify-center relative group "
                >
                  {/* Tooltip */}
                  <div className="group-hover:opacity-100 absolute -translate-x-20 opacity-0 bg-neutral-900 border-neutral-700 text-neutral-100 text-xs transition-all duration-75 font-medium px-2 py-1 rounded-lg">
                    {option.name}
                  </div>

                  {/* Badge on first item */}
                  {index === 0 && (
                    <div className="p-1 rounded-full border border-neutral-200 absolute -top-2 flex items-center justify-center -right-2 aspect-square size-6 bg-white">
                      <span className="text-xs font-semibold">
                        {Number(likeCount)}
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <option.icon
                    style={{
                      fill: option.fill || "none",
                      stroke: "#404040",
                      strokeWidth: 1.4,
                    }}
                    className="size-6"
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          onClick={() => setIsOpen((prev) => !prev)}
          className="size-12 rounded-full flex items-center justify-center"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <Plus className="size-6" />
        </motion.button>
      </div>
    </>
  );
};

export default Floater;
//  <AnimatePresence>
//    {isSidebarOpen && (
//      <motion.div
//        key="sidebar"
//        initial={{ x: "100%" }}
//        animate={{ x: 0 }}
//        exit={{ x: "100%" }}
//        className="fixed top-2 h-[98vh] z-50 max-w-xl w-full bottom-2 right-2"
//        transition={{ duration: 0.3, ease: "easeInOut" }}
//      >
//        <div className=" h-full p-1 w-full  bg-neutral-100 border border-neutral-200 shadow-xl rounded-2xl overflow-hidden">
//          <div className="h-full w-full  bg-white border border-neutral-200 rounded-2xl overflow-hidden">
//            <div className="w-full flex px-6 pt-3 py-1 items-center justify-between">
//              <div
//                onClick={() => setIsSidebarOpen(false)}
//                className="group group:bg-neutral-100 rounded-lg flex items-center justify-center"
//              >
//                <LayoutLeft className="size-5 group-hover:stroke-black stroke-neutral-700" />
//              </div>
//              {isLoading ? (
//                <div className="size-8 rounded-full animate-pulse bg-neutral-200" />
//              ) : (
//                <img
//                  src={userData?.data?.profile_image_url}
//                  alt="Profile"
//                  className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
//                />
//              )}
//            </div>
//            <div className="px-2 w-full flex flex-row mt-2 items-center justify-center  border-b border-neutral-200 ">
//              {Object.keys(tabs).map((tab) => {
//                const icon = tabsIcon[tab as keyof typeof tabsIcon];
//                return (
//                  <div
//                    key={tab}
//                    className={cn(
//                      "cursor-pointer flex-1 w-full py-3 mx-2 px-2 flex relative items-center justify-center"
//                    )}
//                    onClick={() => setActiveTab(tab as keyof typeof tabs)}
//                  >
//                    {icon({
//                      className: cn(
//                        "size-5 ",
//                        activeTab === tab ? "text-black" : "text-neutral-700"
//                      ),
//                    })}
//                    <span
//                      className={cn(
//                        "ml-2 font-medium tracking-tight",
//                        activeTab === tab ? "text-black" : "text-neutral-700"
//                      )}
//                    >
//                      {capitalizeFirstLetter(tab)}
//                    </span>
//                    {activeTab === tab && (
//                      <motion.div
//                        layoutId="underline"
//                        className="absolute left-0 inset-x-0 -bottom-[1.5px] h-0.5 bg-black rounded-full"
//                      />
//                    )}
//                  </div>
//                );
//              })}
//            </div>
//            <div>{tabs[activeTab]}</div>
//          </div>
//        </div>
//      </motion.div>
//    )}
//  </AnimatePresence>;
