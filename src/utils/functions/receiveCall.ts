import getUserDevices from "./getDevicesAndMedia";
import { iceCandidate } from "./iceCandidate";
import { SetStateAction, Dispatch } from "react";
export async function receiveCall(
  receiver: WebSocket,
  roomId: string,
  offer: RTCSessionDescriptionInit,
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>
) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);
  await getUserDevices(peerConnection, setSrcAudioTrack, setSrcVideoTrack);
  iceCandidate(
    receiver,
    roomId,
    peerConnection,
    setPeerAudioTrack,
    setPeerVideoTrack
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
  return peerConnection;
}
