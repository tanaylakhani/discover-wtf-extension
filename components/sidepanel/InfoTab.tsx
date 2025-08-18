import { cleanUrl, PublicRandomLink } from "@/lib/utils";
import { Separator } from "../ui/separator";

type InfoTabProps = {
  activeLink: PublicRandomLink | null;
  activeTab: string;
};

const InfoTab = ({ activeLink, activeTab }: InfoTabProps) => {
  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      {activeLink?.screenshot_url && (
        <img
          className="rounded-xl border border-neutral-200"
          src={activeLink?.screenshot_url}
          alt=""
        />
      )}
      <div>
        <span className="mb-2 font-medium tracking-tight text-base text-neutral-600">
          Page Title:
        </span>
        <h2 className="text-lg mb-4 font-medium tracking-tight leading-tight">
          {activeLink?.title || "No title available"}
        </h2>
      </div>
      <Separator className="bg-neutral-300 " />
      <div className="flex flex-col gap-2 ">
        <span className=" font-medium tracking-tight text-base text-neutral-600">
          Target URL:
        </span>
        <span className="text-base font-medium tracking-tight">
          {activeLink?.target_url
            ? cleanUrl(activeLink.target_url)
            : "No URL available"}
        </span>
      </div>
      <div className="mt-4">
        <span className=" font-medium tracking-tight text-base text-neutral-600">
          Page Description:
        </span>
        <p className="mt-2 text-base font-medium tracking-tight ">
          {activeLink?.description || "No description available"}
        </p>
      </div>
      <Separator className="bg-neutral-300 " />
    </div>
  );
};

export default InfoTab;
