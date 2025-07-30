import "@/entrypoints/style.css";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

import { LogOut } from "lucide-react";
import {
  Announcement02,
  HeartRounded,
  MagicWand01,
  Bookmark,
  AnnotationDots,
} from "@untitled-ui/icons-react";
import { Button } from "./ui/button";
import { makeCall } from "@/lib/utils";
import { LinkItem } from "@/lib/graphql/links";

type FloaterProps = {};

const Floater: React.FC<FloaterProps> = () => {
  const { logout } = useAuth();
  const [count, setCount] = useState(0);
  const [activeLink, setActiveLink] = useState<LinkItem | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    browser?.storage.local.get(
      ["urlVisitCount", "bookmarkedLinkIds", "activeLink"],
      (data) => {
        console.log({ floaterData: data });
        setActiveLink(data.activeLink || null);
        setCount(data.urlVisitCount || 0);
        setIsBookmarked(
          (data.bookmarkedLinkIds || []).includes(data?.activeLink?.id)
        );
      }
    );

    // Optional: listen to changes in real-time
    browser?.storage.onChanged.addListener((changes, namespace) => {
      console.log("Storage changes detected:", changes);
      if (changes.urlVisitCount) {
        setCount(changes.urlVisitCount.newValue);
        // setIsBookmarked(
        //   (changes.bookmarkedLinkIds?.newValue || []).includes(changes?.activeLink?.newValue?.id)
        // );
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

    // await browser.runtime
    //   .sendMessage({
    //     type: "ENABLE_SIDE_PANEL",
    //     data: { tabId: currentTabId?.tabId, enabled: isExtensionTab },
    //   })
    //   .catch(console.error);
    // console.log("sent enable side panel message");
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
    await browser.storage.local.set({
      bookmarkedLinkIds: Array.from(bookmarksIdSet),
    });
    console.log("Stored bookmarked link IDs:", bookmarksIdSet);
    browser.runtime.sendMessage({
      type: "BOOKMARK_LINK",
      data: { method: alreadyBookmarked ? "DELETE" : "POST", linkId },
    });
  };
  // console.log(isBookmarked);

  const options = [
    {
      handleClick: () => {},
      name: "Like",
      icon: HeartRounded,
      fill: "none",
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

  return (
    <>
      <motion.div className="fixed bottom-20   right-2  top-1/3 ">
        {" "}
        <Button
          title="Logout"
          className="bg-neutral-50 border border-neutral-200  mb-2 size-10 font-medium flex items-center justify-center rounded-full text-neutral-900"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut className="size-4 " />
        </Button>
        <Button
          title="Discover Count"
          className="bg-neutral-50 border border-neutral-200  mb-4 size-10 font-medium flex items-center justify-center rounded-full text-neutral-900"
        >
          {count}
        </Button>
        <motion.div className="h-fit px-2 py-2.5 shadow-black/10 drop-shadow-md rounded-lg  bg-neutral-100 flex flex-col items-center  justify-center gap-y-4 border border-neutral-200  transition-all duration-200 cursor-pointer">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={option.handleClick}
              className="  relative"
              title={option?.name}
            >
              <option.icon
                style={{
                  fill: option.fill || "none",
                }}
                stroke="black"
                className="size-6 stroke-black  "
              />
            </button>
          ))}
        </motion.div>
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
      </motion.div>
    </>
  );
};

export default Floater;
