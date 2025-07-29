import React from "react";
import ReactDOM from "react-dom/client";
import "./sidepanel.css";

import App from "./App";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "@/lib/apollo-client";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
