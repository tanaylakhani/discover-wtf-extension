import { AuthProvider } from "@/lib/auth-context";
import React from "react";
import ReactDOM from "react-dom/client";
import PopupGuard from "./PopupGuard";
import "./popup.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <PopupGuard />
    </AuthProvider>
  </React.StrictMode>
);
