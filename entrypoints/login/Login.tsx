import { motion } from "framer-motion";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

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
                window.close();
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

  return (
    <motion.div className="min-h-screen transition-all duration-500 bg-white flex items-center justify-center px-4 py-6">
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
    </motion.div>
  );
};

export default OnboardingContent;
