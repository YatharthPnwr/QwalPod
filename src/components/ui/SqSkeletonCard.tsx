import { Skeleton } from "./skeleton";
import { Card } from "./card";
import { UserRound } from "lucide-react";
export default function SqSkeletonCard() {
  return (
    <div className="w-full place-items-center">
      <Card className="w-[95%] h-64 rounded-2xl py-0 px-0 overflow-hidden gap-2">
        <div className="flex flex-col w-full h-full">
          <div className="flex-2/3 hover:opacity-50">
            <UserRound className="w-full h-52 object-cover" />
          </div>
          <div className="flex-2/3">
            <Skeleton className="w-full h-full"></Skeleton>
          </div>
        </div>
      </Card>
    </div>
  );
}
