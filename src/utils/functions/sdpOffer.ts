interface createSDPOfferInputs {
  sender: WebSocket;
  roomId: string;
  peerConnection: RTCPeerConnection;
  streamMetadata: Map<string, string>;
  fromId: string;
  toId: string;
}
export async function createSdpOffer(props: createSDPOfferInputs) {
  try {
    // Create offer with options to preserve existing tracks
    const localOffer = await props.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await props.peerConnection.setLocalDescription(localOffer);

    if (!props.sender) {
      console.log("No sender found returning");
      return;
    }
    const res = props.sender.send(
      JSON.stringify({
        event: "sendSdpOffer",
        data: {
          roomId: props.roomId,
          offer: localOffer,
          streamMetaData: Object.fromEntries(props.streamMetadata),
          fromId: props.fromId,
          toId: props.toId,
        },
      })
    );
    return res;
  } catch (error) {
    return error;
  }
}
