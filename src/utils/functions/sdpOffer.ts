export async function createSdpOffer(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection
) {
  //create a new offer and set it in the local description.
  const localOffer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(localOffer);

  //send the offer to all the other people in the room
  if (!sender) {
    return;
  }

  const res = (sender.onopen = () => {
    console.log("Sending the message");
    sender.send(
      JSON.stringify({
        event: "sendSdpOffer",
        data: {
          roomId: roomId,
          offer: localOffer,
        },
      })
    );
  });

  return res;
}
