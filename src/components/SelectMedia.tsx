import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useApplicationContext } from "@/lib/context/ApplicationContext";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { switchMedia } from "@/utils/functions/getDevicesAndMedia";
import getUserDevices from "@/utils/functions/getDevicesAndMedia";
import { useMediaPredicate } from "react-media-hook";
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
import { Camera, Mic, LucideArrowDownCircle, InfoIcon } from "lucide-react";

export default function SelectMedia({
  setReadyToJoin,
  srcVideoStream,
  srcAudioStream,
  deviceTypeToId,
  setSrcAudioStream,
  setSrcVideoStream,
}: {
  setReadyToJoin: Dispatch<SetStateAction<boolean>>;
  srcVideoStream: MediaStream | undefined;
  srcAudioStream: MediaStream | undefined;
  deviceTypeToId: React.RefObject<Map<string, string>>;
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>;
}) {
  const params = useParams();
  const { isLoaded, user } = useUser();
  const roomId = params.roomId;
  const router = useRouter();
  const { ws, webWorkerRef } = useApplicationContext();

  //All different input options
  const [audioInputOptions, setAudioInputOptions] =
    useState<MediaDeviceInfo[]>();

  const [videoOptions, setVideoOptions] = useState<MediaDeviceInfo[]>();

  //This is the current selected srcAudioInput
  const [srcAudioInput, setSrcAudioInput] = useState<string | undefined>(
    undefined
  );
  const [srcVideoInput, setSrcVideoInput] = useState<string | undefined>(
    undefined
  );

  //CONTROL PANEL
  const isSm = useMediaPredicate("(min-width: 640px)"); // ≥640px
  const isMd = useMediaPredicate("(min-width: 768px)"); // ≥768px
  const isLg = useMediaPredicate("(min-width: 1024px)"); // ≥1024px
  const isXl = useMediaPredicate("(min-width: 1280px)");
  const is2xl = useMediaPredicate("(min-width: 1536px)"); // ≥1536px

  async function getConnectedDevices(type: string) {
    const connectedDevices = await navigator.mediaDevices.enumerateDevices();
    const connectedTypeDevices = connectedDevices.filter(
      (device) => device.kind === type
    );
    if (type === "audioinput") {
      setAudioInputOptions(connectedTypeDevices);
    } else if (type === "videoinput") {
      setVideoOptions(connectedTypeDevices);
    }
  }

  useEffect(() => {
    //Get and set the input audio and video
    getConnectedDevices("audioinput");
    getConnectedDevices("videoinput");
  }, [srcAudioStream, srcVideoStream]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/");
      return;
    }
    if (isLoaded && user) {
      window.addEventListener("beforeunload", () => {
        console.log("Exiting", user?.id);
        //Send the disconnecting msg
        ws.current?.send(
          JSON.stringify({
            event: "disconnecting",
            data: {
              roomId: roomId,
              userId: user.id,
            },
          })
        );
        //Close indexed db
        if (webWorkerRef.current) {
          webWorkerRef.current.postMessage({
            event: "closeDB",
          });
          console.log("Sent the close db msg to the database");
        }
      });

      const getUserDevicesandSetupHandler = async () => {
        //initialze a new worker
        const workerScript = new Worker(
          new URL("../../public/chunkStore.ts", import.meta.url)
        );
        webWorkerRef.current = workerScript;
        workerScript.onmessage = (e) => {
          const event = e.data.event;
          if (event === "IndexedDbOpenedSuccessfully") {
            console.log("Successfully opened the indexed DB");
            webWorkerRef.current = workerScript;
          }
        };

        const mediaStreams = await getUserDevices();

        if (mediaStreams) {
          const [audioStream, videoStream] = mediaStreams;

          console.log("initial audio", audioStream);
          console.log("initialvideo", videoStream);
          setSrcAudioStream(audioStream);
          setSrcVideoStream(videoStream);
          setSrcAudioInput(audioStream.getTracks().at(0)?.label);
          setSrcVideoInput(videoStream.getTracks().at(0)?.label);
          //Add the device id along with kind in the MAP.
          deviceTypeToId.current.clear();
          deviceTypeToId.current.set(audioStream.id, "peerAudio");
          deviceTypeToId.current.set(videoStream.id, "peerVideo");
        }
      };
      getUserDevicesandSetupHandler();
    }
  }, [isLoaded, user]);

  return (
    <>
      <div className="flex flex-col w-full h-full">
        <div className="basis-5/12 w-full h-full max-h-5/12 md:max-h-6/12 lg:max-h-6/12 flex items-center justify-center">
          <div className="w-11/12 max-w-80 h-11/12 sm:max-w-7/12 md:max-w-6/12 lg:max-w-5/12 p-2 bg-popover rounded-2xl">
            <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg flex items-center justify-center">
              <video
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                ref={(video) => {
                  if (video && srcVideoStream) {
                    video.srcObject = srcVideoStream;
                  }
                }}
              ></video>
            </div>
          </div>
        </div>
        <div className="basis-7/12 flex flex-col">
          <div className="basis-1/3 h-full flex items-center justify-center">
            <div className="w-11/12 sm:max-w-7/12 md:max-w-6/12 lg:max-w-5/12 h-9/12 min-h-9/12 rounded-xl flex items-center justify-items-center bg-popover px-2 gap-2">
              <div className="basis-1/2 h-10/12 AudioInput border-2 rounded-xl w-full md:w-10/12 lg:w-10/12 flex items-center justify-center p-1">
                <div className="basis-1/2 flex items-center justify-center w-full h-full">
                  <div className="flex items-center justify-center w-full h-full">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild></DropdownMenuTrigger>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-11/12 h-8/12 rounded-full"
                        >
                          <LucideArrowDownCircle
                            className="size-7"
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
                      <DropdownMenuContent className="w-40">
                        <DropdownMenuLabel>
                          Select Audio input device
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={srcAudioInput}
                          onValueChange={setSrcAudioInput}
                        >
                          {audioInputOptions?.map((audioOption, key) => (
                            <DropdownMenuRadioItem
                              key={key}
                              value={audioOption.label}
                              onClick={async () => {
                                await switchMedia({
                                  kind: "audioinput",
                                  deviceId: audioOption.deviceId,
                                  setSrcVideoStream: setSrcVideoStream,
                                  setSrcAudioStream: setSrcAudioStream,
                                  deviceTypeToID: deviceTypeToId,
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
                <div className="basis-1/2 px-0 m-0 flex-2/4 h-full items-center justify-center flex">
                  <Mic className="size-9" />
                </div>
              </div>
              <div className="basis-1/2 AudioInput border-2 rounded-xl w-full md:w-10/12 lg:w-10/12 h-10/12 flex items-center justify-center p-1">
                <div className="flex-2/4 flex items-center justify-center w-full h-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-11/12 h-8/12 rounded-full"
                      >
                        <LucideArrowDownCircle
                          className="size-7"
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
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuLabel>
                        Select Video input device
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={srcVideoInput}
                        onValueChange={setSrcVideoInput}
                      >
                        {videoOptions?.map((videoOption, key) => (
                          <DropdownMenuRadioItem
                            key={key}
                            value={videoOption.label}
                            className="my-2 hover:bg-cyan-950 hover:rounded-xs"
                            onClick={async () => {
                              await switchMedia({
                                kind: "videoinput",
                                deviceId: videoOption.deviceId,
                                setSrcVideoStream: setSrcVideoStream,
                                setSrcAudioStream: setSrcAudioStream,
                                deviceTypeToID: deviceTypeToId,
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
                <div className="px-0 m-0 flex-2/4 h-full items-center justify-center flex">
                  <Camera className="size-9" />
                </div>
              </div>
            </div>
          </div>

          <div className="basis-2/3 w-full">
            <div className="w-full h-full flex flex-col items-center justify-end">
              <div className="flex-7/12 sm:max-w-7/12 md:max-w-6/12 lg:max-w-5/12 p-2 w-11/12 md:justify-center flex items-end gap-2">
                <div className="flex items-end">
                  <InfoIcon />
                </div>
                <div>Select your input devices for the Podcast.</div>
              </div>
              <div className="flex-4/12 w-full sm:max-w-7/12 md:max-w-6/12 lg:max-w-5/12 flex items-center justify-center">
                <Button
                  className="w-11/12 h-10/12 p-0 m-0 border rounded-xl text-lg text-white"
                  onClick={() => {
                    if (
                      srcAudioStream &&
                      srcVideoStream &&
                      webWorkerRef.current
                    ) {
                      setReadyToJoin(true);
                    } else {
                      console.log(
                        "Cannot join the pod untill atleast 1 audio and video stream is selected. Or the worker script hasnt loaded yet"
                      );
                    }
                  }}
                >
                  JOIN POD
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
