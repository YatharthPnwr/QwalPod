import { Camera, Mic, Unplug, Ellipsis, MicOff, CameraOff } from "lucide-react";
import { SetStateAction, Dispatch, useEffect, useState } from "react";
import { switchMedia } from "@/utils/functions/getDevicesAndMedia";

interface ControlsInput {
  audioInputOptions: MediaDeviceInfo[] | undefined;
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  videoOptions: MediaDeviceInfo[] | undefined;
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  setLocalStream: Dispatch<SetStateAction<MediaStream | null>>;
  localStream: MediaStream | null;
  srcVideoTrack: MediaStream | undefined;
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>;
  srcAudioTrack: MediaStream | undefined;
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>;
  peerConnection: RTCPeerConnection;
}
export default function Controls(props: ControlsInput) {
  const [audioSelectionModal, setAudioSelectionModal] =
    useState<boolean>(false);
  const [videoSelectionModal, setVideoSelectionModal] =
    useState<boolean>(false);
  const [micOn, setMicOn] = useState<boolean>(false);
  const [videoOn, setVideoOn] = useState<boolean>(false);

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
  }, []);
  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-3 bg-gray-800 rounded-2xl w-1/3 h-2/5 items-center justify-items-center">
          <div className="AudioInput rounded-2xl w-2/3 h-3/4 bg-amber-500 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-x-5">
              <Ellipsis
                size={20}
                onClick={() => {
                  setAudioSelectionModal(!audioSelectionModal);
                  setVideoSelectionModal(false);
                }}
              />
              {micOn ? (
                <Mic
                  onClick={() => {
                    setMicOn(false);
                  }}
                />
              ) : (
                <MicOff
                  onClick={() => {
                    setMicOn(true);
                  }}
                />
              )}
            </div>
            {audioSelectionModal && (
              <div className="SelectAudioInputModal absolute rounded-2xl bottom-32 w-52 h-48 bg-gray-800 p-5">
                <ul className="">
                  {props.audioInputOptions?.map((audioOption, key) => (
                    <li
                      key={key}
                      className="my-2"
                      onClick={async () => {
                        await switchMedia({
                          kind: "audioinput",
                          deviceId: audioOption.deviceId,
                          setLocalStream: props.setLocalStream,
                          localStream: props.localStream,
                          srcVideoStream: props.srcVideoTrack,
                          setSrcVideoStream: props.setSrcVideoTrack,
                          srcAudioStream: props.srcAudioTrack,
                          setSrcAudioStream: props.setSrcAudioTrack,
                          peerConnection: props.peerConnection,
                        });
                      }}
                    >
                      {key + 1} . {audioOption.label}
                      <hr className="opacity-60 bg-gray-500 m-2" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="VideoInput rounded-2xl w-2/3 h-3/4 flex items-center justify-center bg-amber-500">
            <div className="grid grid-cols-2 gap-x-5">
              <Ellipsis
                size={20}
                onClick={() => {
                  setVideoSelectionModal(!videoSelectionModal);
                  setAudioSelectionModal(false);
                }}
              />
              {videoOn ? (
                <Camera
                  onClick={() => {
                    setVideoOn(false);
                  }}
                />
              ) : (
                <CameraOff
                  onClick={() => {
                    setVideoOn(true);
                  }}
                />
              )}
            </div>
            {videoSelectionModal && (
              <div className="SelectVideoInputModal absolute rounded-2xl bottom-32 w-52 h-48 bg-gray-800 p-5">
                <ul className="">
                  {props.videoOptions?.map((videoOption, key) => (
                    <li
                      key={key}
                      className="my-2 hover:bg-cyan-950"
                      onClick={async () => {
                        await switchMedia({
                          kind: "videoinput",
                          deviceId: videoOption.deviceId,
                          setLocalStream: props.setLocalStream,
                          localStream: props.localStream,
                          srcVideoStream: props.srcVideoTrack,
                          setSrcVideoStream: props.setSrcVideoTrack,
                          srcAudioStream: props.srcAudioTrack,
                          setSrcAudioStream: props.setSrcAudioTrack,
                          peerConnection: props.peerConnection,
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
          <div className="LeavePod rounded-2xl w-2/3 h-3/4 flex items-center justify-center bg-red-500">
            <Unplug />
          </div>
        </div>
      </div>
    </>
  );
}
