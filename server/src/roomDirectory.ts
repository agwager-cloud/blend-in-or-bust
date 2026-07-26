const roomsByCode = new Map<string, string>();

export function createRoomCode(): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    if (!roomsByCode.has(code)) return code;
  }
  throw new Error("Unable to allocate a room code");
}

export function registerRoom(code: string, roomId: string): void {
  roomsByCode.set(code, roomId);
}

export function unregisterRoom(code: string): void {
  roomsByCode.delete(code);
}

export function resolveRoom(code: string): string | undefined {
  return roomsByCode.get(code);
}
