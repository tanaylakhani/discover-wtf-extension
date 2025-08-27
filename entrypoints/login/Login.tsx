import { motion } from "framer-motion";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getFirstName, makeCall } from "@/lib/utils";
import { User } from "@/lib/graphql/user";
import { usePersonaGeneration } from "@/hooks/usePersonaGeneration";
import {
  PersonaIdentityData,
  usePersonaIdentity,
} from "@/hooks/usePersonaPhases";
import { CornerDownLeft } from "@untitled-ui/icons-react";

type Site = { url: string; title: string; visitCount?: number };

interface LoginState {
  isLoading: boolean;
  isWaitingForLogin: boolean;
  isSuccess: boolean;
  error: string | null;
}

const OnboardingContent = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Login state management
  const [loginState, setLoginState] = useState<LoginState>({
    isLoading: false,
    isWaitingForLogin: false,
    isSuccess: false,
    error: null,
  });
  const [history, setHistory] = useState<Site[]>([]);
  const [bookmarks, setBookmarks] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top visited sites
    browser.history.search({ text: "", maxResults: 10 }, (results) => {
      setHistory(
        results
          .filter(
            (r) => typeof r.url === "string" && typeof r.title === "string"
          )
          .map((r) => ({
            url: r.url as string,
            title: r.title as string,
            visitCount: r.visitCount,
          }))
      );
    });

    // Fetch bookmarks
    browser.bookmarks.getTree((nodes) => {
      const allBookmarks: Site[] = [];
      function traverse(nodes: Browser.bookmarks.BookmarkTreeNode[]) {
        for (const node of nodes) {
          if (node.url) allBookmarks.push({ url: node.url, title: node.title });
          if (node.children) traverse(node.children);
        }
      }
      traverse(nodes);
      setBookmarks(allBookmarks);
      setLoading(false);
    });
  }, []);
  const [activeStep, setActiveStep] = useState(0);

  const handleActiveStep = (step: number) => {
    setActiveStep(step);
  };
  const [identityData, setIdentityData] = useState<PersonaIdentityData | null>(
    null
  );

  // Use phased hooks for persona generation
  const identityMutation = usePersonaIdentity((response) =>
    setIdentityData(response as PersonaIdentityData)
  );
  const {
    mutate: generateIdentity,
    isPending: isIdentityLoading,
    error: identityError,
  } = identityMutation;
  const hasTriggeredGeneration = useRef(false);

  useEffect(() => {
    // Check if user is already logged in
    const getInitialData = async () => {
      const { gqlToken } = await browser.storage.local.get("gqlToken");
      setLoginState((prev) => ({
        ...prev,
        isSuccess: !!gqlToken,
      }));
    };

    getInitialData();
  }, []);

  useEffect(() => {
    const fetchAndStoreIdentity = async () => {
      const { personaIdentity } = await browser.storage.local.get(
        "personaIdentity"
      );
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (
        personaIdentity &&
        personaIdentity.expiry &&
        now < personaIdentity.expiry
      ) {
        // Use cached identity
        setIdentityData(personaIdentity.data as PersonaIdentityData);
      } else {
        if (!identityData && !hasTriggeredGeneration.current) {
          hasTriggeredGeneration.current = true;
          generateIdentity();
        }
      }
    };

    fetchAndStoreIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref to store interval ID for cleanup
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show welcome section after logo appears - slowed down
    const timer1 = setTimeout(() => {
      setShowWelcome(true);
    }, 2000);

    // Show features section - slowed down
    const timer2 = setTimeout(() => {
      setShowFeatures(true);
    }, 4000);

    // Show login section - slowed down
    const timer3 = setTimeout(() => {
      setShowLogin(true);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Add keyboard shortcut for cmd+enter after login section loads
  useEffect(() => {
    if (!showLogin) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLogin]);

  // Check if we're in a browser extension context
  useEffect(() => {
    if (!browser || !browser.storage) {
      console.error("❌ browser extension APIs not available");
      setLoginState((prev) => ({
        ...prev,
        error: "This page must be opened as a browser extension.",
      }));
    }
  }, []);

  // Cleanup effect for interval
  useEffect(() => {
    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
        console.log("🧹 Cleaned up token polling interval");
      }
    };
  }, []);

  const handleLogin = async () => {
    console.log("🚀 Starting login process");

    setLoginState({
      isLoading: true,
      isWaitingForLogin: false,
      isSuccess: false,
      error: null,
    });

    try {
      // Open BetterStacks login page
      const loginWindow = window.open(
        "https://betterstacks.com/login",
        "_blank"
      );
      console.log(
        "🔗 Opened login window:",
        loginWindow ? "Success" : "Failed"
      );

      if (!loginWindow) {
        throw new Error(
          "Failed to open login window. Please check your popup blocker settings."
        );
      }

      // Update state to waiting for login
      setLoginState((prev) => ({
        ...prev,
        isLoading: false,
        isWaitingForLogin: true,
      }));

      // Clear any existing interval
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }

      // Start polling for token
      let pollCount = 0;
      tokenCheckIntervalRef.current = setInterval(async () => {
        pollCount++;
        console.log(
          `🔍 Polling attempt ${pollCount} - checking browser.storage.local for token`
        );

        try {
          // Check if browser storage is still accessible (Firefox dead object fix)
          if (!browser || !browser.storage || !browser.storage.local) {
            console.warn("⚠️ Browser storage not accessible, stopping polling");
            if (tokenCheckIntervalRef.current) {
              clearInterval(tokenCheckIntervalRef.current);
              tokenCheckIntervalRef.current = null;
            }
            return;
          }

          const result = await browser.storage.local.get("gqlToken");
          console.log("🔍 Storage check result:", {
            hasGoogleToken: !!result.gqlToken,
            tokenLength: result.gqlToken?.length,
            pollCount,
          });

          if (result.gqlToken && result.gqlToken.length > 0) {
            console.log("✅ Token detected in storage!");

            // Stop polling
            if (tokenCheckIntervalRef.current) {
              clearInterval(tokenCheckIntervalRef.current);
              tokenCheckIntervalRef.current = null;
            }

            // Close login window if still open (Firefox dead object fix)
            try {
              if (
                loginWindow &&
                typeof loginWindow.closed === "boolean" &&
                !loginWindow.closed
              ) {
                loginWindow.close();
                console.log("🔒 Closed login window");
              }
            } catch (e) {
              console.warn(
                "⚠️ Could not close login window (likely dead object):",
                e
              );
            }

            // Open Import page in new tab
            try {
              console.log(
                "Hurray 🎉 Login successful! Redirecting to import page..."
              );
              //   browser.tabs.create({
              //     url: browser.runtime.getURL("/import.html"),
              //   });
            } catch (e) {
              console.warn("Could not open import page:", e);
            }

            // Update UI to success state
            setLoginState({
              isLoading: false,
              isWaitingForLogin: false,
              isSuccess: true,
              error: null,
            });

            console.log("✅ Login process completed successfully!");

            // Close this tab after 2 seconds
            setTimeout(() => {
              try {
                // window.close();
                alert("You can now close this tab.");
              } catch (e) {
                console.warn("⚠️ Could not close window:", e);
              }
            }, 2000);
          }
        } catch (error) {
          console.error("❌ Error checking for token:", error);

          // Stop polling on error
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }

          setLoginState({
            isLoading: false,
            isWaitingForLogin: false,
            isSuccess: false,
            error: "Error checking authentication status. Please try again.",
          });
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (tokenCheckIntervalRef.current) {
          clearInterval(tokenCheckIntervalRef.current);
          tokenCheckIntervalRef.current = null;
        }
        console.log("⏰ Polling timeout reached (5 minutes)");

        setLoginState((prev) => ({
          ...prev,
          isLoading: false,
          isWaitingForLogin: false,
          error: "Login timeout. Please try again.",
        }));
      }, 300000);
    } catch (error: any) {
      console.error("❌ Error during login:", error);
      setLoginState({
        isLoading: false,
        isWaitingForLogin: false,
        isSuccess: false,
        error:
          error.message || "Failed to start login process. Please try again.",
      });
    }
  };

  const getButtonContent = () => {
    if (loginState.isLoading) {
      return (
        <>
          <div className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Opening BetterStacks...
        </>
      );
    }

    if (loginState.isWaitingForLogin) {
      return (
        <>
          <div className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Waiting for login...
        </>
      );
    }

    if (loginState.isSuccess) {
      return "✅ Login Successful";
    }

    return (
      <>
        <span>Login to Stacks</span>
        <span className="text-sm opacity-80">⌘↩</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (loginState.isSuccess) {
      return "default";
    }
    return "default";
  };

  const getButtonClass = () => {
    if (loginState.isSuccess) {
      return "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-600 hover:to-emerald-600 cursor-default";
    }

    if (loginState.isLoading || loginState.isWaitingForLogin) {
      return "cursor-wait bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-cyan-600 dark:hover:from-teal-600 dark:hover:to-teal-700";
    }

    return "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 shadow-lg hover:shadow-xl";
  };
  const tabs = {
    welcome: (
      <WelcomeTab userData={identityData} onNext={() => handleActiveStep(1)} />
    ),
    history: <></>,
    "content-preferences": <></>,
  };

  return (
    <motion.div className="min-h-screen transition-all duration-500 bg-white flex items-center justify-center px-4 py-6">
      {loginState?.isSuccess ? (
        <div className="max-w-3xl flex flex-col w-full mx-auto">
          <div className="flex w-fit mx-auto gap-x-2 items-center justify-center mb-10">
            {[...Array(Object.keys(tabs).length)].map((_, i) => {
              return (
                <div
                  key={i}
                  onClick={() => handleActiveStep(i)}
                  className={`h-2 size-8 transition-all duration-300 rounded-full ${
                    i === activeStep
                      ? "bg-green-500 size-12 "
                      : "bg-neutral-200"
                  }`}
                ></div>
              );
            })}
          </div>
          <div className="border flex items-center justify-center bg-white h-[500px] border-neutral-200 rounded-3xl z-[1] p-6 shadow-xl">
            {Object.values(tabs)[activeStep]}
          </div>
        </div>
      ) : (
        <Button
          onClick={handleLogin}
          disabled={
            loginState.isLoading ||
            loginState.isWaitingForLogin ||
            loginState.isSuccess
          }
          size="lg"
          className={`px-8 py-6 text-white font-semibold rounded-full transition-all duration-300 flex items-center gap-2 ${getButtonClass()}`}
        >
          {getButtonContent()}
        </Button>
      )}
    </motion.div>
  );
};

export function getFrequentlyVisitedSites(
  maxResults: number = 10
): Promise<Array<{ url: string; title: string; visitCount: number }>> {
  return new Promise((resolve, reject) => {
    if (!("chrome" in window) || !browser.history) {
      reject(new Error("chrome.history API is not available"));
      return;
    }
    browser.history
      .search({ text: "", maxResults, startTime: 0 })
      .then((results) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
          return;
        }
        // Sort by visitCount descending
        const sorted = results
          .filter((r) => r.url && r.title)
          .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
          .map((r) => ({
            url: r.url!,
            title: r.title!,
            visitCount: r.visitCount || 0,
          }));
        resolve(sorted);
      });
  });
}

const WelcomeTab = ({
  userData,
  onNext,
}: {
  userData: PersonaIdentityData | null;
  onNext: () => void;
}) => {
  return (
    <div>
      <h2 className="text-4xl font-medium tracking-tight">
        Hello{" "}
        {getFirstName(userData?.identity_inference?.name as string) || "there"}{" "}
        👋 <br />
        Welcome to{" "}
        <span className="font-instrument font-thin italic">Discover.wtf</span>
      </h2>
      <p className="mt-2 text-base text-neutral-800 font-medium leading-tight">
        Let's get to know you so we can curate the <br /> right experience for
        you.
      </p>
      <Button
        disabled={!userData}
        onClick={onNext}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            alert("hi");
            onNext();
          }
        }}
        className="font-medium w-full h-12 bg-black text-white rounded-full mt-6"
      >
        Get Started
      </Button>
      <div className="mt-2 flex items-center justify-start font-medium text-neutral-600 text-xs px-4">
        Press Enter
        <div className="bg-neutral-200 ml-2 rounded-md p-1 ">
          <CornerDownLeft className=" size-3  " />
        </div>
      </div>
    </div>
  );
};

export default OnboardingContent;
