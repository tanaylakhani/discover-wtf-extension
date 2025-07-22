import React, { useState, useEffect } from "react";
import { TGoogleUser, getAuthToken, getGoogleUser } from "@/lib/utils";
import Floater from "./Floater";
import { AuthPopup } from "./Popup";

const App = ({
  token: initialToken,
  user: initialUser,
}: {
  token: string | null;
  user: TGoogleUser | null;
}) => {
  const [token, setToken] = useState<string | null>(initialToken);
  const [user, setUser] = useState<TGoogleUser | null>(initialUser);
  const [loading, setLoading] = useState(false);

  // Function to refresh auth state
  const refreshAuthState = async () => {
    try {
      setLoading(true);
      const authToken = await getAuthToken();
      const googleUser = await getGoogleUser();

      setToken(authToken?.authToken || null);
      setUser(googleUser || null);
    } catch (error) {
      console.log("Auth refresh failed:", error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Listen for storage changes to update auth state
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes.authToken) {
        console.log("Auth token changed, refreshing state");
        refreshAuthState();
      }
    };

    // Listen for browser storage changes
    if (typeof browser !== "undefined" && browser.storage) {
      browser.storage.local.onChanged.addListener(handleStorageChange);

      return () => {
        browser.storage.local.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const handleAuthSuccess = async (newToken: string) => {
    console.log("Auth success, refreshing state");
    await refreshAuthState();
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  console.log({ token, user, loading });

  if (loading) {
    return <div>Loading...</div>;
  }

  return token && user ? (
    <Floater setToken={handleLogout} />
  ) : (
    <AuthPopup onSuccess={handleAuthSuccess} />
  );
};

export default App;
