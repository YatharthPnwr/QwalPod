"use client";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
export default function DashBoard() {
  const router = useRouter();
  const roomIdRef = useRef<HTMLInputElement>(null);
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
    <div className="flex w-full h-full bg-white items-center justify-center">
      <div>
        <button
          className=" text-neutral-950 bg-green-400 h-10 w-28 border rounded-4xl"
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
          Create a Room
        </button>
        <input
          ref={roomIdRef}
          type="text"
          className="bg-black h-10 w-32 mx-10 text-white px-2"
          placeholder="Enter room ID"
        />
        <button
          className="text-neutral-950 bg-yellow-300 h-10 w-28 border rounded-4xl"
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
        </button>
      </div>
    </div>
  );
}
