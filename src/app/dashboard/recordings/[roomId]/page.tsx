"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AudioLines, FileVideo, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import SkeletonCard from "@/components/ui/SkeletonCard";
import axios from "axios";
import AudioFile from "@/components/ui/audioFile";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import VideoFile from "@/components/ui/videoFile";

interface SegmentInfo {
  segNumber: number;
  link: string;
  thumbnailLink?: string;
}
interface UserFileUrls {
  userProfile: string;
  userName: string;
  audio: SegmentInfo[];
  video: SegmentInfo[];
  screen: SegmentInfo[];
}
interface GetAllFilesRes {
  [userId: string]: UserFileUrls;
}

export default function PodAssets() {
  const params = useParams<{ roomId: string }>();
  const { roomId } = params;
  const router = useRouter();

  const [loaded, setLoaded] = useState<boolean>(false);
  console.log("The room id is", roomId);
  const [meetingURLS, setMeetingURLS] = useState<GetAllFilesRes | null>(null);
  useEffect(() => {
    const getMeetingURLS = async () => {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getFinalFilesAccessURL`,
        {
          meetingId: roomId,
        }
      );
      console.log(res.data.getAllFilesResponse);
      console.log(Object.keys(res.data.getAllFilesResponse));
      setMeetingURLS(res.data.getAllFilesResponse);
      setLoaded(true);
    };
    getMeetingURLS();
  }, []);
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
      <div className="w-full h-full flex flex-col" key={"userContainer"}>
        {meetingURLS &&
          Object.keys(meetingURLS).map((user, userIndex) => {
            // userId = user.userId;

            return (
              <div className="w-full h-full p-3" key={userIndex}>
                <Card className="w-full h-full p-3" key={userIndex}>
                  <div className="font-extrabold text-center">Video Files</div>
                  <div className="w-full grid grid-cols-3 gap-1.5">
                    {meetingURLS[user].video.map((video, videoIndex) => {
                      return (
                        <div key={`video-${videoIndex}`}>
                          <VideoFile
                            link={video.link}
                            thumbnail={video.thumbnailLink as string}
                          ></VideoFile>
                        </div>
                      );
                    })}
                  </div>
                  <div className="font-extrabold text-center">Audio Files</div>
                  <div className="w-full grid grid-cols-3 gap-1.5">
                    {meetingURLS[user].audio.map((audio, audioIndex) => {
                      return (
                        <div key={`audio-${audioIndex}`}>
                          <AudioFile link={audio.link}></AudioFile>
                        </div>
                      );
                    })}
                  </div>
                  {meetingURLS[user].screen.length > 0 && (
                    <div className="font-extrabold text-center">
                      Screen Files
                    </div>
                  )}
                  <div className="w-full grid grid-cols-3 gap-1.5">
                    {meetingURLS[user].screen.map((screen, screenIndex) => {
                      return (
                        <div key={`screen-${screenIndex}`}>
                          <VideoFile
                            link={screen.link}
                            thumbnail={screen.thumbnailLink as string}
                          ></VideoFile>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            );
          })}
      </div>
    </>
  );
}
