export function iceCandidate(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection
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
}
