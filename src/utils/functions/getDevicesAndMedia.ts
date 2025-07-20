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
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setLocalStream: Dispatch<SetStateAction<MediaStream | null>>
) {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setLocalStream(mediaStream);
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
    const audioTrack = new MediaStream(mediaStream.getAudioTracks());
    setSrcAudioTrack(audioTrack);
    const videoTrack = new MediaStream(mediaStream.getVideoTracks());
    setSrcVideoTrack(videoTrack);
  } catch (e) {
    console.log(e);
    return null;
  }
}

interface updateMediaInputs {
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>;
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>;
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>;
}
export async function updateMediaStream(props: updateMediaInputs) {
  console.log("This was triggered");
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

interface switchMediaInputs {
  kind: "audioinput" | "videoinput" | "audiooutput";
  deviceId: string;
  localStream: MediaStream | null;
  setLocalStream: Dispatch<SetStateAction<MediaStream | null>>;
  peerConnection: RTCPeerConnection;
  srcVideoStream: MediaStream | undefined;
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  srcAudioStream: MediaStream | undefined;
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>;
}
export async function switchMedia(props: switchMediaInputs) {
  if (props.kind === "audioinput") {
    const currentVideoDeviceId = props.srcVideoStream
      ?.getVideoTracks()[0]
      ?.getSettings().deviceId;
    if (!currentVideoDeviceId) {
      return;
    }
    const newConstraints = {
      audio: { deviceId: { exact: props.deviceId } },
      video: currentVideoDeviceId
        ? { deviceId: { exact: currentVideoDeviceId } }
        : true,
    };
    try {
      const newStream = await navigator.mediaDevices.getUserMedia(
        newConstraints
      );
      //stop the current stream
      props.localStream?.getTracks().forEach((track) => {
        if (track.kind === "audioinput") {
          track.stop();
        }
      });
      props.setLocalStream(newStream);
      props.setSrcAudioStream(newStream);
      props.peerConnection.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") {
          sender.replaceTrack(newStream.getAudioTracks()[0]);
        }
      });
    } catch (e) {
      console.log(e);
    }
  } else if (props.kind === "videoinput") {
    const currentAudioDeviceId = props.srcAudioStream
      ?.getAudioTracks()[0]
      ?.getSettings().deviceId;
    if (!currentAudioDeviceId) {
      return;
    }

    const newConstraints = {
      video: { deviceId: { exact: props.deviceId } },
      audio: currentAudioDeviceId
        ? { deviceId: { exact: currentAudioDeviceId } }
        : true,
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(
        newConstraints
      );
      //stop the current stream
      props.localStream?.getTracks().forEach((track) => {
        if (track.kind === "videoinput") {
          track.stop();
        }
      });
      props.setLocalStream(newStream);
      props.setSrcVideoStream(newStream);
      props.peerConnection.getSenders().forEach((sender) => {
        if (sender.track?.kind === "video") {
          sender.replaceTrack(newStream.getVideoTracks()[0]);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
}
