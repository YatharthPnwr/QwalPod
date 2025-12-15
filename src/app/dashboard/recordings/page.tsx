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
import SqSkeletonCard from "@/components/ui/SqSkeletonCard";

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

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/");
      return;
    }
    if (isLoaded && user) {
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

  if (!loaded) {
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
  }
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
