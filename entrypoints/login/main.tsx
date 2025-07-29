import React from "react";
import ReactDOM from "react-dom/client";
import "@/assets/global.css";
import OnboardingContent from "./Login";

createReactEntrypoint(OnboardingContent);

function createReactEntrypoint<T extends Record<string, any> = {}>(
  Component: React.ComponentType<T>,
  props?: T,
  rootElementId: string = "root"
) {
  const rootElement = document.getElementById(rootElementId);

  if (!rootElement) {
    console.error(`❌ Root element with id "${rootElementId}" not found`);
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
