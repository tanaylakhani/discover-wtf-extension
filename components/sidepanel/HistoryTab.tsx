import { makeCall, PublicRandomLink } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";

type HistoryTabProps = {
  activeTab: string;
  activeLink: PublicRandomLink | null;
};

const HistoryTab = ({ activeTab, activeLink }: HistoryTabProps) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["get-history", activeLink?.id],
    queryFn: async () => {
      const response = await makeCall("/track-visit", {
        method: "POST",
        cache: "no-store",
      });
      console.log({ response });
      return (response?.data || []) as PublicRandomLink[];
    },
    staleTime: 0,
  });

  return (
    <div>
      {/* {isLoading && <p>Loading...</p>} */}
      {error && <p>{error?.message}</p>}
      {isLoading
        ? [...Array.from({ length: 10 })].map((_, index) => (
            <div
              key={index}
              className="px-2 bg-white shadow-sm pt-2 pb-4 border last:mb-24 border-neutral-200 mt-2 rounded-xl"
            >
              <Skeleton className="border h-[160px] w-full object-cover overflow-hidden bg-neutral-200 border-neutral-200 rounded-xl" />
              <div className="mt-2 space-y-2">
                <Skeleton className="bg-neutral-200 flex flex-col items-start justify-center px-4 h-8 w-full" />
                <Skeleton className="bg-neutral-200 h-6 w-full" />
              </div>
            </div>
          ))
        : data!.map((item) => (
            <div
              key={item.id}
              className="px-2 pt-2 bg-white shadow-sm z-10 pb-4 border last:mb-24 border-neutral-200 mt-2 rounded-xl"
            >
              {item?.screenshot_url && (
                <img
                  src={item?.screenshot_url}
                  className="border h-[160px] w-full object-cover overflow-hidden border-neutral-200 rounded-xl"
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
  );
};

export default HistoryTab;
