"use client";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
export default function DashBoard() {
  const router = useRouter();
  const roomIdRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { userRole, setUserRole, ws } = useApplicationContext();
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:3000/api/ws");
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
      } else if (res.type == "clientIdGenerated") {
        const clientId = res.data;
        //set the client id in the localstorage.
        localStorage.setItem("userId", clientId);
      }
    };
  });
  return (
    // <div className="flex w-full h-full bg-white items-center justify-center">
    //   <div>
    //     <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    //       Toggle Theme
    //     </Button>
    //   </div>
    //   <div>
    //     <Button
    //       onClick={() => {
    //         //create  a new room,
    //         if (!ws.current) {
    //           return;
    //         }
    //         const wsConnMan = new WebSocketConnHandle(ws.current, 1800);
    //         wsConnMan.waitForConnection(() => {
    //           if (!ws.current) {
    //             return;
    //           }
    //           ws.current.send(
    //             JSON.stringify({
    //               event: "createNewRoom",
    //             })
    //           );
    //         });
    //       }}
    //     >
    //       Create new room
    //     </Button>
    //     <input
    //       ref={roomIdRef}
    //       type="text"
    //       className="bg-black h-10 w-32 mx-10 text-white px-2"
    //       placeholder="Enter room ID"
    //     />
    //     <Button
    //       onClick={() => {
    //         const roomId = roomIdRef.current?.value?.trim();
    //         localStorage.setItem("roomId", roomId as string);
    //         console.log("The roomId being sent is,", roomId);
    //         if (roomId) {
    //           router.push(`/podcast/${roomId}`);
    //         }
    //       }}
    //     >
    //       Join a Room
    //     </Button>
    //   </div>
    // </div>

    <div className="w-screen flex items-center justify-center flex-col">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[250px] h-[200px] rounded-full bg-gradient-to-tr from-[#ff7b00] via-[#ffb800] to-[#ff7b00] opacity-50 blur-[120px]" />
      </div>

      <h1 className="w-1/2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
        Record <span className="text-primary">Studio Quality Podcasts. </span>{" "}
        <br></br>
        <span className="italic font-light flex justify-center">
          Anytime, Anywhere.
        </span>{" "}
      </h1>
      <p className="w-1/2 text-muted-foreground mb-8 text-center leading-relaxed md:text-xl pt-3">
        Capture the highest-quality local recordings from every guest,
        automatically synced to the cloud, ready for your next big episode.
      </p>

      <div>
        <div>
          <Button
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
        </div>
        <input
          ref={roomIdRef}
          type="text"
          className="bg-black h-10 w-32 mx-10 text-white px-2"
          placeholder="Enter room ID"
        />
        <Button
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
