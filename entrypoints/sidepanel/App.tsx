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
