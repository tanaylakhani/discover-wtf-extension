import URL from "@/lib/url";
import {
  animateGlobeIcon,
  fetchInitialLinks,
  getRandomUrl,
  hasDiscoverHistoryParam,
  isValidUrl,
  makeCall,
  updateCount,
} from "../lib/utils";

// Global variables to store the extension tab ID and window ID
let extensionTabId: number | null = null;
let extensionWindowId: number | null = null;
let sidePanelOpenTabs = new Set<number>(); // Track which tabs have sidepanel open

export default defineBackground(async () => {
  (async () => {
    const { gqlToken } = await browser.storage.local.get("gqlToken");
    await browser.action.setPopup({
      popup: gqlToken ? "" : browser.runtime.getURL("/authPopup.html"),
    });
  })();
  initializeContextMenus();

  browser.runtime.onStartup.addListener(async () => {
    console.log("Starup called 🌱💌🌊");
    const { gqlToken } = await browser.storage.local.get("gqlToken");
    await browser.action.setPopup({
      popup: gqlToken ? "" : browser.runtime.getURL("/authPopup.html"),
    });

    // const resp = await makeCall("/recall");
    // console.log({ resp });
  });

  browser.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "local" && changes.gqlToken) {
      console.log("🚨 Changes Detected");
      const newToken = changes.gqlToken.newValue;
      await browser.action.setPopup({
        popup: newToken ? "" : browser.runtime.getURL("/authPopup.html"),
      });
    }
  });
  browser.action.onClicked.addListener(handleActionClick);
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true;
  });
  browser.tabs.onRemoved.addListener(handleTabRemoval);
  browser.tabs.onUpdated.addListener(handleTabUpdate);
  browser.windows.onRemoved.addListener(async (windowId) => {
    if (windowId === extensionWindowId) {
      await browser.storage.local.remove("extensionTabId");
      extensionTabId = null;
      extensionWindowId = null;
      console.log("Extension window closed, cleared tracking");
    }
  });

  // Listen for keyboard command and trigger the same logic as clicking the extension icon
  browser.commands.onCommand.addListener(async (command) => {
    if (command === "trigger-action-click") {
      // Simulate clicking the extension icon
      // Get the current active tab
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        await handleActionClick(tab);
      }
    }
  });
});

async function initializeContextMenus() {
  try {
    // Remove all existing context menus
    browser.contextMenus.removeAll();

    const tokenData = await browser.storage.local.get(["gqlToken"]);
    const isLoggedIn = !!tokenData.gqlToken;

    if (isLoggedIn) {
      browser.contextMenus.create({
        id: "discover_separator",
        type: "separator",
        contexts: ["action"],
      });
      // Add logout option (only if logged in)
      browser.contextMenus.create({
        id: "discover_logout",
        title: "Logout",
        contexts: ["action"],
      });
    } else {
      browser.contextMenus.create({
        id: "discover_login",
        title: "Login with Stacks",
        contexts: ["action"],
      });
    }

    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    console.log("✅ Context menus initialized");
  } catch (error) {
    console.error("❌ Error initializing context menus:", error);
  }
}

// Handle context menu clicks
function handleContextMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab
) {
  // console.log('🖱️ Context menu clicked:', info.menuItemId);

  try {
    switch (info.menuItemId) {
      case "discover_login":
        handleLoginClick();
        break;
      case "discover_logout":
        handleLogoutClick();
        break;
      default:
    }
  } catch (error) {
    console.error("❌ Error handling context menu click:", error);
  }
}

function handleLoginClick() {
  browser.tabs.create({
    url: browser.runtime.getURL("/login.html"),
    active: true,
  });
}

export async function handleLogoutClick() {
  try {
    // console.log('🔓 Starting logout process...');

    const authKeys = [
      "googleToken",
      "gqlToken",
      "rememberYourChoice",
      "installed",
    ];

    await browser.storage.local.remove(authKeys);
    initializeContextMenus();

    // Show notification to user
    browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("/icon/48.png"),
      title: "Discover Extension",
      message: "Successfully logged out of Stacks",
    });
  } catch (error) {
    console.error("❌ Error during logout:", error);

    browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("/icon/48.png"),
      title: "Stacks Extension - Error",
      message: "Failed to logout. Please try again.",
    });
  }
}

// Handle extension icon click
async function handleActionClick(tab: any) {
  await fetchInitialLinks();

  const [url] = await Promise.all([
    getRandomUrl(),
    animateGlobeIcon(tab?.id as number),
  ]);

  await handleTab(url);
  await updateCount();
}

// Handle runtime messages
async function handleMessage(
  message: any,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  switch (message.type) {
    case "OPEN_SIDE_PANEL":
      handleOpenSidePanel(sender, sendResponse);
      break;
    case "DISABLE_POPUP":
      handleDisablePopup(sender, sendResponse);
      break;
    case "ENABLE_POPUP":
      handleEnablePopup(sender, sendResponse);
      break;
    case "GET_CURRENT_TAB_ID":
      sendResponse({ tabId: sender.tab?.id });
      break;
    case "SET_GQL_TOKEN":
      handleSetGQLToken(message, sendResponse);
      break;
    case "FETCH_API_DATA":
      handleFetchApiData(message, sender, sendResponse);
      break;
    case "MARK_LINK_AS_VISITED":
      handleMarkLinkAsVisited(message, sender, sendResponse);
      break;

    case "BOOKMARK_LINK":
      handleBookmarkLink(message, sendResponse);
      break;
    case "GET_LIKE_STATUS":
      handleGetLikeStatus(message, sendResponse);
      break;
    case "GET_BOOKMARK_STATUS":
      handleGetBookmarkStatus(message, sendResponse);
      break;
    case "TOGGLE_LIKE":
      handleToggleLike(message, sendResponse);
      break;
    case "TOGGLE_BOOKMARK":
      handleToggleBookmark(message, sendResponse);
      break;
    case "LIKE_LINK":
      handleLikeLink(message, sendResponse);
      break;
  }
}

async function handleTab(url: string) {
  try {
    const data = await browser.storage.local.get("extensionTabId");
    // Update already existing tab opened previously by extension
    if (data?.extensionTabId !== undefined) {
      try {
        await browser.tabs.update(data?.extensionTabId, { url, active: true });
        const updatedTab = await browser.tabs.get(data?.extensionTabId);
        await browser.windows.update(updatedTab.windowId, { focused: true });
        extensionTabId = data?.extensionTabId;
        extensionWindowId = updatedTab.windowId;
        return;
      } catch (e: any) {
        // If the tab doesn't exist, fall through to create a new one
        if (e && e.message && e.message.includes("No tab with id")) {
          console.warn("Tab not found, creating a new one.");
        } else {
          throw e;
        }
      }
    }
    //  Create New Tab if not tab was created by extension earlier or if old one is gone
    const createdTab = await browser.tabs.create({
      active: true,
      url,
    });
    await browser.storage.local.set({ extensionTabId: createdTab.id });
    extensionTabId = createdTab.id || null;
    extensionWindowId = createdTab.windowId || null;
  } catch (e) {
    console.log("Error updating or creating tab:", e);
  }
}

// Handle tab removal
async function handleTabRemoval(tabId: number, removeInfo: any) {
  const data = await browser.storage.local.get([
    "extensionTabId",
    "urlVisitCount",
  ]);

  if (data.extensionTabId === tabId) {
    await browser.storage.local.remove("extensionTabId");
    // await browser.storage.local.set({ urlVisitCount: 0 });
    extensionTabId = null;
    extensionWindowId = null;
    console.log("Extension tab closed, cleared tracking");
  }
}

// Handle tab updates
async function handleTabUpdate(
  tabId: number,
  changeInfo: Browser.tabs.TabChangeInfo,
  tab: Browser.tabs.Tab
) {
  if (
    changeInfo.url &&
    isValidUrl(changeInfo.url) &&
    !hasDiscoverHistoryParam(changeInfo?.url)
  ) {
    const data = await browser.storage.local.get([
      "extensionTabId",
      "extensionTabHistory",
    ]);

    if (data.extensionTabId === tabId) {
      // await updateExtensionTabHistory(changeInfo.url, tab);
    }
  }
}

const handleOpenSidePanel = (
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("opensidebar", extensionTabId);

    browser.sidePanel.open({
      tabId: sender?.tab?.id as number,
      windowId: sender?.tab?.windowId,
    });

    sendResponse({
      success: true,
    });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};

const handleDisablePopup = async (
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("Disabling popup");
    await browser.action.setPopup({ popup: "" });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};
const handleBookmarkLink = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log({ message });
    const params = {
      linkId: message?.data?.linkId,
    };

    const stringifiedParams = new URLSearchParams(params).toString();
    await makeCall(`/bookmark?${stringifiedParams}`, {
      method: message?.data?.method,
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};
const handleLikeLink = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log({ message });
    const params = {
      linkId: message?.data?.linkId,
    };

    const stringifiedParams = new URLSearchParams(params).toString();
    await makeCall(`/like?${stringifiedParams}`, {
      method: message?.data?.method,
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};
const handleGetLikeStatus = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🔍 Getting like status:", message);
    const linkId = message?.linkId;

    try {
      // Also try to get from server
      const res = (await makeCall(`/like?linkId=${linkId}`, {}, 10000)) as {
        liked: boolean;
        count: number;
      };
      console.log("✅ Server like status response:", res);
      sendResponse(res);
    } catch (serverError) {
      console.log("⚠️ Server request failed, using local data:", serverError);
      // Fallback to local data if server fails
      sendResponse({
        success: false,
        error: (serverError as Error)?.message,
      });
    }
  } catch (error) {
    console.error("❌ Error in handleGetLikeStatus:", error);
    sendResponse({
      liked: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
const handleGetBookmarkStatus = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🔍 Getting bookmark status:", message);
    const linkId = message?.linkId;

    try {
      // Also try to get from server
      const res = (await makeCall(`/bookmark?linkId=${linkId}`, {}, 10000)) as {
        data: { bookmarked: boolean };
      };
      console.log(
        "handleGetBookmarkStatus:✅ Server bookmark status response:",
        res?.data
      );
      sendResponse(res?.data);
    } catch (serverError) {
      console.log(
        "handleGetBookmarkStatus:⚠️ Server request failed, using local data:",
        serverError
      );
      // Fallback to local data if server fails
      sendResponse({
        bookmarked: false,
        success: false,
        error: (serverError as Error)?.message,
      });
    }
  } catch (error) {
    console.error("❌ Error in handleGetBookmarkStatus:", error);
    sendResponse({
      success: false,
      bookmarked: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const handleToggleLike = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🔄 Toggling like:", message);
    const linkId = message?.linkId;
    const liked = message?.liked;

    // Also make API call in background (don't wait for it)
    makeCall(
      `/like?linkId=${linkId}`,
      {
        method: "POST",
        body: JSON.stringify({
          liked: liked,
        }),
      },
      10000
    );
    sendResponse({
      success: true,
      error: null,
    });
  } catch (error) {
    console.error("❌ Error toggling like:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
const handleToggleBookmark = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🔄 Toggling bookmark:", message);
    const linkId = message?.linkId;
    const bookmarked = message?.bookmarked;

    // Also make API call in background (don't wait for it)
    makeCall(
      `/bookmark?linkId=${linkId}`,
      {
        method: "POST",
        body: JSON.stringify({
          bookmarked: bookmarked,
        }),
      },
      10000
    );
    sendResponse({
      success: true,
      error: null,
    });
  } catch (error) {
    console.error("❌ Error toggling like:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const handleEnablePopup = async (
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🌱 Enabling Auth Popup");
    await browser.action.setPopup({
      popup: browser.runtime.getURL("/authPopup.html"),
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};

const handleSetGQLToken = async (
  message: any,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("Setting GQL Token", message.value);
    const storageData = {
      googleToken: message?.value,
      gqlToken: message?.value,
      rememberYourChoice: true,
    };

    await browser.storage.local.set(storageData);
    initializeContextMenus();
    sendResponse({
      success: true,
    });
  } catch (error) {
    sendResponse({
      success: false,
    });
  }
};

const handleFetchApiData = async (
  message: any,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  try {
    const { endpoint, options = {} } = message.payload;

    // Validate endpoint
    if (!endpoint) {
      sendResponse({
        success: false,
        error: "Endpoint is required",
      });
      return;
    }

    // Construct full URL - assuming your Next.js API is running on localhost:3001
    const apiUrl = `${URL}/api/links${endpoint}`;

    // Get auth token from storage if available
    const { gqlToken } = await browser.storage.local.get("gqlToken");
    // Default headers
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gqlToken}`,
      ...options.headers,
    };

    // Fetch data from Next.js API route
    const response = await fetch(apiUrl, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    sendResponse({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching API data:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};

const handleMarkLinkAsVisited = async (
  message: any,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  try {
    console.log("🌱 Marking link as visited:", message);
    const linkId = message?.data?.linkId;

    // Also make API call in background (don't wait for it)
    makeCall(
      `/mark-visited?linkId=${linkId}`,
      {
        method: "POST",
      },
      10000
    );
    sendResponse({
      success: true,
      error: null,
    });
  } catch (error) {
    console.error("❌ Error marking link as visited:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
