"use client";
import { Card } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
interface videoFileUrl {
  meetingId: string;
  thumbnailUrl: string;
}

export default function Recordings() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [userThumbnails, setUserThumbnails] = useState<videoFileUrl[] | null>(
    null
  );

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }
    const userThumbnails = async () => {
      try {
        const userThumbnails = await axios.post("/api/getThumbnailUrls", {
          userId: user.id,
        });
        setUserThumbnails((prevThumbnails) => [
          ...(prevThumbnails || []),
          ...userThumbnails.data.userThumbnails,
        ]);
      } catch (e) {
        console.error("failed to fetch videos", e);
      }
    };
    userThumbnails();
  }, [isLoaded, user]);
  return (
    <div className="w-screen">
      <div className="p-7">
        <div className="grid grid-cols-3 w-full p-7 place-items-center gap-2 ">
          {userThumbnails &&
            userThumbnails.map((recording) => {
              return (
                <Card
                  key={recording.meetingId}
                  className="w-[95%] h-64 rounded-2xl py-0 px-0 overflow-hidden gap-2 "
                  onClick={() => {
                    console.log("Download requested");
                  }}
                >
                  <div className="flex flex-col w-full h-full">
                    <div className="flex-2/3 hover:opacity-50">
                      <img
                        src={recording.thumbnailUrl}
                        className="w-full h-52 object-cover"
                        alt={`Recording ${recording.meetingId}`}
                      />
                    </div>
                    <div className="flex-2/3">
                      <Button
                        size={"lg"}
                        className="w-full h-full"
                        onClick={() => {
                          router.push(
                            `/dashboard/recordings/${recording.meetingId}`
                          );
                        }}
                      >
                        Download Pod Assets
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
