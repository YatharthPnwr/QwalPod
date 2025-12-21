"use client";
import { useRef, useState } from "react";
import SelectMedia from "@/components/SelectMedia";
import PodSpacePage from "@/components/PodSpacePage";

export default function Space() {
  const [readyToJoin, setReadyToJoin] = useState<boolean>(false);

  const [srcAudioStream, setSrcAudioStream] = useState<MediaStream | undefined>(
    undefined
  );

  const [srcVideoStream, setSrcVideoStream] = useState<MediaStream | undefined>(
    undefined
  );
  const deviceTypeToId = useRef<Map<string, string>>(new Map());

  return (
    <>
      <div className="w-screen h-screen">
        {!readyToJoin && (
          <SelectMedia
            setReadyToJoin={setReadyToJoin}
            srcVideoStream={srcVideoStream}
            srcAudioStream={srcAudioStream}
            deviceTypeToId={deviceTypeToId}
            setSrcVideoStream={setSrcVideoStream}
            setSrcAudioStream={setSrcAudioStream}
          ></SelectMedia>
        )}
        {readyToJoin && srcAudioStream && srcVideoStream && (
          <PodSpacePage
            srcAudioStream={srcAudioStream}
            srcVideoStream={srcVideoStream}
            deviceTypeToID={deviceTypeToId}
          />
        )}
      </div>
    </>
  );
}
