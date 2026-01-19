"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import AudioFile from "@/components/ui/audioFile";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import VideoFile from "@/components/ui/videoFile";
import { Video, Mic, Monitor, Loader2 } from "lucide-react";

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
  const { user, isLoaded } = useUser();
  const [loaded, setLoaded] = useState<boolean>(false);
  const [meetingURLS, setMeetingURLS] = useState<GetAllFilesRes | null>(null);

  useEffect(() => {
    if (user && isLoaded) {
      const getMeetingURLS = async () => {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_JS_BACKEND_URL}/api/getFinalFilesAccessURL`,
          {
            meetingId: roomId,
          },
        );
        setMeetingURLS(res.data.getAllFilesResponse);
        setLoaded(true);
      };
      getMeetingURLS();
    }
  }, [user, isLoaded, roomId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div
            onClick={() => router.push("/")}
            className="cursor-pointer text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            QwalPod
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors relative group"
            >
              Join a Pod
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </button>
            <button
              onClick={() => router.push("/dashboard/recordings")}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors relative group"
            >
              My Recordings
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton />
              <SignUpButton>
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Pod Assets</h1>
          <p className="text-muted-foreground mt-1">
            Download all recordings of the meeting {roomId}
          </p>
        </div>

        {/* Loading State */}
        {!loaded && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading meeting assets...</p>
          </div>
        )}

        {/* Empty State */}
        {loaded && (!meetingURLS || Object.keys(meetingURLS).length === 0) && (
          <Card className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No assets found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              There are no recordings available for this session yet. Come back
              later.
            </p>
          </Card>
        )}

        {/* User Cards */}
        <div className="space-y-3">
          {meetingURLS &&
            Object.keys(meetingURLS).map((usr, userIndex) => {
              const userData = meetingURLS[usr];
              const hasVideo = userData.video.length > 0;
              const hasAudio = userData.audio.length > 0;
              const hasScreen = userData.screen.length > 0;

              return (
                <Card
                  key={userIndex}
                  className="overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* User Header */}
                  <div className="flex items-center gap-4 p-3 border-b border-border/50 bg-muted/30">
                    <img
                      className="rounded-full w-12 h-12 object-cover shadow-sm"
                      src={user?.imageUrl}
                      alt={user?.firstName || "User"}
                    />
                    <div>
                      <h2 className="font-semibold text-lg">
                        {userData.userName || user?.firstName}'s Assets
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {userData.video.length +
                          userData.audio.length +
                          userData.screen.length}{" "}
                        files
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Video Section */}
                    {hasVideo && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-muted">
                            <Video className="h-4 w-4" />
                          </div>
                          <h3 className="font-semibold">Video Files</h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {userData.video.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userData.video.map((video, videoIndex) => (
                            <div
                              key={`video-${videoIndex}`}
                              className="rounded-lg overflow-hidden border border-border/50 hover:border-border transition-colors"
                            >
                              <VideoFile
                                link={video.link}
                                thumbnail={video.thumbnailLink as string}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Audio Section */}
                    {hasAudio && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-muted">
                            <Mic className="h-4 w-4" />
                          </div>
                          <h3 className="font-semibold">Audio Files</h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {userData.audio.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userData.audio.map((audio, audioIndex) => (
                            <div
                              key={`audio-${audioIndex}`}
                              className="rounded-lg overflow-hidden border border-border/50 hover:border-border transition-colors"
                            >
                              <AudioFile link={audio.link} />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Screen Section */}
                    {hasScreen && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-muted">
                            <Monitor className="h-4 w-4" />
                          </div>
                          <h3 className="font-semibold">Screen Recordings</h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {userData.screen.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userData.screen.map((screen, screenIndex) => (
                            <div
                              key={`screen-${screenIndex}`}
                              className="rounded-lg overflow-hidden border border-border/50 hover:border-border transition-colors"
                            >
                              <VideoFile
                                link={screen.link}
                                thumbnail={screen.thumbnailLink as string}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* No Content for User */}
                    {!hasVideo && !hasAudio && !hasScreen && (
                      <div className="text-center py-8 text-muted-foreground">
                        No files available for this user
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </main>
    </div>
  );
}
