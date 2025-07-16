export function iceCandidate(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection
) {
  //Listener for local ICE candidate.
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      //Send the local ICE candidate to all the peers in the space.
      sender.send(
        JSON.stringify({
          event: "trickleIce",
          roomId: roomId,
          iceCandidate: event.candidate,
        })
      );
    }
  });

  // //Event handler for recieving the ICE candidate.
  // sender.onmessage = async (msg) => {
  //   const res = JSON.parse(msg.data as string);
  //   if (res.type == "iceCandidate") {
  //     const remoteIceCandidate = res.iceCandidate;
  //     if (remoteIceCandidate) {
  //       try {
  //         await peerConnection.addIceCandidate(remoteIceCandidate);
  //       } catch (e) {
  //         console.log(e);
  //       }
  //     }
  //   }
}
// }
