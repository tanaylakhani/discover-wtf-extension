import "@/entrypoints/style.css";
import { cn, PublicRandomLink } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import ToolbarApp from "./Toolbar";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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
  const [activeLink, setActiveLink] = useState<PublicRandomLink | null>(link);
  const [count, setCount] = useState(urlVisitCount || 0);
  const [inRabbitHole, setIsInRabbitHole] = useState(false);
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

      const previous = queryClient.getQueryData<PublicRandomLink[]>([
        "get-history",
        activeLink?.id,
      ]);
      // Fetch the latest activeLink from local storage synchronously for optimistic update
      const { activeLink: latestActiveLink } = await browser.storage.local.get(
        "activeLink"
      );
      if (latestActiveLink) {
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

  return (
    <>
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
                  src={browser.runtime.getURL("/images/spiral.png")} // force reload by changing URL
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
            className="bg-purple-500 w-full rounded-l-full h-12 pl-6 pr-4 flex items-center justify-center "
          >
            <span className="text-neutral-200 text-sm font-semibold mr-1">
              Discover Count:
            </span>
            <span className="font-semibold text-sm tracking-tight text-white">
              {count}
            </span>
          </div>
          {/* </div> */}
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
                  src={browser.runtime.getURL("/rabbit-hole-icon.gif")} // force reload by changing URL
                  alt="Animated"
                  className="  object-cover"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <ToolbarApp activeLink={activeLink} addToHistory={addToHistory} />
    </>
  );
};

export default Floater;
// <div className="fixed rounded-full bottom-20 right-4 flex flex-col items-center border border-neutral-200 bg-neutral-100 ">
//   <AnimatePresence>
//     {isOpen && (
//       <motion.div
//         className=" flex flex-col pt-2 items-center "
//         initial="closed"
//         animate="open"
//         exit="closed"
//         variants={containerVariants}
//       >
//         {options.map((option, index) => (
//           <motion.button
//             key={index}
//             variants={itemVariants}
//             onClick={option.handleClick}
//             disabled={option?.disabled}
//             className="p-2 size-12 rounded-full flex items-center justify-center relative group "
//           >
//             {/* Tooltip */}
//             <div className="group-hover:opacity-100 absolute -translate-x-20 opacity-0 bg-neutral-900 border-neutral-700 text-neutral-100 text-xs transition-all duration-75 font-medium px-2 py-1 rounded-lg">
//               {option.name}
//             </div>

//             {/* Badge on first item */}
//             {index === 0 && (
//               <div className="p-1 rounded-full border border-neutral-200 absolute -top-2 flex items-center justify-center -right-2 aspect-square size-6 bg-white">
//                 <span className="text-xs font-semibold">
//                   {Number(likeCount)}
//                 </span>
//               </div>
//             )}

//             {/* Icon */}
//             <option.icon
//               style={{
//                 fill: option.fill || "none",
//                 stroke:
//                   option?.fill && option.fill === "black"
//                     ? "black"
//                     : "#404040",
//                 strokeWidth: 1.4,
//               }}
//               className="size-6"
//             />
//           </motion.button>
//         ))}
//       </motion.div>
//     )}
//   </AnimatePresence>

//   {/* Toggle Button */}
//   <motion.button
//     onClick={() => setIsOpen((prev) => !prev)}
//     className="size-12 rounded-full flex items-center justify-center"
//     animate={{ rotate: isOpen ? 45 : 0 }}
//     transition={{ duration: 0.5 }}
//   >
//     <Plus className="size-6" />
//   </motion.button>
// </div>
