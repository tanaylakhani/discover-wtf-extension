import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { links } from "./data";

let urls: string[] = [...links];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function authenticateUser() {
  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      interactive: true,
      url: getAuthUrl(),
    });
    if (!responseUrl) {
      throw new Error("No response URL returned from launchWebAuthFlow");
    }
    // Parse access_token from responseUrl
    const m = responseUrl.match(/[#&]access_token=([^&]*)/);
    const token = m && m[1];
    if (token) {
      browser.storage.local.set({ authToken: token });
      return token;
    } else {
      throw new Error("No access token found in response");
    }
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

export async function animateGlobeIcon(tabId: number) {
  for (let i = 1; i <= 9; i++) {
    await new Promise((res) => setTimeout(res, 100));
    browser.action.setIcon({ path: `/animate/globe${i}.png`, tabId: tabId });
  }
}

export const openSidePanel = async () => {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log({ tab });
    if (!tab?.id) return;

    await browser.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true,
    });

    await browser.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.log("error opening side panel:", error);
  }
};

export const getRandomUrl = (urls: string[]) => {
  const urlBase = urls[Math.floor(Math.random() * urls?.length)];
  return urlBase;
};

export const handleExtensionOnClick = async () => {
  const url = getRandomUrl(urls);
  browser.storage.local.get("extensionTabId", async (data) => {
    const existingTabId = data.extensionTabId;
    if (existingTabId !== undefined) {
      try {
        await browser.tabs.update(existingTabId, { url, active: true });
        await browser.windows.update(existingTabId?.windowId, {
          focused: true,
        });
        return;
      } catch (e) {
        console.log("err in handleExtensionOnClick:", e);
      }
    }
    const createdTab = await browser.tabs.create({
      active: true,
      url,
    });
    browser.storage.local.set({ extensionTabId: createdTab.id });
  });
};

export function isValidUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export type TGoogleUser = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
};

export function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove query and hash
    parsed.search = "";
    parsed.hash = "";

    // Remove trailing slash (unless it's root)
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return `${parsed.host}${parsed.pathname}`;
  } catch (e) {
    console.warn("Invalid URL:", url);
    return url;
  }
}

export const getAuthToken = async () => {
  return await browser.storage.local.get("authToken");
};

export const getActiveExtensionTabId = async () => {
  return await browser.storage.local.get("extensionTabId");
};

export async function getGoogleUser() {
  const token = await browser.storage.local.get("authToken");
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${token?.authToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user info");
  }

  return await res.json();
}

export const getAuthUrl = () => {
  const clientId =
    "749325556750-7vhqt1hskpg7k2229vqiakc7nbgfbv8t.apps.googleusercontent.com";
  const redirectUri = `https://${browser.runtime.id}.chromiumapp.org/`;
  const scopes = ["email", "profile"];
  const authUrl =
    `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scopes.join(" "))}`;
  return authUrl;
};
