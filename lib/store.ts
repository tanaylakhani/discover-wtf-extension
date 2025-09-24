import { createStore } from "zustand/vanilla";

type TAuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthStoreState {
  state: TAuthState;
  isRestrictedPage: boolean;
  currentUrl: string;
  isInitialized: boolean;

  logout: () => Promise<void>;
  checkAuthAndUrl: () => Promise<void>;
  setAuthState: (state: TAuthState) => void;
  setCurrentUrl: (url: string) => void;
  setRestrictedPage: (restricted: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const authStore = createStore<AuthStoreState>((set, get) => ({
  state: "loading",
  isRestrictedPage: false,
  currentUrl: "",
  isInitialized: false,
  setAuthState: (state) => set({ state }),
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setRestrictedPage: (restricted) => set({ isRestrictedPage: restricted }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  logout: async () => {
    try {
      set({ state: "loading" });
      await browser.storage.local.remove("gqlToken");
      set({ state: "unauthenticated" });
      document.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  },

  checkAuthAndUrl: async () => {
    try {
      const { gqlToken } = await browser.storage.local.get("gqlToken");

      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab?.url || "";

      set({ currentUrl: url });
      const restricted = isRestrictedUrl(url);
      set({ isRestrictedPage: restricted });
      if (!gqlToken) {
        set({ state: "unauthenticated" });
      } else {
        set({ state: "authenticated" });
      }

      set({ isInitialized: true });
    } catch (err) {
      set({ state: "unauthenticated", isInitialized: true });
    }
  },
}));

// Helper: checks if a URL is restricted
const isRestrictedUrl = (url: string): boolean => {
  if (!url) return true;

  const restrictedPrefixes = [
    "browser://",
    "browser-extension://",
    "arc://",
    "edge://",
    "safari://",
    "moz-extension://",
    "about:",
    "file://",
  ];

  const newTabUrls = [
    "chrome://newtab/",
    "chrome://new-tab-page/",
    "about:newtab",
    "about:home",
    "about:blank",
    "edge://newtab/",
    "browser://newtab/",
    "moz-extension://",
  ];

  return (
    restrictedPrefixes.some((prefix) => url.startsWith(prefix)) ||
    newTabUrls.some((newTabUrl) => url.startsWith(newTabUrl))
  );
};

const useAuth = () => authStore.getState();
export default useAuth;
