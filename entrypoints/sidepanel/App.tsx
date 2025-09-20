import { PageData } from "@/components/Toolbar";
import { PublicRandomLink } from "@/lib/utils";
import { UIMessage } from "ai";
import React from "react";

const App = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [activeTab, setActiveTab] = useState<keyof typeof tabsIcon>("history");
  const [activeLink, setActiveLink] = useState<PublicRandomLink | null>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  React.useEffect(() => {
    browser.storage.local
      .get(["activeLink", "activeSidePanelTab", "pageData"])
      .then((res) => {
        if (res.activeLink) {
          setActiveLink(res.activeLink);
        }
        if (res.activeSidePanelTab) {
          setActiveTab(res.activeSidePanelTab);
        }
        if (res.pageData) {
          setPageData(res.pageData);
        }
      });

    const handleStorage = (changes: any, area: string) => {
      if (area === "local") {
        if (changes.activeLink) {
          setActiveLink(changes.activeLink.newValue);
        }
        if (changes.activeSidePanelTab) {
          setActiveTab(changes.activeSidePanelTab.newValue);
        }
        if (changes.pageData) {
          setPageData(changes.pageData.newValue);
        }
      }
    };
    browser.storage.onChanged.addListener(handleStorage);
    return () => browser.storage.onChanged.removeListener(handleStorage);
  }, []);

  return (
    <Sidebar
      isOpen={true}
      messages={messages}
      activeLink={activeLink as PublicRandomLink}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setMessages={setMessages}
      onClose={() => window.close()}
      pageData={pageData as PageData}
    />
  );
};

export default App;

// import AskTab from "@/components/sidepanel/AskTab";
// import HistoryTab from "@/components/sidepanel/HistoryTab";
// import InfoTab from "@/components/sidepanel/InfoTab";
// import ThreadsTab from "@/components/sidepanel/ThreadsTab";
// import {
//   capitalizeFirstLetter,
//   cn,
//   makeCall,
//   PublicRandomLink,
//   TUser,
// } from "@/lib/utils";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import {
//   AnnotationDots,
//   InfoCircle,
//   LayoutLeft,
//   List,
//   MagicWand01,
// } from "@untitled-ui/icons-react";
// import { motion } from "framer-motion";
// import useMeasure from "react-use-measure";
// type Comment = {
//   linkId: string;
//   id: string;
//   userId: string;
//   content: string;
//   isPrivate: boolean;
//   commentedAt: Date;
//   media: { id: string; url: string; type: string; createdAt: Date }[];
// };

// function App() {
//   const [activeLink, setActiveLink] = useState<PublicRandomLink | null>(null);
//   const queryClient = useQueryClient();
//   const [activeTab, setActiveTab] = useState<keyof typeof tabs>("history");

//   const { addToHistoryMutation } = useHistory(activeLink);
//   useEffect(() => {
//     const getInitialActiveSidePanelTabState = async () => {
//       browser.storage.local.get("activeSidePanelTab").then((res) => {
//         console.log({ activeSidePanelTab: res.activeSidePanelTab });
//         setActiveTab(res.activeSidePanelTab ?? "history");
//       });
//     };
//     getInitialActiveSidePanelTabState();

//     const listener = (
//       changes: Record<string, Browser.storage.StorageChange>,
//       area: string
//     ) => {
//       if (area === "local" && changes.activeSidePanelTab) {
//         console.log({ changes: changes?.activeSidePanelTab });
//         setActiveTab(changes.activeSidePanelTab.newValue ?? "history");
//       }
//     };

//     browser.storage.onChanged.addListener(listener);

//     return () => {
//       browser.storage.onChanged.removeListener(listener);
//     };
//   }, []);

//   const { data, isLoading } = useQuery({
//     queryKey: ["get-user"],
//     queryFn: async () => {
//       const resp = await makeCall("/user", {}, 10000);
//       console.log({ userData: resp });
//       return resp?.data as TUser;
//     },
//   });
//   const [ref, bounds] = useMeasure();
//   const tabs = {
//     history: (
//       <HistoryTab
//         height={bounds?.height}
//         activeLink={activeLink}
//         activeTab={activeTab}
//       />
//     ),
//     comments: (
//       <ThreadsTab
//         height={bounds?.height}
//         activeLink={activeLink}
//         user={data as TUser}
//         activeTab={activeTab}
//       />
//     ),
//     ask: (
//       <AskTab
//         height={bounds?.height}
//         user={data as TUser}
//         activeLink={activeLink}
//         activeTab={activeTab}
//       />
//     ),
//     // usage: <>Usage</>,
//     info: <InfoTab activeLink={activeLink} activeTab={activeTab} />,
//   };
//   console.log({ userData: data });

//   const tabsIcon = {
//     history: List,
//     comments: AnnotationDots,
//     ask: MagicWand01,
//     // usage: BarChart01,
//     info: InfoCircle,
//   };

//   useEffect(() => {
//     const initialActiveLink = async () => {
//       const link = await browser.storage.local.get("activeLink");
//       setActiveLink(link?.activeLink);
//       console.log({ link: link?.activeLink });
//     };
//     initialActiveLink();

//     const listener = (
//       changes: Record<string, Browser.storage.StorageChange>,
//       area: string
//     ) => {
//       if (area === "local" && changes.activeLink) {
//         setActiveLink(changes.activeLink.newValue ?? null);
//       }
//     };

//     browser.storage.onChanged.addListener(listener);

//     return () => {
//       browser.storage.onChanged.removeListener(listener);
//     };
//   }, []);

//   useEffect(() => {
//     const listener = (message: any) => {
//       if (message.type === "MARK_AS_VISITED") {
//         console.log("📩 Sidepanel got MARK_AS_VISITED", message, activeLink);
//         addToHistoryMutation.mutate(activeLink as PublicRandomLink);
//       }
//     };

//     browser.runtime.onMessage.addListener(listener);
//     return () => browser.runtime.onMessage.removeListener(listener);
//   }, [addToHistoryMutation]);

//   return (
//     <div className="overflow-hidden relative h-screen w-full flex flex-col ">
//       <div ref={ref} className="w-full flex flex-col">
//         <div className="w-full flex px-6 pt-3 py-1 items-center justify-between">
//           <div
//             onClick={() => window.close()}
//             className="group group:bg-neutral-100 rounded-lg flex items-center justify-center"
//           >
//             <LayoutLeft className="size-5 group-hover:stroke-black stroke-neutral-700" />
//           </div>
//           {isLoading ? (
//             <div className="size-8 rounded-full animate-pulse bg-neutral-200" />
//           ) : (
//             <img
//               src={data?.profile_image_url!}
//               alt="Profile"
//               className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
//             />
//           )}
//         </div>
//         <div className="px-2 w-full flex flex-row mt-2 items-center justify-center  border-b border-neutral-200 ">
//           {Object.keys(tabs).map((tab) => {
//             const icon = tabsIcon[tab as keyof typeof tabsIcon];
//             return (
//               <div
//                 key={tab}
//                 className={cn(
//                   "cursor-pointer flex-1 w-full py-3 mx-2 px-2 flex relative items-center justify-center"
//                 )}
//                 onClick={async () => {
//                   await browser.storage.local.set({
//                     activeSidePanelTab: tab,
//                   });
//                   setActiveTab(tab as keyof typeof tabs);
//                 }}
//               >
//                 {icon({
//                   className: cn(
//                     "size-5 ",
//                     activeTab === tab ? "text-black" : "text-neutral-700"
//                   ),
//                 })}
//                 <span
//                   className={cn(
//                     "ml-2 font-medium tracking-tight text-base",
//                     activeTab === tab ? "text-black" : "text-neutral-700"
//                   )}
//                 >
//                   {capitalizeFirstLetter(tab)}
//                 </span>
//                 {activeTab === tab && (
//                   <motion.div
//                     layoutId="underline"
//                     className="absolute left-0 inset-x-0 -bottom-[1.5px] h-[3px] bg-purple-600 rounded-full"
//                   />
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//       <div className="h-full overflow-hidden flex flex-col w-full ">
//         {tabs[activeTab]}
//       </div>
//     </div>
//   );
// }

// export default App;
// <Tabs
//   value={activeTab}
//   onValueChange={(value) => setActiveTab(value as keyof typeof tabs)}
//   className="font-inter h-screen p-2 overflow-hidden"
// >

{
  /* <TabsList className="w-full justify-start bg-neutral-100">
    {Object.keys(tabs).map((key) => (
      <TabsTrigger
        key={key}
        className="w-fit "
        value={key}
        onClick={() => setActiveTab(key as keyof typeof tabs)}
      >
        {tabsIcon[key as keyof typeof tabsIcon]}{" "}
        {capitalizeFirstLetter(key)}
      </TabsTrigger>
    ))}
  </TabsList>
  {Object.entries(tabs).map(([key, component]) => (
    <TabsContent value={key} key={key}>
      <ScrollArea className="h-screen overflow-y-auto  relative ">
        <div className="mb-[10rem] h-full w-full">{component}</div>
      </ScrollArea>
    </TabsContent>
  ))}
</Tabs> */
}

{
  /* <div className="flex font-inter items-center gap-2 border border-neutral-200 rounded-lg bg-white shadow-sm py-2 px-3">
  {isLoading ? (
    <div className="size-10 rounded-full bg-neutral-200 animate-pulse" />
  ) : (
    data?.profile_image_url && (
      <img
        src={data.profile_image_url}
        className="size-10 rounded-full"
        alt=""
      />
    )
  )}
  <div className="flex-1">
    {isLoading ? (
      <Skeleton className="h-4 w-24 bg-neutral-200" />
    ) : (
      <h4 className="font-medium tracking-tight leading-tight text-sm">
        {data?.name}
      </h4>
    )}
    {isLoading ? (
      <Skeleton className="h-2 mt-1 w-3/4 bg-neutral-200" />
    ) : (
      <span className="text-sm text-muted-foreground">{data?.email}</span>
    )}
  </div>
  <div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={"icon"} disabled={isLoading} variant={"ghost"}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white -translate-x-4">
        <DropdownMenuItem
          className="hover:outline-none transition-all duration-75 hover:bg-neutral-100 font-inter"
          variant="default"
        >
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:outline-none transition-all duration-75 hover:bg-neutral-100 font-inter"
          variant="default"
        >
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleLogoutClick}
          className="hover:outline-none transition-all duration-75 hover:bg-neutral-100 font-inter"
          variant="destructive"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div> */
}
