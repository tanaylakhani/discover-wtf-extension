import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],

  manifest: {
    action: {},

    page_action: {},

    permissions: [
      "bookmarks",
      "history",
      "cookies",
      "webRequest",
      "notifications",
      "scripting",
      "identity",
      "tabs",
      "storage",
      "contextMenus",
      "sidePanel",
    ],
    // oauth2: {
    //   client_id:
    //     "749325556750-7vhqt1hskpg7k2229vqiakc7nbgfbv8t.apps.googleusercontent.com",
    //   scopes: ["email", "profile"],
    // },
    icons: {
      "16": "/animate/globe1.png",
      "32": "/animate/globe1.png",
      "48": "/animate/globe1.png",
      "128": "/animate/globe1.png",
    },
  },
});
// GOCSPX - ysT8zs9Ao3S - fwTfbwicos3vsmb6;

// https://accounts.google.com/o/oauth2/auth?client_id=749325556750-7vhqt1hskpg7k2229vqiakc7nbgfbv8t.apps.googleusercontent.com&redirect_uri=https://chdjiopdopeilajhpfklgoekocfjgike.chromiumapp.org/&response_type=token&scope=email%20profile
