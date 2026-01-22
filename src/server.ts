import { parse } from "node:url";
import {
  createServer,
  Server,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import next from "next";
import type { WebSocket as WSWebSocket } from "ws";
import { WebSocketServer } from "ws";
import { Socket } from "node:net";
import { podSpaceManager } from "./lib/podcast/podSpaceManager";

const nextApp = next({ dev: process.env.NODE_ENV !== "production" });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      handle(req, res, parse(req.url || "", true));
    },
  );

  const wss = new WebSocketServer({ noServer: true });
  const podMan = new podSpaceManager();

  wss.on("connection", (ws: WSWebSocket) => {
    ws.on("message", async function (msg) {
      const { event, data } = JSON.parse(msg.toString());
      //Logic to assign a room to the user.
      if (event == "getUsersInRoom") {
        const roomId = data.roomId;
        const res = JSON.stringify(podMan.getExistingUsers(roomId));
        ws.send(res);
      }
      if (event == "createNewRoom") {
        const res = JSON.stringify(podMan.createRoom(ws));
        ws.send(res);
      }
      if (event == "joinRoom") {
        const res = podMan.joinRoom(ws, data.roomId, data.userId);

        ws.send(JSON.stringify(res));
      }

      //A handler that sends the sdp offer to all the clients in the podSpace.
      if (event == "sendSdpOffer") {
        const res = JSON.stringify(
          await podMan.sendSdpOffer(
            data.roomId,
            data.offer,
            new Map(Object.entries(data.streamMetaData)),
            data.fromId,
            data.toId,
          ),
        );
        ws.send(res);
      }

      //A handler that sends the answer of an sdp offer to all the clients in the podSpace.
      if (event == "sendAnswer") {
        console.log("Sending the answer to", data.toId);
        const res = JSON.stringify(
          await podMan.answer(
            data.roomId,
            data.answer,
            data.fromId,
            data.toId,
            new Map(Object.entries(data.streamMetaData)),
          ),
        );
        ws.send(res);
      }

      //A handler to send the ice candidates
      if (event == "trickleIce") {
        const res = JSON.stringify(
          await podMan.trickleIce(
            data.roomId,
            data.iceCandidate,
            data.fromId,
            data.toId,
          ),
        );
        ws.send(res);
      }
      if (event == "startScreenShare") {
        const { roomId, userId } = data;
        console.log("User ID STARTING IS,", userId);
        ws.send(JSON.stringify(await podMan.startScreenShare(roomId, userId)));
      }
      if (event == "screenShareEnded") {
        const { roomId, userId } = data;
        ws.send(JSON.stringify(await podMan.endScreenShare(roomId, userId)));
      }

      if (event == "disconnecting") {
        const roomId = data.roomId;
        const user = data.userId;
        await podMan.disconnecting(roomId, user);
      }
    });

    // Handle cleanup when connection closes
    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === "/_next/webpack-hmr") {
      nextApp.getUpgradeHandler()(req, socket, head);
      return; // ADD THIS RETURN
    }

    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return; // ADD THIS RETURN
    }

    // If no matching path, destroy the socket
    socket.destroy();
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
