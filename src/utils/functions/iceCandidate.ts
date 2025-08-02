import React, { Dispatch, SetStateAction } from "react";
import { updateMediaStream } from "./getDevicesAndMedia";
import getUserMedia from "@/utils/functions/getDevicesAndMedia";
import { createSdpOffer } from "@/utils/functions/sdpOffer";

export function iceCandidate(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection,
  setPeerAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setVideoOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setAudioInputOptions: Dispatch<SetStateAction<MediaDeviceInfo[] | undefined>>,
  setSrcAudioStream: Dispatch<SetStateAction<MediaStream | undefined>>,
  setSrcVideoStream: Dispatch<SetStateAction<MediaStream | undefined>>,
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
  deviceTypeToID: React.RefObject<Map<string, string>>
) {
  //listen for local ICE candidate.
  peerConnection.onicecandidate = (event) => {
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
    console.log(peerConnection.signalingState);
  };

  peerConnection.onnegotiationneeded = async () => {
    console.log("Negotiation is required. sending again the sdp offers.");
    if (!hasInitialNegotiationCompleted.current) {
      console.log("FAILED TO SEND, INITIAL NEGOTIATION NOT YET COMPLETED");
      return;
    }
    const sdpOfferSendAndCreate = async () => {
      if (!sender || !peerConnection) {
        return;
      }

      const res = await createSdpOffer(
        sender,
        localStorage.getItem("roomId") as string,
        peerConnection,
        deviceTypeToID.current
      );
      return res;
    };
    sdpOfferSendAndCreate();
  };

  navigator.mediaDevices.ondevicechange = async () => {
    console.log("DEVICE CHANGED");
    await updateMediaStream({
      setVideoOptions,
      setAudioInputOptions,
    });

    if (srcAudioStream && peerConnection) {
      srcAudioStream.getTracks().forEach((track) => {
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track === track);
        if (sender) {
          peerConnection.removeTrack(sender);
        }
      });
    }

    if (srcVideoStream && peerConnection) {
      srcVideoStream.getTracks().forEach((track) => {
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
        setSrcAudioStream,
        setSrcVideoStream,
        deviceTypeToID
      );
    }
  };
}
