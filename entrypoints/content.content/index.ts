export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",
  async main(ctx) {
    try {
      // BetterStacks specific logic
      if (window.location.hostname.includes("betterstacks.com")) {
        // Check cookies for token only
        const cookies = document.cookie;

        const tokenMatch = cookies.match(/gqlToken=([^;]+)/);

        if (tokenMatch) {
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
