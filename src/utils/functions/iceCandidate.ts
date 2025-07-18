import { Dispatch, SetStateAction } from "react";
export function iceCandidate(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection,
  setPeerAudioTrack: Dispatch<SetStateAction<MediaStream | undefined>>,
  setPeerVideoTrack: Dispatch<SetStateAction<MediaStream | undefined>>
) {
  //Listener for local ICE candidate.
  peerConnection.addEventListener("icecandidate", (event) => {
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
  });

  //listen for connected stage.
  peerConnection.addEventListener("connectionstatechange", (e) => {
    console.log(e);
    console.log(peerConnection.signalingState);
  });

  //Remote stream
  peerConnection.addEventListener("track", (event) => {
    console.log("SETTING THE REMOTE STREAMS LHAHAAHAHAHAH");
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
  });
}
