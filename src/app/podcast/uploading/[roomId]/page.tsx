"use client";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export default function Uploading() {
  const { webWorkerRef } = useApplicationContext();
  const { isLoaded, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      if (!webWorkerRef.current) {
        console.log("No web worker found!");
        return;
      }
      const roomId = localStorage.getItem("roomId");
      console.log("roomId is", roomId);

      webWorkerRef.current.onmessage = (e) => {
        const event = e.data.event;

        if (event == "AllChunksUploaded") {
          router.push(
            `/dashboard/recordings/${localStorage.getItem("roomId")}`
          );
        }
      };
    }
  }, [isLoaded, user]);
  return (
    <>
      <div className="w-full h-screen flex items-center justify-center">
        <Empty className="w-full">
          <EmptyHeader>
            <Spinner className="size-15" />
            <EmptyTitle>Uploading remaining parts of the podcast</EmptyTitle>
            <EmptyDescription>
              Please wait while we upload the remaining chunks. You will
              automatically be redirected once this is completed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}
