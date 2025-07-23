import { links } from "@/lib/data";
import {
  animateGlobeIcon,
  authenticateUser,
  getRandomUrl,
  hasDiscoverHistoryParam,
  isValidUrl,
} from "../lib/utils";

// Global variables to store the extension tab ID and window ID
let extensionTabId: number | null = null;
let extensionWindowId: number | null = null;

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    await animateGlobeIcon(tab?.id as number);

    const url = getRandomUrl(links);

    // Check if extensionTabId exists in storage
    const data = await browser.storage.local.get("extensionTabId");
    const storedTabId = data.extensionTabId;

    if (storedTabId !== undefined) {
      try {
        // Update existing tab
        await browser.tabs.update(storedTabId, { url, active: true });
        const updatedTab = await browser.tabs.get(storedTabId);
        await browser.windows.update(updatedTab.windowId, { focused: true });

        // Update global variables
        extensionTabId = storedTabId;
        extensionWindowId = updatedTab.windowId;

        return;
      } catch (e) {
        console.log("Error updating existing tab:", e);
        // If update fails, we'll create a new tab below
      }
    }

    // Create new tab
    const createdTab = await browser.tabs.create({
      active: true,
      url,
    });

    // Store tab ID in storage and global variables
    await browser.storage.local.set({ extensionTabId: createdTab.id });
    extensionTabId = createdTab.id || null;
    extensionWindowId = createdTab.windowId || null;
  });

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      if (message.type === "CHECK_IF_EXTENSION_TAB") {
        const data = await browser.storage.local.get("extensionTabId");
        const isExtensionTab = sender.tab?.id === data.extensionTabId;
        sendResponse({ isExtensionTab });
        return true;
      } else if (message.type === "AUTHENTICATE_USER") {
        authenticateUser().then((token) => {
          sendResponse({ token });
        });

        return true; // Indicates async response
      } else if (message.type === "OPEN_SIDE_PANEL") {
        console.log("opensidebar");
        browser.sidePanel.open({
          tabId: sender?.tab?.id as number,
          windowId: sender?.tab?.windowId,
        });
        return true; // Indicates async response
      }
    }
  );

  // Initialize side panel behavior on install
  // browser.runtime.onInstalled.addListener(async () => {
  //   // Initialize storage
  //   await browser.storage.local.set({
  //     // urlVisitCount: 0,
  //     // extensionTabHistory: [], // Track URLs visited by extension tab specifically
  //   });
  // });

  // Handle tab removal to clean up extension tab tracking
  browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const data = await browser.storage.local.get([
      "extensionTabId",
      "urlVisitCount",
    ]);
    if (data.extensionTabId === tabId) {
      await browser.storage.local.remove("extensionTabId");
      await browser.storage.local.set({ urlVisitCount: 0 });
      extensionTabId = null;
      extensionWindowId = null;
      console.log("Extension tab closed, cleared tracking");
    }
  });

  // Track URL changes for extension tabs only
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log("Tab updated:", { tabId, changeInfo, tab });
    // if (changeInfo.status === "complete") {

    if (
      changeInfo.url &&
      isValidUrl(changeInfo.url) &&
      !hasDiscoverHistoryParam(changeInfo?.url)
    ) {
      const data = await browser.storage.local.get([
        "extensionTabId",
        "extensionTabHistory",
      ]);

      // Only track history for extension tab
      if (data.extensionTabId === tabId) {
        // Track extension tab specific history with additional metadata
        let extensionTabHistory = data.extensionTabHistory || [];
        const historyEntry = {
          url: changeInfo.url,
          timestamp: Date.now(),
          title: tab.title || "",
        };

        // Avoid consecutive duplicates for extension tab history
        if (
          extensionTabHistory.length === 0 ||
          extensionTabHistory[extensionTabHistory.length - 1].url !==
            changeInfo.url
        ) {
          extensionTabHistory.push(historyEntry);
          // Limit extension tab history to last 100 URLs
          if (extensionTabHistory.length > 100) {
            extensionTabHistory = extensionTabHistory.slice(
              extensionTabHistory.length - 100
            );
          }

          // Update URL visit count
          const currentCount = await browser.storage.local.get("urlVisitCount");
          const newCount = (currentCount.urlVisitCount || 0) + 1;

          await browser.storage.local.set({
            extensionTabHistory,
            urlVisitCount: newCount,
          });

          // Update global variables with current tab info
          extensionTabId = tabId;
          extensionWindowId = tab.windowId || null;

          console.log(`Extension tab visited: ${changeInfo.url}`);
          console.log(
            `Extension tab history length: ${extensionTabHistory.length}`
          );
          console.log(`Total URLs visited: ${newCount}`);
        }
      }
    }
    // }
  });
});
