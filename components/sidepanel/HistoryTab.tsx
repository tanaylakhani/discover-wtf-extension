import { cleanUrl, getFaviconFromDomain, PublicRandomLink } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { LoadingSkeleton } from "./ThreadsTab";
import { Globe, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";

type HistoryTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
  height: number;
};

const HistoryTab = ({ activeTab, activeLink, height }: HistoryTabProps) => {
  const { data, isLoading, error, refetch } = useHistory(activeLink);
  const scrollAreaHeight = `calc(100vh - ${height}px)`;

  return (
    <div>
      {/* {isLoading && <p>Loading...</p>} */}
      {error && <p>{error?.message}</p>}
      {isLoading ? (
        <LoadingSkeleton height={scrollAreaHeight} />
      ) : (
        <ScrollArea
          style={{
            height: scrollAreaHeight,
          }}
          className="px-2 overflow-y-auto h-full"
        >
          <div className="w-full grid grid-cols-1 gap-y-4">
            {data!.map((item) => (
              <div
                key={item.id}
                className="px-4 w-full first:mt-3 py-2 z-10 last:mb-24 flex items-center justify-center"
              >
                {/* {item?.favicon_url ? ( */}
                <img
                  className="aspect-square size-10"
                  src={getFaviconFromDomain(item?.domain)}
                  alt=""
                />
                {/* ) : (
                  <Globe strokeWidth={1} className="size-10 " />
                )} */}

                <div className="flex-1 flex flex-col items-start justify-center px-4">
                  <h3 className="text-base line-clamp-1 font-medium tracking-tight leading-tight">
                    {item.title}
                  </h3>
                  <div className="text-sm w-[300px] truncate text-neutral-600">
                    {cleanUrl(item?.target_url)}
                  </div>
                </div>
                <Button size={"icon"} variant={"outline"}>
                  <MoreVertical />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default HistoryTab;
