import type { WebSocket as WSWebSocket } from "ws";

export async function receiveCall(receiver: WSWebSocket, roomId: string) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);

  receiver.onmessage = async (msg) => {
    const res = JSON.parse(msg.data as string);
    if (res.type == "offer") {
      peerConnection.setRemoteDescription(new RTCSessionDescription(res.data));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      const response = await receiver.send(
        JSON.stringify({
          event: "answer",
          data: {
            roomId: roomId,
            answer: answer,
          },
        })
      );
      return response;
    }
  };
}
