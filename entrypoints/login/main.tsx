import React from "react";
import ReactDOM from "react-dom/client";
import "@/assets/global.css";
import OnboardingContent from "./Login";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "@/lib/query-client";

createReactEntrypoint(() => (
  <QueryClientProvider client={queryClient}>
    <OnboardingContent />
  </QueryClientProvider>
));

function createReactEntrypoint<T extends Record<string, any> = {}>(
  Component: React.ComponentType<T>,
  props?: T,
  rootElementId: string = "root"
) {
  const rootElement = document.getElementById(rootElementId);

  if (!rootElement) {
    return;
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    React.createElement(
      React.StrictMode,
      {},
      React.createElement(
        Component as React.ComponentType<any>,
        props || ({} as T)
      )
    )
  );

  return root;
}
