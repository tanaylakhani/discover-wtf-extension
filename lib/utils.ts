import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { links } from "./data";
import queryClient from "./query-client";

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

export const getRandomUrl = async (): Promise<string> => {
  const {
    links,
    visitedLinkIds,
    currentPage,
  }: {
    links: PublicRandomLink[];
    visitedLinkIds: string[];
    currentPage: number;
  } = await browser.storage.local.get([
    "links",
    "visitedLinkIds",
    "currentPage",
  ]);
  const visited = new Set(visitedLinkIds || []);

  let unvisited = links.filter((link) => !visited.has(link.id));

  if (unvisited.length === 0) {
    console.log("fetching new links for next page:", currentPage);
    const newLinks = await fetchNextPage(currentPage);
    unvisited = newLinks!.filter((link) => !visited.has(link.id));
  }

  const randomLink = unvisited[Math.floor(Math.random() * unvisited?.length)];
  // add in the visited Set
  visited.add(randomLink?.id);

  // mark the link as visited in storage and db
  markAsVisited(randomLink.id, visited);
  await browser.storage.local.set({
    activeLink: randomLink,
  });

  console.log({ unvisited, set: [...visited] });

  return randomLink?.target_url;
};

const markAsVisited = async (linkId: string, visited: Set<string>) => {
  await browser.storage.local.set({
    visitedLinkIds: [...visited],
  });
  const data = await queryClient.fetchQuery({
    queryKey: ["track-visit", linkId],
    queryFn: () => makeCall(`/track-visit?linkId=${linkId}`),
  });

  // makeCall(`/track-visit?${stringifiedParams}`).catch((error) => {
  //   console.error("Failed to mark link as visited in DB:", error);
  // });
};

export const updateCount = async () => {
  browser.storage.local.get("urlVisitCount", (data) => {
    const currentCount = data.urlVisitCount || 0;
    const newCount = currentCount + 1;
    browser.storage.local.set({ urlVisitCount: newCount });
    console.log("Updated URL visit count:", newCount);
  });
};

// if (!response?.success && response?.error) {
//   throw new Error(`Failed to mark link as visited in DB: ${response.error}`);
// }
// return response?.success;

export const makeCall = async (
  endpoint: string,
  options: RequestInit = {},
  timeout = 6000 // in milliseconds
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const token = await getGqlToken();
  if (!token?.gqlToken) {
    throw new Error("No GraphQL token found");
  }
  try {
    const response = await fetch(`http://localhost:3001/api/links${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.gqlToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    console.log({ data });
    if (!response.ok) {
      const message = data?.error || "Unknown error occurred";
      const error = new Error(message);
      (error as any).status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
};

export type PublicRandomLink = {
  id: string;
  title: string;
  description: string;
  target_url: string;
  domain: string;
  favicon_url: string;
  screenshot_url: string;
  created_at: string; // ISO timestamp
  __typename: "PublicRandomLink";
};

export type GetLinksPayload = {
  count: number;
  data: {
    userId: string;
    linkId: string;
    likedAt: Date;
  }[];
};

export const fetchInitialLinks = async () => {
  const { links } = await browser.storage.local.get("links");

  if (!links || links.length === 0) {
    console.log("No Links found in storage, fetching from server...");
    try {
      const response = await makeCall("/random", {}, 10000);
      console.log({ response });
      if (response?.random_links) {
        await browser.storage.local.set({
          links: response.random_links,
          currentPage: 1,
        });
        console.log("Links fetched and stored successfully");
        return response.random_links as PublicRandomLink[];
      } else {
        console.error("No links found in response");
      }
    } catch (error) {
      console.error("Error fetching links:", error);
    }
  }
};

const fetchNextPage = async (currentPage: number) => {
  console.log("Fetching the next batch of links for page:", currentPage);
  const nextPage = currentPage + 1;
  // const params = {
  //   currentPage: nextPage.toString(),
  // };
  // const stringifiedParams = new URLSearchParams(params).toString();

  const response = await makeCall("/random", {}, 10000);
  const newLinks = response?.random_links as PublicRandomLink[];

  // If next page has no links then user has visited all links
  if (!newLinks || newLinks.length === 0) {
    throw new Error("No more links available");
  }

  await browser.storage.local.set({
    links: newLinks, // remove the prev 20 links ana update with next batch of 20 links
    currentPage: nextPage, // update the current page
  });
  return newLinks;
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

export const getGqlToken = async () => {
  return await browser.storage.local.get("gqlToken");
};

export const getActiveExtensionTabId = async () => {
  return await browser.storage.local.get("extensionTabId");
};

export async function getGoogleUser() {
  const token = await browser.storage.local.get("gqlToken");
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

export function hasDiscoverHistoryParam(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has("discover_history");
  } catch {
    return false;
  }
}

export const makeCommentsCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = await getGqlToken();
  if (!token?.gqlToken) {
    throw new Error("No GraphQL token found");
  }
  const response = await fetch(`http://localhost:3001/api/links${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.gqlToken}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to make comments call: ${errorData?.error || "Unknown error"}`
    );
  }

  return response.json();
};

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
