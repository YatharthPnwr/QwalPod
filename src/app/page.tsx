"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
export default function DashBoard() {
  const router = useRouter();
  const roomIdRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex w-full h-full bg-white items-center justify-center">
      <div>
        <button
          className=" text-neutral-950 bg-green-400 h-10 w-28 border rounded-4xl"
          onClick={() => {
            router.push("/podcast/caller");
          }}
        >
          Create a Room
        </button>
        <input
          ref={roomIdRef}
          type="text"
          className="bg-black h-10 w-32 mx-10"
        ></input>
        <button
          className="text-neutral-950 bg-yellow-300 h-10 w-28 border rounded-4xl"
          onClick={() => {
            router.push(`/podcast/calee?roomId=${roomIdRef.current?.value}`);
          }}
        >
          Join a Room
        </button>
      </div>
    </div>
  );
}
