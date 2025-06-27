import { parse } from "node:url";
import {
  createServer,
  Server,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";
import { Socket } from "node:net";

const nextApp = next({ dev: process.env.NODE_ENV !== "production" });
const handle = nextApp.getRequestHandler();
const clients: Map<WebSocket, string> = new Map();

nextApp.prepare().then(() => {
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      handle(req, res, parse(req.url || "", true));
    }
  );

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket) => {
    const clientId = randomUUID();
    // clients.add("yatharth", ws);
    clients.set(ws, clientId);

    console.log("New client connected");

    //Send the new id to the user
    ws.send(
      JSON.stringify({
        clientId: clientId,
        data: "Connection eshtabilished successfully",
      })
    );

    ws.on("message", (message: string) => {
      console.log(`Message received: ${message}`);
      const data = JSON.parse(message);
      const receiver = data.receiver;
      const action = data.action;
      const content = data.content;

      let receiverWs: WebSocket | null = null;
      clients.forEach((v, k) => {
        if (v == receiver) {
          receiverWs = k;
        }
      });
      if (!receiverWs) {
        return;
      }
      (receiverWs as WebSocket).send(
        JSON.stringify({
          action: action,
          content: content,
        })
      );
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log("Client disconnected");
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
