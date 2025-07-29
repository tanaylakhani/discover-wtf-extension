import apolloClient from "@/lib/apollo-client";
import { ApolloProvider } from "@apollo/client";
import React from "react";
import ReactDOM from "react-dom/client";
import PopupGuard from "./PopupGuard";
import "./popup.css";
import { AuthProvider } from "@/lib/auth-context";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <PopupGuard />
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
