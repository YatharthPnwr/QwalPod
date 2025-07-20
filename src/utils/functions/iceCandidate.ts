import { Dispatch, SetStateAction } from "react";
import { updateMediaStream } from "./getDevicesAndMedia";
import getUserMedia from "@/utils/functions/getDevicesAndMedia";

export function iceCandidate(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection,
  setPeerAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setSrcAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  localStream: MediaStream | null,
  setLocalStream: Dispatch<SetStateAction<MediaStream | null>>
) {
  //listen for local ICE candidate.
  peerConnection.onicecandidate = (event) => {
    console.log("Reached the peerconnection icecandidate");
    console.log("The ice candidate is ", event.candidate);
    if (event.candidate) {
      //Send the local ICE candidate to all the peers in the space.
      sender.send(
        JSON.stringify({
          event: "trickleIce",
          data: {
            roomId: roomId,
            iceCandidate: event.candidate,
          },
        })
      );
    }
  };

  //listen for connection state change
  peerConnection.onconnectionstatechange = (event) => {
    console.log("The connection has been ESHTABILISHED");
    console.log(event);
    console.log(peerConnection.signalingState);
  };

  //set remote stream
  peerConnection.ontrack = (event) => {
    const remoteStream = event.streams[0];
    console.log("The remote stream is", remoteStream);
    const audioStream = new MediaStream(remoteStream.getAudioTracks());
    const videoStream = new MediaStream(remoteStream.getVideoTracks());

    if (typeof setPeerAudioTrack !== "function") {
      throw new Error("setPeerAudioTrack is not a function");
    }
    if (typeof setPeerVideoTrack !== "function") {
      throw new Error("setPeerVideoTrack is not a function");
    }

    setPeerAudioTrack(audioStream);
    setPeerVideoTrack(videoStream);
  };

  navigator.mediaDevices.ondevicechange = async () => {
    console.log("DEVICE CHANGED");
    await updateMediaStream({
      setVideoOptions,
      setAudioInputOptions,
      setSrcAudioTrack,
      setSrcVideoTrack,
    });

    if (localStream && peerConnection) {
      localStream.getTracks().forEach((track) => {
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track === track);
        if (sender) {
          peerConnection.removeTrack(sender);
        }
      });
    }

    if (peerConnection) {
      await getUserMedia(
        peerConnection,
        setSrcAudioTrack,
        setSrcVideoTrack,
        setLocalStream
      );
    }
  };
}
