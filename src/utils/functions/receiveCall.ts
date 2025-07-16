export async function receiveCall(
  receiver: WebSocket,
  roomId: string,
  offer: RTCSessionDescriptionInit
) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  receiver.send(
    JSON.stringify({
      event: "sendAnswer",
      data: {
        roomId: roomId,
        answer: answer,
      },
    })
  );
  return peerConnection;
}
