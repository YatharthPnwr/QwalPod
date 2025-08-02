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
  pc: RTCPeerConnection,
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
    displayMedia.getTracks().forEach((track) => {
      pc.addTrack(track, displayMedia);
    });
  } catch (e) {
    console.log(e);
  }
}

export default async function getUserDevices(
  peerConnection: RTCPeerConnection,
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  deviceTypeToID: React.RefObject<Map<string, string>>
) {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const videoStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
    //Add the device id along with kind in the MAP.
    deviceTypeToID.current.clear();
    deviceTypeToID.current.set(audioStream.id, "peerAudio");
    deviceTypeToID.current.set(videoStream.id, "peerVideo");
    audioStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, audioStream);
    });
    setSrcAudioStream(audioStream);
    videoStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, videoStream);
    });
    setSrcVideoStream(videoStream);
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

interface switchMediaInputs {
  kind: "audioinput" | "videoinput" | "audiooutput";
  deviceId: string;
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
    };
    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia(
        newConstraints
      );
      //stop the current stream
      props.srcAudioStream?.getTracks().forEach((track) => {
        if (track.kind === "audioinput") {
          track.stop();
        }
      });
      props.setSrcAudioStream(newAudioStream);
      props.peerConnection.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") {
          sender.replaceTrack(newAudioStream.getAudioTracks()[0]);
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

    const newVideoConstraints = {
      video: { deviceId: { exact: props.deviceId } },
    };

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia(
        newVideoConstraints
      );
      //stop the current stream
      props.srcVideoStream?.getTracks().forEach((track) => {
        if (track.kind === "videoinput") {
          track.stop();
        }
      });
      props.setSrcVideoStream(newVideoStream);
      props.peerConnection.getSenders().forEach((sender) => {
        if (sender.track?.kind === "video") {
          sender.replaceTrack(newVideoStream.getVideoTracks()[0]);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
}
