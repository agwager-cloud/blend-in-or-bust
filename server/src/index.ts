import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BlendRoom } from "./BlendRoom.js";
import { resolveRoom } from "./roomDirectory.js";

const port = Number(process.env.PORT ?? 2567);

function applyCorsHeaders(request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin ?? "*";
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader(
    "Access-Control-Allow-Headers",
    request.headers["access-control-request-headers"] ?? "Content-Type, Authorization",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Max-Age", "86400");
}

const httpServer = createServer((request, response) => {
  applyCorsHeaders(request, response);
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
  // Colyseus' matchmaking listener may handle this request after this callback.
  // Do not end matchmake/reconnect responses here.
  if (request.url?.startsWith("/matchmake/")) return;
  response.writeHead(200);
  response.end(JSON.stringify({ message: "Blend in or Bust multiplayer server" }));
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    // The first Babylon museum build can briefly occupy the browser main
    // thread on iPads and slower laptops. Keep heartbeat tolerance generous
    // enough for the first load without disabling heartbeat checks.
    pingInterval: 10_000,
    pingMaxRetries: 18,
  }),
});

// Raw Colyseus usage does not add CORS to matchmaking/reconnect routes.
// Prepend this listener so every HTTP response, including /matchmake/reconnect,
// receives the required itch.io origin headers before Colyseus writes it.
httpServer.prependListener("request", (request, response) => {
  applyCorsHeaders(request, response);
});

gameServer.define("blend_room", BlendRoom);

await gameServer.listen(port);
console.log(`Blend in or Bust server listening on port ${port}`);
