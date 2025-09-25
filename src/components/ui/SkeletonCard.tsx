import { Skeleton } from "./skeleton";
import { Card } from "./card";
export default function SkeletonCard() {
  return (
    <div className="h-full grid w-full p-11 place-items-center gap-5">
      <Card className="w-full h-full">
        <div className="flex flex-col p-2 px-5 items-center gap-5 justify-center">
          {/*Thumbnail section*/}
          <Skeleton className="w-full h-60 border rounded-2xl overflow-hidden"></Skeleton>
          <div className="w-full flex flex-row align-center justify-start px-0 gap-7">
            {/*Image section*/}
            <div className="w-1/3">
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
            {/*Download buttons*/}
            <div className="cursor-pointer group w-full">
              <Skeleton className="w-full h-12 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"></Skeleton>
            </div>
            <div className="w-full group">
              <Skeleton className="w-full h-12 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"></Skeleton>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
