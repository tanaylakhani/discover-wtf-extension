// src/content-scripts/PopupUI.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import "../entrypoints/style.css";
import { Loader } from "lucide-react";
import { Button } from "./ui/button";
import { DialogHeader } from "./ui/dialog";

type AuthPopupProps = {
  onSuccess?: (token: string) => void;
};

const GoogleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export function AuthPopup({ onSuccess }: AuthPopupProps) {
  const [loading, setLoading] = useState(false);
  const handleAuth = async () => {
    try {
      setLoading(true);
      const response = await browser.runtime.sendMessage({
        type: "AUTHENTICATE_USER",
      });
      if (response && response.token) {
        setLoading(true);
        onSuccess!(response?.token);
      }
    } catch (e) {
      console.error("Authentication failed:", e);
      //  setAuthStatus("error");
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed max-w-sm  bg-white w-full top-4 right-6 overflow-hidden rounded-xl"
      style={{
        zIndex: 2370000000030,

        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="relative p-8 w-full bg-gradient-to-br from-indigo-600 via-transparent  to-transparent h-full ">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

        <div className="relative z-10 space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <img
              className="object-cover w-full h-full"
              src="/images/icon_128.png"
              alt=""
            />
          </div>

          <h3 className="text-3xl font-semibold tracking-tight">
            Welcome to Discover.wtf
          </h3>

          <p className="text-neutral-800  text-base leading-snug font-medium tracking-tight">
            Sign in to unlock personalized discoveries and save your favorite
            finds.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-gray-50 h-12 text-base font-medium border border-neutral-300 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader className="mr-3 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <GoogleIcon />
                <span className="ml-3">Sign in with Google</span>
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-neutral-800 text-sm">
              By signing in, you agree to our{" "}
              <button className="underline hover:text-white transition-colors">
                Terms of Service
              </button>{" "}
              and{" "}
              <button className="underline hover:text-white transition-colors">
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
