import React from "react";
import { createRoot } from "react-dom/client";
import { ToastNotification } from "../../components/toast/ToastNotification";

interface ToastOptions {
  type: "comments" | "highlights";
  isEnabled: boolean;
  duration?: number;
}

class ToastManager {
  private activeToasts: Map<string, HTMLElement> = new Map();

  showToast(options: ToastOptions) {
    const toastId = `toast-${options.type}-${Date.now()}`;

    // Clear all existing toasts to prevent conflicts when switching modes
    this.clearAllToasts();

    // Create toast container
    const container = document.createElement("div");
    container.id = toastId;
    container.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
    `;

    // Create React component
    const ToastComponent = () => {
      return React.createElement(ToastNotification, {
        type: options.type,
        isEnabled: options.isEnabled,
        duration: options.duration || 3000,
        onClose: () => {
          this.removeToast(options.type);
        },
      });
    };

    // Render toast
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(ToastComponent));

    // Store reference
    this.activeToasts.set(options.type, container);
  }

  removeToast(type: string) {
    const existingToast = this.activeToasts.get(type);
    if (existingToast) {
      existingToast.remove();
      this.activeToasts.delete(type);
    }
  }

  clearAllToasts() {
    this.activeToasts.forEach((container) => {
      container.remove();
    });
    this.activeToasts.clear();
  }
}

export const toastManager = new ToastManager();

// Helper functions with debouncing to prevent conflicts
let toastTimeout: NodeJS.Timeout | null = null;

export const showCommentsToast = (isEnabled: boolean) => {
  // Clear any pending toast
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Small delay to ensure the correct toast shows when switching modes
  toastTimeout = setTimeout(() => {
    toastManager.showToast({
      type: "comments",
      isEnabled,
      duration: 3000,
    });
  }, 50);
};

export const showHighlightsToast = (isEnabled: boolean) => {
  // Clear any pending toast
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Small delay to ensure the correct toast shows when switching modes
  toastTimeout = setTimeout(() => {
    toastManager.showToast({
      type: "highlights",
      isEnabled,
      duration: 3000,
    });
  }, 50);
};
