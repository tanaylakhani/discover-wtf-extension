import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { LogOut, Settings, Settings2, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AvatarMenuProps = {
  children?: React.ReactNode;
};

const AvatarMenu = ({ children }: AvatarMenuProps) => {
  const menu = [
    {
      icon: User2,
      name: "Account",
      onClick: () => {},
    },
    {
      icon: Settings2,
      name: "Preferences",
      onClick: () => {},
    },
    {
      icon: Settings,

      name: "Settings",
      onClick: () => {},
    },
    {
      icon: LogOut,
      name: "Logout",
      onClick: async () => {
        await browser.storage.local.clear();
        window.close();
      },
    },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="overflow-hidden text-base border border-neutral-200 p-0 w-48 rounded-xl bg-white -translate-x-4 translate-y-4">
        {menu.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className={cn(
              "font-inter border-b border-neutral-200 last:border-none px-3 first:pt-2 last:pb-2 cursor-pointer hover:bg-neutral-100 py-1  flex items-center justify-start w-full  group",
              index === 1 ||
                (index < menu.length - 1 && "pointer-events-none opacity-80")
            )}
          >
            <item.icon className="size-4 group-last:group-hover:stroke-red-700" />
            <span className="tracking-tight text-neutral-800 group-last:group-hover:text-red-700 text-sm ml-2 ">
              {item.name}
            </span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default AvatarMenu;
