import { createServer } from "node:http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BlendRoom } from "./BlendRoom.js";
import { resolveRoom } from "./roomDirectory.js";

const port = Number(process.env.PORT ?? 2567);

const httpServer = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({ ok: true, game: "Blend in or Bust" }));
    return;
  }
  const roomMatch = request.url?.match(/^\/rooms\/(\d{5})$/);
  if (roomMatch) {
    const roomId = resolveRoom(roomMatch[1]);
    response.writeHead(roomId ? 200 : 404);
    response.end(JSON.stringify(roomId ? { roomId } : { error: "Room not found" }));
    return;
  }
  response.writeHead(200);
  response.end(JSON.stringify({ message: "Blend in or Bust multiplayer server" }));
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("blend_room", BlendRoom);

await gameServer.listen(port);
console.log(`Blend in or Bust server listening on port ${port}`);
