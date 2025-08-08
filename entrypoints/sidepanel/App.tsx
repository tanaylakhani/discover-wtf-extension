import HistoryTab from "@/components/sidepanel/HistoryTab";
import InfoTab from "@/components/sidepanel/InfoTab";
import ThreadsTab from "@/components/sidepanel/ThreadsTab";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { capitalizeFirstLetter, PublicRandomLink } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AnnotationDots,
  InfoCircle,
  List,
  MagicWand01,
} from "@untitled-ui/icons-react";

type Comment = {
  linkId: string;
  id: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  commentedAt: Date;
  media: { id: string; url: string; type: string; createdAt: Date }[];
};

function App() {
  const [activeLink, setActiveLink] = useState<PublicRandomLink | null>(null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<keyof typeof tabs>("comments");
  const tabs = {
    history: <HistoryTab activeLink={activeLink} activeTab={activeTab} />,
    comments: <ThreadsTab activeLink={activeLink} activeTab={activeTab} />,
    ask: <></>,
    info: <InfoTab activeLink={activeLink} activeTab={activeTab} />,
  };

  const tabsIcon = {
    history: <List />,
    comments: <AnnotationDots />,
    ask: <MagicWand01 />,
    info: <InfoCircle />,
  };

  useEffect(() => {
    const initialActiveLink = async () => {
      const link = await browser.storage.local.get("activeLink");
      setActiveLink(link?.activeLink);
      console.log({ link: link?.activeLink });
    };
    initialActiveLink();

    const listener = (
      changes: Record<string, Browser.storage.StorageChange>,
      area: string
    ) => {
      if (area === "local" && changes.activeLink) {
        setActiveLink(changes.activeLink.newValue ?? null);
      }
    };

    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return (
    <Tabs className="font-inter h-screen p-2 overflow-hidden">
      <TabsList className="w-full bg-neutral-100">
        {Object.keys(tabs).map((key) => (
          <TabsTrigger
            key={key}
            className="w-fit"
            value={key}
            onClick={() =>
              key === "ask"
                ? window.close()
                : setActiveTab(key as keyof typeof tabs)
            }
          >
            {tabsIcon[key as keyof typeof tabsIcon]}{" "}
            {capitalizeFirstLetter(key)}
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.entries(tabs).map(([key, component]) => (
        <TabsContent value={key} key={key}>
          <ScrollArea className="h-screen overflow-y-auto  relative ">
            {component}
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default App;
// const tabs = {
//   // "ask-ai": {
//   //   name: "Ask AI",
//   // },
//   threads: {
//     name: "Threads",
//   },
//   history: {
//     name: "History",
//   },
// };
// const [history, setHistory] = React.useState<LinkItem[]>([]);
// const [activeTab, setActiveTab] =
//   React.useState<keyof typeof tabs>("history");

// React.useEffect(() => {
//   const fetchHistory = async () => {
//     const {
//       visitedLinkIds,
//       links,
//     }: { visitedLinkIds: string[]; links: LinkItem[] } =
//       await browser.storage.local.get(["visitedLinkIds", "links"]);

//     const linkMap = new Map(links.map((link) => [link.id, link]));

//     const history = visitedLinkIds
//       .map((id) => linkMap.get(id))
//       .filter((link): link is LinkItem => Boolean(link))
//       .reverse();

//     setHistory(history);
//   };
//   const handleStorageChange = async (changes: any) => {
//     if (changes.visitedLinkIds || changes.links) {
//       setTimeout(() => {
//         fetchHistory();
//       }, 800);
//     }
//   };

//   fetchHistory();
//   browser.storage.onChanged.addListener(handleStorageChange);
//   return () => {
//     // isMounted = false;
//     browser.storage.onChanged.removeListener(handleStorageChange);
//   };
// }, [activeTab]);

// const handleHistoryItemClicked = useCallback((url: string) => {
//   const formattedUrl = new URL(url);
//   formattedUrl.searchParams.set("discover_history", "1");
//   browser.storage.local.get("extensionTabId", async (data) => {
//     const storedTabId = data.extensionTabId;
//     if (storedTabId) {
//       console.log({ storedTabId, formattedUrl });
//       // const tab = await browser.tabs.get(data.extensionTabId);
//       // if (tab) {
//       await browser.tabs.update(storedTabId, {
//         url: formattedUrl.toString(),
//         active: true,
//       });
//       // }
//     }
//   });
// }, []);
