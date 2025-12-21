import React, { Dispatch, SetStateAction } from "react";
import { ScreenShareStatus } from "@/utils/exports";
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
  userId: string,
  roomId: string,
  setSrcScreenShareStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setScreenShareStatus: Dispatch<SetStateAction<ScreenShareStatus>>,
  ws: React.RefObject<WebSocket | null>,
  latestSrcScreenShareStream: React.RefObject<MediaStream | undefined>
) {
  try {
    if (!userId) {
      console.log("NO USER ID FOUND RETURNING");
      return;
    }
    const segmentNumber = await getSegmentNumber(
      webWorkerRef,
      roomId,
      userId,
      true
    );
    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    displayMedia.getVideoTracks().forEach((track) => {
      track.onended = () => {
        //Send the websocket message to end to all the users in the room
        //set the srcScreen share as undefined
        console.log("Triggered ended track");
        setSrcScreenShareStream(undefined);
        latestSrcScreenShareStream.current = undefined;
        setScreenShareStatus(ScreenShareStatus.IDLE);
        //Send an ending status
        ws.current?.send(
          JSON.stringify({
            event: "screenShareEnded",
            data: {
              userId: userId,
              roomId: roomId,
            },
          })
        );
      };
    });

    console.log("The displayMedia is", displayMedia);
    latestSrcScreenShareStream.current = displayMedia;
    setSrcScreenShareStream(displayMedia);
    screenShareRecorderRef.current = new MediaRecorder(displayMedia);
    handleScreenShareRecording(
      screenShareRecorderRef,
      webWorkerRef,
      userId,
      segmentNumber
    );
    deviceTypeToID.current.set(displayMedia.id, "peerScreenShare");
    console.log("THE UPDATED DEVICETYPETOID IS", deviceTypeToID.current);
    peerConnectionInfo.current.forEach((peer) => {
      const pc = peer.peerConnection;
      displayMedia.getTracks().forEach((track) => {
        pc.addTrack(track, displayMedia);
      });
    });
    console.log("Sending the started msg with userid as", userId);
    ws.current?.send(
      JSON.stringify({
        event: "startScreenShare",
        data: {
          userId: userId,
          roomId: roomId,
        },
      })
    );
    setScreenShareStatus(ScreenShareStatus.SHARING);
  } catch (e) {
    console.log(e);
  }
}
//Get the latest segment number
const getSegmentNumber = async (
  webWorkerRef: React.RefObject<Worker | null>,
  roomId: string,
  userId: string,
  screenSegment: boolean
) => {
  return new Promise<number>((resolve, reject) => {
    if (!webWorkerRef.current) {
      console.log("NO web worker found, creating a new");
      //create a new worker
      const workerScript = new Worker(
        new URL("../../../public/chunkStore.ts", import.meta.url)
      );
      webWorkerRef.current = workerScript;
    }
    if (screenSegment) {
      webWorkerRef.current.postMessage({
        roomId: roomId as string,
        userId: userId,
        event: "getScreenShareSegmentNumber",
      });
    } else {
      webWorkerRef.current.postMessage({
        roomId: roomId as string,
        userId: userId,
        event: "getSegmentNumber",
      });
    }
    webWorkerRef.current.onmessage = (e) => {
      const data = e.data;
      const event = data.event;
      if (event === "audioAndVideoSegment") {
        resolve(data.audioAndVideoSegmentNumber);
        return;
      }
      if (event === "screenSegmentNumber") {
        resolve(data.screenShareSegmentNumber);
        return;
      }
    };
    webWorkerRef.current.onerror = (e) => {
      reject(e);
    };
  });
};
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
    return [audioStream, videoStream];
  } catch (e) {
    console.log(e);
    return null;
  }
}
//Send the blobs of video and audio to the worker script.
export async function handleRecording(
  audioRecorderRef: React.RefObject<MediaRecorder | null>,
  videoRecorderRef: React.RefObject<MediaRecorder | null>,
  audioStream: MediaStream,
  videoStream: MediaStream,
  roomId: string,
  webWorkerRef: React.RefObject<Worker | null>,
  userId: string
) {
  //get the streamNumber first then start the recording.
  //With every saveChunk message send the streamNumber too.
  //Get the latest segmentId to save the chunks to
  if (!videoStream || !audioStream) {
    console.log("No video or No audio stream found returning!!!");
  }
  const audioAndVideoSegmentNumber = await getSegmentNumber(
    webWorkerRef,
    roomId as string,
    userId as string,
    false
  );
  console.log(
    "The audio And Video Segment Ids are",
    audioAndVideoSegmentNumber
  );
  console.log("Starting the local recording of media");
  const audioRecorder = new MediaRecorder(audioStream);
  const videoRecorder = new MediaRecorder(videoStream);
  // Log after starting
  audioRecorderRef.current = audioRecorder;
  videoRecorderRef.current = videoRecorder;

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
    //webWorkerRef.current
    const id = crypto.randomUUID();
    console.log("The type of chunkis", e.data.type);
    console.log("Sending chunk save mesg to the worker script with id", id);
    webWorkerRef.current.postMessage({
      roomId: localStorage.getItem("roomId"),
      id: id,
      userId: userId,
      event: "saveChunk",
      type: "audio",
      segmentNumber: audioAndVideoSegmentNumber,
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
    console.log("The type of chunk is (video)", e.data.type);
    const id = crypto.randomUUID();
    console.log("Sending chunk save mesg to the worker script with id", id);
    webWorkerRef.current.postMessage({
      id: id,
      roomId: localStorage.getItem("roomId"),
      userId: userId,
      event: "saveChunk",
      type: "video",
      segmentNumber: audioAndVideoSegmentNumber,
      chunk: e.data,
    });
  };
  videoRecorderRef.current.onstop = () => {
    console.log("video recording stopped");
  };
  audioRecorderRef.current.onstop = () => {
    console.log("Audio recording stopped");
  };
  audioRecorderRef.current.start(20000);
  videoRecorderRef.current.start(20000);
}

function handleScreenShareRecording(
  screenShareRef: React.RefObject<MediaRecorder | null>,
  webWorkerRef: React.RefObject<Worker | null>,
  userId: string,
  segmentNumber: number
) {
  //Get ScreenShareSegmentNumber first store it in a variable,
  //Then with each saveChunk msg, send that number to the worker script.
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
    }
    const id = crypto.randomUUID();
    webWorkerRef.current.postMessage({
      id: id,
      roomId: localStorage.getItem("roomId"),
      userId: userId,
      event: "saveChunk",
      type: "screen",
      chunk: e.data,
      screenShareSegmentNumber: segmentNumber,
    });
  };
  screenShareRef.current.start(20000);
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
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>;
  deviceTypeToID: React.RefObject<Map<string, string>>;
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

      props.setSrcAudioStream(newAudioStream);
      console.log("Latest src audio stream is set as", newAudioStream);

      //Update the local mapping
      props.deviceTypeToID.current.forEach((value, key) => {
        if (value == "peerAudio") {
          props.deviceTypeToID.current.delete(key);
        }
      });
      props.deviceTypeToID.current.set(newAudioStream.id, "peerAudio");
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
      props.setSrcVideoStream(newVideoStream);
      props.deviceTypeToID.current.forEach((value, key) => {
        if (value == "peerVideo") {
          props.deviceTypeToID.current.delete(key);
        }
      });
      props.deviceTypeToID.current.set(newVideoStream.id, "peerVideo");
    } catch (e) {
      console.log("Error switching video device:", e);
    }
  }
}
