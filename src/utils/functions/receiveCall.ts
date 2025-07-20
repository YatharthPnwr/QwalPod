import getUserDevices from "./getDevicesAndMedia";
import { iceCandidate } from "./iceCandidate";
import { SetStateAction, Dispatch } from "react";
export async function receiveCall(
  receiver: WebSocket,
  roomId: string,
  offer: RTCSessionDescriptionInit,
  peerConnection: RTCPeerConnection,
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setLocalStream: Dispatch<SetStateAction<MediaStream | null>>,
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  localstream: MediaStream | null
) {
  await getUserDevices(
    peerConnection,
    setSrcAudioTrack,
    setSrcVideoTrack,
    setLocalStream
  );
  iceCandidate(
    receiver,
    roomId,
    peerConnection,
    setPeerAudioTrack,
    setPeerVideoTrack,
    setVideoOptions,
    setAudioInputOptions,
    setSrcAudioTrack,
    setSrcVideoTrack,
    localstream,
    setLocalStream
  );
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  receiver.send(
    JSON.stringify({
      event: "sendAnswer",
      data: {
        roomId: roomId,
        answer: answer,
      },
    })
  );
}
