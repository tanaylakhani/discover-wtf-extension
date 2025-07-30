import App from "@/components/App";
import { getGqlToken } from "@/lib/utils";
import ReactDOM from "react-dom/client";
import "./style.css";
import { AuthProvider } from "@/lib/auth-context";
import { ApolloClient, ApolloProvider } from "@apollo/client";
import apolloClient from "@/lib/apollo-client";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_start",
  async main(ctx) {
    console.log("Hello from floater content script!");
    const extensionTabId = await browser.storage.local.get("extensionTabId");
    const res = await browser.runtime.sendMessage({
      type: "GET_CURRENT_TAB_ID",
    });
    const token = await getGqlToken();
    console.log({ res, extensionTabId, token });
    if (!token?.gqlToken || res?.tabId !== extensionTabId?.extensionTabId)
      return;

    console.log("Attempting to load user and token...");
    try {
      const ui = await createShadowRootUi(ctx, {
        name: "discover-extension-floater",
        position: "inline",
        anchor: "body",
        append: "before",
        onMount: (container) => {
          console.log("inside floater cs - mounting UI");
          // Don't mount react app directly on <body>
          const wrapper = document.createElement("div");
          wrapper.id = "floater-wrapper";
          wrapper.style.zIndex = "2147483647";
          container.append(wrapper);

          const root = ReactDOM.createRoot(wrapper);
          root.render(
            <ApolloProvider client={apolloClient}>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ApolloProvider>
          );
          return { root, wrapper };
        },
        onRemove: (elements) => {
          console.log("Removing UI elements");
          elements?.root.unmount();
          elements?.wrapper.remove();
        },
      });

      ui.mount();
      console.log("UI mounted successfully");
    } catch (error) {
      console.error("Error in content script:", error);
    }
  },
});
