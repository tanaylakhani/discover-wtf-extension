import { PublicRandomLink } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { LoadingSkeleton } from "./ThreadsTab";

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
        <LoadingSkeleton />
      ) : (
        <ScrollArea
          style={{
            height: scrollAreaHeight,
          }}
          className="px-2 overflow-y-auto h-full"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data!.map((item) => (
              <div
                key={item.id}
                className="px-2 pt-2 bg-white shadow-md  first:mt-3 z-10 pb-4 border last:mb-24 border-neutral-300  rounded-2xl"
              >
                {item?.screenshot_url && (
                  <img
                    src={item?.screenshot_url}
                    className="border h-[160px] w-full object-cover overflow-hidden border-neutral-300 rounded-2xl"
                    alt=""
                  />
                )}
                <div className="mt-2 mb-4 flex flex-col items-start justify-center px-4">
                  <h3 className="text-lg line-clamp-3 font-medium tracking-tight leading-tight">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default HistoryTab;
