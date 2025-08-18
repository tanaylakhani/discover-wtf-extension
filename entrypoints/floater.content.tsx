import App from "@/components/App";
import { AuthProvider } from "@/lib/auth-context";
import { getGqlToken } from "@/lib/utils";
import ReactDOM from "react-dom/client";
import "./style.css";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "@/lib/query-client";

let uiInstance: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_idle", // Changed from document_start to document_idle

  async main(ctx) {
    console.log("Hello from floater content script!");

    // Wait for body to be available
    const waitForBody = () => {
      return new Promise<void>((resolve) => {
        if (document.body) {
          resolve();
          return;
        }

        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            resolve();
          }
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      });
    };

    // Define the mount logic
    const maybeMountUi = async () => {
      // Ensure body exists before proceeding
      await waitForBody();

      const { extensionTabId, activeLink, urlVisitCount } =
        await browser.storage.local.get([
          "extensionTabId",
          "activeLink",
          "urlVisitCount",
        ]);
      const res = await browser.runtime.sendMessage({
        type: "GET_CURRENT_TAB_ID",
      });
      const token = await getGqlToken();

      const shouldMount = token?.gqlToken && res?.tabId === extensionTabId;

      if (shouldMount && !uiInstance) {
        console.log("Mounting floater UI...");

        uiInstance = await createShadowRootUi(ctx, {
          name: "discover-extension-floater",
          position: "inline",
          anchor: () => document.body || document.documentElement,
          append: "before",
          onMount: (container) => {
            const wrapper = document.createElement("div");
            wrapper.id = "floater-wrapper";
            wrapper.style.zIndex = "2147483647";
            
            container.append(wrapper);

            const root = ReactDOM.createRoot(wrapper);
            root.render(
              // <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <App activeLink={activeLink} urlVisitCount={urlVisitCount} />
              </QueryClientProvider>
              // </AuthProvider>
            );
            return { root, wrapper };
          },
          onRemove: (elements) => {
            console.log("Unmounting floater UI...");
            elements?.root.unmount();
            elements?.wrapper.remove();
          },
        });

        uiInstance.mount();
      } else if (!shouldMount && uiInstance) {
        console.log("Conditions unmet — unmounting floater UI...");
        await uiInstance.remove();
        uiInstance = null;
      }
    };

    // Initial check
    await maybeMountUi();

    // React to gqlToken or extensionTabId changes
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;

      if ("gqlToken" in changes || "extensionTabId" in changes) {
        maybeMountUi();
      }
    });
  },
});
