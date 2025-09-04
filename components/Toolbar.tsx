import { Toolbar } from "@betterstacks/toolbar-sdk";
import { BookOpen, Brain, Search, SidebarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

function ToolbarApp() {
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBrowserAgentOpen, setIsBrowserAgentOpen] = useState(false);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "OPEN_SEARCH_DIALOG") {
        setIsSearchDialogOpen(true);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const toolbarButtons = [
    {
      id: "browser-agent",
      icon: <Brain size={16} />,
      tooltip: "Browser Agent",
      pinned: true,
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsBrowserAgentOpen(true);
      },
    },
    {
      id: "search",
      icon: <Search size={16} />,
      tooltip: "Quick Search",
      pinned: true,
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsSearchDialogOpen(true);
      },
    },
    {
      id: "memory",
      icon: <BookOpen size={16} />,
      tooltip: "Discovery Agent (Coming Soon)",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
    {
      id: "sidebar-toggle",
      icon: <SidebarIcon size={16} />,
      tooltip: "Sidebar",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIsBrowserAgentOpen((prev) => !prev);
        // console.log('Memory Agent clicked');
        // You can add your memory agent logic here
      },
    },
  ];

  return (
    <>
      <Toolbar
        className="bg-white border-b border-neutral-200"
        buttons={toolbarButtons}
        defaultIcon={<Brain size={16} />}
      />{" "}
      <Sidebar
        isOpen={isBrowserAgentOpen}
        onClose={() => setIsBrowserAgentOpen(false)}
      />
    </>
  );
}

export default ToolbarApp;
