import App from "@/components/App";
import { AuthProvider } from "@/lib/auth-context";
import { getGqlToken } from "@/lib/utils";
import ReactDOM from "react-dom/client";
import "./style.css";

let uiInstance: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_start",

  async main(ctx) {
    console.log("Hello from floater content script!");

    // Define the mount logic
    const maybeMountUi = async () => {
      const extensionTabId = (await browser.storage.local.get("extensionTabId"))
        ?.extensionTabId;
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
          anchor: "body",
          append: "before",
          onMount: (container) => {
            const wrapper = document.createElement("div");
            wrapper.id = "floater-wrapper";
            wrapper.style.zIndex = "2147483647";
            container.append(wrapper);

            const root = ReactDOM.createRoot(wrapper);
            root.render(
              <AuthProvider>
                <App />
              </AuthProvider>
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
