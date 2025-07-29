import { authStore } from "@/lib/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",
  async main(ctx) {
    try {
      console.log("🚨 CONTENT SCRIPT START:", {
        url: window.location.href,
        domain: window.location.hostname,
        readyState: document.readyState,
      });

      // BetterStacks specific logic
      if (window.location.hostname.includes("betterstacks.com")) {
        console.log("🚨 ON BETTERSTACKS DOMAIN!");

        // Check cookies for token only
        const cookies = document.cookie;
        console.log("🚨 ALL COOKIES:", cookies);

        const tokenMatch = cookies.match(/gqlToken=([^;]+)/);

        if (tokenMatch) {
          console.log("🚨 TOKEN FOUND:", tokenMatch[1]);

          // Send only the token to background script
          browser.runtime.sendMessage({
            type: "SET_GQL_TOKEN",
            value: tokenMatch[1],
          });
        } else {
          console.log("🚨 NO TOKEN FOUND");
        }
      }
    } catch (error) {
      console.error("🚨 CONTENT SCRIPT ERROR:", error);
    }
  },
});
