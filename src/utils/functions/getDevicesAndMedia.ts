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
  deviceTypeToID: React.RefObject<Map<string, string>>,
  screenShareRecorderRef: React.RefObject<MediaRecorder | null>,
  webWorkerRef: React.RefObject<Worker | null>,
  userId: string | undefined
) {
  try {
    if (!userId) {
      console.log("NO USER ID FOUND RETURNING");
      return;
    }
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    console.log("The displayMedia is", displayMedia);
    screenShareRecorderRef.current = new MediaRecorder(displayMedia);
    handleScreenShareRecording(screenShareRecorderRef, webWorkerRef, userId);
    deviceTypeToID.current.set(displayMedia.id, "peerScreenShare");
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

export default async function getUserDevices(
  audioRecorderRef: React.RefObject<MediaRecorder | null>,
  videoRecorderRef: React.RefObject<MediaRecorder | null>,
  workerScriptRef: React.RefObject<Worker | null>,
  userId: string | null
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
    console.log("Starting the local recording of media");
    const audioRecorder = new MediaRecorder(audioStream);
    const videoRecorder = new MediaRecorder(videoStream);
    // Log after starting
    audioRecorderRef.current = audioRecorder;
    videoRecorderRef.current = videoRecorder;
    console.log("Handling Recordings");
    handleRecording(
      audioRecorderRef,
      videoRecorderRef,
      workerScriptRef,
      userId as string
    );

    return [audioStream, videoStream];
  } catch (e) {
    console.log(e);
    return null;
  }
}
//Send the blobs of video and audio to the worker script.
function handleRecording(
  audioRecorderRef: React.RefObject<MediaRecorder | null>,
  videoRecorderRef: React.RefObject<MediaRecorder | null>,
  webWorkerRef: React.RefObject<Worker | null>,
  userId: string
) {
  console.log("handling recordings");
  if (!audioRecorderRef.current || !videoRecorderRef.current) {
    console.log("No audio or video recorders found returning");
    return;
  }
  if (!webWorkerRef.current) {
    console.log("NO web worker found, creating a new");
    //create a new worker
    const workerScript = new Worker(
      new URL("../../../public/chunkStore", import.meta.url)
    );
    webWorkerRef.current = workerScript;
    // return;
  }
  audioRecorderRef.current.ondataavailable = (e) => {
    //send the blob to the worker script.
    if (!webWorkerRef.current) {
      console.log("NO web worker found, creating a new");
      //create a new worker
      const workerScript = new Worker(
        new URL("../../../public/chunkStore", import.meta.url)
      );
      webWorkerRef.current = workerScript;
      // return;
    }
    webWorkerRef.current.postMessage({
      roomId: localStorage.getItem("roomId"),
      userId: userId,
      event: "saveChunk",
      type: "audio",
      datatype: "blob",
      chunk: e.data,
    });
  };
  videoRecorderRef.current.ondataavailable = (e) => {
    if (!webWorkerRef.current) {
      console.log("NO web worker found, creating a new");
      //create a new worker
      const workerScript = new Worker(
        new URL("../../../public/chunkStore", import.meta.url)
      );
      webWorkerRef.current = workerScript;
      // return;
    }
    webWorkerRef.current.postMessage({
      roomId: localStorage.getItem("roomId"),
      userId: userId,
      event: "saveChunk",
      type: "video",
      datatype: "blob",
      chunk: e.data,
    });
  };
  videoRecorderRef.current.onstop = () => {
    console.log("video recording stopped");
  };
  audioRecorderRef.current.onstop = () => {
    console.log("Audio recording stopped");
  };
  audioRecorderRef.current.start(5000);
  videoRecorderRef.current.start(5000);
}

function handleScreenShareRecording(
  screenShareRef: React.RefObject<MediaRecorder | null>,
  webWorkerRef: React.RefObject<Worker | null>,
  userId: string
) {
  if (!webWorkerRef.current) {
    console.log("NO web worker found, creating a new");
    //create a new worker
    const workerScript = new Worker(
      new URL("../../../public/chunkStore", import.meta.url)
    );
    webWorkerRef.current = workerScript;
    // return;
  }
  if (!screenShareRef.current) {
    console.log("no screen share recorder found returning");
    return;
  }
  console.log("Handling screen share");
  screenShareRef.current.ondataavailable = (e) => {
    console.log("screen data avaliable");
    if (!webWorkerRef.current) {
      console.log("NO web worker found, creating a new");
      //create a new worker
      const workerScript = new Worker(
        new URL("../../../public/chunkStore", import.meta.url)
      );
      webWorkerRef.current = workerScript;
      // return;
    }
    webWorkerRef.current.postMessage({
      roomId: localStorage.getItem("roomId"),
      userId: userId,
      event: "saveChunk",
      type: "screen",
      datatype: "blob",
      chunk: e.data,
    });
  };
  screenShareRef.current.start(5000);
  screenShareRef.current.onstop = () => {
    console.log("screen sharing stopped stopped");
  };
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
  audioRecorderRef: React.RefObject<MediaRecorder | null>;
  videoRecorderRef: React.RefObject<MediaRecorder | null>;
  webWorkerRef: React.RefObject<Worker | null>;
  userId: string | undefined;
}

export async function switchMedia(props: switchMediaInputs) {
  if (props.kind === "audioinput") {
    const newConstraints = {
      audio: { deviceId: { exact: props.deviceId } },
    };

    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia(
        newConstraints
      );

      // Stop the audio recorder BEFORE stopping tracks
      if (
        props.audioRecorderRef.current &&
        props.audioRecorderRef.current.state === "recording"
      ) {
        console.log("Stopping audio recorder before track switch");
        props.audioRecorderRef.current.stop();
      }

      // Stop the current stream locally
      props.srcAudioStream?.getTracks().forEach((track) => {
        if (track.kind === "audio") {
          track.stop();
        }
      });

      props.setSrcAudioStream(newAudioStream);

      // Update peer connections
      props.peerConnectionInfo.current.forEach((peer) => {
        const peerConnection = peer.peerConnection;
        peerConnection.getSenders().forEach((sender) => {
          if (sender.track?.kind === "audio") {
            sender.replaceTrack(newAudioStream.getAudioTracks()[0]);
          }
        });
      });

      // Create and start new audio recorder
      const newAudioRecorder = new MediaRecorder(newAudioStream);
      props.audioRecorderRef.current = newAudioRecorder;

      // Re-setup audio recording handlers
      newAudioRecorder.ondataavailable = (e) => {
        if (!props.webWorkerRef.current) {
          console.log("NO web worker found returning");
          return;
        }
        props.webWorkerRef.current.postMessage({
          roomId: localStorage.getItem("roomId"),
          userId: props.userId,
          type: "audio",
          event: "saveChunk",
          datatype: "blob",
          chunk: e.data,
        });
      };

      newAudioRecorder.onstop = () => {
        console.log("Audio recording stopped");
      };

      newAudioRecorder.start(5000);
      console.log("New audio recorder started");
    } catch (e) {
      console.log("Error switching audio device:", e);
    }
  } else if (props.kind === "videoinput") {
    const newVideoConstraints = {
      video: { deviceId: { exact: props.deviceId } },
    };

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia(
        newVideoConstraints
      );

      //  Stop the video recorder BEFORE stopping tracks
      if (
        props.videoRecorderRef.current &&
        props.videoRecorderRef.current.state === "recording"
      ) {
        console.log("Stopping video recorder before track switch");
        props.videoRecorderRef.current.stop();
      }

      // Stop the current stream
      props.srcVideoStream?.getTracks().forEach((track) => {
        if (track.kind === "video") {
          track.stop();
        }
      });

      props.setSrcVideoStream(newVideoStream);

      // Update peer connections
      props.peerConnectionInfo.current.forEach((peer) => {
        const peerConnection = peer.peerConnection;
        peerConnection.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            sender.replaceTrack(newVideoStream.getVideoTracks()[0]);
          }
        });
      });

      // Create and start new video recorder
      console.log("Creating new video recorder with new stream");
      const newVideoRecorder = new MediaRecorder(newVideoStream);

      props.videoRecorderRef.current = newVideoRecorder;

      // Re-setup video recording handlers
      newVideoRecorder.ondataavailable = (e) => {
        if (!props.webWorkerRef.current) {
          console.log("NO web worker found returning");
          return;
        }
        props.webWorkerRef.current.postMessage({
          roomId: localStorage.getItem("roomId"),
          type: "video",
          userId: props.userId,
          event: "saveChunk",
          datatype: "blob",
          chunk: e.data,
        });
      };

      newVideoRecorder.onstop = () => {
        console.log("Video recording stopped");
      };

      newVideoRecorder.start(5000);
      console.log("New video recorder started");
    } catch (e) {
      console.log("Error switching video device:", e);
    }
  }
}
