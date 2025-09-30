import { cleanUrl, PublicRandomLink } from "@/lib/utils";

export const getFaviconFromDomain = (domain: string) => {
  return `https://s2.googleusercontent.com/s2/favicons?domain=${domain}`;
};
type TLinkCardProps = {
  link: PublicRandomLink;
};
const LinkCard = ({ link }: TLinkCardProps) => {
  return (
    <div
      key={link.id}
      className="flex flex-col mr-3 hover:bg-neutral-50 shadow-md transition-all last:mr-0 bg-white max-w-sm flex-shrink-0 w-full py-4 px-6 h-[180px]  cursor-pointer rounded-2xl border border-neutral-200"
    >
      <img
        className="size-6 border border-neutral-200 rounded-full overflow-hidden "
        src={getFaviconFromDomain(link.domain)}
        alt=""
      />
      <div className="mt-2 w-full">
        <h3 className="font-medium leading-snug text-base tracking-tight line-clamp-2">
          {link.title || "Untitled"}
        </h3>
        <span className="w-[200px] truncate line-clamp-1 text-sm text-neutral-700  ">
          {cleanUrl(link.target_url)}
        </span>
        <span className="line-clamp-2 mt-2 text-neutral-700">
          {link?.description}
        </span>
      </div>
    </div>
  );
};

export default LinkCard;
