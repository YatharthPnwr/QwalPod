import {
  Camera,
  Mic,
  Unplug,
  Ellipsis,
  MicOff,
  CameraOff,
  ScreenShareIcon,
  ScreenShareOff,
  Ban,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import React, { SetStateAction, Dispatch, useEffect, useState } from "react";
import {
  startScreenShare,
  switchMedia,
} from "@/utils/functions/getDevicesAndMedia";
import { useMediaPredicate } from "react-media-hook";
import { useRouter } from "next/navigation";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { ScreenShareStatus } from "@/utils/exports";
interface peerConnectionInfo {
  to: string;
  peerConnection: RTCPeerConnection;
  remoteDeviceTypeToId: Map<string, string>;
  pendingIceCandidates: RTCIceCandidate[];
}

interface ControlsInput {
  audioInputOptions: MediaDeviceInfo[] | undefined;
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  videoOptions: MediaDeviceInfo[] | undefined;
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  srcVideoStream: MediaStream | undefined;
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  srcAudioStream: MediaStream | undefined;
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  latestSrcAudioStream: React.RefObject<MediaStream | undefined>;
  latestSrcVideoStream: React.RefObject<MediaStream | undefined>;
  peerConnectionInfo: React.RefObject<peerConnectionInfo[]>;
  deviceTypeToID: React.RefObject<Map<string, string>>;
  audioRecorderRef: React.RefObject<MediaRecorder | null>;
  videoRecorderRef: React.RefObject<MediaRecorder | null>;
  screenShareRecorderRef: React.RefObject<MediaRecorder | null>;
  roomId: string | undefined;
  userId: string | undefined;
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
  const router = useRouter();
  const { webWorkerRef } = useApplicationContext();
  //Currently selected audio, video options.
  const { ws } = useApplicationContext();
  const [srcAudioInput, setSrcAudioInput] = useState<string | undefined>(
    props.audioInputOptions?.at(0)?.label
  );
  const [srcVideoInput, setSrcVideoInput] = useState<string | undefined>(
    props.videoOptions?.at(0)?.label
  );

  //get the avaliable connected devices.
  async function getConnectedDevices(type: string) {
    const connectedDevices = await navigator.mediaDevices.enumerateDevices();
    const connectedTypeDevices = connectedDevices.filter(
      (device) => device.kind === type
    );
    if (type === "audioinput") {
      props.setAudioInputOptions(connectedTypeDevices);
      console.log(
        "Setting the srcAudio input as, ",
        connectedTypeDevices.at(0)?.label
      );
      if (srcAudioInput == undefined) {
        setSrcAudioInput(connectedTypeDevices.at(0)?.label);
      }
    } else if (type === "videoinput") {
      props.setVideoOptions(connectedTypeDevices);
      console.log(
        "Setting the srcVideo input as, ",
        connectedTypeDevices.at(0)?.label
      );
      if (srcVideoInput == undefined) {
        setSrcVideoInput(connectedTypeDevices.at(0)?.label);
      }
    }
  }

  useEffect(() => {
    const audioOptions = async () => {
      return await getConnectedDevices("audioinput");
    };
    const videoOptions = async () => {
      return await getConnectedDevices("videoinput");
    };
    audioOptions();
    videoOptions();
  }, [props.srcAudioStream, props.srcVideoStream]);

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <div className="h-4/5 rounded-xl grid grid-cols-4 gap-x-0 sm:w-2/3 md:w-3/5 lg:w-5/12 xl:8/12 items-center justify-items-center bg-popover">
          <div className="gap-0 AudioInput border-2 rounded-xl w-full md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center p-1">
            <div className="flex-2/5 flex items-center justify-center w-full h-full">
              <div className="flex items-center justify-center w-full h-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild></DropdownMenuTrigger>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-9/12 h-6/12">
                      <Ellipsis
                        className="size-6"
                        size={
                          is2xl
                            ? 40
                            : isXl
                            ? 35
                            : isLg
                            ? 35
                            : isMd
                            ? 35
                            : isSm
                            ? 25
                            : 20
                        }
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>
                      Select Audio input device
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={srcAudioInput}
                      onValueChange={setSrcAudioInput}
                    >
                      {props.audioInputOptions?.map((audioOption, key) => (
                        <DropdownMenuRadioItem
                          key={key}
                          value={audioOption.label}
                          onClick={async () => {
                            await switchMedia({
                              kind: "audioinput",
                              deviceId: audioOption.deviceId,
                              srcVideoStream: props.srcVideoStream,
                              setSrcVideoStream: props.setSrcVideoStream,
                              srcAudioStream: props.srcAudioStream,
                              setSrcAudioStream: props.setSrcAudioStream,
                              latestSrcAudioStream: props.latestSrcAudioStream,
                              latestSrcVideoStream: props.latestSrcVideoStream,
                              peerConnectionInfo: props.peerConnectionInfo,
                              audioRecorderRef: props.audioRecorderRef,
                              videoRecorderRef: props.videoRecorderRef,
                              webWorkerRef: webWorkerRef,
                              userId: props.userId,
                              deviceTypeToID: props.deviceTypeToID,
                            });
                          }}
                        >
                          {audioOption.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="px-0 m-0 flex-3/5 w-full h-full items-center justify-center flex">
              <Button
                variant="outline"
                className="h-11/12 w-10/12 rounded-full"
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
          </div>
          <div className="gap-0 Video border-2 rounded-xl w-full md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center p-1">
            <div className="flex-2/5 flex items-center justify-center w-full h-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-9/12 h-6/12">
                    <Ellipsis
                      className="size-6"
                      size={
                        is2xl
                          ? 40
                          : isXl
                          ? 35
                          : isLg
                          ? 35
                          : isMd
                          ? 35
                          : isSm
                          ? 25
                          : 20
                      }
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>
                    Select Video input device
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={srcVideoInput}
                    onValueChange={setSrcVideoInput}
                  >
                    {props.videoOptions?.map((videoOption, key) => (
                      <DropdownMenuRadioItem
                        key={key}
                        value={videoOption.label}
                        className="my-2 hover:bg-cyan-950 hover:rounded-xs"
                        onClick={async () => {
                          await switchMedia({
                            kind: "videoinput",
                            deviceId: videoOption.deviceId,
                            srcVideoStream: props.srcVideoStream,
                            setSrcVideoStream: props.setSrcVideoStream,
                            srcAudioStream: props.srcAudioStream,
                            setSrcAudioStream: props.setSrcAudioStream,
                            latestSrcAudioStream: props.latestSrcAudioStream,
                            latestSrcVideoStream: props.latestSrcVideoStream,
                            peerConnectionInfo: props.peerConnectionInfo,
                            audioRecorderRef: props.audioRecorderRef,
                            videoRecorderRef: props.videoRecorderRef,
                            webWorkerRef: webWorkerRef,
                            userId: props.userId,
                            deviceTypeToID: props.deviceTypeToID,
                          });
                        }}
                      >
                        {videoOption.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="px-0 m-0 flex-3/5 w-full h-full items-center justify-center flex">
              <Button
                variant="outline"
                className="h-11/12 w-10/12 rounded-full"
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
          </div>
          <div className="gap-0 screenShare border-2 rounded-xl w-full md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center">
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

          <div className="bg-red-600 gap-0 StopPod  rounded-xl w-full md:w-2/3 lg:w-10/12 h-10/12 flex items-center justify-center p-0">
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

                //close all the peerConnections.
                props.peerConnectionInfo.current?.forEach((peer) => {
                  //close the connection
                  peer.peerConnection.close();
                });
                //Send the msg to store the file in the cloud
                router.push(
                  `/podcast/uploading/${localStorage.getItem("roomId")}`
                );
                //Leave the room
                webWorkerRef.current?.postMessage({
                  event: "consolidateFile",
                  userId: props.userId,
                  roomId: localStorage.getItem("roomId"),
                });
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
