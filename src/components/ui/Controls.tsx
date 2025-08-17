import {
  Camera,
  Mic,
  Unplug,
  Ellipsis,
  MicOff,
  CameraOff,
  ScreenShareIcon,
} from "lucide-react";
import { SetStateAction, Dispatch, useEffect, useState } from "react";

import {
  startScreenShare,
  switchMedia,
} from "@/utils/functions/getDevicesAndMedia";
import { useMediaPredicate } from "react-media-hook";
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
  peerConnectionInfo: React.RefObject<peerConnectionInfo[]>;
  deviceTypeToID: React.RefObject<Map<string, string>>;
}
export default function Controls(props: ControlsInput) {
  const [audioSelectionModal, setAudioSelectionModal] =
    useState<boolean>(false);
  const [videoSelectionModal, setVideoSelectionModal] =
    useState<boolean>(false);
  const [micOn, setMicOn] = useState<boolean>(true);
  const [videoOn, setVideoOn] = useState<boolean>(true);
  const isXs = useMediaPredicate("(max-width: 639px)"); // <640px
  const isSm = useMediaPredicate("(min-width: 640px)"); // ≥640px
  const isMd = useMediaPredicate("(min-width: 768px)"); // ≥768px
  const isLg = useMediaPredicate("(min-width: 1024px)"); // ≥1024px
  const isXl = useMediaPredicate("(min-width: 1280px)");
  const is2xl = useMediaPredicate("(min-width: 1536px)"); // ≥1536px

  //get the avaliable connected devices.
  async function getConnectedDevices(type: string) {
    const connectedDevices = await navigator.mediaDevices.enumerateDevices();
    const connectedTypeDevices = connectedDevices.filter(
      (device) => device.kind === type
    );
    if (type === "audioinput") {
      props.setAudioInputOptions(connectedTypeDevices);
    } else if (type === "videoinput") {
      props.setVideoOptions(connectedTypeDevices);
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
    const closeModal = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAudioSelectionModal(false);
        setVideoSelectionModal(false);
      }
    };

    const clickOutside = () => {
      setAudioSelectionModal(false);
      setVideoSelectionModal(false);
    };

    window.addEventListener("keydown", closeModal);
    return () => {
      window.removeEventListener("keydown", closeModal);
      window.removeEventListener("mousedown", clickOutside);
    };
  }, []);

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-800 rounded-2xl w-11/12 h-2/5 sm:w-2/3 md:w-3/5 lg:w-5/12 xl:8/12 items-center justify-items-center">
          <div className="AudioInput rounded-2xl w-full md:w-2/3 lg:w-10/12 h-3/4 bg-amber-500 flex items-center justify-center">
            <div className="grid sm:grid-cols-2 sm: gap-x-5 items-center">
              <Ellipsis
                className="hidden sm:block"
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
                onClick={() => {
                  setAudioSelectionModal(!audioSelectionModal);
                  setVideoSelectionModal(false);
                }}
              />
              {micOn ? (
                <Mic
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
                  onClick={() => {
                    props.peerConnectionInfo.current.forEach((peer) => {
                      const peerConnection = peer.peerConnection;
                      const sender = peerConnection
                        .getSenders()
                        .find((s) => s.track?.kind === "audio");
                      if (sender && sender.track) {
                        sender.track.enabled = false;
                      }
                    });

                    setMicOn(false);
                  }}
                />
              ) : (
                <MicOff
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
                  onClick={() => {
                    props.peerConnectionInfo.current.forEach((peer) => {
                      const peerConnection = peer.peerConnection;
                      const sender = peerConnection
                        .getSenders()
                        .find((s) => s.track?.kind === "audio");
                      if (sender && sender.track) {
                        sender.track.enabled = true;
                      }
                    });

                    setMicOn(true);
                  }}
                />
              )}
            </div>
            {/* Make this functional instead of just 1 peerconnection. send in all the peer connections object.*/}
            {/* Then enumerate each peer connection and set the audio input as the new audio input */}
            {audioSelectionModal && (
              <div className="SelectAudioInputModal absolute rounded-2xl bottom-32 w-52 h-48 bg-gray-800 p-5">
                <ul className="overflow-y-scroll">
                  {props.audioInputOptions?.map((audioOption, key) => (
                    <li
                      key={key}
                      className="my-2 hover:bg-cyan-950 hover:rounded-xs"
                      onClick={async () => {
                        await switchMedia({
                          kind: "audioinput",
                          deviceId: audioOption.deviceId,
                          srcVideoStream: props.srcVideoStream,
                          setSrcVideoStream: props.setSrcVideoStream,
                          srcAudioStream: props.srcAudioStream,
                          setSrcAudioStream: props.setSrcAudioStream,
                          peerConnectionInfo: props.peerConnectionInfo,
                        });
                      }}
                    >
                      {key + 1} . {audioOption.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="VideoInput rounded-2xl w-full md:w-2/3 lg:w-10/12 h-3/4 flex items-center justify-center bg-amber-500">
            <div className="grid sm:grid-cols-2 sm: gap-x-5 items-center">
              <Ellipsis
                className="hidden sm:block"
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
                onClick={() => {
                  setVideoSelectionModal(!videoSelectionModal);
                  setAudioSelectionModal(false);
                }}
              />
              {videoOn ? (
                <Camera
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
                  onClick={() => {
                    const videoTracks = props.srcVideoStream
                      ?.getTracks()
                      .find((track) => track.kind === "video");
                    if (videoTracks?.enabled) {
                      videoTracks.enabled = false;
                    }
                    setVideoOn(false);
                  }}
                />
              ) : (
                <CameraOff
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
                  onClick={() => {
                    const videoTracks = props.srcVideoStream
                      ?.getTracks()
                      .find((track) => track.kind === "video");
                    if (videoTracks?.enabled == false) {
                      videoTracks.enabled = true;
                    }
                    setVideoOn(true);
                  }}
                />
              )}
            </div>
            {/* Make this functional as well. instead of 1 peerConnection, send in the full peerList */}
            {videoSelectionModal && (
              <div className="SelectVideoInputModal absolute rounded-2xl bottom-32 w-52 h-48 bg-gray-800 p-5">
                <ul className="">
                  {props.videoOptions?.map((videoOption, key) => (
                    <li
                      key={key}
                      className="my-2 hover:bg-cyan-950 hover:rounded-xs"
                      onClick={async () => {
                        await switchMedia({
                          kind: "videoinput",
                          deviceId: videoOption.deviceId,
                          srcVideoStream: props.srcVideoStream,
                          setSrcVideoStream: props.setSrcVideoStream,
                          srcAudioStream: props.srcAudioStream,
                          setSrcAudioStream: props.setSrcAudioStream,
                          peerConnectionInfo: props.peerConnectionInfo,
                        });
                      }}
                    >
                      {key + 1} . {videoOption.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div
            // Make this functional as well.
            className="shareScreenPod rounded-2xl w-full md:w-2/3 h-3/4 flex items-center justify-center bg-green-500"
            onClick={async () => {
              await startScreenShare(
                props.peerConnectionInfo,
                props.deviceTypeToID
              );
            }}
          >
            <ScreenShareIcon
              size={
                is2xl ? 35 : isXl ? 30 : isLg ? 30 : isMd ? 25 : isSm ? 25 : 20
              }
            />
          </div>
          <div className="LeavePod rounded-2xl w-full h-3/4 md:w-2/3 flex items-center justify-center bg-red-500">
            <Unplug
              size={
                is2xl ? 35 : isXl ? 30 : isLg ? 30 : isMd ? 25 : isSm ? 25 : 20
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
