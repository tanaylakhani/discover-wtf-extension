import ThreadChatBox from "@/components/sidepanel/ThreadChatBox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cleanUrl } from "@/lib/utils";
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
  const [history, setHistory] = React.useState<Result[]>([]);
  const [activeTab, setActiveTab] =
    React.useState<keyof typeof tabs>("history");
  const [ref, { height }] = useMeasure();

  React.useEffect(() => {
    const handleStorageChange = async (changes: any) => {
      if (changes.extensionTabHistory) {
        fetchHistory();
      }
    };

    const fetchHistory = async () => {
      const storedHistory = await browser.storage.local.get(
        "extensionTabHistory"
      );
      const history = (storedHistory.extensionTabHistory || []) as THistory[];
      console.log({ history });
      try {
        setHistory((prev) => {
          const urlSet = new Set(prev.map((item) => item.url));
          // history duplicates in history
          history.forEach((item) => {
            if (!urlSet.has(item.url)) {
              urlSet.add(item.url);
            }
          });
          const final = Array.from(urlSet).map((url) =>
            history.find((item) => item.url === url)
          ) as THistory[];
          console.log({ set: Array.from(urlSet), final });
          return final;
        });
      } catch (error) {
        console.error("Error fetching URL metadata:", error);
      }

      // if (isMounted) {

      // }
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
        className="w-full px-2 "
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
          <div className="w-full h-full">
            <ScrollArea
              style={{ height: `calc(100vh - ${height}px)` }}
              className="w-full relative h-full overflow-y-auto"
            >
              {history.length > 0 && (
                <div className="space-y-4  mb-6 mt-4">
                  {(Array.from(new Set(history)) as THistory[])
                    .reverse()
                    .slice(0, 20)
                    .map((entry, index) => {
                      // const images = entry["og:image"]
                      //   ? entry["og:image"].split(",")
                      //   : [];
                      return (
                        <div
                          onClick={() => handleHistoryItemClicked(entry.url)}
                          key={index}
                          className=" border cursor-pointer border-neutral-200 bg-white rounded-3xl"
                        >
                          {/* {images?.length > 0 && (
                            <img
                              className="object-cover h-[250px] w-full border-b border-neutral-200"
                              src={images[0]}
                              alt=""
                            />
                          )} */}
                          <div className="flex px-4 pb-6 pt-4 flex-col items-start justify-center">
                            <h3 className="text-lg leading-snug mb-2 font-medium tracking-tight">
                              {entry.title}
                            </h3>
                            <p className="text-neutral-600 font-medium leading-tight">
                              {cleanUrl(entry.url)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
