import ThreadChatBox from "@/components/sidepanel/ThreadChatBox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkItem, QUERY_LINKS } from "@/lib/graphql/links";
import { cleanUrl } from "@/lib/utils";
import { useQuery } from "@apollo/client";
import React from "react";
import useMeasure from "react-use-measure";
import urlMetadata, { Result } from "url-metadata";

type THistory = {
  timestamp: Date;
  title: string;
  url: string;
};

function App() {
  const tabs = {
    // "ask-ai": {
    //   name: "Ask AI",
    // },
    threads: {
      name: "Threads",
    },
    history: {
      name: "History",
    },
  };
  const [history, setHistory] = React.useState<LinkItem[]>([]);
  const [activeTab, setActiveTab] =
    React.useState<keyof typeof tabs>("history");
  const [ref, { height }] = useMeasure();

  React.useEffect(() => {
    const handleStorageChange = async (changes: any) => {
      if (changes.visitedLinkIds || changes.links) {
        setTimeout(() => {
          fetchHistory();
        }, 800);
      }
    };

    const fetchHistory = async () => {
      const {
        visitedLinkIds,
        links,
      }: { visitedLinkIds: string[]; links: LinkItem[] } =
        await browser.storage.local.get(["visitedLinkIds", "links"]);

      const linkMap = new Map(links.map((link) => [link.id, link]));

      const history = visitedLinkIds
        .map((id) => linkMap.get(id))
        .filter((link): link is LinkItem => Boolean(link))
        .reverse();

      setHistory(history);
    };

    fetchHistory();
    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      // isMounted = false;
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [activeTab]);

  const handleHistoryItemClicked = useCallback((url: string) => {
    const formattedUrl = new URL(url);
    formattedUrl.searchParams.set("discover_history", "1");
    browser.storage.local.get("extensionTabId", async (data) => {
      const storedTabId = data.extensionTabId;
      if (storedTabId) {
        console.log({ storedTabId, formattedUrl });
        // const tab = await browser.tabs.get(data.extensionTabId);
        // if (tab) {
        await browser.tabs.update(storedTabId, {
          url: formattedUrl.toString(),
          active: true,
        });
        // }
      }
    });
  }, []);

  return (
    <div className="p-2 h-screen w-full text-black bg-white">
      {/* <h1 className="text-2xl font-bold mb-4 ">👋 Hello from Side Panel!</h1> */}

      <Tabs
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as keyof typeof tabs)}
        className="w-full "
      >
        <TabsList ref={ref} className="w-full flex bg-neutral-100 space-x-2">
          {Object.entries(tabs).map(([key, tab]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="inter-sans data-[state=active]:border-neutral-200 rounded-lg"
              onClick={() => setActiveTab(key as keyof typeof tabs)}
            >
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="threads">
          <div className="w-full h-full">
            <ScrollArea
              style={{ height: `calc(100vh - ${height}px)` }}
              className="w-full relative  overflow-y-auto"
            >
              <div className="bottom-6 flex items-center justify-center w-full absolute ">
                <ThreadChatBox />
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="w-full h-full px-2 overflow-y-auto ">
            {/* <ScrollArea
              style={{ height: `calc(100vh - ${height}px)` }}
              className="w-full relative h-full overflow-y-auto"
            > */}
            {history.length > 0 && (
              <div>
                {history.map((entry, index) => {
                  return (
                    <div
                      onClick={() => handleHistoryItemClicked(entry.target_url)}
                      key={index}
                      className="overflow-hidden mt-4 first:mt-0 border cursor-pointer border-neutral-200 bg-white rounded-3xl"
                    >
                      {entry?.image_url && (
                        <img
                          className="object-cover h-[180px] w-full border-b border-neutral-200"
                          src={entry.image_url}
                          alt=""
                        />
                      )}
                      <div className="flex px-4 pb-6 pt-4 flex-col items-start justify-center">
                        <h3 className="text-lg leading-snug mb-2 font-medium tracking-tight">
                          {entry.title}
                        </h3>
                        <p className="text-neutral-600 font-medium leading-tight">
                          {cleanUrl(entry.target_url)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* </ScrollArea> */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
