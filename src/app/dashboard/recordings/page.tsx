"use client";
import { Card } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import SqSkeletonCard from "@/components/ui/SqSkeletonCard";
import { useApplicationContext } from "@/lib/context/ApplicationContext";

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
  const [loaded, setLoaded] = useState<boolean>(false);
  const [unuploadedChunkStatus, setUnuploadedChunkStatus] =
    useState<boolean>(true);
  const { webWorkerRef } = useApplicationContext();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/");
      return;
    }
    if (isLoaded && user) {
      //Upload any unleft chunk
      if (!webWorkerRef.current) {
        //Create a new webworkerscipt
        const webWorker = new Worker(
          new URL("../../../../public/chunkStore.ts", import.meta.url)
        );
        webWorker.onmessage = (e) => {
          const event = e.data.event;
          if (event == "IndexedDbOpenedSuccessfully") {
            webWorker.postMessage({
              event: "checkandUploadLeftMeetingsChunks",
              userId: user.id,
            });
          }
          if (
            event == "allLeftChunksUploaded" ||
            event == "allChunksUploadedAlready"
          ) {
            console.log("Setting the status as false");
            setUnuploadedChunkStatus(false);
          }
        };
        webWorkerRef.current = webWorker;
      }
      const userThumbnails = async () => {
        try {
          const userThumbnails = await axios.post(
            `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/dbRecord/getUserThumbnails`,
            {
              userId: user.id,
            }
          );
          setUserThumbnails((prevThumbnails) => [
            ...(prevThumbnails || []),
            ...userThumbnails.data.userThumbnails,
          ]);
          setLoaded(true);
        } catch (e) {
          console.error("failed to fetch videos", e);
        }
      };
      userThumbnails();
    }
  }, [isLoaded, user]);
  if (unuploadedChunkStatus) {
    return (
      <>
        <div className="w-full h-screen flex items-center justify-center">
          <Empty className="w-full">
            <EmptyHeader>
              <Spinner className="size-15" />
              <EmptyTitle>
                Checking & Uploading any remaining bits...
              </EmptyTitle>
              <EmptyDescription>
                Please hang tight while we upload the remaining chunks of
                meetings.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </>
    );
  } else if (!loaded) {
    return (
      <>
        <div className="flex items-center justify-center flex-col mb-10">
          <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-transparent border-b border-border">
            <div className="cursor-pointer container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
              <div
                onClick={() => {
                  router.push("/");
                  return;
                }}
              >
                QwalPod
              </div>
              <nav className="flex items-center gap-4 lg:gap-8">
                <a className="cursor-pointer text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
                  <div
                    onClick={() => {
                      router.push("/dashboard");
                      return;
                    }}
                  >
                    Join a Pod
                  </div>
                  <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
                </a>

                <a className="text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
                  <div
                    onClick={() => {
                      router.push("/dashboard/recordings");
                      return;
                    }}
                  >
                    My Recordings
                  </div>
                  <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
                </a>
              </nav>
              <div className="cursor-pointer items-center gap-4">
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <SignInButton />
                    <SignUpButton>
                      <Button>Sign up</Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </div>
          </header>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full p-2 place-items-center gap-3.5">
          <SqSkeletonCard></SqSkeletonCard>
          <SqSkeletonCard></SqSkeletonCard>
          <SqSkeletonCard></SqSkeletonCard>
        </div>
      </>
    );
  } else {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center flex-col mb-10">
          <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-transparent border-b border-border">
            <div className="cursor-pointer container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
              <div
                onClick={() => {
                  router.push("/");
                  return;
                }}
              >
                QwalPod
              </div>
              <nav className="flex items-center gap-4 lg:gap-8">
                <a className="cursor-pointer text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
                  <div
                    onClick={() => {
                      router.push("/dashboard");
                      return;
                    }}
                  >
                    Join a Pod
                  </div>
                  <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
                </a>

                <a className="text-muted-foreground hover:text-foreground group relative text-xs font-medium transition-colors lg:text-sm hover:cursor-pointer">
                  <div
                    onClick={() => {
                      router.push("/dashboard/recordings");
                      return;
                    }}
                  >
                    My Recordings
                  </div>
                  <span className="bg-primary absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"></span>
                </a>
              </nav>
              <div className="cursor-pointer items-center gap-4">
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <SignInButton />
                    <SignUpButton>
                      <Button>Sign up</Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </div>
          </header>
        </div>
        <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full place-items-center gap-3.5">
          {userThumbnails &&
            userThumbnails.map((recording) => {
              return (
                <Card
                  key={recording.meetingId}
                  className="w-[95%] h-64 rounded-2xl py-0 px-0 overflow-hidden gap-2 "
                >
                  <div className="flex flex-col w-full h-full">
                    <div className="flex-2/3 hover:opacity-50">
                      {recording.thumbnailUrl && (
                        <img
                          src={recording.thumbnailUrl}
                          className="w-full h-52 object-cover"
                          alt={`Recording ${recording.meetingId}`}
                        />
                      )}
                      {!recording.thumbnailUrl && (
                        <UserRound className="w-full h-52" />
                      )}
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
    );
  }
}
