import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BrowsingHistoryEntry } from "@/entrypoints/login/schema";

// Phase 1 interfaces
interface PersonaIdentityData {
  success: boolean;
  session_id: string;
  identity_inference: {
    name: string | null;
    profession: string | null;
    country: string | null;
    profile_picture_url: string | null;
    confidence: {
      name: number;
      profession: number;
      country: number;
      profile_picture: number;
    };
    evidence_sources: {
      name: string[];
      profession: string[];
      profile_picture: string[];
    };
  };
  processing_metadata: {
    data_processed: {
      browsing_entries: number;
      unique_domains: number;
      search_queries: number;
      bookmarks: number;
      time_range: string;
    };
    top_domains: Array<{
      domain: string;
      count: number;
      category: string;
    }>;
    processing_time: string;
  };
  persona: {
    comprehensive_persona: string;
    behavioral_insights: {
      work_life_balance: {
        value: string;
        icon: string;
      };
      learning_style: {
        value: string;
        icon: string;
      };
      decision_making: {
        value: string;
        icon: string;
      };
      information_consumption: {
        value: string;
        icon: string;
      };
    };
    digital_footprint_summary: {
      browsing_patterns: {
        most_active_hours: {
          value: string;
          icon: string;
        };
        session_length: {
          value: string;
          icon: string;
        };
        multitasking: boolean;
      };
      technical_proficiency: string;
    };
  };
}
const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 604800000

// Phase 2 interfaces
interface PersonaContentData {
  success: boolean;
  session_id: string;
  content_preferences: {
    formats: Array<{
      format: string;
      icon: string;
      inclination: string;
    }>;
    topics: string[];
    complexity: "beginner" | "intermediate" | "advanced";
  };
}

interface PersonaGenerationData {
  browsingHistory: BrowsingHistoryEntry[];
  bookmarks: Bookmark[];
  timeRange: "month";
}

interface PersonaIdentityResult {
  identity: PersonaIdentityData;
  dataStats: {
    historyCount: number;
    bookmarkCount: number;
    timeRange: string;
  };
}

interface PersonaContentResult {
  content: PersonaContentData;
  dataStats: {
    historyCount: number;
    bookmarkCount: number;
    timeRange: string;
  };
}

// Chrome Extension API helper functions (shared)
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

// Phase 1 API call
const generateIdentityAPI = async (): Promise<PersonaIdentityResult> => {
  // Check if we have necessary Chrome extension permissions
  if (!browser.history || !browser.bookmarks) {
    throw new Error(
      "Missing Chrome extension permissions for history and bookmarks"
    );
  }

  // Fetch browsing data
  const browsingHistory = await fetchBrowsingHistory();

  const bookmarks = await fetchBookmarks();

  // Prepare payload for API
  const payload: PersonaGenerationData = {
    browsingHistory,
    bookmarks,
    timeRange: "month",
  };

  // Retry logic for Phase 1
  let retryCount = 0;
  let delay = 1000;

  while (true) {
    try {
      const response = await fetch(
        `https://orb.stacks.im/api/persona/identity`,
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
          errorData.detail?.message ||
            errorData.error ||
            `HTTP error! status: ${response.status}`
        );
      }

      const result: PersonaIdentityData = await response.json();

      return {
        identity: result,
        dataStats: {
          historyCount: browsingHistory.length,
          bookmarkCount: bookmarks.length,
          timeRange: "month",
        },
      };
    } catch (apiErr) {
      retryCount++;

      // If we've exceeded reasonable retry attempts, throw the error
      if (retryCount > 5) {
        throw apiErr;
      }

      // Wait before retrying with exponential backoff (max 10 seconds)
      const currentDelay = Math.min(
        delay * Math.pow(1.5, retryCount - 1),
        10000
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
};

// Phase 2 API call
const generateContentPreferencesAPI = async (
  sessionId: string
): Promise<PersonaContentResult> => {
  // Retry logic for Phase 2
  let retryCount = 0;
  let delay = 1000;

  while (true) {
    try {
      const response = await fetch(
        `https://orb.stacks.im/api/persona/content-preferences`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sessionId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail?.message ||
            errorData.error ||
            `HTTP error! status: ${response.status}`
        );
      }

      const result: PersonaContentData = await response.json();

      return {
        content: result,
        dataStats: {
          historyCount: 0, // Not relevant for Phase 2
          bookmarkCount: 0,
          timeRange: "month",
        },
      };
    } catch (apiErr) {
      retryCount++;

      // If we've exceeded reasonable retry attempts, throw the error
      if (retryCount > 3) {
        throw apiErr;
      }

      // Wait before retrying with exponential backoff (max 5 seconds)
      const currentDelay = Math.min(
        delay * Math.pow(1.5, retryCount - 1),
        5000
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
};

// Phase 1 Hook
export const usePersonaIdentity = (
  setState?: (response: PersonaIdentityData) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateIdentityAPI,
    mutationKey: ["generatePersonaIdentity"],
    onSuccess: async (data) => {
      // Invalidate and refetch any related queries
      queryClient.invalidateQueries({ queryKey: ["persona"] });
      queryClient.invalidateQueries({ queryKey: ["personaIdentity"] });
      if (setState) {
        setState(data.identity);
      }
      await browser.storage.local.set({
        personaIdentity: {
          data: data.identity,
          expiry: Date.now() + WEEK_MS,
        },
      });
    },

    // Custom retry logic is handled within the API function
    retry: false,
  });
};

// Phase 2 Hook
export const usePersonaContentPreferences = (
  sessionId: string,
  setState?: (response: PersonaContentData) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateContentPreferencesAPI(sessionId),
    mutationKey: ["generatePersonaContentPreferences", sessionId],
    onSuccess: async (data) => {
      // Invalidate and refetch any related queries
      queryClient.invalidateQueries({ queryKey: ["persona"] });
      queryClient.invalidateQueries({
        queryKey: ["personaContentPreferences"],
      });
      if (setState) {
        setState(data.content);
      }
      await browser.storage.local.set({
        personaContentPreferences: {
          data: data?.content,
          expiry: Date.now() + WEEK_MS,
        },
      });
    },

    retry: false,
  });
};

// Combined hook for backward compatibility
export const usePersonaPhases = (
  setIdentityData?: (response: PersonaIdentityData) => void,
  setContentData?: (response: PersonaContentData) => void
) => {
  const identityMutation = usePersonaIdentity(setIdentityData);
  const contentMutation = usePersonaContentPreferences("", setContentData);

  const generatePhase1 = () => {
    identityMutation.mutate();
  };

  const generatePhase2 = (sessionId: string) => {
    if (sessionId) {
      // Create new mutation with session ID
      const contentMutationWithSession = usePersonaContentPreferences(
        sessionId,
        setContentData
      );
      contentMutationWithSession.mutate();
    }
  };

  return {
    // Phase 1
    generatePhase1,
    identityMutation,
    isIdentityLoading: identityMutation.isPending,
    identityError: identityMutation.error,
    identityData: identityMutation.data,

    // Phase 2
    generatePhase2,
    contentMutation,
    isContentLoading: contentMutation.isPending,
    contentError: contentMutation.error,
    contentData: contentMutation.data,

    // Overall state
    isLoading: identityMutation.isPending || contentMutation.isPending,
    hasErrors: !!identityMutation.error || !!contentMutation.error,
  };
};

// Session status check hook
export const useSessionStatus = (sessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `https://orb.stacks.im/api/persona/session/${sessionId}/status`
      );

      if (!response.ok) {
        throw new Error("Failed to check session status");
      }

      return await response.json();
    },
    mutationKey: ["sessionStatus", sessionId],

    retry: false,
  });
};

// Export types for use in components
export type {
  PersonaIdentityData,
  PersonaContentData,
  PersonaIdentityResult,
  PersonaContentResult,
};
