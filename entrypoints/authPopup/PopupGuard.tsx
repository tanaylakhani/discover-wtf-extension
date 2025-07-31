import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ExternalLink, Globe } from "lucide-react";
import React from "react";

interface PopupGuardProps {}

const PopupGuard: React.FC<PopupGuardProps> = () => {
  const {
    state: authState,
    currentUrl,
    isRestrictedPage,
    isInitialized,
    logout,
  } = useAuth();
  if (!isInitialized) {
    return;
  }
  const handleLogin = () => {
    browser.tabs.create({
      url: browser.runtime.getURL("/login.html"),
    });
    window.close();
  };

  const handleOpenBetterStacks = () => {
    browser.tabs.create({
      url: "https://app.betterstacks.com",
    });
    window.close();
  };

  // Unauthenticated state
  if (authState === "unauthenticated") {
    return (
      <div className="w-[364px] bg-background  inter-sans flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-center px-4 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <img
              src={browser.runtime.getURL("/animate/globe1.png")}
              alt="Stacks logo"
              className="w-8 h-8"
            />
            <span className="text-lg font-semibold text-foreground">
              Stacks
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-8 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border border-neutral-200 bg-muted/50 dark:bg-input/30">
              <ExternalLink
                className="w-6 h-6 text-primary"
                strokeWidth={1.5}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">
                Welcome Back!
              </h3>
              <p className="text-sm leading-relaxed max-w-[280px] text-muted-foreground">
                Sign in to access your saved links, collections, and start
                organizing your digital life.
              </p>
            </div>

            <div className="w-full space-y-3">
              <Button variant={"secondary"} onClick={handleLogin}>
                Sign In
              </Button>

              <p className="text-xs text-muted-foreground/70">
                Secure authentication via Stacks
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Restricted page state
  if (isRestrictedPage) {
    return (
      <div className="w-[364px] bg-white  font-sans flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-center px-4 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-1">
            <img
              src={browser.runtime.getURL("/animate/globe1.png")}
              alt="Stacks logo"
              className="w-8 h-8"
            />
            <span className="text-lg font-semibold text-foreground">
              Stacks
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-8 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border border-neutral-200 bg-muted/50 dark:bg-input/30">
              <Globe className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">
                Ready to Save?
              </h3>
              <p className="text-sm leading-relaxed max-w-[280px] text-muted-foreground">
                Navigate to any website to start saving links, or visit Stacks
                to manage your saved content.
              </p>
            </div>

            <div className="w-full space-y-3">
              <Button variant={"secondary"} onClick={handleOpenBetterStacks}>
                <ExternalLink className="w-4 h-4" />
                Open Stacks
              </Button>

              <p className="text-xs text-muted-foreground/70">
                Or visit any website to start saving links
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default PopupGuard;
