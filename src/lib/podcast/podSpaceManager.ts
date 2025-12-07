import { randomUUID } from "crypto";
import type { User } from "./userManager";
import type { WebSocket as WSWebSocket } from "ws";

interface Room {
  roomId: string;
  users: User[];
  creator: WSWebSocket;
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

  public createRoom(ws: WSWebSocket) {
    const roomId = randomUUID();
    const newRoom: Room = {
      roomId: roomId,
      users: [],
      creator: ws,
    };
    this.rooms.push(newRoom);
    return {
      type: "roomCreated",
      data: roomId,
    } as const satisfies WsResponse;
  }

  public getExistingUsers(roomId: string) {
    const room = this.rooms.find((room) => {
      return room.roomId === roomId;
    });

    if (!room) {
      return {
        type: "error",
        data: "no room with the given room id found.",
      } as const satisfies WsResponse;
    }

    const existingUsersInRoom = room.users;
    const existingUsersIds: string[] = [];
    existingUsersInRoom.forEach((usr) => {
      existingUsersIds.push(usr.userId);
    });
    return {
      type: "existingUsers",
      data: existingUsersIds,
    };
  }

  public joinRoom(ws: WSWebSocket, roomId: string, userId: string) {
    const user: User = {
      userId: userId,
      webSocket: ws,
    };
    const room = this.rooms.find((room) => {
      return room.roomId === roomId;
    });
    if (!room) {
      return {
        type: "error",
        data: "no room with the given room id found.",
      } as const satisfies WsResponse;
    }

    //Check if the userID is already present, if so, then only update the webSocket
    const usrPresent = room.users.find((usr) => {
      return usr.userId === userId;
    });
    if (usrPresent) {
      usrPresent.webSocket = ws;
    } else {
      //add the new user to the room.
      room.users.push(user);
    }

    //ALso return the existing users in the room array.
    const existingUsers = room.users.map((user) => {
      return user.userId;
    });
    //if the new user is the host, emit the hostJoined event
    return {
      type: "participantJoined",
      data: "Participant joined the room successfully",
      existingUsers: existingUsers,
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
    streamMetaData: Map<string, string>,
    fromId: string,
    toId: string
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
    //find the toUser in the given room and send the sdp
    //offer to them only.
    const targetPeer = currentPod.users.find((usr) => {
      return usr.userId == toId;
    });
    if (!targetPeer) {
      return {
        type: "error",
        data: "No user found to send the sdp offer to",
      } as const satisfies WsResponse;
    }
    //send the offer to the target Peer.
    targetPeer?.webSocket.send(
      JSON.stringify({
        type: "offer",
        data: {
          offer: offer,
          fromId: fromId,
          toId: toId,
          streamMetaData: Object.fromEntries(streamMetaData),
        },
      })
    );

    return {
      type: "success",
      data: `Sent the sdp offer to the userId ${toId}`,
    } as const satisfies WsResponse;
  }

  public async disconnecting(roomId: string, userId: string) {
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
    currentPod.users = currentPod.users.filter((usr) => usr.userId != userId);
    //@feature - If there are no users in the meeting, close it.
    //send the disconnected users user id to everyone in the room
    currentPod.users.forEach((usr) => {
      const wsConnection = usr.webSocket;
      wsConnection.send(
        JSON.stringify({
          type: "disconnected",
          data: {
            userId: userId,
          },
        })
      );
    });
  }

  public async answer(
    roomId: string,
    answer: string,
    fromId: string,
    toId: string,
    streamMetaData: Map<string, string>
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

    //Send the answer only to the specified user.
    const targetPeer = currentPod?.users.find((usr) => {
      return usr.userId == toId;
    });
    if (!targetPeer) {
      return {
        type: "error",
        data: "Could not find the target peer",
      };
    }
    targetPeer.webSocket.send(
      JSON.stringify({
        type: "answer",
        data: {
          answer: answer,
          streamMetaData: Object.fromEntries(streamMetaData),
          fromId: fromId,
          toId: toId,
        },
      })
    );
    return {
      type: "success",
      data: `Sent the ans to userId ${toId}`,
    } as const satisfies WsResponse;
  }

  public async trickleIce(
    roomId: string,
    iceCandidate: string,
    fromId: string,
    toId: string
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

    //Send the ICE CANDIDATE TO PARTICULAR USER.
    // currentPod.users.forEach((user) => {
    //   if (user.webSocket != ws) {
    //     user.webSocket.send(
    //       JSON.stringify({
    //         type: "iceCandidate",
    //         data: iceCandidate,
    //       })
    //     );
    //   }
    // });

    const targetPeer = currentPod?.users.find((usr) => {
      return usr.userId == toId;
    });
    if (!targetPeer) {
      return {
        type: "error",
        data: "Could not find the target peer",
      };
    }
    targetPeer.webSocket.send(
      JSON.stringify({
        type: "iceCandidate",
        data: {
          iceCandidate: iceCandidate,
          fromId: fromId,
          toId: toId,
        },
      })
    );
    return {
      type: "success",
      data: "Sent the ice candidates successfully.",
    } as const satisfies WsResponse;
  }
}
