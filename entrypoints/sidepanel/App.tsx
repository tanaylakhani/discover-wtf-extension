import ThreadChatBox from "@/components/sidepanel/ThreadChatBox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkItem } from "@/lib/graphql/links";
import { cleanUrl, makeCall, makeCommentsCall } from "@/lib/utils";
import React from "react";
import useMeasure from "react-use-measure";

type Comment = {
  linkId: string;
  id: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  commentedAt: Date;
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
  const [input, setInput] = React.useState("");
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingComments, setIsFetchingComments] = React.useState(false);

  React.useEffect(() => {
    const getComments = async () => {
      setIsFetchingComments(true);
      const { activeLink } = await browser.storage.local.get("activeLink");
      console.log({ activeLink });
      if (!activeLink) {
        console.error("No active link found");
        setIsFetchingComments(false);
        return;
      }
      const stringifiedParams = new URLSearchParams({
        linkId: activeLink.id,
      }).toString();

      const response = await makeCommentsCall(`/comment?${stringifiedParams}`);
      if (!response?.success && response?.error) {
        console.error("Failed to fetch comments", response.error);
        setIsFetchingComments(false);
        return;
      }
      console.log({ comments: response.comments });
      setComments(response.comments);
      setIsFetchingComments(false);
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
    const handleStorageChange = async (changes: any) => {
      if (changes.visitedLinkIds || changes.links) {
        setTimeout(() => {
          fetchHistory();
        }, 800);
      }
    };

    fetchHistory();
    getComments();
    browser.storage.onChanged.addListener(handleStorageChange);
    const listener = async (message: any, sender: any, sendResponse: any) => {
      if (message.type === "FETCH_COMMENTS") {
        console.log("Got message");
        await getComments();
      }
    };
    browser.runtime.onMessage.addListener(listener);

    return () => {
      // isMounted = false;
      browser.storage.onChanged.removeListener(handleStorageChange);
      browser.runtime.onMessage.removeListener(listener);
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

  const handleSubmit = useCallback(async (message: string, files: File[]) => {
    setIsLoading(true);
    const { activeLink } = await browser.storage.local.get("activeLink");
    if (!activeLink) {
      console.error("No active link found");
      setIsLoading(false);
      return;
    }
    const linkId = activeLink.id;
    const stringifiedParams = new URLSearchParams({
      linkId,
    }).toString();
    const response = await makeCall(`/comment?${stringifiedParams}`, {
      method: "POST",
      body: JSON.stringify({ content: message }),
    });
    if (!response?.success && !response.comment && response?.error) {
      console.error("Failed to submit comment", response.error);
      setIsLoading(false);
      return;
    }

    setComments((prev) => [...prev, response.comment]);
    setInput("");
    setIsLoading(false);
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
              {isFetchingComments ? (
                <span>Loading comments...</span>
              ) : comments?.length === 0 ? (
                <span>No Comment yet. Be the first to comment!</span>
              ) : (
                <div>
                  {comments.map((comment, index) => (
                    <div
                      key={index}
                      className="border-b border-neutral-200 py-2"
                    >
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bottom-6 flex items-center justify-center w-full absolute ">
                <ThreadChatBox
                  input={input}
                  isLoading={isLoading}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                />
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
                      className="overflow-hidden mt-4 first:mt-0 border cursor-pointer border-neutral-300 bg-white rounded-3xl"
                    >
                      {entry?.image_url && (
                        <img
                          className="object-cover h-[180px] w-full border-b border-neutral-200"
                          src={entry.image_url}
                          alt=""
                        />
                      )}
                      <div className="flex px-4 pb-6 pt-4 flex-col items-start justify-center">
                        <h3 className="text-lg line-clamp-2  leading-snug mb-2 font-medium tracking-tight">
                          {entry.title}
                        </h3>
                        <p className="text-neutral-700 line-clamp-1 font-medium leading-tight">
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
