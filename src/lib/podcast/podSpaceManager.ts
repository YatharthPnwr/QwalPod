import { randomUUID } from "crypto";
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

  public createRoom(ws: WSWebSocket, userId: string) {
    const roomId = randomUUID();
    const newRoom: Room = {
      roomId: roomId,
      users: [
        {
          userId: userId,
          webSocket: ws,
        },
      ],
    };
    this.rooms.push(newRoom);
    return {
      type: "roomCreated",
      data: roomId,
    } as const satisfies WsResponse;
  }
  public joinRoom(ws: WSWebSocket, roomId: string, userId: string) {
    const user: User = {
      userId: userId,
      webSocket: ws,
    };
    const room = this.rooms.find((room) => {
      if (room.roomId === roomId) {
        return room;
      }
    });
    if (!room) {
      return {
        type: "error",
        data: "no room with the given room id found.",
      } as const satisfies WsResponse;
    }
    //add the new user to the room.
    room.users.push(user);
    console.log("After joining the room has become ", room);
    return {
      type: "success",
      data: "Room successfully joined.",
    };
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
      return room.roomId === roomId;
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
      return room.roomId === roomId;
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

  public async trickleIce(
    roomId: string,
    iceCandidate: string,
    ws: WSWebSocket
  ): Promise<WsResponse> {
    const currentPod = this.rooms.find((room) => {
      return room.roomId === roomId;
    });
    if (!currentPod) {
      return {
        type: "error",
        data: "Failed to find room",
      } as const satisfies WsResponse;
    }

    currentPod.users.forEach((user) => {
      if (user.webSocket != ws) {
        user.webSocket.send(
          JSON.stringify({
            type: "iceCandidate",
            data: iceCandidate,
          })
        );
      }
    });
    return {
      type: "success",
      data: "Sent the ice candidates successfully.",
    } as const satisfies WsResponse;
  }
}
