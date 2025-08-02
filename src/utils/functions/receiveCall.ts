import getUserDevices from "./getDevicesAndMedia";
import { iceCandidate } from "./iceCandidate";
import { SetStateAction, Dispatch } from "react";
export async function receiveCall(
  receiver: WebSocket,
  roomId: string,
  offer: RTCSessionDescriptionInit,
  peerConnection: RTCPeerConnection,
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  peerVideoStream: MediaStream | undefined,
  peerAudioStream: MediaStream | undefined,
  peerScreenShareVideoStream: MediaStream | undefined,
  setPeerScreenShareVideoStream: Dispatch<
    SetStateAction<MediaStream | undefined>
  >,
  peerScreenShareAudioStream: MediaStream | undefined,
  setPeerScreenShareAudioStream: Dispatch<
    SetStateAction<MediaStream | undefined>
  >,
  hasInitialNegotiationCompleted: React.RefObject<boolean>,
  srcAudioStream: MediaStream | undefined,
  srcVideoStream: MediaStream | undefined,
  deviceTypeToID: React.RefObject<Map<string, string>>,
  remoteDeviceTypeToId: React.RefObject<Map<string, string>>
) {
  await getUserDevices(
    peerConnection,
    setSrcAudioStream,
    setSrcVideoStream,
    deviceTypeToID
  );

  // set remote stream

  // @note - NOW EVERYTHING IS FIXED. JUST SET THE RIGHT MEDIA IN THE RIGHT VARIABLE.
  // THE VIDEO STREAM RECEIVED DOES NOT HAVE THE LABEL SCREEN.
  // TO DEBUG, CHECK THE LENGTH OF THE VIDEO TRACKS RECEIVED AND LOG THEM ,
  // ALSO YOU MAY WANT TO EXCHANGE THE MID OF THE SCREEN SHARE.
  // The screen share video you saw once. LETS GOO.
  // FROM CALLER SIDE THE SCREEN SHARE FUNCTIONALITY WILL BE COMPLETE AFTER THIS.
  // FROM CALEE SIDE TESTING THE SCREEN SHARE FUNCTIONALITY WILL STILL BE LEFT AFTER THIS.
  // The calee screen share works perfectly.
  peerConnection.ontrack = null;
  peerConnection.ontrack = (event) => {
    const remoteStream = event.streams[0];
    const remoteStreamId = remoteStream.id;
    const remoteDeviceType = remoteDeviceTypeToId.current.get(remoteStreamId);

    if (remoteDeviceType === "peerAudio") {
      setPeerAudioStream(remoteStream);
    } else if (remoteDeviceType === "peerVideo") {
      setPeerVideoStream(remoteStream);
    } else if (remoteDeviceType === "peerScreenShare") {
      setPeerScreenShareVideoStream(remoteStream);
      setPeerScreenShareAudioStream(remoteStream);
    }
  };

  iceCandidate(
    receiver,
    roomId,
    peerConnection,
    setPeerAudioStream,
    setPeerVideoStream,
    setVideoOptions,
    setAudioInputOptions,
    setSrcAudioStream,
    setSrcVideoStream,
    peerVideoStream,
    peerAudioStream,
    peerScreenShareVideoStream,
    setPeerScreenShareVideoStream,
    peerScreenShareAudioStream,
    setPeerScreenShareAudioStream,
    hasInitialNegotiationCompleted,
    srcAudioStream,
    srcVideoStream,
    deviceTypeToID
  );
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  hasInitialNegotiationCompleted.current = true;
  receiver.send(
    JSON.stringify({
      event: "sendAnswer",
      data: {
        roomId: roomId,
        answer: answer,
        streamMetaData: Object.fromEntries(deviceTypeToID.current),
      },
    })
  );
}
