import type { User } from "./userManager";
import type { WebSocket as WSWebSocket } from "ws";

interface Room {
  roomId: string;
  users: User[];
}

interface WsSuccessResponse {
  type: string;
  data: string;
}
interface WsErrorResponse {
  type: string;
  error: string;
}

type WsResponse = WsSuccessResponse | WsErrorResponse;

export class podSpaceManager {
  private rooms: Room[];
  constructor() {
    this.rooms = [];
  }
  public async createSdpOffer() {
    const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const peerConnection = new RTCPeerConnection(config);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
  }

  /**
   * Send the SDP offer to rest of the people in the room.
   * @param roomId - The ID of the room
   * @param offer - The SDP offer string
   * @param ws - The WebSocket connection
   */

  public async sendSdpOffer(
    roomId: string,
    offer: RTCSessionDescriptionInit,
    ws: WSWebSocket
  ): Promise<WsResponse> {
    const currentPod = this.rooms.find((room) => {
      return room.roomId == roomId;
    });

    //return an error msg if failed to find a room.
    if (!currentPod) {
      return {
        type: "error",
        error: "Failed to find room",
      } as const satisfies WsResponse;
    }
    //send the offers to all the users.
    currentPod.users.forEach((user) => {
      if (user.webSocket != ws) {
        user.webSocket.send(
          JSON.stringify({
            type: "offer",
            data: offer,
          })
        );
      }
    });

    return {
      type: "success",
      data: "Sent the sdp offers to all the users in the room.",
    } as const satisfies WsResponse;
  }

  public async answer(
    roomId: string,
    answer: string,
    ws: WSWebSocket
  ): Promise<WsResponse> {
    const currentPod = this.rooms.find((room) => {
      return room.roomId == roomId;
    });
    if (!currentPod) {
      return {
        type: "error",
        data: "Failed to find room",
      } as const satisfies WsResponse;
    }
    currentPod?.users.forEach((user) => {
      if (user.webSocket != ws) {
        user.webSocket.send(
          JSON.stringify({
            type: "answer",
            data: answer,
          })
        );
      }
    });

    return {
      type: "success",
      data: "Sent the ans to all the users in the room.",
    } as const satisfies WsResponse;
  }
}
