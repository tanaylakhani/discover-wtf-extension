import rabbit from "@/assets/rabbit-hole-icon.gif";
import spiral from "@/assets/spiral.png";
import "@/entrypoints/style.css";
import { useLike } from "@/hooks/useLike";
import { LinkItem } from "@/lib/graphql/links";
import queryClient from "@/lib/query-client";
import { cn, makeCall, PublicRandomLink } from "@/lib/utils";
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
  const { likeQuery, toggleLike } = useLike(link?.id as string);
  const likeData = likeQuery?.data;
  console.log({ data: likeData });
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

  const handleSidePanelOpen = async () => {
    const extensionTabId = await browser.storage.local.get("extensionTabId");
    console.log("Opening side panel for tab:", extensionTabId);
    const currentTabId = await browser.runtime.sendMessage({
      type: "GET_CURRENT_TAB_ID",
    });
    const isExtensionTab =
      extensionTabId?.extensionTabId === currentTabId?.tabId;
    console.log({ isExtensionTab });

    await browser.runtime
      .sendMessage({
        type: "OPEN_SIDE_PANEL",
        // data: { tabId: currentTabId?.tabId },
      })
      .catch(console.error);
  };

  // const handleBookmark = async () => {
  //   if (!activeLink) {
  //     console.log("No active link to bookmark");
  //     return;
  //   }
  //   const linkId = activeLink?.id;
  //   if (!linkId) {
  //     console.log("No link ID found to bookmark");
  //     return;
  //   }

  //   const { bookmarkedLinkIds } = await browser.storage.local.get(
  //     "bookmarkedLinkIds"
  //   );
  //   const bookmarksIdSet = new Set([...(bookmarkedLinkIds || [])]);

  //   const alreadyBookmarked = bookmarksIdSet.has(linkId);
  //   if (alreadyBookmarked) {
  //     bookmarksIdSet.delete(linkId);
  //     setIsBookmarked(false);
  //     console.log("Link already bookmarked, removing bookmark");
  //   } else {
  //     console.log("Bookmarking link ID:", linkId);
  //     setIsBookmarked(true);
  //     bookmarksIdSet.add(linkId);
  //   }
  //   setIsPending(true);
  //   await browser.storage.local.set({
  //     bookmarkedLinkIds: Array.from(bookmarksIdSet),
  //   });
  //   console.log("Stored bookmarked link IDs:", bookmarksIdSet);

  //   const res = await browser.runtime.sendMessage({
  //     type: "BOOKMARK_LINK",
  //     data: { method: alreadyBookmarked ? "DELETE" : "POST", linkId },
  //   });
  //   setIsPending(false);
  //   console.log("Bookmark response:", res);
  // };
  // const handleLike = async () => {
  //   if (!activeLink) {
  //     console.log("No active link to like");
  //     return;
  //   }
  //   const linkId = activeLink?.id;
  //   if (!linkId) {
  //     console.log("No link ID found to bookmark");
  //     return;
  //   }

  //   const { likedLinkIds } = await browser.storage.local.get("likedLinkIds");
  //   const likesIdSet = new Set([...(likedLinkIds || [])]);

  //   const alreadyLiked = likesIdSet.has(linkId);
  //   if (alreadyLiked) {
  //     likesIdSet.delete(linkId);
  //     setIsLiked(false);
  //     console.log("Link already liked, removing like");
  //   } else {
  //     console.log("Liking link ID:", linkId);
  //     setIsLiked(true);
  //     likesIdSet.add(linkId);
  //   }
  //   setIsPending(true);
  //   await browser.storage.local.set({
  //     likedLinkIds: Array.from(likesIdSet),
  //   });
  //   console.log("Stored liked link IDs:", likesIdSet);

  //   const res = await browser.runtime.sendMessage({
  //     type: "LIKE_LINK",
  //     data: { method: alreadyLiked ? "DELETE" : "POST", linkId },
  //   });
  //   setIsPending(false);
  //   console.log("Like response:", res);
  // };
  // console.log(isBookmarked);

  const options = [
    {
      handleClick: async () => {
        toggleLike(!likeQuery?.data?.liked);
      },
      name: "Like",
      icon: HeartRounded,
      fill: likeData?.liked ? "black" : "none",
    },
    {
      handleClick: async () => {
        await handleSidePanelOpen();
      },
      name: "Comment",
      icon: AnnotationDots,
      fill: "none",
    },
    {
      handleClick: () => {},
      name: "Ask AI",
      icon: MagicWand01,
      fill: "none",
    },
    {
      handleClick: async () => {
        // await handleBookmark();
      },
      name: "Save",
      icon: Bookmark,
      // fill: isBookmarked ? "black" : "none",
      fill: "none",
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
  return (
    <>
      {" "}
      <div className={cn("fixed top-32 flex flex-col items-end right-2 ")}>
        <motion.div className="w-fit gap-x-2 flex items-center justify-center">
          <AnimatePresence>
            {inRabbitHole && (
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={
                  "bg-indigo-700 text-white h-14 w-fit px-8  rounded-full flex items-center justify-center "
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
            title="Discover Count"
            className={
              "bg-black h-14 w-fit px-8  rounded-full flex items-center justify-center "
            }
            // className="bg-neutral-50 border border-neutral-200  mb-4 size-10 font-medium flex items-center justify-center rounded-l-full text-neutral-900"
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
          className={
            "bg-white hover:-translate-x-0 transition-all duration-75 ease-linear translate-x-[50%] border cursor-pointer border-neutral-200 shadow-lg mt-2 h-12 rounded-full flex items-center justify-center  relative overflow-hidden"
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
              className=" flex flex-col items-center "
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
                  // disabled={isPending}
                  className="p-2 size-14 rounded-full flex items-center justify-center relative group "
                >
                  {/* Tooltip */}
                  <div className="group-hover:opacity-100 absolute -translate-x-20 opacity-0 bg-neutral-900 border-neutral-700 text-neutral-100 text-xs transition-all duration-75 font-medium px-2 py-1 rounded-lg">
                    {option.name}
                  </div>

                  {/* Badge on first item */}
                  {index === 0 && (
                    <div className="p-1.5 rounded-full border border-neutral-200 absolute -top-2 flex items-center justify-center -right-2 bg-white">
                      <span className="text-xs font-semibold">
                        {Number(likeData?.count) || 0}
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
          className="size-14 rounded-full flex items-center justify-center"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <Plus className="size-6" />
        </motion.button>
      </div>
      {/* <motion.div
        transition={{ duration: 0.3 }}
        style={{ borderRadius: isOpen ? "1.5rem" : "9999px" }}
        className={cn(
          "left-2 bg-white p-2 fixed bottom-20 ",
          !isOpen && "size-14"
        )}
      >
        <motion.div
          layout
          className="w-full overflow-hidden"
          animate={{ height: isOpen ? 200 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="size-14"
          style={{
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <Plus
            style={{
              stroke: "black",
            }}
            className=" size-6"
          />
        </button>
      </motion.div> */}
      {/* <Button
        title="Logout"
        className="bg-neutral-100 fixed right-2  border border-neutral-200  mt-2 size-10 font-medium flex items-center justify-center rounded-full "
        onClick={async () => {
          await logout();
        }}
      >
        <LogOut03 stroke="black" className="size-6 stroke-black  " />
      </Button> */}
      {/* <button
          className="size-5 "
          onClick={() => setShowSidebar((prev) => !prev)}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={0.8}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 3V21M7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button> */}
    </>
  );
};

export default Floater;
