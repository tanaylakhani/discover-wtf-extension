import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
type TAuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  state: TAuthState;
  isRestrictedPage: boolean;
  currentUrl: string;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  // login: () => Promise<void>;
  logout: () => Promise<void>;
  // refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isRestrictedPage, setIsRestrictedPage] = useState(false);
  const [authState, setAuthState] = useState<TAuthState>("unauthenticated"); // Start as unauthenticated instead of loading
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  const logout = async () => {
    try {
      setAuthState("loading");
      // Clear auth token from storage
      await browser.storage.local.remove("gqlToken");
      setAuthState("unauthenticated");
      document.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      // setAuthState("unauthenticated");
    }
  };

  const checkAuthAndUrl = async () => {
    try {
      // Check authentication
      const { gqlToken } = await browser.storage.local.get("gqlToken");
      // Get current tab URL
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab?.url || "";
      setCurrentUrl(url);

      // Check if page is restricted
      const restricted = isRestrictedUrl(url);
      setIsRestrictedPage(restricted);

      console.log({ url, gqlToken, restricted });
      // Set auth state
      if (!gqlToken) {
        setAuthState("unauthenticated");
      } else {
        setAuthState("authenticated");
      }
      setIsInitialized(true);
    } catch (error) {
      console.error("Error checking auth/URL:", error);
      setAuthState("unauthenticated");
      setIsInitialized(true);
    }
  };

  // Initialize auth check immediately and synchronously check storage first
  useEffect(() => {
    checkAuthAndUrl();
    browser?.storage.onChanged.addListener((changes, namespace) => {
      if (changes.gqlToken) {
        setAuthState(
          typeof changes.gqlToken.newValue !== undefined
            ? "authenticated"
            : "unauthenticated"
        );
      }
    });
  }, []);

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

    // Check for new tab pages across different browsers
    const newTabUrls = [
      "chrome://newtab/",
      "chrome://new-tab-page/",
      "about:newtab",
      "about:home",
      "about:blank",
      "edge://newtab/",
      "browser://newtab/",
      "moz-extension://", // Firefox new tab extensions
    ];

    return (
      restrictedPrefixes.some((prefix) => url.startsWith(prefix)) ||
      newTabUrls.some((newTabUrl) => url.startsWith(newTabUrl))
    );
  };

  // Initialize auth state on mount
  // useEffect(() => {
  //   initializeAuth();
  // }, []);

  // Listen for storage changes (auth u  pdates from other parts of extension)
  // useEffect(() => {
  //   const handleStorageChange = (changes: any, namespace: string) => {
  //     if (namespace === "local") {
  //       if (changes.authToken) {
  //         if (changes.authToken.newValue) {
  //           // Token added/updated
  //           refreshAuth();
  //         } else {
  //           // Token removed
  //           setAuthState((prev) => ({
  //             ...prev,
  //             user: null,
  //             token: null,
  //             isAuthenticated: false,
  //             isLoading: false,
  //           }));
  //         }
  //       }
  //     }
  //   };

  //   browser.storage.onChanged.addListener(handleStorageChange);
  //   return () => browser.storage.onChanged.removeListener(handleStorageChange);
  // }, []);

  // const initializeAuth = async () => {
  //   try {
  //     setAuthState((prev) => ({ ...prev, isLoading: true }));

  //     const token = await getGqlToken();
  //     if (token?.gqlToken) {
  //       // const user = await getGoogleUser();
  //       setAuthState({
  //         user: null,
  //         token: token.authToken,
  //         isLoading: false,
  //         isAuthenticated: true,
  //       });
  //     } else {
  //       setAuthState({
  //         user: null,
  //         token: null,
  //         isLoading: false,
  //         isAuthenticated: false,
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Failed to initialize auth:", error);
  //     setAuthState({
  //       user: null,
  //       token: null,
  //       isLoading: false,
  //       isAuthenticated: false,
  //     });
  //   }
  // };

  const value: AuthContextType = {
    state: authState,
    isRestrictedPage,
    currentUrl,
    isInitialized,
    logout,
  };

  console.log({ authState });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// const login = async () => {
//   try {
//     setAuthState((prev) => ({ ...prev, isLoading: true }));

//     // Trigger authentication via background script
//     const response = await browser.runtime.sendMessage({
//       type: "AUTHENTICATE_USER",
//     });

//     if (response?.token) {
//       await refreshAuth();
//     } else {
//       throw new Error("Authentication failed");
//     }
//   } catch (error) {
//     console.error("Login failed:", error);
//     setAuthState((prev) => ({ ...prev, isLoading: false }));
//     throw error;
//   }
// };

// const logout = async () => {
//   try {
//     setAuthState((prev) => ({ ...prev, isLoading: true }));

//     // Clear auth token from storage
//     await browser.storage.local.remove("authToken");

//     setAuthState({
//       user: null,
//       token: null,
//       isLoading: false,
//       isAuthenticated: false,
//     });
//   } catch (error) {
//     console.error("Logout failed:", error);
//     setAuthState((prev) => ({ ...prev, isLoading: false }));
//   }
// };

// const refreshAuth = async () => {
//   try {
//     const token = await getGqlToken();
//     if (token?.authToken) {
//       // const user = await getGoogleUser();
//       setAuthState({
//         user: null,
//         token: token.authToken,
//         isLoading: false,
//         isAuthenticated: true,
//       });
//     } else {
//       setAuthState({
//         user: null,
//         token: null,
//         isLoading: false,
//         isAuthenticated: false,
//       });
//     }
//   } catch (error) {
//     console.error("Failed to refresh auth:", error);
//     setAuthState({
//       user: null,
//       token: null,
//       isLoading: false,
//       isAuthenticated: false,
//     });
//   }
// };
