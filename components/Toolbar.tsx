// Util function to request extraction via background script
import { useBookmark } from "@/hooks/useBookmark";
import { useLike } from "@/hooks/useLike";
import { PublicRandomLink } from "@/lib/utils";
import { Toolbar } from "@betterstacks/toolbar-sdk";
import { UseMutationResult } from "@tanstack/react-query";
import { HeartRounded } from "@untitled-ui/icons-react";
import {
  Bookmark,
  Brain,
  MessageCircle,
  SidebarIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect } from "react";

type ToolbarProps = {
  activeLink?: PublicRandomLink | null;
  addToHistory: UseMutationResult<
    unknown,
    Error,
    void,
    {
      previous: PublicRandomLink[] | undefined;
    }
  >;
};
export interface PageData {
  url: string;
  title: string;
  content: string;
  metaDescription: string;
}

function ToolbarApp({ activeLink, addToHistory }: ToolbarProps) {
  const {
    liked,
    toggleLike,
    count: likeCount,
    pending: isLikePending,
  } = useLike(activeLink?.id as string);
  const {
    bookmarkQuery,
    toggleBookmark,
    pending: isBookmarkPending,
  } = useBookmark(activeLink?.id as string);
  const bookmarkData = bookmarkQuery?.data;

  const extractPageData = () => {
    try {
      const url = window.location.href;
      const title = document.title;
      const metaDescription =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") || "";

      // Function to clean and extract text content
      const cleanTextContent = (element: Element): string => {
        const clone = element.cloneNode(true) as Element;

        // Remove script, style, noscript tags and their content
        const unwantedTags = [
          "script",
          "style",
          "noscript",
          "nav",
          "header",
          "footer",
          "aside",
        ];
        unwantedTags.forEach((tag) => {
          const elements = clone.querySelectorAll(tag);
          elements.forEach((el) => el.remove());
        });

        // Remove elements that are likely navigation or non-content
        const unwantedSelectors = [
          '[class*="nav"]',
          '[class*="menu"]',
          '[class*="sidebar"]',
          '[class*="footer"]',
          '[class*="header"]',
          '[class*="banner"]',
          '[class*="advertisement"]',
          '[class*="ads"]',
          '[role="navigation"]',
          '[role="banner"]',
          '[role="complementary"]',
        ];

        unwantedSelectors.forEach((selector) => {
          try {
            const elements = clone.querySelectorAll(selector);
            elements.forEach((el) => el.remove());
          } catch (e) {
            // Continue if selector is invalid
          }
        });

        // Get text content and clean it up
        let text = clone.textContent || "";

        // Clean up whitespace
        text = text
          .replace(/\s+/g, " ") // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
          .trim();

        return text;
      };

      // Extract main content - try various selectors in order of preference
      const contentSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".content",
        "#content",
        ".post-content",
        ".entry-content",
        ".page-content",
        ".article-content",
        ".blog-content",
        ".story-content",
        ".text-content",
        "body",
      ];

      let content = "";
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = cleanTextContent(element);
          // If we found substantial content, use it
          if (content.length > 100) {
            break;
          }
        }
      }

      // If still no good content, try to get all visible text from body
      if (!content || content.length < 100) {
        const bodyElement = document.body;
        if (bodyElement) {
          content = cleanTextContent(bodyElement);
        }
      }
      const extractedPageData = { url, title, content, metaDescription };

      browser.storage.local.set({
        pageData: extractedPageData,
      });
    } catch (err) {}
  };

  useEffect(() => {
    extractPageData();
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
      },
    },
    {
      id: "like",
      icon: (
        <HeartRounded fill={liked ? "white" : "none"} width={16} height={16} />
      ),
      tooltip: "Like",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        toggleLike(!liked);
      },
    },

    {
      id: "comments",
      icon: <MessageCircle size={16} />,
      tooltip: "Comments",
      onClick: async (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        await browser.storage.local.set({ activeSidePanelTab: "comments" });
        browser.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      },
    },
    {
      id: "bookmark",

      icon: (
        <Bookmark
          fill={bookmarkData?.bookmarked ? "white" : "none"}
          size={16}
        />
      ),
      tooltip: "Bookmark",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        toggleBookmark(!bookmarkData?.bookmarked);
      },
    },
    {
      id: "ask",
      icon: <SparklesIcon size={16} />,
      tooltip: "Ask",

      onClick: async (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        await browser.storage.local.set({ activeSidePanelTab: "ask" });
        browser.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      },
    },
    {
      id: "sidebar-toggle",
      icon: <SidebarIcon size={16} />,
      tooltip: "Sidebar",
      onClick: (e?: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        browser.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      },
    },
  ];
  return (
    <>
      <Toolbar
        className="bg-white"
        buttons={toolbarButtons}
        defaultIcon={<Brain size={16} />}
        theme={{
          backgroundColor: "white",
          borderColor: "lightgray",
          textColor: "black",
        }}
      />
    </>
  );
}

export default ToolbarApp;
