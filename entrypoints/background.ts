import { links } from "@/lib/data";
import {
  animateGlobeIcon,
  authenticateUser,
  getAuthUrl,
  handleExtensionOnClick,
  isValidUrl,
  openSidePanel,
} from "../lib/utils";

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    await animateGlobeIcon(tab?.id as number);
    await handleExtensionOnClick();
  });

  browser.runtime.onInstalled.addListener(async () => {
    await browser.sidePanel.setPanelBehavior({
      openPanelOnActionClick: false,
    });
    browser.storage.local.set({ tabCount: 0 });
  });

  browser.tabs.onCreated.addListener((tab) => {
    browser.storage.local.get("tabCount", (data) => {
      const newCount = (data.tabCount || 0) + 1;
      browser.storage.local.set({ tabCount: newCount });
    });
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && isValidUrl(changeInfo.url)) {
      browser.storage.local.get("history", (historyData) => {
        let history = historyData.history || [];
        // Avoid consecutive duplicates
        if (
          history.length === 0 ||
          history[history.length - 1] !== changeInfo.url
        ) {
          history.push(changeInfo.url);
          // Limit history to last 50 URLs
          if (history.length > 50) history = history.slice(history.length - 50);
          browser.storage.local.set({ history });
        }
      });
    }
  });

  browser.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      if (message.type === "AUTHENTICATE_USER") {
        authenticateUser().then((token) => {
          sendResponse({ token });
        });
        return true; // Indicates async response
      } else if (message.type === "OPEN_SIDE_PANEL") {
        browser.sidePanel.open({
          tabId: sender?.tab?.id,
          windowId: sender?.tab?.windowId as number,
        });
      }
    }
  );
});
