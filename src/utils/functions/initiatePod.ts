import type { WebSocket as WSWebSocket } from "ws";

export async function initiatePod(sender: WSWebSocket, roomId: string) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);

  //listen for ans from the peer
  sender.onmessage = async (msg) => {
    // Handle incoming message
    const res = JSON.parse(msg.data as string);
    if (res.type == "answer") {
      const remoteDesc = new RTCSessionDescription(res.data);
      await peerConnection.setRemoteDescription(remoteDesc);
    }
  };

  //create a new offer and set it in the local description.
  const localOffer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(localOffer);

  //send the offer to all the other people in the room
  const res = await sender.send(
    JSON.stringify({
      event: "sendSdpOffer",
      data: {
        roomId: roomId,
        offer: localOffer,
      },
    })
  );

  return res;
}
