import { Dispatch, SetStateAction } from "react";
export async function getDisplayMedia() {
  try {
    const DisplayMedia = await navigator.mediaDevices.getDisplayMedia();
    return DisplayMedia;
  } catch (e) {
    console.log(e);
  }
}

export default async function getUserDevices(
  peerConnection: RTCPeerConnection,
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>
) {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
    const audioTrack = new MediaStream(mediaStream.getAudioTracks());
    console.log("THe audio trackckckckck is ", audioTrack);
    setSrcAudioTrack(audioTrack);
    const videoTrack = new MediaStream(mediaStream.getVideoTracks());
    setSrcVideoTrack(videoTrack);
  } catch (e) {
    console.log(e);
    return null;
  }
}
