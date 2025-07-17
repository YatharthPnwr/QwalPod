export async function getDisplayMedia() {
  try {
    const DisplayMedia = await navigator.mediaDevices.getDisplayMedia();
    return DisplayMedia;
  } catch (e) {
    console.log(e);
  }
}

export default async function getUserDevices(
  peerConnection: RTCPeerConnection
) {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
  } catch (e) {
    console.log(e);
    return null;
  }
}
