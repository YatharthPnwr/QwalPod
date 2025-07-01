import type { WebSocket as WSWebSocket } from "ws";
export interface User {
  userId: string;
  webSocket: WSWebSocket;
}

export class userManager {
  private users: User[];
  constructor() {
    this.users = [];
  }

  public addUser(userId: string, webSocket: WSWebSocket) {
    const newUser = {
      userId: userId,
      webSocket: webSocket,
    };
    this.users.push(newUser);
  }
}
