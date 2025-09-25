"use client";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { WebSocketConnHandle } from "@/utils/functions/waitForConnection";
import { useEffect } from "react";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { useRouter } from "next/navigation";
export default function Dashboard() {
  const roomIdRef = useRef<HTMLInputElement>(null);
  const { userRole, setUserRole, ws } = useApplicationContext();
  const router = useRouter();

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
      }
      //@NOTE- REMOVE THIS COMPLETELY after completion of migration to clerk ids.
      else if (res.type == "clientIdGenerated") {
        const clientId = res.data;
        //set the client id in the localstorage.
      }
    };
  });
  return (
    <div>
      <Button
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
  );
}
