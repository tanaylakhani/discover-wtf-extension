import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { links } from "./data";
import queryClient from "./query-client";
import BaseURL from "./url";

let urls: string[] = [...links];
export const getFaviconFromDomain = (domain: string) => {
  return `https://s2.googleusercontent.com/s2/favicons?domain=${domain}`;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function animateGlobeIcon(tabId: number) {
  for (let i = 1; i <= 9; i++) {
    await new Promise((res) => setTimeout(res, 100));
    browser.action.setIcon({ path: `/animate/globe${i}.png`, tabId: tabId });
  }
}

export const getFirstName = (name: string) => {
  return name?.split(" ")[0];
};

export const openSidePanel = async () => {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    await browser.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true,
    });

    await browser.sidePanel.open({ tabId: tab.id });
  } catch (error) {}
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
    const newLinks = await fetchNextPage(currentPage);
    unvisited = newLinks!.filter((link) => !visited.has(link.id));
  }

  const randomLink = unvisited[0];
  // add in the visited Set
  visited.add(randomLink?.id);

  // mark the link as visited in storage and db
  browser.storage.local.set({
    visitedLinkIds: [...visited],
    activeLink: randomLink,
  });

  markAsVisited(randomLink);

  return randomLink?.target_url;
};

const markAsVisited = async (link: PublicRandomLink) => {
  try {
    await queryClient.fetchQuery({
      queryKey: ["track-visit", link.id],
      queryFn: () =>
        makeCall(`/track-visit?linkId=${link.id}`, { method: "POST" }, 10000),
    });
    await browser.runtime.sendMessage({
      type: "MARK_AS_VISITED",
      data: { linkId: link.id },
    });
  } catch (error) {
    console.error("MARK_AS_VISITED:", error);
  }
};

export const updateCount = async () => {
  browser.storage.local.get("urlVisitCount", (data) => {
    const currentCount = data.urlVisitCount || 0;
    const newCount = currentCount + 1;
    browser.storage.local.set({ urlVisitCount: newCount });
  });
};

// if (!response?.success && response?.error) {
//   throw new Error(`Failed to mark link as visited in DB: ${response.error}`);
// }
// return response?.success;

export const makeCall = async (
  endpoint: string,
  options: RequestInit = {},
  timeout = 10000,
  addContentTypeHeader = true
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const token = await getGqlToken();
  if (!token?.gqlToken) {
    throw new Error("No GraphQL token found");
  }
  try {
    const response = await fetch(`${BaseURL}/api/links${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        ...(addContentTypeHeader && {
          "Content-Type":
            typeof options.headers === "object" &&
            options.headers !== null &&
            "Content-Type" in options.headers
              ? (options.headers as Record<string, string>)["Content-Type"]
              : "application/json",
        }),
        Authorization: `Bearer ${token.gqlToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));
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

export type TUser = {
  description?: string | null;
  email: string;
  id: string;
  is_notification_enabled: boolean;
  job_title?: string | null;
  name?: string | null;
  phone?: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  unconfirmed_email?: string | null;
  unique_identity_id: string;
  username?: string | null;
  tags: string[];
  slug: string;
  default_repository: {
    name: string;
    id: string;
  };
  ai_tokens: Array<{
    ai_preferred_model: string;
    ai_provider: string;
    id: string;
    token: string;
  }>;

  is_lifetime_customer: boolean;
  is_paying_customer: boolean;
  plan_type: string;
  can_use_stacks_ai: boolean;
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
    try {
      const response = await makeCall("/random", {}, 10000);
      if (response?.data?.random_links) {
        await browser.storage.local.set({
          links: response.data.random_links,
          currentPage: 1,
        });
        return response.data.random_links as PublicRandomLink[];
      }
    } catch (error) {
      console.error("FETCH_INITIAL_LINKS:", error);
    }
  }
};

const fetchNextPage = async (currentPage: number) => {
  const nextPage = currentPage + 1;

  const response = await makeCall("/random", {}, 10000);
  const newLinks = response?.data?.random_links as PublicRandomLink[];

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
  const response = await fetch(`${BaseURL}/api/links${endpoint}`, {
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

export async function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date?.getTime()) / 1000); // in seconds

  if (diff < 60) {
    return `${diff}s ago`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  } else if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  } else if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diff / 31536000);
    return `${years}y ago`;
  }
}
