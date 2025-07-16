import { parse } from "node:url";
import {
  createServer,
  Server,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import next from "next";
import type { WebSocket as WSWebSocket } from "ws";
import { WebSocketServer } from "ws";
import { Socket } from "node:net";
import { userManager } from "./lib/podcast/userManager";
import { podSpaceManager } from "./lib/podcast/podSpaceManager";

const nextApp = next({ dev: process.env.NODE_ENV !== "production" });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      handle(req, res, parse(req.url || "", true));
    }
  );

  const wss = new WebSocketServer({ noServer: true });
  const userMan = new userManager();
  const podMan = new podSpaceManager();

  wss.on("connection", (ws: WSWebSocket) => {
    const clientId = randomUUID();

    console.log("New client connected");
    userMan.addUser(clientId, ws);

    //Send the new id to the user
    ws.send(
      JSON.stringify({
        type: "clientIdGenerated",
        data: clientId,
      })
    );

    ws.on("message", async function (msg) {
      const { event, data } = JSON.parse(msg.toString());
      //Logic to assign a room to the user.
      if (event == "createNewRoom") {
        const res = JSON.stringify(podMan.createRoom(ws, data.userId));
        ws.send(res);
      }
      if (event == "joinRoom") {
        const res = JSON.stringify(
          podMan.joinRoom(ws, data.roomId, data.userId)
        );
        ws.send(res);
      }

      //A handler that sends the sdp offer to all the clients in the podSpace.
      if (event == "sendSdpOffer") {
        const res = JSON.stringify(
          await podMan.sendSdpOffer(data.roomId, data.offer, ws)
        );
        ws.send(res);
      }

      //A handler that sends the answer of an sdp offer to all the clients in the podSpace.
      if (event == "sendAnswer") {
        const res = JSON.stringify(
          await podMan.answer(data.roomId, data.answer, ws)
        );
        ws.send(res);
      }

      //A handler to send the ice candidates
      if (event == "trickleIce") {
        const res = JSON.stringify(
          await podMan.trickleIce(data.roomId, data.iceCandidate, ws)
        );
        ws.send(res);
      }
    });
  });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === "/_next/webpack-hmr") {
      nextApp.getUpgradeHandler()(req, socket, head);
    }

    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  server.listen(3000);
  console.log("Server listening on port 3000");
});
