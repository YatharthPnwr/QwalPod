import {
  Camera,
  Mic,
  Unplug,
  MicOff,
  CameraOff,
  ScreenShareIcon,
  ScreenShareOff,
  Ban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import React, { SetStateAction, Dispatch, useState } from "react";
import { startScreenShare } from "@/utils/functions/getDevicesAndMedia";
import { useMediaPredicate } from "react-media-hook";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { ScreenShareStatus } from "@/utils/exports";
interface peerConnectionInfo {
  to: string;
  peerConnection: RTCPeerConnection;
  remoteDeviceTypeToId: Map<string, string>;
  pendingIceCandidates: RTCIceCandidate[];
}

interface ControlsInput {
  srcVideoStream: MediaStream | undefined;
  srcAudioStream: MediaStream | undefined;
  peerConnectionInfo: React.RefObject<peerConnectionInfo[]>;
  deviceTypeToID: React.RefObject<Map<string, string>>;
  audioRecorderRef: React.RefObject<MediaRecorder | null>;
  videoRecorderRef: React.RefObject<MediaRecorder | null>;
  screenShareRecorderRef: React.RefObject<MediaRecorder | null>;
  roomId: string;
  userId: string;
  srcScreenShareStream: MediaStream | undefined;
  setSrcScreenShareStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  screenShareStatus: ScreenShareStatus;
  setScreenShareStatus: Dispatch<SetStateAction<ScreenShareStatus>>;
  latestSrcScreenShareStream: React.RefObject<MediaStream | undefined>;
}
export default function Controls(props: ControlsInput) {
  const [micOn, setMicOn] = useState<boolean>(true);
  const [videoOn, setVideoOn] = useState<boolean>(true);
  // const isXs = useMediaPredicate("(max-width: 639px)"); // <640px
  const isSm = useMediaPredicate("(min-width: 640px)"); // ≥640px
  const isMd = useMediaPredicate("(min-width: 768px)"); // ≥768px
  const isLg = useMediaPredicate("(min-width: 1024px)"); // ≥1024px
  const isXl = useMediaPredicate("(min-width: 1280px)");
  const is2xl = useMediaPredicate("(min-width: 1536px)"); // ≥1536px
  // const router = useRouter();
  const { webWorkerRef } = useApplicationContext();
  //Currently selected audio, video options.
  const { ws } = useApplicationContext();

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <div className="min-h-4/5 w-11/12 sm:w-9/12 md:w-8/12 md:gap-0 lg:w-7/12 xl:w-6/12 rounded-xl grid grid-cols-4 gap-2 items-center justify-items-center bg-popover">
          <div className="gap-0 AudioInput border-2 rounded-xl min-w-11/12 md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center">
            <Button
              variant="outline"
              className="w-full h-full"
              onClick={() => {
                if (micOn) {
                  // Toggle all peer connections
                  props.peerConnectionInfo.current.forEach((peer) => {
                    const sender = peer.peerConnection
                      .getSenders()
                      .find((s) => s.track?.kind === "audio");
                    if (sender?.track) {
                      sender.track.enabled = false;
                    }
                  });
                } else {
                  // Toggle all peer connections
                  props.peerConnectionInfo.current.forEach((peer) => {
                    const sender = peer.peerConnection
                      .getSenders()
                      .find((s) => s.track?.kind === "audio");
                    if (sender?.track) {
                      sender.track.enabled = true;
                    }
                  });
                }
                setMicOn(!micOn);
              }}
            >
              {micOn ? (
                <Mic className="size-6" />
              ) : (
                <MicOff className="size-6" />
              )}
            </Button>
          </div>
          <div className="gap-0 VideoInput border-2 rounded-xl min-w-11/12 md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center">
            <Button
              variant="outline"
              className="w-full h-full"
              onClick={() => {
                if (videoOn) {
                  // Turn off video
                  props.peerConnectionInfo.current.forEach((peer) => {
                    const sender = peer.peerConnection
                      .getSenders()
                      .find((s) => s.track?.kind === "video");
                    if (sender?.track) {
                      sender.track.enabled = false;
                    }
                  });
                } else {
                  // Turn on video
                  props.peerConnectionInfo.current.forEach((peer) => {
                    const sender = peer.peerConnection
                      .getSenders()
                      .find((s) => s.track?.kind === "video");
                    if (sender?.track) {
                      sender.track.enabled = true;
                    }
                  });
                }
                setVideoOn(!videoOn);
              }}
            >
              {videoOn ? (
                <Camera className="size-6" />
              ) : (
                <CameraOff className="size-6" />
              )}
            </Button>
          </div>
          <div className="gap-0 screenShare border-2 rounded-xl min-w-11/12 md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center">
            <Button
              variant="outline"
              className="w-full h-full"
              onClick={async () => {
                console.log("Screen share status is", props.screenShareStatus);
                if (props.screenShareStatus === ScreenShareStatus.IDLE) {
                  console.log("Starting screen share");
                  await startScreenShare(
                    props.peerConnectionInfo,
                    props.deviceTypeToID,
                    props.screenShareRecorderRef,
                    webWorkerRef,
                    props.userId,
                    props.roomId,
                    props.setSrcScreenShareStream,
                    props.setScreenShareStatus,
                    ws,
                    props.latestSrcScreenShareStream
                  );
                } else if (
                  props.screenShareStatus === ScreenShareStatus.SHARING
                ) {
                  if (!props.srcScreenShareStream) {
                    console.log("No src Screen share stream found");
                    return;
                  }
                  console.log("Stopping screen share");
                  props.srcScreenShareStream
                    .getTracks()
                    .forEach((track) => track.stop());
                  props.setSrcScreenShareStream(undefined);
                  ws.current?.send(
                    JSON.stringify({
                      event: "screenShareEnded",
                      data: {
                        roomId: props.roomId,
                        userId: props.userId,
                      },
                    })
                  );
                  props.setScreenShareStatus(ScreenShareStatus.IDLE);
                } else if (
                  props.screenShareStatus === ScreenShareStatus.PEERSHARING
                ) {
                  console.log(
                    "Cannot share while a peer is sharing their screen"
                  );
                }
              }}
            >
              {/* When no one is sharing */}
              {props.screenShareStatus === ScreenShareStatus.IDLE && (
                <ScreenShareIcon
                  className="size-6"
                  size={
                    is2xl
                      ? 35
                      : isXl
                      ? 30
                      : isLg
                      ? 30
                      : isMd
                      ? 25
                      : isSm
                      ? 25
                      : 20
                  }
                />
              )}

              {/* when the user is sharing */}
              {props.screenShareStatus === ScreenShareStatus.SHARING && (
                <ScreenShareOff
                  className="size-6"
                  size={
                    is2xl
                      ? 35
                      : isXl
                      ? 30
                      : isLg
                      ? 30
                      : isMd
                      ? 25
                      : isSm
                      ? 25
                      : 20
                  }
                />
              )}

              {/* When a peer is sharing */}
              {props.screenShareStatus === ScreenShareStatus.PEERSHARING && (
                <Ban
                  className="size-6"
                  size={
                    is2xl
                      ? 35
                      : isXl
                      ? 30
                      : isLg
                      ? 30
                      : isMd
                      ? 25
                      : isSm
                      ? 25
                      : 20
                  }
                />
              )}
            </Button>
          </div>

          <div className="bg-red-600 gap-0 StopPod  rounded-xl min-w-11/12 md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center p-0">
            <Button
              variant="outline"
              className=" w-full h-full rounded-xl"
              onClick={async () => {
                //stop the recording
                props.videoRecorderRef.current?.stop();
                props.audioRecorderRef.current?.stop();
                props.screenShareRecorderRef.current?.stop();
                console.log("Exiting", props.userId);
                ws.current?.send(
                  JSON.stringify({
                    event: "disconnecting",
                    data: {
                      roomId: props.roomId,
                      userId: props.userId,
                    },
                  })
                );

                //release the mic and the camera
                props.srcAudioStream?.getTracks().forEach((track) => {
                  track.stop();
                });
                props.srcVideoStream?.getTracks().forEach((track) => {
                  track.stop();
                });
                props.srcScreenShareStream?.getTracks().forEach((track) => {
                  track.stop();
                });

                //close all the peerConnections.
                props.peerConnectionInfo.current?.forEach((peer) => {
                  //close the connection
                  peer.peerConnection.close();
                });
                //Send the msg to store the file in the cloud
                // router.push(
                //   `/podcast/uploading/${localStorage.getItem("roomId")}`
                // );
                //Leave the room
              }}
            >
              <Unplug
                className="size-6"
                size={
                  is2xl
                    ? 35
                    : isXl
                    ? 30
                    : isLg
                    ? 30
                    : isMd
                    ? 25
                    : isSm
                    ? 25
                    : 20
                }
              />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
