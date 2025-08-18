import React, { useEffect, useState } from "react";
import { MessageCircle, Highlighter, X } from "lucide-react";

interface ToastProps {
  type: "comments" | "highlights";
  isEnabled: boolean;
  onClose: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastProps> = ({
  type,
  isEnabled,
  onClose,
  duration = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Start animation
    setIsVisible(true);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShouldRender(false);
        onClose();
      }, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    if (type === "comments") {
      return <MessageCircle size={18} strokeWidth={2} />;
    }
    return <Highlighter size={18} strokeWidth={2} />;
  };

  const getTitle = () => {
    if (type === "comments") {
      return isEnabled ? "Comments Mode On" : "Comments Mode Off";
    }
    return isEnabled ? "Highlights Mode On" : "Highlights Mode Off";
  };

  const getDescription = () => {
    if (type === "comments") {
      return isEnabled
        ? "Click anywhere to add comments"
        : "Comments mode disabled";
    }
    return isEnabled ? "Select text to highlight" : "Highlights mode disabled";
  };

  if (!shouldRender) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "32px",
        left: "50%",
        transform: `translateX(-50%) translateY(${isVisible ? "0" : "20px"})`,
        zIndex: 2147483647,
        opacity: isVisible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "rgba(10, 10, 10, 0.95)",
          borderRadius: "16px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: "320px",
          maxWidth: "400px",
          boxShadow: isEnabled
            ? "0 8px 32px rgba(16, 185, 129, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)"
            : "0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)",
          border: isEnabled
            ? "1px solid rgba(16, 185, 129, 0.3)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow effect */}
        {isEnabled && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 50%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Animated rays */}
        {isEnabled && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "200%",
              height: "200%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(from 0deg, transparent, rgba(16, 185, 129, 0.1), transparent, rgba(16, 185, 129, 0.1), transparent)",
              animation: "raycast 3s linear infinite",
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Icon container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: isEnabled
              ? "rgba(16, 185, 129, 0.15)"
              : "rgba(255, 255, 255, 0.08)",
            color: isEnabled ? "#10B981" : "#9CA3AF",
            position: "relative",
            zIndex: 1,
          }}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#E5E5E5",
              marginBottom: "4px",
            }}
          >
            {getTitle()}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              lineHeight: "1.4",
            }}
          >
            {getDescription()}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              setShouldRender(false);
              onClose();
            }, 300);
          }}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6B7280",
            transition: "all 0.2s ease",
            position: "relative",
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "#9CA3AF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#6B7280";
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes raycast {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
