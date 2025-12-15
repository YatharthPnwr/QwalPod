"use client";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useEffect } from "react";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Dashboard() {
  const roomIdRef = useRef<HTMLInputElement>(null);
  const { setUserRole, ws } = useApplicationContext();
  const router = useRouter();

  useEffect(() => {
    ws.current = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_BACKEND_URL as string}/api/ws`
    );
    if (!ws.current) {
      console.log("No websocket found returning");
      return;
    }

    ws.current.onmessage = async (event) => {
      const res = JSON.parse(event.data.toString());
      if (res.type === "error") {
        console.log(res.data);
      } else if (res.type === "roomCreated") {
        const roomId = res.data;
        //set the room id in the localstorage.
        localStorage.setItem("roomId", roomId);
        setUserRole("caller");
        router.push(`/podcast/${roomId}`);
      }
    };
  });
  return (
    <div className="w-screen">
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
      <div className="w-screen flex items-center justify-center">
        <Button
          className="cursor-pointer"
          size={"lg"}
          onClick={() => {
            //create  a new room,
            if (!ws.current) {
              return;
            }
            const wsConnMan = new WebSocketConnHandle(ws.current, 1800);
            wsConnMan.waitForConnection(() => {
              if (!ws.current) {
                return;
              }
              ws.current.send(
                JSON.stringify({
                  event: "createNewRoom",
                })
              );
            });
          }}
        >
          Create new room
        </Button>

        <input
          ref={roomIdRef}
          type="text"
          className="bg-black h-10 w-32 mx-10 text-white px-2"
          placeholder="Enter room ID"
        />
        <Button
          className="cursor-pointer"
          onClick={() => {
            const roomId = roomIdRef.current?.value?.trim();
            localStorage.setItem("roomId", roomId as string);
            console.log("The roomId being sent is,", roomId);
            if (roomId) {
              router.push(`/podcast/${roomId}`);
            }
          }}
        >
          Join a Room
        </Button>
      </div>
    </div>
  );
}
