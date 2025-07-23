import "@/entrypoints/style.css";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  cleanUrl,
  getAuthToken,
  getGoogleUser,
  TGoogleUser,
} from "../lib/utils";

import { GalleryVerticalEnd, LogOut } from "lucide-react";
import Sparkle from "./icons/ai";
import Bookmark from "./icons/bookmark";
import Comment from "./icons/comment";
import Heart from "./icons/heart";
import { Button } from "./ui/button";

const History: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [history, setHistory] = useState<
    { url: string; timestamp: number; title: string }[]
  >([]);
  useEffect(() => {
    browser.storage.local.get("extensionTabHistory", (data) => {
      setHistory(data.extensionTabHistory || []);
    });
    const listener = (changes: any, namespace: string) => {
      if (changes.extensionTabHistory) {
        setHistory(changes.extensionTabHistory.newValue || []);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);
  return (
    <motion.div
      key={"history"}
      initial={{ opacity: 0.4, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{
        type: "spring",
        stiffness: 100,
        ease: "easeIn",
      }}
      className="fixed rounded-3xl inter-sans top-24 right-4 z-[100000] bg-white border border-neutral-300 shadow-lg p-4 w-80 max-h-96 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-lg tracking-tight">
          Recently Discovered
        </span>
        <button
          onClick={onClose}
          className="size-8 group border flex items-center justify-center border-neutral-200 hover:bg-red-500 transition-all duration-75 rounded-full"
        >
          <svg
            width="100%"
            height="100%"
            className="size-4 group-hover:stroke-white stroke-black"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 7L7 17M7 7L17 17"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <ul className="text-xs">
        {history.length === 0 ? (
          <li className="text-gray-400">No history yet.</li>
        ) : (
          history
            .slice()
            .reverse()
            .map((entry, idx) => (
              <li key={idx} className="mb-1 break-all">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {cleanUrl(entry.url)}
                </a>
              </li>
            ))
        )}
      </ul>
    </motion.div>
  );
};

const ChatBox: React.FC<{ user: TGoogleUser | null }> = ({ user }) => {
  const [message, setMessage] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    // TODO: Handle message submission
    console.log("Submitting message:", message);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4">
        {/* Messages will go here */}
        <div className="text-gray-500 text-center mt-8">No messages yet</div>
      </div>
      <div className="border p-3 flex rounded-2xl bg-white shadow-xl flex-col absolute bottom-4 inset-x-2 border-neutral-200 pt-4">
        <div className="flex w-full items-center justify-between gap-2">
          {user ? (
            <img
              src={user?.picture}
              alt={user.name}
              className="size-8 rounded-full"
            />
          ) : (
            <div className="size-8 rounded-full bg-neutral-200 flex items-center justify-center">
              <svg
                className="size-4 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <TextareaAutosize
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-lg inter-sans resize-none appearance-none px-3 py-2 text-sm focus:outline-none focus-visible:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="p-1 bg-blue-600 text-white rounded-full size-8 font-medium disabled:opacity-50 hover:bg-blue-700"
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 20V4M12 4L6 10M12 4L18 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100003]">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-neutral-600 mb-4">
              Please sign in to participate in threads.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAuthPrompt(false);
                  // Trigger auth flow
                  browser.runtime.sendMessage({ type: "AUTHENTICATE_USER" });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type FloaterProps = {
  setToken: (token: string | null) => void;
};

const Floater: React.FC<FloaterProps> = ({ setToken }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showHistory, setShowHistory] = useState(false);

  const [user, setUser] = useState<TGoogleUser | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    (async () => {
      const isAuth = await getAuthToken();
      if (isAuth?.authToken) {
        setUser(await getGoogleUser());
      } else {
        setUser(null);
      }
    })();
  }, []);

  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    const newPosition = { x: info.point.x, y: info.point.y };
    setPosition(newPosition);
    browser.storage.local.set({ floaterPosition: newPosition });
  };

  useEffect(() => {
    browser.storage.local.get("floaterPosition", (data) => {
      if (data.floaterPosition) {
        setPosition(data.floaterPosition);
      }
    });
    browser?.storage.local.get("urlVisitCount", (data) => {
      setCount(data.urlVisitCount || 0);
    });

    // Optional: listen to changes in real-time
    browser?.storage.onChanged.addListener((changes, namespace) => {
      if (changes.urlVisitCount) {
        setCount(changes.urlVisitCount.newValue);
      }
    });
  }, []);

  const options = [
    { name: "Like", icon: Heart },
    { name: "Comment", icon: Comment },
    { name: "Ask AI", icon: Sparkle },
    { name: "Save", icon: Bookmark },
    // {name:"Share", icon: <Share/>},
  ];
  const handleSidePanelOpen = async () => {
    await browser.runtime
      .sendMessage({ type: "OPEN_SIDE_PANEL" })
      .catch(console.error);
  };
  return (
    <>
      {/* <ExtensionSidebar
        ref={ref}
        show={showSidebar}
        onClose={() => setShowSidebar(false)}
      /> */}
      {/* <div
        style={{ zIndex: 2147483647 }}
        className={
          "bg-black  fixed top-10 right-4 h-14 px-6 rounded-full text-white flex items-center justify-center"
        }
      >
        <span className="text-neutral-200 font-medium">Discover Count. </span>
        <span className="font-semibold ml-2 tracking-tight ">{count}</span>
        <button
          className="ml-4 p-3 stroke-white"
          onClick={() => setShowHistory((v) => !v)}
        >
          <GalleryVerticalEnd />
        </button>
        <button
          className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={async () => {
            if (user) {
              await browser.storage.local.remove("authToken");
              setToken(null);
            }
          }}
          // disabled={authStatus === "loading"}
        >
          Logout
        </button>
      </div>
      <AnimatePresence>
        {showHistory && <History onClose={() => setShowHistory(false)} />}
      </AnimatePresence> */}

      <motion.div
        style={{
          zIndex: 2147483647,
        }}
        className="fixed bottom-20 right-2  top-1/3 "
      >
        {" "}
        <Button
          title="Logout"
          className="bg-neutral-50 border border-neutral-200  mb-2 size-10 font-medium flex items-center justify-center rounded-full text-neutral-900"
          onClick={async () => {
            if (user) {
              await browser.storage.local.remove("authToken");
              setToken(null);
            }
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
              onClick={async () => {
                await handleSidePanelOpen();
              }}
              className="  relative"
            >
              <option.icon className="size-5 stroke-none fill-neutral-700" />
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
