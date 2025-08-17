import { Dispatch, SetStateAction } from "react";
export async function getDisplayMedia() {
  try {
    const DisplayMedia = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    return DisplayMedia;
  } catch (e) {
    console.log(e);
  }
}

export async function startScreenShare(
  // here the full peer list will come
  peerConnectionInfo: React.RefObject<peerConnectionInfo[]>,
  deviceTypeToID: React.RefObject<Map<string, string>>
) {
  try {
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    deviceTypeToID.current.set(displayMedia.id, "peerScreenShare");
    console.log(
      "Added screen share to map Final state is: ",
      Object.fromEntries(deviceTypeToID.current)
    );
    peerConnectionInfo.current.forEach((peer) => {
      const pc = peer.peerConnection;
      displayMedia.getTracks().forEach((track) => {
        pc.addTrack(track, displayMedia);
      });
    });
  } catch (e) {
    console.log(e);
  }
}

export default async function getUserDevices() {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const videoStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
    console.log("The audio stream achieved are");
    console.log("audio stream", audioStream);
    console.log("Video stream", videoStream);
    return [audioStream, videoStream];
  } catch (e) {
    console.log(e);
    return null;
  }
}

interface updateMediaInputs {
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
}
export async function updateMediaStream(props: updateMediaInputs) {
  const updatedMediaStream = await navigator.mediaDevices.enumerateDevices();
  const audioOptions = updatedMediaStream.filter(
    (device) => device.kind === "audioinput"
  );
  const videoOptions = updatedMediaStream.filter(
    (device) => device.kind === "videoinput"
  );
  props.setAudioInputOptions(audioOptions);
  props.setVideoOptions(videoOptions);
}
interface peerConnectionInfo {
  to: string;
  peerConnection: RTCPeerConnection;
  remoteDeviceTypeToId: Map<string, string>;
  pendingIceCandidates: RTCIceCandidate[];
}

interface switchMediaInputs {
  kind: "audioinput" | "videoinput" | "audiooutput";
  deviceId: string;
  peerConnectionInfo: React.RefObject<peerConnectionInfo[]>;
  srcVideoStream: MediaStream | undefined;
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  srcAudioStream: MediaStream | undefined;
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>;
}
export async function switchMedia(props: switchMediaInputs) {
  if (props.kind === "audioinput") {
    // const currentVideoDeviceId = props.srcVideoStream
    //   ?.getVideoTracks()[0]
    //   ?.getSettings().deviceId;
    // if (!currentVideoDeviceId) {
    //   return;
    // }
    const newConstraints = {
      audio: { deviceId: { exact: props.deviceId } },
    };
    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia(
        newConstraints
      );
      //stop the current stream locally
      props.srcAudioStream?.getTracks().forEach((track) => {
        if (track.kind === "audio") {
          track.stop();
        }
      });
      props.setSrcAudioStream(newAudioStream);
      //Make changes here. enumerate all the peer connections and set the new value there
      props.peerConnectionInfo.current.forEach((peer) => {
        const peerConnection = peer.peerConnection;
        peerConnection.getSenders().forEach((sender) => {
          if (sender.track?.kind === "audio") {
            sender.replaceTrack(newAudioStream.getAudioTracks()[0]);
          }
        });
      });
    } catch (e) {
      console.log(e);
    }
  } else if (props.kind === "videoinput") {
    // const currentAudioDeviceId = props.srcAudioStream
    //   ?.getAudioTracks()[0]
    //   ?.getSettings().deviceId;
    // if (!currentAudioDeviceId) {
    //   return;
    // }

    const newVideoConstraints = {
      video: { deviceId: { exact: props.deviceId } },
    };

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia(
        newVideoConstraints
      );
      //stop the current stream
      props.srcVideoStream?.getTracks().forEach((track) => {
        if (track.kind === "video") {
          track.stop();
        }
      });
      props.setSrcVideoStream(newVideoStream);
      //Make changes here. enumerate all the peer connections and set the new value there
      props.peerConnectionInfo.current.forEach((peer) => {
        const peerConnection = peer.peerConnection;
        peerConnection.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            sender.replaceTrack(newVideoStream.getVideoTracks()[0]);
          }
        });
      });
    } catch (e) {
      console.log(e);
    }
  }
}
