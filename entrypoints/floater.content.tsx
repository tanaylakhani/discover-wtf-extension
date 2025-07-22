import App from "@/components/App";
import { getAuthToken, getGoogleUser } from "@/lib/utils";
import ReactDOM from "react-dom/client";
import "./style.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // if (!window.location.search.includes("discover_extension_tab=1")) {
    //   return;
    // }

    console.log("Attempting to load user and token...");

    try {
      // Handle case where user/token might not be available
      let user = null;
      let token = null;

      try {
        user = await getGoogleUser();
        token = await getAuthToken();
      } catch (authError) {
        console.log("Auth not available, showing auth UI:", authError);
      }

      console.log("User:", user);
      console.log("Token:", token);

      const ui = await createShadowRootUi(ctx, {
        name: "discover-extension-floater",
        position: "inline",
        anchor: "body",
        append: "first",
        onMount: (container) => {
          console.log("inside floater cs - mounting UI");
          // Don't mount react app directly on <body>
          const wrapper = document.createElement("div");
          wrapper.id = "floater-wrapper";
          wrapper.style.zIndex = "999999";
          container.append(wrapper);

          const root = ReactDOM.createRoot(wrapper);
          root.render(<App token={token?.authToken} user={user} />);
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
