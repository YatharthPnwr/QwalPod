export async function createSdpOffer(
  sender: WebSocket,
  roomId: string,
  peerConnection: RTCPeerConnection,
  streamMetadata: Map<string, string>
) {
  try {
    // Create offer with options to preserve existing tracks
    const localOffer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peerConnection.setLocalDescription(localOffer);

    if (!sender) {
      console.log("No sender found returning");
      return;
    }
    const res = sender.send(
      JSON.stringify({
        event: "sendSdpOffer",
        data: {
          roomId: roomId,
          offer: localOffer,
          streamMetaData: Object.fromEntries(streamMetadata),
        },
      })
    );
    return res;
  } catch (error) {
    return error;
  }
}
