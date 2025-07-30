import { links } from "@/lib/data";
import {
  animateGlobeIcon,
  fetchInitialLinks,
  getGqlToken,
  getRandomUrl,
  hasDiscoverHistoryParam,
  isValidUrl,
  makeCall,
  updateCount,
} from "../lib/utils";
import { QUERY_USER_STRING } from "@/lib/graphql/user";

// Global variables to store the extension tab ID and window ID
let extensionTabId: number | null = null;
let extensionWindowId: number | null = null;

// const response = await fetch("https://api.betterstacks.com/graphql", {
//   method: "POST",
//   headers: {
//     Accept: "application/json",
//     "Content-Type": "application/json",
//     "X-Authorization": gqlToken,
//     Authorization: `Bearer ${gqlToken}`,
//   },
//   body: JSON.stringify({
//     query: RECALL_LINKS_QUERY_STRING(3, 1, 50),
//   }),
// });
// browser.runtime.onInstalled.addListener((details) => {
//   console.log("Extension installed:", details);

// });
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

async function handleLogoutClick() {
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
  await updateCount();
  handleTab(url);
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

    case "BOOKMARK_LINK":
      handleBookmarkLink(message, sendResponse);
      break;
  }
}

async function handleTab(url: string) {
  try {
    const data = await browser.storage.local.get("extensionTabId");
    // Update already existing tab opened previously by extension
    if (data?.extensionTabId !== undefined) {
      await browser.tabs.update(data?.extensionTabId, { url, active: true });
      const updatedTab = await browser.tabs.get(data?.extensionTabId);
      await browser.windows.update(updatedTab.windowId, { focused: true });
      extensionTabId = data?.extensionTabId;
      extensionWindowId = updatedTab.windowId;
      return;
    }
    //  Create New Tab if not tab was created by extension earlier
    const createdTab = await browser.tabs.create({
      active: true,
      url,
    });

    await browser.storage.local.set({ extensionTabId: createdTab.id });
    extensionTabId = createdTab.id || null;
    extensionWindowId = createdTab.windowId || null;
  } catch (e) {
    console.log("Error updating existing tab:", e);
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

// Update extension tab history
// async function updateExtensionTabHistory(url: string, tab: any) {
//   const data = await browser.storage.local.get("extensionTabHistory");
//   let extensionTabHistory = data.extensionTabHistory || [];

//   const historyEntry = {
//     url: url,
//     timestamp: Date.now(),
//     title: tab.title || "",
//   };

//   if (
//     extensionTabHistory.length === 0 ||
//     extensionTabHistory[extensionTabHistory.length - 1].url !== url
//   ) {
//     extensionTabHistory.push(historyEntry);

//     if (extensionTabHistory.length > 100) {
//       extensionTabHistory = extensionTabHistory.slice(
//         extensionTabHistory.length - 100
//       );
//     }

//     const currentCount = await browser.storage.local.get("urlVisitCount");
//     const newCount = (currentCount.urlVisitCount || 0) + 1;

//     await browser.storage.local.set({
//       extensionTabHistory,
//       urlVisitCount: newCount,
//     });

//     extensionTabId = tab.id || null;
//     extensionWindowId = tab.windowId || null;

//     console.log(`Extension tab visited: ${url}`);
//     console.log(`Extension tab history length: ${extensionTabHistory.length}`);
//     console.log(`Total URLs visited: ${newCount}`);
//   }
// }

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
    makeCall(`/bookmark?${stringifiedParams}`, {
      method: message?.data?.method,
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({
      success: false,
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
