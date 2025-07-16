import type { WebSocket as WSWebSocket } from "ws";
import { createSdpOffer } from "./sdpOffer";
import { iceCandidate } from "./iceCandidate";

export async function initiatePod(sender: WSWebSocket, roomId: string) {
  const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const peerConnection = new RTCPeerConnection(config);

  //create and receive an SDP offer.
  const sdpOfferCreateAndSend = createSdpOffer(sender, roomId, peerConnection);

  //initialize the ice candidate
  const iceCandidateCreateAndSend = iceCandidate(
    sender,

    roomId,
    peerConnection
  );

  return {
    sdpOffer: sdpOfferCreateAndSend,
    iceCandidate: iceCandidateCreateAndSend,
    peerConnection: peerConnection,
  };
}
