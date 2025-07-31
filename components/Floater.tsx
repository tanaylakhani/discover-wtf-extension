import rabbit from "@/assets/rabbit-hole-icon.gif";
import spiral from "@/assets/spiral.png";
import "@/entrypoints/style.css";
import { LinkItem } from "@/lib/graphql/links";
import { cn } from "@/lib/utils";
import {
  AnnotationDots,
  Bookmark,
  HeartRounded,
  MagicWand01,
  X,
} from "@untitled-ui/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
type FloaterProps = {};

const Floater: React.FC<FloaterProps> = () => {
  const [count, setCount] = useState(0);
  const [activeLink, setActiveLink] = useState<LinkItem | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    browser?.storage.local.get(
      [
        "urlVisitCount",
        "bookmarkedLinkIds",
        "activeLink",
        "likedLinkIds",
        "gqlToken",
      ],
      (data) => {
        console.log({ floaterData: data });
        setActiveLink(data.activeLink || null);
        setCount(data.urlVisitCount || 0);
        setIsBookmarked(
          (data.bookmarkedLinkIds || []).includes(data?.activeLink?.id)
        );
        setIsLiked((data.likedLinkIds || []).includes(data?.activeLink?.id));
      }
    );

    // Optional: listen to changes in real-time
    browser?.storage.onChanged.addListener((changes, namespace) => {
      console.log("Storage changes detected:", changes);
      if (changes.urlVisitCount) {
        setCount(changes.urlVisitCount.newValue);
      }
    });
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

  const handleBookmark = async () => {
    if (!activeLink) {
      console.log("No active link to bookmark");
      return;
    }
    const linkId = activeLink?.id;
    if (!linkId) {
      console.log("No link ID found to bookmark");
      return;
    }

    const { bookmarkedLinkIds } = await browser.storage.local.get(
      "bookmarkedLinkIds"
    );
    const bookmarksIdSet = new Set([...(bookmarkedLinkIds || [])]);

    const alreadyBookmarked = bookmarksIdSet.has(linkId);
    if (alreadyBookmarked) {
      bookmarksIdSet.delete(linkId);
      setIsBookmarked(false);
      console.log("Link already bookmarked, removing bookmark");
    } else {
      console.log("Bookmarking link ID:", linkId);
      setIsBookmarked(true);
      bookmarksIdSet.add(linkId);
    }
    setIsPending(true);
    await browser.storage.local.set({
      bookmarkedLinkIds: Array.from(bookmarksIdSet),
    });
    console.log("Stored bookmarked link IDs:", bookmarksIdSet);

    const res = await browser.runtime.sendMessage({
      type: "BOOKMARK_LINK",
      data: { method: alreadyBookmarked ? "DELETE" : "POST", linkId },
    });
    setIsPending(false);
    console.log("Bookmark response:", res);
  };
  const handleLike = async () => {
    if (!activeLink) {
      console.log("No active link to like");
      return;
    }
    const linkId = activeLink?.id;
    if (!linkId) {
      console.log("No link ID found to bookmark");
      return;
    }

    const { likedLinkIds } = await browser.storage.local.get("likedLinkIds");
    const likesIdSet = new Set([...(likedLinkIds || [])]);

    const alreadyLiked = likesIdSet.has(linkId);
    if (alreadyLiked) {
      likesIdSet.delete(linkId);
      setIsLiked(false);
      console.log("Link already liked, removing like");
    } else {
      console.log("Liking link ID:", linkId);
      setIsLiked(true);
      likesIdSet.add(linkId);
    }
    setIsPending(true);
    await browser.storage.local.set({
      likedLinkIds: Array.from(likesIdSet),
    });
    console.log("Stored liked link IDs:", likesIdSet);

    const res = await browser.runtime.sendMessage({
      type: "LIKE_LINK",
      data: { method: alreadyLiked ? "DELETE" : "POST", linkId },
    });
    setIsPending(false);
    console.log("Like response:", res);
  };
  // console.log(isBookmarked);

  const options = [
    {
      handleClick: async () => {
        await handleLike();
      },
      name: "Like",
      icon: HeartRounded,
      fill: isLiked ? "black" : "none",
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
        await handleBookmark();
      },
      name: "Save",
      icon: Bookmark,
      fill: isBookmarked ? "black" : "none",
    },
    // {name:"Share", icon: <Share/>},
  ];
  const [gifKey, setGifKey] = useState(0);
  const [inRabbitHole, setIsInRabbitHole] = useState(false);
  const triggerGif = () => {
    // This causes <img> to rerender and restart the GIF
    setGifKey((prev) => prev + 1);
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
            <span className="font-semibold tracking-tight text-white">
              {count}
            </span>
          </div>
        </motion.div>
        <motion.div
          title="Discover Count"
          className={
            "bg-white border cursor-pointer border-neutral-200 shadow-lg mt-2 h-12 rounded-full flex items-center justify-center  relative overflow-hidden"
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
      <motion.div className="h-fit fixed bottom-1/3  right-2  px-2 py-2.5 shadow-black/10 drop-shadow-md rounded-lg  bg-neutral-100 flex flex-col items-center  justify-center gap-y-4 border border-neutral-200  transition-all duration-200 cursor-pointer">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={option.handleClick}
            className="  relative"
            title={option?.name}
            disabled={isPending}
          >
            <option.icon
              style={{
                fill: option.fill || "none",
                stroke: "black",
                strokeWidth: 1.4,
              }}
              className="size-8 stroke-black  "
            />
          </button>
        ))}
      </motion.div>
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
