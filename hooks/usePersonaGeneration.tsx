import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  BrowsingHistoryEntry,
  PersonaResponse,
} from "@/entrypoints/login/schema";

interface PersonaGenerationData {
  browsingHistory: BrowsingHistoryEntry[];
  bookmarks: Bookmark[];
  timeRange: "month";
}

interface PersonaGenerationResult {
  persona: PersonaResponse;
  dataStats: {
    historyCount: number;
    bookmarkCount: number;
    timeRange: string;
  };
}

// Chrome Extension API helper functions
const fetchBrowsingHistory = async (): Promise<BrowsingHistoryEntry[]> => {
  return new Promise((resolve, reject) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    browser.history.search(
      {
        text: "",
        startTime: oneMonthAgo.getTime(),
        maxResults: 1000,
      },
      (historyItems) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
          return;
        }

        const formattedHistory: BrowsingHistoryEntry[] = historyItems.map(
          (item) => ({
            url: item.url || "",
            title: item.title || "",
            visitTime: new Date(item.lastVisitTime || 0).toISOString(),
            visitCount: item.visitCount,
            lastVisitTime: new Date(item.lastVisitTime || 0).toISOString(),
            domain: item.url
              ? new URL(item.url).hostname.replace("www.", "")
              : "",
            category: "other",
          })
        );

        resolve(formattedHistory);
      }
    );
  });
};

const fetchBookmarks = async (): Promise<Bookmark[]> => {
  return new Promise((resolve, reject) => {
    browser.bookmarks.getTree((bookmarkTreeNodes) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
        return;
      }

      const bookmarks: Bookmark[] = [];

      const traverseBookmarks = (
        nodes: Browser.bookmarks.BookmarkTreeNode[],
        folderName = ""
      ) => {
        nodes.forEach((node) => {
          if (node.url) {
            bookmarks.push({
              url: node.url,
              title: node.title || "",
              dateAdded: new Date(
                parseInt(node.dateAdded?.toString() || "0")
              ).toISOString(),
              folder: folderName,
            });
          } else if (node.children) {
            traverseBookmarks(node.children, node.title || "");
          }
        });
      };

      traverseBookmarks(bookmarkTreeNodes);
      resolve(bookmarks);
    });
  });
};

const generatePersonaAPI = async (): Promise<PersonaGenerationResult> => {
  // Check if we have necessary Chrome extension permissions
  if (!browser.history || !browser.bookmarks) {
    throw new Error(
      "Missing Chrome extension permissions for history and bookmarks"
    );
  }

  // Fetch browsing data
  console.log("Fetching browsing history...");
  const browsingHistory = await fetchBrowsingHistory();

  console.log("Fetching bookmarks...");
  const bookmarks = await fetchBookmarks();

  console.log(
    `Collected ${browsingHistory.length} history entries and ${bookmarks.length} bookmarks`
  );

  // Prepare payload for API
  const payload: PersonaGenerationData = {
    browsingHistory,
    bookmarks,
    timeRange: "month",
  };

  // Infinite retry loop for API call with exponential backoff
  let retryCount = 0;
  let delay = 1000; // Start with 1 second delay

  while (true) {
    try {
      console.log(
        `Calling persona generation API... (attempt ${retryCount + 1})`
      );
      const response = await fetch(
        `https://orb.stacks.im/api/persona/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result: PersonaResponse = await response.json();
      console.log("Persona generated successfully:", result);

      return {
        persona: result,
        dataStats: {
          historyCount: browsingHistory.length,
          bookmarkCount: bookmarks.length,
          timeRange: "month",
        },
      };
    } catch (apiErr) {
      retryCount++;
      console.error(`API call failed (attempt ${retryCount}):`, apiErr);

      // If we've exceeded reasonable retry attempts, throw the error
      if (retryCount > 10) {
        throw apiErr;
      }

      // Wait before retrying with exponential backoff (max 10 seconds)
      const currentDelay = Math.min(
        delay * Math.pow(1.5, retryCount - 1),
        10000
      );
      console.log(`Retrying in ${currentDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
};

export const usePersonaGeneration = (
  setState?: (response: PersonaResponse) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generatePersonaAPI,
    mutationKey: ["generatePersona"],
    onSuccess: (data) => {
      // Invalidate and refetch any related queries
      queryClient.invalidateQueries({ queryKey: ["persona"] });
      if (setState) {
        setState(data.persona);
      }
      console.log("Persona generated and cache invalidated");
    },
    onError: (error) => {
      console.error("Persona generation failed:", error);
    },
    // Custom retry logic is handled within the API function
    retry: false,
  });
};
