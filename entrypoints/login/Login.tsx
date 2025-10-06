import { AnimatePresence, motion } from "framer-motion";

import { CountryWithFlag } from "@/components/country";
import { Button } from "@/components/ui/button";
import {
  PersonaIdentityData,
  usePersonaIdentity,
} from "@/hooks/usePersonaPhases";
import { cn, getFirstName } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Tag, TagInput } from "emblor";
import { v4 as uuid } from "uuid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
type Site = { url: string; title: string; visitCount?: number };

interface LoginState {
  isLoading: boolean;
  isWaitingForLogin: boolean;
  isSuccess: boolean;
  error: string | null;
}

const getButtonContent = (loginState: LoginState) => {
  if (loginState.isLoading) {
    return (
      <>
        <div className="loading-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        Opening BetterStacks...
      </>
    );
  }

  if (loginState.isWaitingForLogin) {
    return (
      <>
        <LucideIcons.LoaderIcon className="size-4 animate-spin" />
        Waiting for login...
      </>
    );
  }

  if (loginState.isSuccess) {
    return "✅ Login Successful";
  }

  return (
    <>
      <span>Login to Stacks</span>
      <span className="text-sm opacity-80">⌘↩</span>
    </>
  );
};

const getButtonClass = (loginState: LoginState) => {
  // if (loginState.isSuccess) {
  //   return "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-600 hover:to-emerald-600 cursor-default";
  // }

  // if (loginState.isLoading || loginState.isWaitingForLogin) {
  //   return "cursor-wait bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-600 dark:to-teal-700 hover:from-teal-600 hover:to-cyan-600 dark:hover:from-teal-600 dark:hover:to-teal-700";
  // }

  return "bg-neutral-200 hover:bg-neutral-300 text-neutral-800 outline-2 outline-neutral-300 border-2 border-neutral-300 ";
};
const getIconComponent = (
  iconName: string
): React.ComponentType<{ className?: string }> | null => {
  if (!iconName) return null;

  // Convert kebab-case or lowercase to PascalCase
  const pascalCaseName = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return (LucideIcons as any)[pascalCaseName] || null;
};

const OnboardingContent = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [contentData, setContentData] = useState<PersonaContentData | null>(
    null
  );
  const [showPreferences, setShowPreferences] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Login state management
  const [activeStep, setActiveStep] = useState(0);
  const [identityData, setIdentityData] = useState<PersonaIdentityData | null>(
    null
  );
  const [loginState, setLoginState] = useState<LoginState>({
    isLoading: false,
    isWaitingForLogin: false,
    isSuccess: false,
    error: null,
  });
  const welcomeTabRef = useRef<HTMLDivElement>(null);
  const personaTabRef = useRef<HTMLDivElement>(null);
  const contentPreferencesTabRef = useRef<HTMLDivElement>(null);
  const videoTabRef = useRef<HTMLDivElement>(null);
  const handleActiveStep = async (step: number) => {
    setActiveStep(step);

    await browser.storage.local.set({ onboardingStep: step });
  };

  const identityMutation = usePersonaIdentity((response) =>
    setIdentityData(response as PersonaIdentityData)
  );
  const contentMutation = usePersonaContentPreferences(
    identityData?.session_id || "",
    (response) => setContentData(response as PersonaContentData)
  );
  const {
    mutate: generateIdentity,
    isPending: isIdentityLoading,
    error: identityError,
  } = identityMutation;
  const {
    mutate: generateContent,
    isPending: isContentLoading,
    error: contentError,
  } = contentMutation;
  const hasTriggeredGeneration = useRef(false);

  useEffect(() => {
    // Check if user is already logged in
    const getInitialData = async () => {
      const { gqlToken } = await browser.storage.local.get("gqlToken");
      setLoginState((prev) => ({
        ...prev,
        isSuccess: !!gqlToken,
      }));
    };

    getInitialData();
  }, []);

  useEffect(() => {
    const fetchAndStoreIdentity = async () => {
      const { personaIdentity, onboardingStep } =
        await browser.storage.local.get(["personaIdentity", "onboardingStep"]);

      if (onboardingStep <= 3) {
        setActiveStep(onboardingStep);
      }

      const now = Date.now();
      if (
        personaIdentity &&
        personaIdentity.expiry &&
        now < personaIdentity.expiry
      ) {
        // Use cached identity
        setIdentityData(personaIdentity.data as PersonaIdentityData);
      } else {
        if (!identityData && !hasTriggeredGeneration.current) {
          hasTriggeredGeneration.current = true;
          generateIdentity();
        }
      }
    };

    fetchAndStoreIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkForContentPreferences = async () => {
      const { personaContentPreferences } = await browser.storage.local.get(
        "personaContentPreferences"
      );
      if (personaContentPreferences) {
        setContentData(personaContentPreferences.data as PersonaContentData);
      } else if (identityData && !contentData) {
        generateContent();
      }
    };
    checkForContentPreferences();
  }, [identityData, contentData, generateContent]);

  // Ref to store interval ID for cleanup
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Show welcome section after logo appears - slowed down
    const timer1 = setTimeout(() => {
      setShowWelcome(true);
    }, 2000);

    // Show features section - slowed down
    const timer2 = setTimeout(() => {
      setShowFeatures(true);
    }, 4000);

    // Show login section - slowed down
    const timer3 = setTimeout(() => {
      setShowLogin(true);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Add keyboard shortcut for cmd+enter after login section loads
  useEffect(() => {
    if (!showLogin) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLogin]);

  // Check if we're in a browser extension context
  useEffect(() => {
    if (!browser || !browser.storage) {
      setLoginState((prev) => ({
        ...prev,
        error: "This page must be opened as a browser extension.",
      }));
    }
  }, []);

  // Cleanup effect for interval
  useEffect(() => {
    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
    };
  }, []);

  const handleLogin = async () => {
    setLoginState({
      isLoading: true,
      isWaitingForLogin: false,
      isSuccess: false,
      error: null,
    });

    try {
      // Open BetterStacks login page
      const loginWindow = window.open(
        "https://betterstacks.com/login",
        "_blank"
      );

      if (!loginWindow) {
        throw new Error(
          "Failed to open login window. Please check your popup blocker settings."
        );
      }

      // Update state to waiting for login
      setLoginState((prev) => ({
        ...prev,
        isLoading: false,
        isWaitingForLogin: true,
      }));

      // Clear any existing interval
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }

      // Start polling for token
      let pollCount = 0;
      tokenCheckIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          // Check if browser storage is still accessible (Firefox dead object fix)
          if (!browser || !browser.storage || !browser.storage.local) {
            if (tokenCheckIntervalRef.current) {
              clearInterval(tokenCheckIntervalRef.current);
              tokenCheckIntervalRef.current = null;
            }
            return;
          }

          const result = await browser.storage.local.get("gqlToken");

          if (result.gqlToken && result.gqlToken.length > 0) {
            console.log("✅ Token detected in storage!");

            // Stop polling
            if (tokenCheckIntervalRef.current) {
              clearInterval(tokenCheckIntervalRef.current);
              tokenCheckIntervalRef.current = null;
            }

            // Close login window if still open (Firefox dead object fix)
            try {
              if (
                loginWindow &&
                typeof loginWindow.closed === "boolean" &&
                !loginWindow.closed
              ) {
                loginWindow.close();
                console.log("🔒 Closed login window");
              }
            } catch (e) {
              console.warn(
                "⚠️ Could not close login window (likely dead object):",
                e
              );
            }

            // Update UI to success state
            setLoginState({
              isLoading: false,
              isWaitingForLogin: false,
              isSuccess: true,
              error: null,
            });

            console.log("✅ Login process completed successfully!");
          }
        } catch (error) {
          console.error("❌ Error checking for token:", error);

          // Stop polling on error
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }

          setLoginState({
            isLoading: false,
            isWaitingForLogin: false,
            isSuccess: false,
            error: "Error checking authentication status. Please try again.",
          });
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (tokenCheckIntervalRef.current) {
          clearInterval(tokenCheckIntervalRef.current);
          tokenCheckIntervalRef.current = null;
        }
        console.log("⏰ Polling timeout reached (5 minutes)");

        setLoginState((prev) => ({
          ...prev,
          isLoading: false,
          isWaitingForLogin: false,
          error: "Login timeout. Please try again.",
        }));
      }, 300000);
    } catch (error: any) {
      console.error("❌ Error during login:", error);
      setLoginState({
        isLoading: false,
        isWaitingForLogin: false,
        isSuccess: false,
        error:
          error.message || "Failed to start login process. Please try again.",
      });
    }
  };

  const tabs = {
    welcome: (
      <WelcomeTab
        ref={welcomeTabRef}
        userData={identityData}
        onNext={() => handleActiveStep(1)}
      />
    ),
    persona: (
      <PersonaTab
        ref={personaTabRef}
        persona={identityData}
        onNext={() => handleActiveStep(2)}
        onPrevious={() => handleActiveStep(0)}
      />
    ),
    "content-preferences": (
      <ContentPreferencesTab
        ref={contentPreferencesTabRef}
        contentData={contentData}
        onNext={() => handleActiveStep(3)}
        onPrevious={() => handleActiveStep(1)}
      />
    ),
    video: (
      <VideoTab
        ref={videoTabRef}
        contentData={contentData}
        onNext={async () => {
          await browser.storage.local.remove([
            "onboardingStep",
            "contentPreferencesTags",
          ]);
          window.close();
        }}
        onPrevious={() => handleActiveStep(2)}
      />
    ),
  };

  return (
    <motion.div className="min-h-screen transition-all duration-500 bg-white flex items-center justify-center px-4 py-6">
      {loginState?.isSuccess ? (
        <div className="max-w-3xl flex flex-col w-full mx-auto">
          <div className="flex fixed left-6 top-0 bottom-0 w-fit h-screen my-auto gap-2 items-center flex-col justify-center mb-10">
            <div className="flex flex-col gap-y-2 h-fit ">
              {[...Array(Object.keys(tabs).length)].map((_, i) => {
                return (
                  <div
                    key={i}
                    // onClick={() => handleActiveStep(i)}
                    className={`w-2  transition-all duration-300 rounded-full ${
                      i === activeStep
                        ? "bg-orange-500 h-12  "
                        : "bg-neutral-200 h-6"
                    }`}
                  ></div>
                );
              })}
            </div>
          </div>
          <div className="">
            {/* <div className="max-w-2xl w-full mx-auto"> */}
            {/* </div> */}
            {/* {Object.entries(tabs).map(([key, tab], index) => ( */}
            <div className="max-w-4xl h-full flex items-center justify-center w-full mx-auto">
              {Object.values(tabs)[activeStep]}
            </div>
            {/* ))} */}
          </div>
        </div>
      ) : (
        <div className="max-w-md w-full mx-auto flex flex-col items-center justify-center text-center ">
          <h2 className="text-4xl text-left w-full font-semibold tracking-tight mb-4">
            Discover smarter ways to <br />
            <span className="bg-gradient-to-t font-instrument text-5xl italic font-light bg-clip-text text-transparent from-orange-500 via-orange-600 to-orange-400">
              Relive the web.
            </span>
          </h2>
          <p className="text-base w-full text-left text-neutral-700 mb-4 ">
            Sign in and get started with Discover.wtf to enhance your browsing
            experience.
          </p>
          <Button
            onClick={handleLogin}
            disabled={
              loginState.isLoading ||
              loginState.isWaitingForLogin ||
              loginState.isSuccess
            }
            size="lg"
            className={`px-8 py-6 w-full text-white font-semibold rounded-full transition-all duration-300 flex items-center font-inter bg-neutral-100 gap-2 ${getButtonClass(
              loginState
            )}`}
          >
            {getButtonContent(loginState)}
          </Button>

          <span className="text-sm font-inter text-neutral-700 mt-3 w-full ">
            By logging in, you agree to our{" "}
            <u className="cursor-pointer">Terms</u> and{" "}
            <u className="cursor-pointer">Privacy Policy</u>.
          </span>
        </div>
      )}
    </motion.div>
  );
};

const WelcomeTab = forwardRef<
  HTMLDivElement,
  {
    userData: PersonaIdentityData | null;
    onNext: () => void;
  }
>(({ userData, onNext }, ref) => {
  return (
    <div ref={ref} className="w-full">
      <h2 className="text-4xl font-medium tracking-tight">
        Hello{" "}
        {getFirstName(userData?.identity_inference?.name as string) || "there"}{" "}
        👋 <br />
        Welcome to{" "}
        <span className="font-instrument font-thin italic">Discover.wtf</span>
      </h2>
      <p className="mt-2 text-base text-neutral-600 font-medium leading-tight">
        Let's get to know you so we can curate the <br /> right experience for
        you.
      </p>
      <Button
        disabled={!userData}
        onClick={onNext}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onNext();
          }
        }}
        className="font-medium max-w-xs w-full h-12 bg-black text-white rounded-full mt-6"
      >
        Get Started
      </Button>
      {/* <div className="mt-2 flex items-center justify-start font-medium text-neutral-600 text-xs px-4">
        Press Enter
        <div className="bg-neutral-200 ml-2 rounded-md p-1 ">
          <CornerDownLeft className=" size-3  " />
        </div>
      </div> */}
    </div>
  );
});
WelcomeTab.displayName = "WelcomeTab";

const getRandomColor = (index: number) => {
  const colorVariants = [
    {
      gradient: "from-blue-50 to-indigo-100",
      border: "border-blue-200",
      icon: "text-blue-600",
    },
    {
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      icon: "text-purple-600",
    },
    {
      gradient: "from-green-50 to-emerald-100",
      border: "border-green-200",
      icon: "text-green-600",
    },
    {
      gradient: "from-orange-50 to-amber-100",
      border: "border-orange-200",
      icon: "text-orange-600",
    },
    {
      gradient: "from-teal-50 to-cyan-100",
      border: "border-teal-200",
      icon: "text-teal-600",
    },
    {
      gradient: "from-rose-50 to-pink-100",
      border: "border-rose-200",
      icon: "text-rose-600",
    },
  ];
  const colorScheme = colorVariants[index % colorVariants.length];
  return colorScheme;
};

const ContentPreferencesTab = forwardRef<
  HTMLDivElement,
  {
    contentData: PersonaContentData | null;
    onNext: () => void;
    onPrevious: () => void;
  }
>(({ contentData, onNext, onPrevious }, ref) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize tags from contentData only once
  useEffect(() => {
    const loadTags = async () => {
      const { contentPreferencesTags } = await browser.storage.local.get(
        "contentPreferencesTags"
      );
      if (contentPreferencesTags && Array.isArray(contentPreferencesTags)) {
        setTags(contentPreferencesTags);
      } else {
        const initialTagsArray =
          (contentData?.content_preferences.topics.map((topic) => ({
            id: uuid(),
            text: topic,
          })) as Tag[]) || [];
        setTags(initialTagsArray);
        // Store initial tags in storage
        browser.storage.local.set({
          contentPreferencesTags: initialTagsArray,
        });
      }
    };
    loadTags();
  }, []);

  const handleSaveChanges = async () => {
    await browser.storage.local.set({ contentPreferencesTags: tags });
    setIsEditMode(false);
  };

  return (
    <div ref={ref} className="flex flex-col">
      <h2 className="text-4xl  font-medium tracking-tight">
        Your Content{" "}
        <span className="font-instrument font-thin italic">Preferences</span>
      </h2>
      <p className="mt-2 text-base text-neutral-600 font-medium leading-tight">
        Customize your content preferences <br /> to improve your experience.
      </p>
      <div className="flex justify-start flex-wrap items-center mt-6 gap-4">
        {contentData?.content_preferences.formats.map((format, index) => (
          <motion.div
            key={index}
            className="rounded-xl p-4 cursor-pointer flex items-center justify-start bg-[#ECECEC] border-2 border-white"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2 + index * 0.1,
              ease: "easeOut",
            }}
          >
            {(() => {
              const IconComponent = getIconComponent(
                format.icon
              ) as React.ComponentType<{
                className?: string;
              }>;
              return IconComponent ? (
                <IconComponent className="size-6 text-black mr-2 stroke-[1.8px]" />
              ) : (
                <LucideIcons.Eye className="size-6 text-black mr-2 stroke-[1.8px]" />
              );
            })()}
            <p className=" text-black text-base capitalize text-left font-medium tracking-tight">
              {format.format}
            </p>
            {/* <p className="mt-1 text-sm text-black capitalize text-center font-light">
              {format.inclination}
            </p> */}
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-6  w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
        }}
      >
        <hr className="mb-6" />
        <div className="mb-4 flex items-center justify-start">
          <h2 className="font-medium text-xl">Topics of Interest</h2>
          {!isEditMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size={"icon"}
                    variant={"outline"}
                    className="border-neutral-300 rounded-full ml-4"
                    onClick={() => setIsEditMode(true)}
                  >
                    <LucideIcons.Pencil />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add or remove topics</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {isEditMode ? (
          <div className="border p-4 overflow-hidden border-neutral-200 rounded-2xl w-full shadow-md bg-white">
            <TagInput
              tags={tags}
              setTags={(newTags) => {
                setTags(newTags);
              }}
              placeholder="Add a tag"
              styleClasses={{
                input: "w-full border-none shadow-none sm:max-w-[350px]",
                tag: {
                  body: "rounded-lg",
                },
              }}
              activeTagIndex={activeTagIndex}
              setActiveTagIndex={setActiveTagIndex}
              inlineTags={false}
              inputFieldPosition={"bottom"}
            />
          </div>
        ) : (
          <div className="flex justify-start items-center gap-4 flex-wrap">
            {tags?.map((topic, index) => {
              // Cycle through different pastel color combinations
              const colorScheme = getRandomColor(index);
              return (
                <motion.div
                  key={index}
                  className={`bg-gradient-to-br ${colorScheme.gradient} ${colorScheme.border} border rounded-xl p-2 flex items-center gap-3 text-center`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.1,
                    ease: "easeOut",
                  }}
                >
                  <LucideIcons.Hash
                    className={`size-4 ${colorScheme.icon} stroke-[1.5px]`}
                  />
                  <p className="text-base text-neutral-800 capitalize font-medium">
                    {topic?.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
        {isEditMode ? (
          <div className="flex mt-6 gap-2 items-center justify-start w-full">
            <Button
              disabled={tags.length === 0}
              onClick={handleSaveChanges}
              className="bg-black  text-white px-6 h-10 rounded-full"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setIsEditMode(false)}
              // variant={"outline"}
              className=" px-6 border border-neutral-300 h-10 bg-neutral-100 font-medium rounded-full"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex mt-6 gap-2 items-center justify-start w-full">
            <Button
              disabled={tags.length === 0}
              onClick={onNext}
              className="bg-black  text-white px-6 h-10 rounded-full"
            >
              Next
            </Button>
            <Button
              onClick={onPrevious}
              // variant={"outline"}
              className=" px-6 border border-neutral-300 h-10 bg-neutral-100 font-medium rounded-full"
            >
              Back
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
});
ContentPreferencesTab.displayName = "ContentPreferencesTab";

const VideoTab = forwardRef<
  HTMLDivElement,
  {
    contentData: PersonaContentData | null;
    onPrevious: () => void;
    onNext: () => void;
  }
>(({ onNext, onPrevious }, ref) => {
  return (
    <div ref={ref} className="flex flex-col">
      <h2 className="text-4xl  font-medium tracking-tight">
        What
        <span className="font-instrument font-thin italic mx-2">
          Discover.wtf
        </span>
        can do for you
      </h2>
      <p className="mt-2 text-base text-neutral-600 font-medium leading-tight">
        Disover is your personal agent in your browser. It knows you,
        understands you and helps you get more done with less manual effort
        while you browse.
      </p>

      <motion.div
        className="mt-6  w-full"
        layout
        layoutId="VIDEO_SHOWCASE"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      >
        <div className="w-full h-[400px] aspect-video rounded-3xl bg-neutral-100 border border-neutral-200  flex p-2 shadow-xl items-center justify-center">
          <div className="bg-white border shadow-xl border-neutral-200 size-full rounded-3xl"></div>
        </div>
        <div className="flex mt-6 gap-2 items-center justify-start w-full">
          <div className="relative group inline-block ">
            <div
              className="absolute inset-1 group-hover:scale-105 rounded-full blur-lg opacity-60 group-hover:opacity-80
            transition duration-300  bg-gradient-to-r
            from-pink-500 via-yellow-400 to-purple-500 animate-pulse z-0 "
            ></div>

            <Button
              onClick={onNext}
              className="bg-black relative z-10  text-white px-6 h-10 rounded-full"
            >
              Start Discovering
            </Button>
          </div>
          <Button
            onClick={onPrevious}
            variant={"outline"}
            className=" px-6 border-neutral-300 h-10 bg-neutral-100 font-medium rounded-full"
          >
            Back
          </Button>
        </div>
        {/* */}
      </motion.div>
    </div>
  );
});
VideoTab.displayName = "VideoTab";
const PersonaTab = forwardRef<
  HTMLDivElement,
  {
    persona: PersonaIdentityData | null;
    onPrevious: () => void;
    onNext: () => void;
  }
>(({ onNext, onPrevious, persona }, ref) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showProfession, setShowProfession] = useState(false);
  const [showTopSites, setShowTopSites] = useState(false);

  const [shiftLayout, setShiftLayout] = useState(false);
  const [isCardsHovered, setIsCardsHovered] = useState(false);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  // Handle scroll state for mask effect
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;

    setScrollState({
      canScrollUp: scrollTop > 0,
      canScrollDown: scrollTop + clientHeight < scrollHeight - 5, // 5px buffer
    });
  };

  // Generate dynamic mask based on scroll state
  const getMaskStyle = () => {
    const { canScrollUp, canScrollDown } = scrollState;

    if (!canScrollUp && !canScrollDown) {
      // No scrolling needed - no mask
      return {};
    } else if (canScrollUp && canScrollDown) {
      // Can scroll both ways - fade top and bottom
      return {
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
      };
    } else if (canScrollUp && !canScrollDown) {
      // Can only scroll up - fade only top
      return {
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 100%)",
      };
    } else if (!canScrollUp && canScrollDown) {
      // Can only scroll down - fade only bottom
      return {
        maskImage:
          "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
      };
    }

    return {};
  };

  // useEffect(() => {
  //   // After 2 seconds, hide the welcome text and show the persona name
  //   const welcomeTimer = setTimeout(() => {
  //     setShowWelcome(false);
  //   }, 3000);

  //   const professionTimer = setTimeout(() => {
  //     setShowProfession(true);
  //   }, 6000);

  //   const topSitesTimer = setTimeout(() => {
  //     setShowTopSites(true);
  //   }, 7000);

  //   const shiftLayoutTimer = setTimeout(() => {
  //     setShiftLayout(true);
  //   }, 10000);

  //   return () => {
  //     clearTimeout(welcomeTimer);
  //     clearTimeout(professionTimer);
  //     clearTimeout(topSitesTimer);
  //     clearTimeout(shiftLayoutTimer);
  //   };
  // }, []);

  // Check initial scroll state when content loads
  useEffect(() => {
    const checkInitialScrollState = () => {
      const scrollableElement = document.querySelector(
        ".scrollable-persona-content"
      ) as HTMLDivElement;
      if (scrollableElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        setScrollState({
          canScrollUp: scrollTop > 0,
          canScrollDown: scrollTop + clientHeight < scrollHeight - 5,
        });
      }
    };

    // Check after a delay to ensure content is rendered
    const checkTimer = setTimeout(checkInitialScrollState, 4000);
    return () => clearTimeout(checkTimer);
  }, [shiftLayout]);

  // Get top 5 domains from the persona data
  const topSites = persona?.processing_metadata?.top_domains?.slice(0, 5) || [];
  return (
    <div ref={ref} className="flex w-full flex-col">
      <h2 className="text-4xl  font-medium tracking-tight">
        Your
        <span className="font-instrument font-thin italic mx-2">Persona</span>
        Details
      </h2>
      <p className="mt-2 text-base text-neutral-600 font-medium leading-tight">
        Your persona details help us tailor the experience to your needs.
      </p>

      {/* {shiftLayout && ( */}
      <div>
        <motion.p
          layout
          layoutId="IDENTITY_NAME"
          className="text-[40px] font-satoshi leading-tight text-[#424242]"
        >
          {persona?.identity_inference.name}
        </motion.p>
        <motion.p
          layout
          layoutId="IDNETITY_PROFESSION"
          className="mt-2 opacity-75 font-satoshi font-light text-lg leading-snug max-w-xl text-[#424242] flex items-center"
        >
          {persona?.identity_inference.profession}
          {persona?.identity_inference.country && (
            <span>
              {", "}
              <CountryWithFlag country={persona?.identity_inference.country} />
            </span>
          )}
        </motion.p>

        {topSites.length > 0 && (
          <motion.div className="mt-8" layout layoutId="IDENTITY_SITES">
            <div
              className="relative w-fit"
              onMouseEnter={() => setIsCardsHovered(true)}
              onMouseLeave={() => setIsCardsHovered(false)}
            >
              {topSites.map((site, index) => (
                <SiteCard
                  key={site.domain}
                  domain={site.domain}
                  count={site.count}
                  delay={0.5 + index * 0.1}
                  shiftLayout={true}
                  stackIndex={index}
                  isHovered={isCardsHovered}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-2 max-w-5xl w-full gap-8">
          {/* <div> */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.5, duration: 0.8 }}
            className="mt-24 max-w-lg max-h-[450px] overflow-y-auto scrollable-persona-content"
            style={getMaskStyle()}
            onScroll={handleScroll}
          >
            <div className="font-satoshi font-light text-base leading-relaxed text-[#424242] opacity-90">
              {persona?.persona?.comprehensive_persona}
            </div>
          </motion.div>
          {/* </div> */}

          <div>
            {/* Asymmetric Grid of Characteristic Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-md ml-auto">
              {/* Large card - Learning Style */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200"
              >
                <div className="flex items-center gap-3 mb-1">
                  {(() => {
                    const IconComponent = getIconComponent(
                      persona?.persona?.behavioral_insights.learning_style
                        .icon as string
                    ) as React.ComponentType<{ className?: string }>;

                    return IconComponent ? (
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    ) : (
                      <LucideIcons.BookOpen className="w-6 h-6 text-blue-600" />
                    );
                  })()}
                  <h3 className="font-satoshi font-medium text-xs opacity-75 text-[#424242]">
                    Learning Style
                  </h3>
                </div>
                <p className="font-satoshi text-lg text-[#424242] capitalize font-semibold">
                  {persona?.persona?.behavioral_insights.learning_style.value.replace(
                    "-",
                    " "
                  )}{" "}
                  learner
                </p>
              </motion.div>

              {/* Decision Making */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="aspect-square bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  {(() => {
                    const IconComponent = getIconComponent(
                      persona?.persona?.behavioral_insights.decision_making
                        .icon as string
                    ) as React.ComponentType<{ className?: string }>;
                    return IconComponent ? (
                      <IconComponent className="w-8 h-8 text-purple-600 mb-2" />
                    ) : (
                      <LucideIcons.Target className="w-8 h-8 text-purple-600 mb-2" />
                    );
                  })()}
                  <h4 className="font-satoshi font-medium text-xs text-[#424242] mb-0.5 opacity-75">
                    Decision Making
                  </h4>
                  <p className="font-satoshi text-2xl text-[#424242] capitalize font-semibold">
                    {persona?.persona?.behavioral_insights.decision_making.value.replace(
                      "-",
                      " "
                    )}
                  </p>
                </div>
              </motion.div>

              {/* Active Hours */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="aspect-square bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200 flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  {(() => {
                    const IconComponent = getIconComponent(
                      persona?.persona?.digital_footprint_summary
                        .browsing_patterns.most_active_hours.icon as string
                    ) as React.ComponentType<{ className?: string }>;
                    return IconComponent ? (
                      <IconComponent className="w-8 h-8 text-green-600 mb-2" />
                    ) : (
                      <LucideIcons.Clock className="w-8 h-8 text-green-600 mb-2" />
                    );
                  })()}
                  <h4 className="font-satoshi font-medium text-xs text-[#424242] mb-0.5 opacity-75">
                    Active Hours
                  </h4>
                  <p className="font-satoshi text-2xl text-[#424242] capitalize font-semibold">
                    {
                      persona?.persona?.digital_footprint_summary
                        .browsing_patterns.most_active_hours.value
                    }
                  </p>
                </div>
              </motion.div>

              {/* Work-Life Balance */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                className="aspect-square bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-4 border border-orange-200 flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  {(() => {
                    const IconComponent = getIconComponent(
                      persona?.persona?.behavioral_insights.work_life_balance
                        .icon as string
                    ) as React.ComponentType<{ className?: string }>;
                    return IconComponent ? (
                      <IconComponent className="w-8 h-8 text-orange-600 mb-2" />
                    ) : (
                      <LucideIcons.Scale className="w-8 h-8 text-orange-600 mb-2" />
                    );
                  })()}
                  <h4 className="font-satoshi font-medium text-xs text-[#424242] mb-0.5 opacity-75">
                    Work-Life
                  </h4>
                  <p className="font-satoshi text-2xl text-[#424242] capitalize font-semibold">
                    {persona?.persona?.behavioral_insights.work_life_balance.value.replace(
                      "-",
                      " "
                    )}
                  </p>
                </div>
              </motion.div>

              {/* Information Consumption */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6, duration: 0.5 }}
                className="aspect-square bg-gradient-to-br from-teal-50 to-cyan-100 rounded-xl p-4 border border-teal-200 flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  {(() => {
                    const IconComponent = getIconComponent(
                      persona?.persona?.behavioral_insights
                        .information_consumption.icon as string
                    ) as React.ComponentType<{ className?: string }>;
                    return IconComponent ? (
                      <IconComponent className="w-8 h-8 text-teal-600 mb-2" />
                    ) : (
                      <LucideIcons.Eye className="w-8 h-8 text-teal-600 mb-2" />
                    );
                  })()}
                  <h4 className="font-satoshi font-medium text-xs text-[#424242] mb-0.5 opacity-75">
                    Reading Style
                  </h4>
                  <p className="font-satoshi text-2xl text-[#424242] capitalize font-semibold">
                    {persona?.persona?.behavioral_insights.information_consumption.value.replace(
                      "-",
                      " "
                    )}
                  </p>
                </div>
              </motion.div>

              {/* Session Length & Technical Proficiency - Combined wide card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.8, duration: 0.5 }}
                className="col-span-2 bg-gradient-to-br from-rose-50 to-pink-100 rounded-xl p-4 border border-rose-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getIconComponent(
                        persona?.persona?.digital_footprint_summary
                          .browsing_patterns.session_length.icon as string
                      ) as React.ComponentType<{ className?: string }>;
                      return IconComponent ? (
                        <IconComponent className="w-5 h-5 text-rose-600" />
                      ) : (
                        <LucideIcons.Timer className="w-5 h-5 text-rose-600" />
                      );
                    })()}
                    <div>
                      <h4 className="font-satoshi font-medium text-xs text-[#424242] opacity-75">
                        Session Length
                      </h4>
                      <p className="font-satoshi text-xs text-[#424242] capitalize font-semibold">
                        {
                          persona?.persona?.digital_footprint_summary
                            .browsing_patterns.session_length.value
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LucideIcons.Zap className="w-5 h-5 text-rose-600" />
                    <div>
                      <h4 className="font-satoshi font-medium text-xs text-[#424242] opacity-75">
                        Tech Level
                      </h4>
                      <p className="font-satoshi text-xs text-[#424242] capitalize font-semibold">
                        {
                          persona?.persona?.digital_footprint_summary
                            .technical_proficiency
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      {/* )} */}
      <div className="flex mt-6 gap-2 items-center justify-start w-full">
        <Button
          onClick={onNext}
          className="bg-black relative z-10  text-white px-6 h-10 rounded-full"
        >
          Next
        </Button>
        <Button
          onClick={onPrevious}
          variant={"outline"}
          className=" px-6 border-neutral-300 h-10 bg-neutral-100 font-medium rounded-full"
        >
          Back
        </Button>
      </div>
      {/* */}
    </div>
  );
});

const SiteCard = ({
  domain,
  count,
  delay,
  shiftLayout = false,
  stackIndex,
  isHovered,
}: {
  domain: string;
  count: number;
  delay: number;
  shiftLayout?: boolean;
  stackIndex?: number;
  isHovered?: boolean;
}) => {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  // Calculate stacked position when not hovered
  const getStackedTransform = () => {
    if (!shiftLayout || stackIndex === undefined) return {};

    // Create slight uneven stacking with small random offsets
    const baseOffset = stackIndex * 56; // Base stacking offset
    const randomX = (stackIndex % 2 === 0 ? 1 : -1) * (stackIndex * 0.5); // Slight horizontal variance
    const randomRotation = (stackIndex % 2 === 0 ? 1 : -1) * (stackIndex * 0.8); // Slight rotation variance

    return {
      x: isHovered ? stackIndex * 148 : baseOffset, // Spread horizontally on hover
      // y: isHovered ? 0 : baseOffset,
      // rotate: isHovered ? 0 : randomRotation,
      zIndex: stackIndex,
    };
  };

  // Handle click to navigate to domain
  const handleClick = () => {
    // Ensure the URL has a protocol
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    window.open(url, "_blank");
  };

  return (
    <motion.div
      layout
      layoutId={`site-${domain}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        ...getStackedTransform(),
      }}
      transition={{
        delay,
        duration: 0.5,
        ease: "easeOut",
        // Smoother transitions for hover states
        x: { duration: 0.3, ease: "easeInOut" },
        y: { duration: 0.3, ease: "easeInOut" },
        rotate: { duration: 0.3, ease: "easeInOut" },
      }}
      className={cn(
        "bg-[#F1F3F4] backdrop-blur-sm rounded-xl p-4 min-w-[140px] flex items-center text-center hover:shadow-lg transition-shadow ",
        !shiftLayout ? "flex-col" : "items-center p-2",
        shiftLayout && "absolute cursor-pointer border-2 border-white gap-2"
      )}
      style={{
        zIndex: shiftLayout
          ? isHovered
            ? 10 + (stackIndex || 0)
            : 5 - (stackIndex || 0)
          : "auto",
      }}
      onClick={handleClick}
    >
      <img
        src={faviconUrl}
        alt={`${domain} favicon`}
        className={cn(
          "rounded",
          !shiftLayout ? "mb-2 w-8 h-8" : "mb-0 w-6 h-6"
        )}
        onError={(e) => {
          // Fallback to a generic globe icon if favicon fails to load
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3ccircle cx='12' cy='12' r='10'/%3e%3cline x1='2' y1='12' x2='22' y2='12'/%3e%3cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3e%3c/svg%3e";
        }}
      />
      <p className="font-medium text-sm text-gray-800 mb-0.5 capitalize">
        {domain.replace("www.", "").split(".")[0]}
      </p>

      <AnimatePresence mode="wait">
        {!shiftLayout && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-gray-500 font-light"
          >
            {domain}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingContent;
