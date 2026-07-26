import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Matrix,
  PBRMaterial,
  PointLight,
  Ray,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Texture,
  Vector3,
} from "@babylonjs/core";
// Register Babylon's scene loaders through the package entry point. Importing
// the OBJ directory directly is not resolved consistently by Vite on Windows.
import "@babylonjs/loaders";
import { Client, Room } from "colyseus.js";
import "./style.css";

const assetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const titleBackgroundUrl = new URL(
  assetUrl("assets/title-background.jpg"),
  document.baseURI,
).href;
document.documentElement.style.setProperty(
  "--title-background-image",
  `url("${titleBackgroundUrl}")`,
);

function revealAppWhenStyled(attempt = 0): void {
  const stylesLoaded = getComputedStyle(document.documentElement)
    .getPropertyValue("--blend-styles-loaded")
    .trim() === "1";
  if (stylesLoaded) {
    document.documentElement.classList.add("app-ready");
    document.querySelector("#boot-loading")?.remove();
    return;
  }
  if (attempt < 100) {
    window.setTimeout(() => revealAppWhenStyled(attempt + 1), 100);
    return;
  }
  const message = document.querySelector<HTMLElement>("#boot-loading-message");
  if (message) {
    message.textContent = "The game files did not load correctly. Refresh the itch.io page and try again.";
  }
}
window.setTimeout(() => revealAppWhenStyled(), 0);

const titleScreen = document.querySelector<HTMLElement>("#title-screen")!;
const lobbyScreen = document.querySelector<HTMLElement>("#lobby-screen")!;
const gameScreen = document.querySelector<HTMLElement>("#game-screen")!;
const sceneLoading = document.querySelector<HTMLElement>("#scene-loading")!;
const sceneLoadingMessage = document.querySelector<HTMLElement>("#scene-loading-message")!;
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const nameInput = document.querySelector<HTMLInputElement>("#player-name")!;
const roomInput = document.querySelector<HTMLInputElement>("#room-code")!;
const formMessage = document.querySelector<HTMLElement>("#form-message")!;
const hostButton = document.querySelector<HTMLButtonElement>("#host-button")!;
const joinButton = document.querySelector<HTMLButtonElement>("#join-button")!;
const practiceButton = document.querySelector<HTMLButtonElement>("#practice-button")!;
const playerLabel = document.querySelector<HTMLElement>("#player-label")!;
const moveStick = document.querySelector<HTMLElement>("#move-stick")!;
const stickKnob = moveStick.querySelector<HTMLElement>(".stick-knob")!;
const lookZone = document.querySelector<HTMLElement>("#look-zone")!;
const blendButton = document.querySelector<HTMLButtonElement>("#blend-button")!;
const blendLabel = blendButton.querySelector<HTMLElement>(".blend-label")!;
const blendMessage = document.querySelector<HTMLElement>("#blend-message")!;
const lobbyCode = document.querySelector<HTMLElement>("#lobby-code")!;
const lobbyMessage = document.querySelector<HTMLElement>("#lobby-message")!;
const playerList = document.querySelector<HTMLElement>("#player-list")!;
const connectionStatus = document.querySelector<HTMLElement>("#connection-status")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-button")!;
const remoteLabels = document.querySelector<HTMLElement>("#remote-labels")!;
const arenaTitle = document.querySelector<HTMLElement>("#arena-title")!;
const arenaSubtitle = document.querySelector<HTMLElement>("#arena-subtitle")!;
const hostSettings = document.querySelector<HTMLElement>("#host-settings")!;
const roundTimeSelect = document.querySelector<HTMLSelectElement>("#round-time")!;
const blenderCountSelect = document.querySelector<HTMLSelectElement>("#blender-count")!;
const botsEnabledSelect = document.querySelector<HTMLSelectElement>("#bots-enabled")!;
const playersCounter = document.querySelector<HTMLElement>("#players-counter")!;
const bustedCounter = document.querySelector<HTMLElement>("#busted-counter")!;
const flagsCounter = document.querySelector<HTMLElement>("#flags-counter")!;
const rubbishCounter = document.querySelector<HTMLElement>("#rubbish-counter")!;
const museumMap = document.querySelector<HTMLElement>("#museum-map")!;
const museumMapGrid = document.querySelector<HTMLElement>("#museum-map-grid")!;
const roundTimer = document.querySelector<HTMLElement>("#round-timer")!;
const roleReveal = document.querySelector<HTMLElement>("#role-reveal")!;
const revealCard = roleReveal.querySelector<HTMLElement>(".reveal-card")!;
const roleTitle = document.querySelector<HTMLElement>("#role-title")!;
const roleInstructions = document.querySelector<HTMLElement>("#role-instructions")!;
const revealCountdown = document.querySelector<HTMLElement>("#reveal-countdown")!;
const resultsOverlay = document.querySelector<HTMLElement>("#results-overlay")!;
const winnerTitle = document.querySelector<HTMLElement>("#winner-title")!;
const winnerMessage = document.querySelector<HTMLElement>("#winner-message")!;
const returnLobbyButton = document.querySelector<HTMLButtonElement>("#return-lobby-button")!;
const resultsWaiting = document.querySelector<HTMLElement>("#results-waiting")!;
const bustButton = document.querySelector<HTMLButtonElement>("#bust-button")!;
const liftButton = document.querySelector<HTMLButtonElement>("#lift-button")!;
const bustedBanner = document.querySelector<HTMLElement>("#busted-banner")!;
const reportButton = document.querySelector<HTMLButtonElement>("#report-button")!;
const meetingOverlay = document.querySelector<HTMLElement>("#meeting-overlay")!;
const meetingEyebrow = document.querySelector<HTMLElement>("#meeting-eyebrow")!;
const meetingTitle = document.querySelector<HTMLElement>("#meeting-title")!;
const meetingMessage = document.querySelector<HTMLElement>("#meeting-message")!;
const meetingTimer = document.querySelector<HTMLElement>("#meeting-timer")!;
const voteGrid = document.querySelector<HTMLElement>("#vote-grid")!;
const skipVoteButton = document.querySelector<HTMLButtonElement>("#skip-vote-button")!;
const voteStatus = document.querySelector<HTMLElement>("#vote-status")!;
const roomNameBadge = document.querySelector<HTMLElement>("#room-name-badge")!;
const hintText = document.querySelector<HTMLElement>(".hint-card span")!;
const privacyBlackout = document.querySelector<HTMLElement>("#privacy-blackout")!;
const blackoutCountdown = document.querySelector<HTMLElement>("#blackout-countdown")!;
const spectatorBadge = document.querySelector<HTMLElement>("#spectator-badge")!;
const spectatorName = document.querySelector<HTMLElement>("#spectator-name")!;
const spectatorRoomCount = document.querySelector<HTMLElement>("#spectator-room-count")!;
const spectatorControls = document.querySelector<HTMLElement>("#spectator-controls")!;
const spectatorPrevRoom = document.querySelector<HTMLButtonElement>("#spectator-prev-room")!;
const spectatorNextRoom = document.querySelector<HTMLButtonElement>("#spectator-next-room")!;
const securityCameraEffect = document.querySelector<HTMLElement>("#security-camera-effect")!;
const securityChannel = securityCameraEffect.querySelector<HTMLElement>(".security-channel")!;
const soundToggle = document.querySelector<HTMLButtonElement>("#sound-toggle")!;
const hudTop = document.querySelector<HTMLElement>(".hud-top")!;
const flagsPill = flagsCounter.closest<HTMLElement>(".status-pill.flags")!;

let game: PracticeGame | undefined;
let activeRoom: Room<any> | undefined;
let reconnecting = false;
let localRole: "seeker" | "blender" | "practice" = "practice";
let blenderTeammates = new Set<string>();
let renderedMeetingNumber = -1;
let submittedVote = "";
let pendingSpectatorConcealment: string[] = [];
let connectionInProgress = false;
let connectionRequestId = 0;
let arenaEntryGeneration = 0;
let arenaEntryPromise: Promise<void> | undefined;
let arenaEntryRoom: Room<any> | undefined;
let museumLoadPromise: Promise<PracticeGame> | undefined;

const SERVER_WAKE_WINDOW_MS = 60_000;
const CONNECTION_ATTEMPT_TIMEOUT_MS = 14_000;
const CONNECTION_RETRY_DELAY_MS = 1_250;

type MultiplayerAction = "host" | "join";

interface OpenedMultiplayerRoom {
  client: Client;
  room: Room<any>;
}

function schemaMap(value: unknown): any | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { get?: unknown; forEach?: unknown };
  return typeof candidate.get === "function" && typeof candidate.forEach === "function"
    ? value as any
    : undefined;
}

function roomPlayers(room: Room<any> | undefined): any | undefined {
  return schemaMap(room?.state?.players);
}

function roomCollection(room: Room<any>, key: "flags" | "rubbish" | "crimes"): any | undefined {
  return schemaMap(room?.state?.[key]);
}

function isCurrentRoom(room: Room<any>): boolean {
  return activeRoom === room;
}

// Keep the original network role identifiers for compatibility, while every
// player-facing screen uses the clearer Blend in or Bust names.
function publicRoleName(role: unknown): string {
  if (role === "blender") return "BUSTER";
  if (role === "seeker") return "BLENDER";
  return String(role ?? "").toUpperCase();
}

const serverUrl = import.meta.env.VITE_SERVER_URL ||
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:2567`;
const httpServerUrl = serverUrl.replace(/^ws/, "http");
const deviceId = getDeviceId();

const syncSoundTogglePlacement = (): void => {
  const inGame = !gameScreen.classList.contains("hidden");
  if (inGame) {
    if (soundToggle.parentElement !== hudTop) hudTop.insertBefore(soundToggle, flagsPill);
    soundToggle.classList.add("in-game-hud");
  } else {
    soundToggle.classList.remove("in-game-hud");
    if (soundToggle.parentElement !== document.body) document.body.append(soundToggle);
  }
};

new MutationObserver(syncSoundTogglePlacement).observe(gameScreen, {
  attributes: true,
  attributeFilter: ["class"],
});
syncSoundTogglePlacement();

const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
const lockedViewport = "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no, interactive-widget=resizes-content";
const gameIsVisible = (): boolean => !gameScreen.classList.contains("hidden");

const restoreLockedViewport = (): void => {
  if (!gameIsVisible()) return;
  if (viewportMeta && viewportMeta.content !== lockedViewport) viewportMeta.content = lockedViewport;
  window.scrollTo(0, 0);
};

for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(eventName, (event) => {
    if (!gameIsVisible()) return;
    event.preventDefault();
    restoreLockedViewport();
  }, { capture: true, passive: false });
}
document.addEventListener("touchmove", (event) => {
  if (gameIsVisible()) event.preventDefault();
}, { capture: true, passive: false });
document.addEventListener("dblclick", (event) => {
  if (gameIsVisible()) event.preventDefault();
}, { capture: true });
window.visualViewport?.addEventListener("resize", () => {
  if (gameIsVisible() && (window.visualViewport?.scale ?? 1) > 1.001) restoreLockedViewport();
});
window.addEventListener("orientationchange", () => {
  window.setTimeout(restoreLockedViewport, 80);
  window.setTimeout(restoreLockedViewport, 320);
});

class BackgroundMusic {
  private readonly tracks = [
    assetUrl("assets/music/leberch-landscape-history-255440.mp3"),
    assetUrl("assets/music/leberch-history-ambient-375201.mp3"),
    assetUrl("assets/music/leberch-history-music-355590.mp3"),
    assetUrl("assets/music/leberch-background-history-375263.mp3"),
    assetUrl("assets/music/leberch-history-movie-375359.mp3"),
  ];
  private queue: string[] = [];
  private lastTrack = "";
  private started = false;
  private meetingActive = false;
  private muted = localStorage.getItem("blend-music-muted") === "true";
  private readonly audio = new Audio();
  private readonly meetingAudio = new Audio(assetUrl("assets/music/leberch-dark-history-262605.mp3"));

  constructor() {
    this.audio.volume = 0.14;
    this.audio.preload = "auto";
    this.audio.addEventListener("ended", () => this.playNext());
    this.meetingAudio.volume = 0.16;
    this.meetingAudio.preload = "auto";
    this.meetingAudio.loop = true;
    this.meetingAudio.muted = this.muted;
    this.syncButton();
    const unlock = () => {
      this.started = true;
      if (!this.muted && !this.meetingActive && this.audio.paused) this.playNext();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    soundToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.started = true;
      this.muted = !this.muted;
      localStorage.setItem("blend-music-muted", String(this.muted));
      this.audio.muted = this.muted;
      this.meetingAudio.muted = this.muted;
      if (!this.muted && this.meetingActive) {
        void this.meetingAudio.play().catch(() => undefined);
      } else if (!this.muted && this.audio.paused) {
        this.playNext();
      }
      this.syncButton();
    });
  }

  setMeetingActive(active: boolean): void {
    if (this.meetingActive === active) return;
    this.meetingActive = active;
    if (active) {
      this.audio.pause();
      this.meetingAudio.currentTime = 0;
      this.meetingAudio.muted = this.muted;
      if (this.started && !this.muted) {
        void this.meetingAudio.play().catch(() => undefined);
      }
    } else if (this.started && !this.muted) {
      this.meetingAudio.pause();
      this.meetingAudio.currentTime = 0;
      void this.audio.play().catch(() => this.playNext());
    } else {
      this.meetingAudio.pause();
      this.meetingAudio.currentTime = 0;
    }
  }

  private playNext(): void {
    if (!this.started || this.muted || this.meetingActive) return;
    if (this.queue.length === 0) {
      this.queue = [...this.tracks].sort(() => Math.random() - 0.5);
      if (this.queue[0] === this.lastTrack && this.queue.length > 1) {
        [this.queue[0], this.queue[1]] = [this.queue[1], this.queue[0]];
      }
    }
    const next = this.queue.shift();
    if (!next) return;
    this.lastTrack = next;
    this.audio.src = next;
    this.audio.muted = this.muted;
    void this.audio.play().catch(() => undefined);
  }

  private syncButton(): void {
    soundToggle.querySelector("span")!.textContent = this.muted ? "OFF" : "ON";
    soundToggle.querySelector("strong")!.textContent = this.muted ? "MUSIC OFF" : "MUSIC ON";
    soundToggle.setAttribute("aria-label", this.muted ? "Play background music" : "Mute background music");
    soundToggle.classList.toggle("muted", this.muted);
  }
}

const backgroundMusic = new BackgroundMusic();

function validName(): string | undefined {
  const name = nameInput.value.trim();
  if (name.length < 2) {
    formMessage.textContent = "Please enter a player name with at least 2 characters.";
    nameInput.focus();
    return;
  }
  localStorage.setItem("blend-player-name", name);
  return name;
}

function getDeviceId(): string {
  const stored = localStorage.getItem("blend-device-id");
  if (stored) return stored;
  const created = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  localStorage.setItem("blend-device-id", created);
  return created;
}

function setConnectionControlsBusy(action: MultiplayerAction, busy: boolean): void {
  hostButton.disabled = busy;
  joinButton.disabled = busy;
  practiceButton.disabled = busy;
  hostButton.textContent = busy && action === "host" ? "CONNECTING..." : "HOST GAME";
  joinButton.textContent = busy && action === "join" ? "CONNECTING..." : "JOIN GAME";
}

function updateServerWakeMessage(
  action: MultiplayerAction,
  deadline: number,
  roomCode: string,
): void {
  const remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const task = action === "host"
    ? "creating your room"
    : `finding room ${roomCode}`;
  formMessage.textContent =
    `FREE SERVER MAY BE ASLEEP - waking it now and ${task}. ` +
    `Please wait; this can take up to 60 seconds. ${remainingSeconds}s remaining.`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isTerminalConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /room not found|room full|24 players|24 participants|removed from this room|different name|already connected|other game tab|device could not be identified|invalid name|forbidden|unauthori[sz]ed|game is locked/i.test(message);
}

function formatConnectionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Could not connect to the server.";
  if (/full|24 players|24 participants/i.test(message)) {
    return "ROOM FULL - this room already has 24 players. Please host a new room for the additional students.";
  }
  return message;
}

function openRoomWithTimeout(
  action: MultiplayerAction,
  name: string,
  roomCode: string,
  timeoutMs: number,
): Promise<OpenedMultiplayerRoom> {
  const client = new Client(serverUrl);
  const abortController = new AbortController();
  const operation = (async (): Promise<OpenedMultiplayerRoom> => {
    if (action === "host") {
      const room = await client.create("blend_room", { name, deviceId });
      return { client, room };
    }

    const response = await fetch(`${httpServerUrl}/rooms/${roomCode}`, {
      cache: "no-store",
      signal: abortController.signal,
    });
    if (response.status === 404) throw new Error("Room not found. Check the five-digit code.");
    if (!response.ok) throw new Error(`The server returned ${response.status} while finding the room.`);
    const result = await response.json() as { roomId?: string };
    if (!result.roomId) throw new Error("Room not found. Check the five-digit code.");
    const room = await client.joinById(result.roomId, { name, deviceId });
    return { client, room };
  })();

  return new Promise<OpenedMultiplayerRoom>((resolve, reject) => {
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      abortController.abort();
      const error = new Error("The connection attempt timed out while the free server was waking.");
      error.name = "ServerWakeAttemptTimeout";
      reject(error);
    }, timeoutMs);

    operation.then((opened) => {
      if (finished) {
        void opened.room.leave(true);
        return;
      }
      finished = true;
      window.clearTimeout(timeout);
      resolve(opened);
    }).catch((error: unknown) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      reject(error);
    });
  });
}

async function connectMultiplayer(action: MultiplayerAction): Promise<void> {
  if (connectionInProgress) return;
  const name = validName();
  if (!name) return;
  const roomCode = roomInput.value.trim();
  if (action === "join" && !/^\d{5}$/.test(roomCode)) {
    formMessage.textContent = "Enter the 5-digit room code to join.";
    roomInput.focus();
    return;
  }

  connectionInProgress = true;
  const requestId = ++connectionRequestId;
  const deadline = Date.now() + SERVER_WAKE_WINDOW_MS;
  setConnectionControlsBusy(action, true);
  updateServerWakeMessage(action, deadline, roomCode);
  const statusTimer = window.setInterval(
    () => updateServerWakeMessage(action, deadline, roomCode),
    1_000,
  );

  let lastError: unknown;
  try {
    while (requestId === connectionRequestId && Date.now() < deadline) {
      const remainingMs = deadline - Date.now();
      try {
        const opened = await openRoomWithTimeout(
          action,
          name,
          roomCode,
          Math.max(1_000, Math.min(CONNECTION_ATTEMPT_TIMEOUT_MS, remainingMs)),
        );
        if (requestId !== connectionRequestId) {
          void opened.room.leave(true);
          return;
        }

        arenaEntryGeneration += 1;
        activeRoom = opened.room;
        bindRoom(opened.room, opened.client);
        titleScreen.classList.add("hidden");
        lobbyScreen.classList.remove("hidden");
        updateLobby();
        if (["reveal", "game", "discussion", "voting", "verdict", "results"]
          .includes(String(opened.room.state.phase))) {
          requestEnterMultiplayerArena(opened.room);
        }
        return;
      } catch (error) {
        lastError = error;
        if (isTerminalConnectionError(error)) throw error;
        const retryDelay = Math.min(CONNECTION_RETRY_DELAY_MS, deadline - Date.now());
        if (retryDelay > 0) await wait(retryDelay);
      }
    }

    if (requestId === connectionRequestId) {
      const finalDetail = lastError instanceof Error && lastError.name !== "ServerWakeAttemptTimeout"
        ? ` Last response: ${lastError.message}`
        : "";
      throw new Error(
        "SERVER DID NOT RESPOND WITHIN 60 SECONDS - the free server may still be waking. " +
        `Press Host or Join to try again.${finalDetail}`,
      );
    }
  } catch (error) {
    if (requestId === connectionRequestId) formMessage.textContent = formatConnectionError(error);
  } finally {
    window.clearInterval(statusTimer);
    if (requestId === connectionRequestId) {
      connectionInProgress = false;
      setConnectionControlsBusy(action, false);
    }
  }
}

function bindRoom(room: Room<any>, client: Client): void {
  connectionStatus.textContent = "CONNECTED";
  connectionStatus.classList.add("online");
  room.onMessage("room-info", ({ roomCode }: { roomCode: string }) => {
    if (!isCurrentRoom(room)) return;
    lobbyCode.textContent = roomCode;
  });
  room.onMessage("role", ({
    role,
    blenderTeammates: teammateIds = [],
  }: {
    role: "seeker" | "blender";
    blenderTeammates?: string[];
  }) => {
    if (!isCurrentRoom(room)) return;
    localRole = role;
    blenderTeammates = new Set(teammateIds);
    game?.resetForRound();
    updateRoleReveal();
  });
  room.onMessage("disguise-changed", ({
    sessionId,
    disguise,
  }: {
    sessionId: string;
    disguise: string;
  }) => {
    if (!isCurrentRoom(room)) return;
    game?.syncRemoteDisguise(sessionId, disguise);
  });
  room.onMessage("busted", ({
    targetSessionId,
    attackerSessionId,
  }: {
    targetSessionId: string;
    attackerSessionId: string;
  }) => {
    if (!isCurrentRoom(room)) return;
    game?.handleBust(targetSessionId);
    if (attackerSessionId === room.sessionId) game?.confirmBust();
  });
  room.onMessage("ejected", ({ targetSessionId }: { targetSessionId: string }) => {
    if (!isCurrentRoom(room)) return;
    game?.handleBust(targetSessionId);
  });
  room.onMessage("spectator-conceal", ({ sessionIds }: { sessionIds: string[] }) => {
    if (!isCurrentRoom(room)) return;
    pendingSpectatorConcealment = [...sessionIds];
    game?.setSpectatorConcealment(sessionIds);
  });
  room.onMessage("late-spectator", () => {
    if (!isCurrentRoom(room)) return;
    formMessage.textContent = "Joined the active round as a security-camera spectator.";
  });
  room.onMessage("reset-positions", ({
    positions,
  }: {
    positions: Record<string, { x: number; y: number; z: number; rotation: number }>;
  }) => {
    if (!isCurrentRoom(room)) return;
    game?.resetRoundPositions(positions);
  });
  room.onMessage("bust-cooldown", ({ durationMs }: { durationMs: number }) => {
    if (!isCurrentRoom(room)) return;
    game?.setGlobalBustCooldown(durationMs);
  });
  room.onMessage("flag-found", ({ by }: { by: string }) => {
    if (!isCurrentRoom(room)) return;
    flagsCounter.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35)", color: "#fff" }, { transform: "scale(1)" }],
      { duration: 500 },
    );
    game?.showObjectiveNotice(`${by} found a flag!`, 4200);
  });
  room.onMessage("rubbish-collected", ({ id, by }: { id: string; by: string }) => {
    if (!isCurrentRoom(room)) return;
    rubbishCounter.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.28)", color: "#fff" }, { transform: "scale(1)" }],
      { duration: 420 },
    );
    game?.collectRubbishVisual(id);
    game?.showObjectiveNotice(`${by} cleaned up some rubbish!`, 3200);
  });
  room.onMessage("bot-lift", ({ containerId }: { containerId: string }) => {
    if (!isCurrentRoom(room)) return;
    game?.handleBotLift(containerId);
  });
  room.onMessage("lifted", ({
    containerId,
    flagId,
    collected,
  }: {
    containerId: string;
    flagId: string;
    collected?: boolean;
  }) => {
    if (!isCurrentRoom(room)) return;
    game?.handleLifted(containerId, flagId, Boolean(collected));
    game?.showObjectiveNotice(
      collected
        ? "You found a hidden flag!"
        : flagId
          ? "A flag is hidden here - only a Blender can collect it."
          : "Nothing was hidden here.",
      collected ? 5000 : 2600,
    );
  });
  room.onStateChange(() => {
    if (!isCurrentRoom(room)) return;
    updateLobby();
    const matchInProgress = ["reveal", "game", "discussion", "voting", "verdict", "results"]
      .includes(String(room.state?.phase));
    if (matchInProgress && gameScreen.classList.contains("hidden")) {
      requestEnterMultiplayerArena(room);
    }
    updateMatchScreens(room);
    updateMeetingUi(room);
  });
  room.onLeave(async (code) => {
    if (activeRoom !== room) return;
    if (code === 4001) {
      // A host removal requires a new name before this browser can rejoin the
      // same room. Clear the saved value so the player cannot accidentally
      // submit the removed name again without editing it.
      localStorage.removeItem("blend-player-name");
      nameInput.value = "";
      leaveRoom(false, "The host removed you. Enter a different name before rejoining this room.");
      window.setTimeout(() => nameInput.focus(), 0);
      return;
    }
    if (code === 1000 || reconnecting || activeRoom !== room) return;
    reconnecting = true;
    connectionStatus.textContent = "RECONNECTING";
    connectionStatus.classList.remove("online");
    try {
      const restored = await client.reconnect(room.reconnectionToken);
      activeRoom = restored;
      game?.setRoom(restored);
      bindRoom(restored, client);
    } catch {
      leaveRoom(false, "Connection lost. Please join the room again.");
    } finally {
      reconnecting = false;
    }
  });
}

function updateLobby(): void {
  const room = activeRoom;
  if (!room?.state) return;
  const players = roomPlayers(room);
  if (!players) return;
  lobbyCode.textContent = room.state.roomCode || lobbyCode.textContent;
  playerList.replaceChildren();
  const localIsHost = Boolean(players.get(room.sessionId)?.isHost);
  players.forEach((player: any, sessionId: string) => {
    const row = document.createElement("div");
    row.className = "lobby-player";
    row.innerHTML = `<span class="player-dot"></span><span class="lobby-player-name"></span>${player.isHost ? '<span class="host-badge">HOST</span>' : ""}`;
    row.querySelector<HTMLElement>(".lobby-player-name")!.textContent = player.isLateSpectator
      ? `${player.name} | SPECTATOR`
      : player.name;
    if (localIsHost && sessionId !== room.sessionId && !player.isBot) {
      const removeButton = document.createElement("button");
      removeButton.className = "remove-player";
      removeButton.type = "button";
      removeButton.textContent = "REMOVE";
      removeButton.setAttribute("aria-label", `Remove ${player.name} from the lobby`);
      removeButton.addEventListener("click", () => room.send("kick-player", sessionId));
      row.append(removeButton);
    }
    playerList.append(row);
  });
  startButton.classList.toggle("hidden", !localIsHost);
  hostSettings.classList.toggle("hidden", !localIsHost);
  roundTimeSelect.value = String(room.state.roundSeconds);
  blenderCountSelect.value = String(room.state.blenderOverride);
  botsEnabledSelect.value = !room.state.botsEnabled
    ? "off"
    : room.state.balancedHumanRoles ? "balanced" : "on";
  let lobbyParticipants = 0;
  let lobbySpectators = 0;
  players.forEach((player: any) => {
    if (player.isBot) return;
    if (player.isLateSpectator) lobbySpectators += 1;
    else lobbyParticipants += 1;
  });
  playerList.classList.toggle("crowded", lobbyParticipants + lobbySpectators >= 13);
  playerList.classList.toggle("full", lobbyParticipants >= 24);
  lobbyMessage.classList.toggle("room-full", lobbyParticipants >= 24);
  lobbyMessage.textContent = lobbyParticipants >= 24
    ? "24 / 24 participants - ROOM FULL - additional students should host a new room."
    : lobbySpectators > 0
      ? `${lobbyParticipants} / 24 participants - ${lobbySpectators} spectators - Share code ${room.state.roomCode}`
      : `${lobbyParticipants} / 24 participants - Share code ${room.state.roomCode}`;
}

function updateRoleReveal(): void {
  const buster = localRole === "blender";
  roleTitle.textContent = buster ? "BUSTER" : "BLENDER";
  roleInstructions.textContent = buster
    ? "You cannot collect flags or rubbish. Disguise yourself, deceive the Blenders and Bust them before they complete the museum objectives."
    : "Find every hidden flag, clean up the rubbish, survive the Busters and report crime scenes.";
  revealCard.classList.toggle("buster", buster);
}

function updateMatchScreens(room: Room<any>): void {
  if (!isCurrentRoom(room)) return;
  const players = roomPlayers(room);
  if (!players) return;
  const phase = String(room.state?.phase ?? "lobby");
  const local = players.get(room.sessionId);
  const lateSpectator = Boolean(local?.isLateSpectator);
  roleReveal.classList.toggle("hidden", phase !== "reveal" || lateSpectator);
  resultsOverlay.classList.toggle("hidden", phase !== "results");
  flagsCounter.textContent = `FLAGS ${room.state.flagsFound} / ${room.state.flagsRequired}`;
  const rubbishLeft = Math.max(0, Number(room.state.rubbishRequired ?? 0) - Number(room.state.rubbishCollected ?? 0));
  rubbishCounter.textContent = `${rubbishLeft} RUBBISH LEFT`;
  let activePlayers = 0;
  let bustedPlayers = 0;
  players.forEach((player: any) => {
    if (player.isLateSpectator) return;
    if (player.alive) activePlayers += 1;
    else bustedPlayers += 1;
  });
  playersCounter.textContent = `${activePlayers} ACTIVE`;
  bustedCounter.textContent = `${bustedPlayers} busted`;
  if (phase === "results") {
    const blendersWon = room.state.winner === "seekers";
    const objectivesComplete = room.state.flagsFound >= room.state.flagsRequired && rubbishLeft === 0;
    winnerTitle.textContent = blendersWon ? "BLENDERS WIN!" : "BUSTERS WIN!";
    winnerMessage.textContent = blendersWon
      ? objectivesComplete
        ? "The Blenders found every flag and cleaned the entire museum."
        : "Every Buster was identified and voted out."
      : Date.now() >= room.state.roundEndsAt
        ? "The Busters prevented the museum objectives from being completed in time."
        : "No active Blenders remain.";
    returnLobbyButton.classList.toggle("hidden", !local?.isHost);
    resultsWaiting.classList.toggle("hidden", Boolean(local?.isHost));
  }
  if (phase === "lobby" && !lobbyScreen.classList.contains("hidden")) return;
  if (phase === "lobby") {
    game?.pause();
    resultsOverlay.classList.add("hidden");
    roleReveal.classList.add("hidden");
    gameScreen.classList.add("hidden");
    lobbyScreen.classList.remove("hidden");
    localRole = "practice";
    updateLobby();
  }
}

function updateMeetingUi(room: Room<any>): void {
  if (!isCurrentRoom(room)) return;
  const players = roomPlayers(room);
  if (!players) return;
  const phase = String(room.state?.phase ?? "lobby");
  const meetingActive = ["discussion", "voting", "verdict"].includes(phase);
  backgroundMusic.setMeetingActive(meetingActive);
  meetingOverlay.classList.toggle("hidden", !meetingActive);
  if (!meetingActive) return;
  const local = players.get(room.sessionId);
  if (renderedMeetingNumber !== room.state.meetingNumber) {
    renderedMeetingNumber = room.state.meetingNumber;
    submittedVote = "";
  }
  voteGrid.replaceChildren();
  players.forEach((player: any, sessionId: string) => {
    const button = document.createElement("button");
    button.className = "vote-card";
    const displayName = player.isBot ? `${player.name} | BOT` : player.name;
    button.textContent = player.isLateSpectator
      ? `${displayName} - SPECTATOR`
      : player.alive ? displayName : `${displayName} - BUSTED`;
    button.disabled = phase !== "voting" || !local?.alive || !player.alive
      || Boolean(player.isLateSpectator) || Boolean(submittedVote);
    button.classList.toggle("selected", submittedVote === sessionId);
    button.addEventListener("click", () => submitVote(sessionId));
    voteGrid.append(button);
  });
  skipVoteButton.classList.toggle("hidden", phase !== "voting");
  skipVoteButton.disabled = !local?.alive || Boolean(submittedVote);
  if (phase === "discussion") {
    meetingEyebrow.textContent = `${room.state.meetingReporter} REPORTED THE SCENE`;
    meetingTitle.textContent = "DISCUSS!";
    meetingMessage.textContent = local?.alive
      ? "Talk aloud. Who was behaving suspiciously?"
      : "Silent spectator: listen, but do not reveal who you suspect.";
    voteStatus.textContent = "Movement, bots, flags, rubbish and the round timer are paused.";
  } else if (phase === "voting") {
    meetingEyebrow.textContent = "CAST YOUR VOTE";
    meetingTitle.textContent = local?.alive ? "WHO IS THE BUSTER?" : "WATCH THE VOTE";
    meetingMessage.textContent = local?.alive
      ? "Choose one active player or skip. Your choice cannot be changed."
      : "Busted players cannot vote or reveal information.";
    voteStatus.textContent = submittedVote
      ? "Vote submitted - waiting for the others."
      : `${room.state.votesCast} votes submitted`;
  } else {
    meetingEyebrow.textContent = "VOTE RESULT";
    meetingTitle.textContent = room.state.verdictText || "COUNTING VOTES...";
    meetingMessage.textContent = room.state.verdictRole
      ? `Their role was ${publicRoleName(room.state.verdictRole)}.`
      : "The round will resume if both teams are still active.";
    voteStatus.textContent = "Returning to the arena shortly...";
  }
}

function submitVote(targetId: string): void {
  if (!activeRoom || submittedVote) return;
  submittedVote = targetId;
  activeRoom.send("vote", targetId);
  updateMeetingUi(activeRoom);
}

skipVoteButton.addEventListener("click", () => submitVote("skip"));

function showSceneLoading(message: string): void {
  sceneLoadingMessage.textContent = message;
  sceneLoading.classList.remove("hidden");
}

function hideSceneLoading(): void {
  sceneLoading.classList.add("hidden");
}

async function ensureMuseumLoaded(): Promise<PracticeGame> {
  if (game) return game;
  if (museumLoadPromise) return museumLoadPromise;

  showSceneLoading("Building the 25 museum rooms...");
  const nextGame = new PracticeGame(canvas, playerLabel);
  museumLoadPromise = (async () => {
    try {
      await nextGame.start((message) => showSceneLoading(message));
      game = nextGame;
      return nextGame;
    } catch (error) {
      console.error("Museum loading failed", error);
      sceneLoadingMessage.textContent = "The museum could not finish loading. Refresh the itch.io page and try again.";
      throw error;
    } finally {
      museumLoadPromise = undefined;
    }
  })();
  return museumLoadPromise;
}

async function waitForRoundState(room: Room<any>, generation: number): Promise<void> {
  const deadline = performance.now() + 6_000;
  while (performance.now() < deadline) {
    if (generation !== arenaEntryGeneration || !isCurrentRoom(room)) return;
    const players = roomPlayers(room);
    if (players) {
      let humanCount = 0;
      let botCount = 0;
      players.forEach((player: any) => {
        if (player?.isLateSpectator) return;
        if (player?.isBot) botCount += 1;
        else humanCount += 1;
      });
      const expectedBots = room.state?.botsEnabled
        ? Math.min(8, Math.max(0, 24 - humanCount))
        : 0;
      if (botCount >= expectedBots) return;
      showSceneLoading(`Syncing players and testing bots... ${botCount} of ${expectedBots}`);
    } else {
      showSceneLoading("Syncing multiplayer room...");
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
}

async function enterMultiplayerArena(room: Room<any>, generation: number): Promise<void> {
  if (!isCurrentRoom(room) || generation !== arenaEntryGeneration) return;
  lobbyScreen.classList.add("hidden");
  titleScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  showSceneLoading("Loading the museum...");
  arenaTitle.textContent = `ROOM ${String(room.state?.roomCode ?? "")}`;
  const playersBeforeLoad = roomPlayers(room);
  arenaSubtitle.textContent = `${Number(playersBeforeLoad?.size ?? 0)} players connected`;
  playerLabel.textContent = nameInput.value.trim().toUpperCase();

  const loadedGame = await ensureMuseumLoaded();
  if (!isCurrentRoom(room) || generation !== arenaEntryGeneration) {
    loadedGame.pause();
    hideSceneLoading();
    return;
  }

  await waitForRoundState(room, generation);
  if (!isCurrentRoom(room) || generation !== arenaEntryGeneration) {
    loadedGame.pause();
    hideSceneLoading();
    return;
  }

  loadedGame.setRoom(room);
  if (pendingSpectatorConcealment.length > 0) {
    loadedGame.setSpectatorConcealment(pendingSpectatorConcealment);
  }
  const local = roomPlayers(room)?.get(room.sessionId);
  if (local?.isLateSpectator) room.send("spectator-ready");
  loadedGame.resume();
  updateRoleReveal();
  updateMatchScreens(room);
  window.requestAnimationFrame(() => hideSceneLoading());
}

function requestEnterMultiplayerArena(room: Room<any>): void {
  if (!isCurrentRoom(room)) return;
  if (arenaEntryPromise && arenaEntryRoom === room) return;
  const generation = arenaEntryGeneration;
  const entryPromise = enterMultiplayerArena(room, generation)
    .catch((error) => {
      if (generation === arenaEntryGeneration && isCurrentRoom(room)) {
        console.error("Arena entry failed", error);
        sceneLoadingMessage.textContent = "The game scene could not finish loading. Return to the lobby and try again.";
      }
    })
    .finally(() => {
      if (arenaEntryPromise === entryPromise) {
        arenaEntryPromise = undefined;
        arenaEntryRoom = undefined;
      }
    });
  arenaEntryRoom = room;
  arenaEntryPromise = entryPromise;
}

async function enterPractice(): Promise<void> {
  const name = validName();
  if (!name) return;
  const generation = ++arenaEntryGeneration;
  titleScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  showSceneLoading("Loading the museum...");
  arenaTitle.textContent = "MIDNIGHT MUSEUM";
  arenaSubtitle.textContent = "Local museum exploration";
  playerLabel.textContent = name.toUpperCase();
  const loadedGame = await ensureMuseumLoaded();
  if (generation !== arenaEntryGeneration || activeRoom) {
    loadedGame.pause();
    hideSceneLoading();
    return;
  }
  loadedGame.setRoom(undefined);
  loadedGame.resume();
  window.requestAnimationFrame(() => hideSceneLoading());
}

hostButton.addEventListener("click", () => void connectMultiplayer("host"));
joinButton.addEventListener("click", () => void connectMultiplayer("join"));
practiceButton.addEventListener("click", enterPractice);
document.querySelector("#back-button")!.addEventListener("click", () => {
  arenaEntryGeneration += 1;
  hideSceneLoading();
  if (activeRoom) {
    leaveRoom(true);
    return;
  }
  game?.pause();
  gameScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  titleScreen.classList.remove("hidden");
});
const currentLobbySettings = () => ({
  roundSeconds: Number(roundTimeSelect.value),
  blenderOverride: Number(blenderCountSelect.value),
  botsEnabled: botsEnabledSelect.value !== "off",
  balancedHumanRoles: botsEnabledSelect.value === "balanced",
});
const sendSettings = () => activeRoom?.send("settings", currentLobbySettings());
roundTimeSelect.addEventListener("change", sendSettings);
blenderCountSelect.addEventListener("change", sendSettings);
botsEnabledSelect.addEventListener("change", sendSettings);
startButton.addEventListener("click", () => activeRoom?.send("start", currentLobbySettings()));
returnLobbyButton.addEventListener("click", () => activeRoom?.send("return-lobby"));
document.querySelector("#leave-button")!.addEventListener("click", () => leaveRoom(true));

function leaveRoom(consented: boolean, message = "You left the room."): void {
  arenaEntryGeneration += 1;
  hideSceneLoading();
  const room = activeRoom;
  activeRoom = undefined;
  if (consented) void room?.leave(true);
  game?.setRoom(undefined);
  game?.pause();
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  titleScreen.classList.remove("hidden");
  connectionStatus.classList.remove("online");
  formMessage.textContent = message;
  localRole = "practice";
  blenderTeammates.clear();
  pendingSpectatorConcealment = [];
  roleReveal.classList.add("hidden");
  resultsOverlay.classList.add("hidden");
  meetingOverlay.classList.add("hidden");
  privacyBlackout.classList.add("hidden");
  spectatorBadge.classList.add("hidden");
  backgroundMusic.setMeetingActive(false);
}

nameInput.value = localStorage.getItem("blend-player-name") ?? "";
roomInput.addEventListener("input", () => {
  roomInput.value = roomInput.value.replace(/\D/g, "").slice(0, 5);
});

interface RemoteAvatar {
  root: TransformNode;
  body: Mesh;
  visor: Mesh;
  collider: Mesh;
  label: HTMLElement;
  target: Vector3;
  targetRotation: number;
  disguiseName: string;
  labelHeight: number;
  lastMovedAt: number;
  labelOpacity: number;
  alive: boolean;
  disguiseMesh?: Mesh;
}

class PracticeGame {
  // v0.18.14 lowered the orbit by about 30 degrees. Raise it back by 15
  // degrees so some ceiling remains visible without dominating portrait views.
  private static readonly DEFAULT_CAMERA_BETA = Math.PI / 2 - Math.PI / 12 - 0.035;
  private static readonly STATIONARY_CAMERA_TURN_SPEED = 1.75;
  // High corner CCTV view: a lower beta places the camera higher above the
  // room and points it farther downward. The wider radius/FOV exposes more of
  // the floor and reduces blind spots directly beneath the security camera.
  // Five degrees farther downward than v0.18.19. The below-floor target keeps
  // each fixed camera under the room ceiling while retaining a wide corner view.
  private static readonly SECURITY_CAMERA_BETA = 1.0 - Math.PI / 36;
  private static readonly SECURITY_CAMERA_RADIUS = 12.75;
  private static readonly SECURITY_CAMERA_FOV = 1.36;
  private static readonly SECURITY_CAMERA_TARGET_Y = -2.5;
  private static readonly ROOM_CENTERS = [-40, -20, 0, 20, 40] as const;
  private static readonly CENTRE_ROOM_INDEX = 12;
  private static readonly GRAND_GALLERY_INDEX = 7;
  private static readonly ROOM_NAMES = [
    "MARITIME HALL", "NATURAL HISTORY", "SPACE GALLERY", "ROYAL COLLECTION", "FOSSIL WING",
    "SCIENCE HALL", "ANCIENT EXHIBIT", "GRAND GALLERY", "NEON ARCADE", "SCULPTURE GARDEN",
    "MIDNIGHT ATRIUM", "GIFT SHOP", "MIDNIGHT ROTUNDA", "WORLD CULTURES", "MUSIC HALL",
    "INVENTION LAB", "ARCTIC GALLERY", "HALL OF WONDERS", "MODERN MASTERS", "OBSERVATORY",
    "INNOVATION VAULT", "OCEANIC GALLERY", "HALL OF LEGENDS", "DISCOVERY LAB", "FUTURE VISIONS",
  ] as const;
  private static readonly LIFT_ANIMATION_MS = 1050;
  private static readonly LIFT_BLEND_LOCK_MS = 1125;
  private static readonly PILLAR_ROOM_INDICES = new Set([1, 3, 5, 9, 15, 19, 21, 23]);
  private engine: Engine;
  private scene: Scene;
  private camera!: ArcRotateCamera;
  private playerRoot!: TransformNode;
  private playerBody!: Mesh;
  private playerVisor!: Mesh;
  private playerCollider!: Mesh;
  private disguiseProps: Mesh[] = [];
  private paintingLiftables: Mesh[] = [];
  private cameraOccluders: Mesh[] = [];
  private securityOverheadMeshes: Mesh[] = [];
  private wallOccludedUntil = new Map<Mesh, number>();
  private remotePlayerColliders: Mesh[] = [];
  private remotePlayers = new Map<string, RemoteAvatar>();
  // Direct server events bridge the few frames before Colyseus state patches
  // arrive, including unblends. This prevents one device from showing a body
  // while another device already shows the same player's disguise.
  private remoteDisguiseOverrides = new Map<string, string>();
  private flagMeshes = new Map<string, TransformNode>();
  private rubbishMeshes = new Map<string, TransformNode>();
  private rubbishCollectedOverrides = new Set<string>();
  private crimeMeshes = new Map<string, TransformNode>();
  private room: Room<any> | undefined;
  private lastNetworkSend = 0;
  private currentDisguiseName = "";
  private localAlive = true;
  private localLateSpectator = false;
  private spectatorConcealmentReady = true;
  private movementSuppressedUntil = 0;
  private bustTargetId = "";
  private liftTargetId = "";
  private lastLiftAnimationAt = -Infinity;
  private liftLockedUntil = -Infinity;
  private globalBustBlockedUntil = 0;
  private reportTargetId = "";
  private spectatorRoomIndex = 12;
  private spectatorPrivacyActive = false;
  private spectatorConcealedPlayers = new Set<string>();
  private targetProp: Mesh | undefined;
  private targetHighlight: Mesh | undefined;
  private disguiseMesh: Mesh | undefined;
  private disguised = false;
  private lastBlendAt = -Infinity;
  private cameraTargetHeight = 1.35;
  private input = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private lookPointer: number | undefined;
  private rightMouseLooking = false;
  private lastLook = { x: 0, y: 0 };
  private pendingLookX = 0;
  private pendingLookY = 0;
  private cameraAlpha = Math.PI / 2;
  private cameraBeta = PracticeGame.DEFAULT_CAMERA_BETA;
  private movePointer: number | undefined;
  private labelOpacity = 1;
  private lastMovedAt = performance.now();
  private lastManualCameraAt = -Infinity;
  private inputAttached = false;
  private playerRoomName = "";
  private lastCrimeAlertAt = -Infinity;
  private lastMapRoomIndex = -1;
  private objectiveNoticeUntil = 0;
  private flagSignalState = "";
  private readonly crimeRoomAudio = new Audio(assetUrl("assets/crime-room-alert.mp3"));
  private running = false;

  constructor(
    private readonly gameCanvas: HTMLCanvasElement,
    private readonly label: HTMLElement,
  ) {
    this.engine = new Engine(gameCanvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: false,
    });
    this.scene = new Scene(this.engine);
    this.crimeRoomAudio.preload = "auto";
    this.crimeRoomAudio.volume = 0.78;
    // Pointer picking every frame is unnecessary in this game and can cause
    // small frame-time spikes on iPads with high-density displays.
    this.scene.skipPointerMovePicking = true;
  }

  async start(reportProgress: (message: string) => void = () => undefined): Promise<void> {
    reportProgress("Building the 25 museum rooms...");
    this.createMuseumMap();
    this.createWorld();
    reportProgress("Loading artwork, furniture and museum props...");
    await this.loadGrandGalleryArt();
    reportProgress("Finishing textures, lighting and sound...");
    await this.scene.whenReadyAsync();
    this.attachInput();
    this.engine.runRenderLoop(() => {
      if (!this.running) return;
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      this.update(dt);
      this.scene.render();
    });
    this.resume();
  }

  resume(): void {
    this.running = true;
    restoreLockedViewport();
    this.engine.resize();
    this.gameCanvas.focus({ preventScroll: true });
    window.setTimeout(() => {
      restoreLockedViewport();
      this.engine.resize();
    }, 120);
  }

  pause(): void {
    this.running = false;
    this.input.clear();
    this.touchMove = { x: 0, y: 0 };
    this.lookPointer = undefined;
    this.rightMouseLooking = false;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    this.gameCanvas.style.cursor = "";
    stickKnob.style.transform = "translate(0px, 0px)";
  }

  showObjectiveNotice(message: string, durationMs = 3200): void {
    hintText.textContent = message;
    this.objectiveNoticeUntil = performance.now() + durationMs;
    this.flagSignalState = "";
    gameScreen.classList.remove("flag-signal-room", "flag-signal-hot");
  }

  setRoom(room: Room<any> | undefined): void {
    this.room = room;
    this.clearRemotePlayers();
    this.remoteDisguiseOverrides.clear();
    this.clearFlags();
    this.clearRubbish();
    this.rubbishCollectedOverrides.clear();
    this.clearCrimes();
    this.playerRoomName = "";
    this.crimeRoomAudio.pause();
    this.crimeRoomAudio.currentTime = 0;
    if (!room || !this.playerCollider) return;
    this.resetForRound();
    const local = roomPlayers(room)?.get(room.sessionId);
    if (local) {
      this.playerCollider.position.set(local.x, 1.12, local.z);
      this.playerRoot.position.set(local.x, 0, local.z);
      this.playerRoot.rotation.y = local.rotation;
      // Spawn the camera on the same side of the centre divider as the player.
      // This prevents even a single first frame from appearing behind a wall.
      this.cameraAlpha = local.z < 0 ? -Math.PI / 2 : Math.PI / 2;
      this.cameraBeta = PracticeGame.DEFAULT_CAMERA_BETA;
      this.applyCameraOrbit();
      const focus = this.playerRoot.position.add(new Vector3(0, this.cameraTargetHeight, 0));
      this.camera.target.copyFrom(focus);
      this.updateCameraOcclusion(focus, 1);
      if (local.isLateSpectator) this.enterLateSpectatorMode();
    }
  }

  resetForRound(): void {
    if (!this.playerBody) return;
    this.disguiseMesh?.dispose();
    this.disguiseMesh = undefined;
    this.disguised = false;
    this.currentDisguiseName = "";
    this.liftTargetId = "";
    this.lastLiftAnimationAt = -Infinity;
    this.liftLockedUntil = -Infinity;
    this.playerBody.setEnabled(true);
    this.playerVisor.setEnabled(true);
    this.playerRoot.scaling.setAll(1);
    this.playerCollider.setEnabled(true);
    this.localAlive = true;
    this.localLateSpectator = false;
    this.spectatorConcealmentReady = true;
    this.movementSuppressedUntil = 0;
    this.cameraTargetHeight = 1.35;
    this.lastBlendAt = -Infinity;
    bustedBanner.classList.add("hidden");
    privacyBlackout.classList.add("hidden");
    spectatorBadge.classList.add("hidden");
    spectatorControls.classList.add("hidden");
    securityCameraEffect.classList.add("hidden");
    gameScreen.classList.remove("security-camera-mode");
    this.spectatorRoomIndex = 12;
    this.spectatorPrivacyActive = false;
    this.spectatorConcealedPlayers.clear();
    this.remoteDisguiseOverrides.clear();
    this.globalBustBlockedUntil = 0;
    this.camera.lowerBetaLimit = 0.82;
    this.camera.upperRadiusLimit = 11;
    this.camera.radius = Math.min(this.camera.radius, 8.5);
    this.camera.fov = 0.9;
    this.lookPointer = undefined;
    this.rightMouseLooking = false;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    this.playerRoomName = "";
    this.lastCrimeAlertAt = -Infinity;
    this.labelOpacity = 1;
    this.label.style.opacity = "1";
    this.lastMapRoomIndex = -1;
    this.objectiveNoticeUntil = 0;
    this.flagSignalState = "";
    hintText.textContent = "Your name fades when you stand still.";
    gameScreen.classList.remove("flag-signal-room", "flag-signal-hot");
  }

  private enterLateSpectatorMode(): void {
    this.localAlive = false;
    this.localLateSpectator = true;
    this.spectatorConcealmentReady = false;
    this.spectatorRoomIndex = PracticeGame.CENTRE_ROOM_INDEX;
    this.spectatorPrivacyActive = false;
    this.playerBody.setEnabled(false);
    this.playerVisor.setEnabled(false);
    this.disguiseMesh?.setEnabled(false);
    this.playerCollider.setEnabled(false);
    this.label.style.opacity = "0";
    bustedBanner.classList.add("hidden");
    privacyBlackout.classList.add("hidden");
  }

  handleBust(targetSessionId: string): void {
    this.playPopSound();
    if (targetSessionId === this.room?.sessionId) {
      this.localAlive = false;
      this.localLateSpectator = false;
      this.spectatorConcealmentReady = false;
      this.spectatorRoomIndex = this.roomIndexAt(this.playerRoot.position.x, this.playerRoot.position.z);
      this.animatePop(this.playerRoot, () => {
        this.playerBody.setEnabled(false);
        this.playerVisor.setEnabled(false);
        this.disguiseMesh?.setEnabled(false);
      });
      this.playerCollider.setEnabled(false);
      bustedBanner.classList.remove("hidden");
      privacyBlackout.classList.remove("hidden");
      spectatorBadge.classList.add("hidden");
      this.label.style.opacity = "0";
      return;
    }
    const avatar = this.remotePlayers.get(targetSessionId);
    if (avatar) {
      avatar.alive = false;
      avatar.label.style.opacity = "0";
      avatar.label.style.display = "none";
      avatar.collider.setEnabled(false);
      this.animatePop(avatar.root, () => avatar.root.setEnabled(false));
    }
  }

  handleBotLift(containerId: string): void {
    // Bot inspections are visible as a prop lift, but flag results remain
    // private so spectators and nearby players gain no hidden information.
    this.animateLift(containerId);
  }

  handleLifted(containerId: string, flagId: string, collected: boolean): void {
    const target = this.liftNodesFor(containerId)[0];
    if (!target) return;
    if (flagId) {
      const flag = this.room ? roomCollection(this.room, "flags")?.get(flagId) : undefined;
      const stablePosition = flag
        ? this.flagPreviewPosition(containerId, Number(flag.x), Number(flag.z))
        : target.getAbsolutePosition();
      this.showPrivateFlag(stablePosition, collected);
    }
    if (collected) {
      flagsCounter.animate(
        [
          { filter: "brightness(1)", transform: "scale(1)" },
          { filter: "brightness(2)", transform: "scale(1.18)" },
          { filter: "brightness(1)", transform: "scale(1)" },
        ],
        { duration: 700 },
      );
      this.showFlagFoundCelebration();
    }
  }

  collectRubbishVisual(id: string): void {
    this.rubbishCollectedOverrides.add(id);
    const root = this.rubbishMeshes.get(id);
    if (!root) return;
    this.rubbishMeshes.delete(id);
    const startedAt = performance.now();
    const animate = () => {
      if (root.isDisposed()) return;
      const amount = Math.min(1, (performance.now() - startedAt) / 280);
      root.scaling.setAll(Math.max(0.01, 1 - amount));
      root.position.y = Math.sin(amount * Math.PI) * 0.55;
      root.rotation.y += 0.12;
      if (amount < 1) requestAnimationFrame(animate);
      else root.dispose();
    };
    requestAnimationFrame(animate);
  }

  confirmBust(): void {
    const oneFlagRemains = this.room
      ? this.room.state.flagsRequired - this.room.state.flagsFound === 1
      : false;
    if (!oneFlagRemains) this.globalBustBlockedUntil = Date.now() + 10_000;
  }

  setGlobalBustCooldown(durationMs: number): void {
    this.globalBustBlockedUntil = durationMs > 0 ? Date.now() + durationMs : 0;
  }

  resetRoundPositions(
    positions: Record<string, { x: number; y: number; z: number; rotation: number }>,
  ): void {
    if (!this.playerRoot || !this.playerCollider || !this.room) return;
    const localSpawn = positions[this.room.sessionId];
    if (localSpawn) {
      this.movementSuppressedUntil = performance.now() + 900;
      this.input.clear();
      this.releaseMoveControl();
      this.releaseLookControl();
      this.playerRoot.position.set(localSpawn.x, localSpawn.y, localSpawn.z);
      this.playerRoot.rotation.y = localSpawn.rotation;
      this.playerCollider.position.set(localSpawn.x, 1.12, localSpawn.z);
      const focus = new Vector3(
        localSpawn.x,
        localSpawn.y + (this.disguised ? this.cameraTargetHeight : 1.35),
        localSpawn.z,
      );
      this.camera.target.copyFrom(focus);
      this.applyCameraOrbit();
      this.lastNetworkSend = performance.now();
    }
    for (const [sessionId, spawn] of Object.entries(positions)) {
      if (sessionId === this.room.sessionId) continue;
      const avatar = this.remotePlayers.get(sessionId);
      if (!avatar) continue;
      avatar.root.position.set(spawn.x, spawn.y, spawn.z);
      avatar.target.set(spawn.x, spawn.y, spawn.z);
      avatar.root.rotation.y = spawn.rotation;
      avatar.targetRotation = spawn.rotation;
      avatar.collider.position.set(spawn.x, 1.12, spawn.z);
    }
  }

  syncRemoteDisguise(sessionId: string, disguiseName: string): void {
    if (!this.room || sessionId === this.room.sessionId) return;
    this.remoteDisguiseOverrides.set(sessionId, disguiseName);
    const avatar = this.remotePlayers.get(sessionId);
    if (avatar && avatar.disguiseName !== disguiseName) {
      this.setRemoteDisguise(avatar, disguiseName);
    }
  }

  setSpectatorConcealment(sessionIds: string[]): void {
    this.spectatorConcealmentReady = true;
    this.spectatorConcealedPlayers = new Set(sessionIds);
    if (this.localAlive) return;
    for (const sessionId of sessionIds) {
      const avatar = this.remotePlayers.get(sessionId);
      avatar?.root.setEnabled(false);
      avatar?.collider.setEnabled(false);
      if (avatar) {
        avatar.label.style.opacity = "0";
        avatar.label.style.display = "none";
      }
    }
  }

  private createMuseumMap(): void {
    if (museumMapGrid.childElementCount === PracticeGame.ROOM_NAMES.length) return;
    museumMapGrid.replaceChildren();
    PracticeGame.ROOM_NAMES.forEach((roomName, index) => {
      const cell = document.createElement("span");
      cell.className = "museum-map-cell";
      cell.dataset.roomIndex = String(index);
      cell.title = roomName;
      cell.setAttribute("aria-label", roomName);
      if (index === PracticeGame.CENTRE_ROOM_INDEX) cell.classList.add("centre-room");
      museumMapGrid.append(cell);
    });
  }

  private updateMuseumMap(roomIndex: number): void {
    if (roomIndex === this.lastMapRoomIndex) return;
    this.lastMapRoomIndex = roomIndex;
    museumMapGrid.querySelectorAll<HTMLElement>(".museum-map-cell").forEach((cell) => {
      cell.classList.toggle("active", Number(cell.dataset.roomIndex) === roomIndex);
    });
    museumMap.setAttribute("aria-label", `Museum map - ${PracticeGame.ROOM_NAMES[roomIndex]}`);
  }

  private createWorld(): void {
    this.scene.clearColor = new Color4(0.035, 0.025, 0.14, 1);
    this.scene.collisionsEnabled = true;

    const skyLight = new HemisphericLight("sky", new Vector3(0, 1, 0), this.scene);
    skyLight.intensity = 0.82;
    skyLight.diffuse = new Color3(0.55, 0.65, 1);
    skyLight.groundColor = new Color3(0.2, 0.08, 0.3);

    const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.35), this.scene);
    sun.position = new Vector3(8, 15, -8);
    sun.intensity = 1.4;
    const shadows = new ShadowGenerator(1024, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 24;

    const floor = MeshBuilder.CreateGround("floor", { width: 100, height: 100 }, this.scene);
    const floorMaterial = new PBRMaterial("floorMaterial", this.scene);
    floorMaterial.albedoColor = new Color3(0.055, 0.045, 0.15);
    floorMaterial.metallic = 0.32;
    floorMaterial.roughness = 0.42;
    floor.material = floorMaterial;
    floor.receiveShadows = true;
    floor.checkCollisions = true;

    this.addArenaWalls();
    // v0.19.0 uses the matched 5x5 furniture/exhibit layout. The legacy
    // hand-placed 3x3 prop cluster is intentionally omitted so the central
    // rotunda stays open and client collision geometry matches the server.
    this.createPlayer(shadows);

    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      PracticeGame.DEFAULT_CAMERA_BETA,
      8.5,
      this.playerRoot.position.add(new Vector3(0, 1.4, 0)),
      this.scene,
    );
    this.camera.lowerRadiusLimit = 1.6;
    this.camera.upperRadiusLimit = 11;
    this.camera.lowerBetaLimit = 0.82;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.015;
    this.camera.fov = 0.9;
    this.camera.minZ = 0.1;
    // The camera is allowed to move freely while occluding walls fade away.
    // Babylon camera collisions can repeatedly push an orbit camera at corners,
    // which presents as shake or tearing in a multi-room map.
    this.camera.checkCollisions = false;
    this.camera.collisionRadius = new Vector3(0.55, 0.55, 0.55);
    this.camera.inputs.clear();
    this.cameraAlpha = this.camera.alpha;
    this.cameraBeta = this.camera.beta;
    this.applyCameraOrbit();
    this.updateCameraOcclusion(
      this.playerRoot.position.add(new Vector3(0, this.cameraTargetHeight, 0)),
      1,
    );
  }

  private addArenaWalls(): void {
    const wallMaterial = new PBRMaterial("museum-walls", this.scene);
    wallMaterial.albedoColor = new Color3(0.075, 0.045, 0.18);
    wallMaterial.metallic = 0.12;
    wallMaterial.roughness = 0.72;
    const trimMaterial = new StandardMaterial("museum-trim", this.scene);
    trimMaterial.diffuseColor = new Color3(0.12, 0.76, 0.95);
    trimMaterial.emissiveColor = new Color3(0.05, 0.48, 0.82);

    const walls: Array<[number, number, number, number]> = [
      [0, -50, 100, 0.7], [0, 50, 100, 0.7], [-50, 0, 0.7, 100], [50, 0, 0.7, 100],
    ];
    const addDoorWall = (
      vertical: boolean,
      divider: number,
      cellCenter: number,
      doorWidth: number,
    ) => {
      const segmentLength = (20 - doorWidth) / 2;
      const offset = doorWidth / 2 + segmentLength / 2;
      if (vertical) {
        walls.push([divider, cellCenter - offset, 0.55, segmentLength]);
        walls.push([divider, cellCenter + offset, 0.55, segmentLength]);
      } else {
        walls.push([cellCenter - offset, divider, segmentLength, 0.55]);
        walls.push([cellCenter + offset, divider, segmentLength, 0.55]);
      }
    };

    for (let dividerIndex = 0; dividerIndex < 4; dividerIndex += 1) {
      const divider = -30 + dividerIndex * 20;
      for (let row = 0; row < 5; row += 1) {
        const leftIndex = row * 5 + dividerIndex;
        const rightIndex = leftIndex + 1;
        const wide = leftIndex === PracticeGame.CENTRE_ROOM_INDEX
          || rightIndex === PracticeGame.CENTRE_ROOM_INDEX;
        addDoorWall(true, divider, PracticeGame.ROOM_CENTERS[row], wide ? 12 : 7.2);
      }
      for (let column = 0; column < 5; column += 1) {
        const topIndex = dividerIndex * 5 + column;
        const bottomIndex = topIndex + 5;
        const wide = topIndex === PracticeGame.CENTRE_ROOM_INDEX
          || bottomIndex === PracticeGame.CENTRE_ROOM_INDEX;
        addDoorWall(false, divider, PracticeGame.ROOM_CENTERS[column], wide ? 12 : 7.2);
      }
    }

    walls.forEach(([x, z, width, depth], index) => {
      const wall = MeshBuilder.CreateBox(`museum-wall-${index}`, {
        width, height: 5.6, depth,
      }, this.scene);
      wall.position.set(x, 2.8, z);
      wall.material = wallMaterial;
      wall.checkCollisions = true;
      wall.isPickable = true;
      this.cameraOccluders.push(wall);
      const trim = MeshBuilder.CreateBox(`museum-trim-${index}`, {
        width: width > depth ? width : 0.12,
        height: 0.1,
        depth: depth >= width ? depth : 0.12,
      }, this.scene);
      trim.position.set(x, 0.12, z);
      trim.material = trimMaterial;
    });

    const colours = [
      new Color3(0.19, 0.06, 0.25), new Color3(0.05, 0.16, 0.27),
      new Color3(0.2, 0.09, 0.035), new Color3(0.06, 0.2, 0.17),
      new Color3(0.18, 0.05, 0.17), new Color3(0.11, 0.16, 0.04),
    ];
    PracticeGame.ROOM_CENTERS.forEach((z, row) => {
      PracticeGame.ROOM_CENTERS.forEach((x, column) => {
        const index = row * 5 + column;
        const inset = MeshBuilder.CreateGround(`room-floor-${index}`, {
          width: 19.2, height: 19.2,
        }, this.scene);
        inset.position.set(x, 0.018, z);
        const material = new PBRMaterial(`room-floor-material-${index}`, this.scene);
        material.albedoColor = colours[(row * 5 + column) % colours.length];
        material.metallic = 0.35;
        material.roughness = 0.38;
        inset.material = material;

        const light = new PointLight(`room-light-${index}`, new Vector3(x, 4.2, z), this.scene);
        const color = [
          new Color3(0.25, 0.75, 1), new Color3(0.55, 0.9, 0.35),
          new Color3(0.65, 0.4, 1), new Color3(1, 0.65, 0.25),
          new Color3(0.25, 0.9, 0.9),
        ][(row + column) % 5];
        light.diffuse = color;
        light.intensity = index === PracticeGame.CENTRE_ROOM_INDEX ? 0.72 : 0.42;
        light.range = 16;
      });
    });

    this.addCentralRotunda();
    this.addGrandGalleryArchitecture();
    this.addMuseumPortraitCollection();
    this.addMuseumSculpturesAndFossils();
    this.addMuseumPillarRooms();
  }

  private addCentralRotunda(): void {
    const floorMaterial = new PBRMaterial("rotunda-medallion-material", this.scene);
    floorMaterial.albedoColor = new Color3(0.12, 0.48, 0.65);
    floorMaterial.emissiveColor = new Color3(0.025, 0.16, 0.22);
    floorMaterial.metallic = 0.55;
    floorMaterial.roughness = 0.28;
    const medallion = MeshBuilder.CreateCylinder("rotunda-medallion", {
      height: 0.045, diameter: 8.2, tessellation: 48,
    }, this.scene);
    medallion.position.y = 0.045;
    medallion.material = floorMaterial;
    medallion.checkCollisions = false;

    const ringMaterial = new StandardMaterial("rotunda-ring-material", this.scene);
    ringMaterial.diffuseColor = new Color3(0.82, 0.58, 0.16);
    ringMaterial.emissiveColor = new Color3(0.38, 0.18, 0.025);
    const ring = MeshBuilder.CreateTorus("rotunda-ring", {
      diameter: 7.4, thickness: 0.12, tessellation: 64,
    }, this.scene);
    ring.position.y = 0.085;
    ring.material = ringMaterial;

    const orbMaterial = new PBRMaterial("rotunda-orb-material", this.scene);
    orbMaterial.albedoColor = new Color3(0.3, 0.94, 1);
    orbMaterial.emissiveColor = new Color3(0.12, 0.62, 0.82);
    orbMaterial.metallic = 0.15;
    orbMaterial.roughness = 0.18;
    const orb = MeshBuilder.CreateIcoSphere("rotunda-orb", { radius: 0.72, subdivisions: 2 }, this.scene);
    orb.position.set(0, 3.65, 0);
    orb.material = orbMaterial;
    orb.checkCollisions = false;
    const glow = new PointLight("rotunda-orb-glow", new Vector3(0, 3.5, 0), this.scene);
    glow.diffuse = new Color3(0.35, 0.9, 1);
    glow.intensity = 1.15;
    glow.range = 18;
  }


  private addMuseumPortraitCollection(): void {
    const gold = new PBRMaterial("collection-frame-gold", this.scene);
    gold.albedoColor = new Color3(0.78, 0.46, 0.11);
    gold.metallic = 0.72;
    gold.roughness = 0.25;
    gold.backFaceCulling = false;
    let index = 0;

    const addPainting = (
      x: number,
      z: number,
      facing: number,
      inwardX: number,
    ) => {
      // Keep every painting clearly inside the room rather than embedded in
      // the wall surface. The outside museum walls are slightly thicker than
      // internal dividers, so the old 9.66 placement left exterior paintings
      // inside the wall by about one centimetre. When that wall faded for the
      // third-person camera, its transparent depth sorting could make the frame
      // and portrait vanish while approaching or lifting it.
      const frameInset = 0.18;
      const portraitInset = 0.025;
      const frame = MeshBuilder.CreatePlane(`museum-art-frame-${index}`, {
        width: 3.35, height: 2.62,
      }, this.scene);
      frame.position.set(x + inwardX * frameInset, 2.75, z);
      frame.rotation.y = facing;
      frame.material = gold;
      frame.isPickable = false;
      frame.alwaysSelectAsActiveMesh = true;
      const portrait = MeshBuilder.CreatePlane(`museum-art-${index}`, {
        width: 3.05, height: 2.32,
      }, this.scene);
      portrait.position.copyFrom(frame.position);
      portrait.position.x += inwardX * portraitInset;
      portrait.rotation.copyFrom(frame.rotation);
      portrait.alwaysSelectAsActiveMesh = true;
      const texture = new Texture(assetUrl("assets/museum/art/museum-paintings-atlas-v1.png"), this.scene);
      texture.uScale = 0.25;
      texture.vScale = 1 / 3;
      texture.uOffset = (index % 4) * 0.25;
      texture.vOffset = (Math.floor(index / 4) % 3) / 3;
      const material = new StandardMaterial(`museum-portrait-material-${index}`, this.scene);
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.emissiveColor = new Color3(0.28, 0.24, 0.2);
      material.backFaceCulling = false;
      material.zOffset = -3;
      portrait.material = material;
      portrait.isPickable = false;
      this.paintingLiftables.push(portrait);

      const lampMaterial = new StandardMaterial(`picture-light-material-${index}`, this.scene);
      lampMaterial.diffuseColor = new Color3(0.92, 0.7, 0.28);
      lampMaterial.emissiveColor = new Color3(1, 0.72, 0.25);
      const pictureLight = MeshBuilder.CreateBox(`picture-light-${index}`, {
        width: 1.75, height: 0.12, depth: 0.12,
      }, this.scene);
      pictureLight.position.set(x + inwardX * 0.34, 4.18, z);
      pictureLight.rotation.y = Math.PI / 2;
      pictureLight.material = lampMaterial;
      const glow = new PointLight(
        `picture-glow-${index}`,
        new Vector3(x + inwardX * 0.72, 3.92, z),
        this.scene,
      );
      glow.diffuse = new Color3(1, 0.72, 0.38);
      glow.specular = new Color3(1, 0.82, 0.52);
      glow.intensity = 0.66;
      glow.range = 5.8;
      index += 1;
    };

    const paintingOffsetForWall = (roomIndex: number, side: "west" | "east"): number => {
      const column = roomIndex % 5;
      const hasNeighbour = side === "west" ? column > 0 : column < 4;
      if (!hasNeighbour) return 5.8;
      const neighbourIndex = side === "west" ? roomIndex - 1 : roomIndex + 1;
      const doorWidth = roomIndex === PracticeGame.CENTRE_ROOM_INDEX
        || neighbourIndex === PracticeGame.CENTRE_ROOM_INDEX ? 12 : 7.2;
      const solidSegmentLength = (20 - doorWidth) / 2;
      // Centre every frame on the solid wall segment rather than near the door.
      // This keeps the complete frame and picture light clear of both standard
      // entrances and the extra-wide Midnight Rotunda entrances.
      return doorWidth / 2 + solidSegmentLength / 2;
    };

    PracticeGame.ROOM_CENTERS.forEach((roomZ, row) => {
      PracticeGame.ROOM_CENTERS.forEach((roomX, column) => {
        const roomIndex = row * 5 + column;
        // The Midnight Rotunda is intentionally free of paintings so its four
        // broad entrances and suspended centrepiece define the museum hub.
        if (roomIndex === PracticeGame.CENTRE_ROOM_INDEX) return;
        const sideSign = roomIndex % 2 === 0 ? -1 : 1;
        const westOffset = paintingOffsetForWall(roomIndex, "west");
        const eastOffset = paintingOffsetForWall(roomIndex, "east");
        addPainting(roomX - 9.66, roomZ + sideSign * westOffset, Math.PI / 2, 1);
        addPainting(roomX + 9.66, roomZ - sideSign * eastOffset, -Math.PI / 2, -1);
      });
    });
  }


  private addMuseumSculpturesAndFossils(): void {
    const roomCenters = PracticeGame.ROOM_CENTERS.flatMap((z) =>
      PracticeGame.ROOM_CENTERS.map((x) => ({ x, z })));
    roomCenters.forEach(({ x, z }, index) => {
      if (index === PracticeGame.CENTRE_ROOM_INDEX) return;
      const stone = new PBRMaterial(`exhibit-stone-${index}`, this.scene);
      stone.albedoColor = index % 2
        ? new Color3(0.72, 0.66, 0.58)
        : new Color3(0.3, 0.62, 0.7);
      stone.metallic = index % 3 === 0 ? 0.35 : 0.05;
      stone.roughness = 0.52;
      const baseMaterial = new PBRMaterial(`exhibit-base-${index}`, this.scene);
      baseMaterial.albedoColor = new Color3(0.18, 0.11, 0.25);
      baseMaterial.metallic = 0.28;
      baseMaterial.roughness = 0.38;
      const parts: Mesh[] = [];
      const base = MeshBuilder.CreateBox(`exhibit-base-part-${index}`, {
        width: 2.8, height: 0.42, depth: 1.65,
      }, this.scene);
      base.position.y = 0.21;
      base.material = baseMaterial;
      parts.push(base);

      if (index % 2 === 0) {
        const spine = MeshBuilder.CreateCylinder(`fossil-spine-${index}`, {
          height: 2.3, diameter: 0.18, tessellation: 10,
        }, this.scene);
        spine.rotation.x = Math.PI / 2;
        spine.position.set(0, 1.32, 0);
        spine.material = stone;
        parts.push(spine);
        for (const ribZ of [-0.7, -0.25, 0.2, 0.65]) {
          const rib = MeshBuilder.CreateTorus(`fossil-rib-${index}-${ribZ}`, {
            diameter: 0.9, thickness: 0.09, tessellation: 14,
          }, this.scene);
          rib.rotation.x = Math.PI / 2;
          rib.position.set(0, 1.23, ribZ);
          rib.scaling.y = 0.72;
          rib.material = stone;
          parts.push(rib);
        }
        const skull = MeshBuilder.CreateSphere(`fossil-skull-${index}`, {
          diameter: 0.65, segments: 10,
        }, this.scene);
        skull.position.set(0, 1.48, -1.25);
        skull.scaling.set(1.15, 0.72, 0.9);
        skull.material = stone;
        parts.push(skull);
      } else {
        const torso = MeshBuilder.CreateCapsule(`sculpture-torso-${index}`, {
          height: 1.65, radius: 0.42, tessellation: 12,
        }, this.scene);
        torso.position.y = 1.32;
        torso.material = stone;
        parts.push(torso);
        const head = MeshBuilder.CreateSphere(`sculpture-head-${index}`, {
          diameter: 0.58, segments: 12,
        }, this.scene);
        head.position.y = 2.37;
        head.material = stone;
        parts.push(head);
        for (const side of [-1, 1]) {
          const arm = MeshBuilder.CreateCylinder(`sculpture-arm-${index}-${side}`, {
            height: 1.1, diameter: 0.2, tessellation: 10,
          }, this.scene);
          arm.position.set(side * 0.55, 1.55, 0);
          arm.rotation.z = side * 0.72;
          arm.material = stone;
          parts.push(arm);
        }
      }
      const exhibit = Mesh.MergeMeshes(parts, true, true, undefined, true, true);
      if (!exhibit) return;
      exhibit.name = index % 2 === 0 ? `fossil-exhibit-${index}` : `sculpture-exhibit-${index}`;
      exhibit.position.set(x, 0, z);
      exhibit.rotation.y = (index % 4) * Math.PI / 2;
      exhibit.checkCollisions = true;
      exhibit.isPickable = false;
      this.disguiseProps.push(exhibit);
    });
  }


  private addMuseumPillarRooms(): void {
    const marble = new PBRMaterial("shared-room-pillars", this.scene);
    marble.albedoColor = new Color3(0.62, 0.58, 0.7);
    marble.roughness = 0.42;
    const gold = new PBRMaterial("shared-room-pillar-gold", this.scene);
    gold.albedoColor = new Color3(0.78, 0.48, 0.14);
    gold.metallic = 0.72;
    gold.roughness = 0.25;
    [...PracticeGame.PILLAR_ROOM_INDICES].forEach((roomIndex) => {
      const roomX = PracticeGame.ROOM_CENTERS[roomIndex % 5];
      const roomZ = PracticeGame.ROOM_CENTERS[Math.floor(roomIndex / 5)];
      for (const xOffset of [-7.35, 7.35]) {
        for (const zOffset of [-7.25, 7.25]) {
          const pillar = MeshBuilder.CreateCylinder(`room-pillar-${roomIndex}-${xOffset}-${zOffset}`, {
            height: 4.8, diameter: 0.62, tessellation: 18,
          }, this.scene);
          pillar.position.set(roomX + xOffset, 2.4, roomZ + zOffset);
          pillar.material = marble;
          const capital = MeshBuilder.CreateCylinder(`room-pillar-cap-${roomIndex}-${xOffset}-${zOffset}`, {
            height: 0.25, diameterTop: 1.05, diameterBottom: 0.68, tessellation: 18,
          }, this.scene);
          capital.position.set(roomX + xOffset, 4.83, roomZ + zOffset);
          capital.material = gold;
        }
      }
    });
  }


  private addGrandGalleryArchitecture(): void {
    const galleryX = 0;
    const galleryZ = -20;
    const ivory = new PBRMaterial("gallery-ivory", this.scene);
    ivory.albedoColor = new Color3(0.72, 0.65, 0.78);
    ivory.roughness = 0.56;
    const gold = new PBRMaterial("gallery-gold", this.scene);
    gold.albedoColor = new Color3(0.88, 0.53, 0.12);
    gold.metallic = 0.72;
    gold.roughness = 0.24;
    const ceilingMaterial = new PBRMaterial("gallery-ceiling", this.scene);
    ceilingMaterial.albedoColor = new Color3(0.055, 0.035, 0.13);
    ceilingMaterial.roughness = 0.62;

    const ceiling = MeshBuilder.CreateBox("gallery-coffered-ceiling", {
      width: 19.2, height: 0.18, depth: 19.2,
    }, this.scene);
    ceiling.position.set(galleryX, 5.48, galleryZ);
    ceiling.material = ceilingMaterial;
    this.securityOverheadMeshes.push(ceiling);

    [-8, -4, 0, 4, 8].forEach((x, index) => {
      for (const zOffset of [-9, 9]) {
        if (Math.abs(x) < 3) continue;
        const shaft = MeshBuilder.CreateCylinder(`gallery-column-${index}-${zOffset}`, {
          height: 4.7, diameter: 0.72, tessellation: 20,
        }, this.scene);
        shaft.position.set(galleryX + x, 2.45, galleryZ + zOffset);
        shaft.material = ivory;
        const base = MeshBuilder.CreateCylinder(`gallery-column-base-${index}-${zOffset}`, {
          height: 0.32, diameter: 1.18, tessellation: 20,
        }, this.scene);
        base.position.set(galleryX + x, 0.16, galleryZ + zOffset);
        base.material = gold;
        const capital = MeshBuilder.CreateCylinder(`gallery-column-capital-${index}-${zOffset}`, {
          height: 0.28, diameterTop: 1.2, diameterBottom: 0.82, tessellation: 20,
        }, this.scene);
        capital.position.set(galleryX + x, 4.82, galleryZ + zOffset);
        capital.material = gold;
      }
    });

    const beamData: Array<[number, number, number, number]> = [
      [galleryX, galleryZ - 9.2, 19.4, 0.22],
      [galleryX - 7.3, galleryZ, 0.22, 18.2],
      [galleryX + 7.3, galleryZ, 0.22, 18.2],
    ];
    beamData.forEach(([x, z, width, depth], index) => {
      const beam = MeshBuilder.CreateBox(`gallery-gold-beam-${index}`, {
        width, height: 0.16, depth,
      }, this.scene);
      beam.position.set(x, 5.32, z);
      beam.material = gold;
      this.securityOverheadMeshes.push(beam);
    });
  }


  private async loadGrandGalleryArt(): Promise<void> {
    const floorTints = [
      new Color3(0.88, 0.68, 0.48),
      new Color3(1, 0.94, 0.86),
      new Color3(0.48, 0.6, 0.9),
      new Color3(0.58, 0.82, 0.62),
      new Color3(0.72, 0.58, 0.86),
      new Color3(0.9, 0.72, 0.48),
    ];
    Array.from({ length: 25 }, (_, index) => floorTints[index % floorTints.length]).forEach((tint, index) => {
      const floor = this.scene.getMeshByName(`room-floor-${index}`) as Mesh | null;
      if (!floor) return;
      const marble = new PBRMaterial(`museum-marble-${index}`, this.scene);
      const diffuse = new Texture(assetUrl("assets/museum/marble_01_diff_1k.jpg"), this.scene);
      diffuse.uScale = 3.4;
      diffuse.vScale = 3.4;
      const normal = new Texture(assetUrl("assets/museum/marble_01_nor_dx_1k.jpg"), this.scene);
      normal.uScale = 3.4;
      normal.vScale = 3.4;
      marble.albedoTexture = diffuse;
      marble.bumpTexture = normal;
      marble.albedoColor = tint;
      marble.metallic = 0.08;
      marble.roughness = index === 1 ? 0.3 : 0.4;
      floor.material = marble;
    });
    const walls = this.cameraOccluders;
    const wallMaterial = walls[0]?.material as PBRMaterial | undefined;
    if (wallMaterial) {
      const diffuse = new Texture(assetUrl("assets/museum/painted_plaster_wall_diff_1k.jpg"), this.scene);
      diffuse.uScale = 4;
      diffuse.vScale = 2;
      const normal = new Texture(assetUrl("assets/museum/painted_plaster_wall_nor_dx_1k.jpg"), this.scene);
      normal.uScale = 4;
      normal.vScale = 2;
      wallMaterial.albedoTexture = diffuse;
      wallMaterial.bumpTexture = normal;
      wallMaterial.albedoColor = new Color3(0.3, 0.17, 0.48);
    }

    // Remove the original blockout primitives now that every room has proper
    // exhibits. Compound and imported objects remain valid Blend targets.
    const blockoutProps = this.disguiseProps.filter((prop) =>
      /^(urn|statue|sarcophagus|plinth|bench|orb|arcade|capsule|pot|display|shelf|crate)-\d+$/.test(prop.name));
    this.disguiseProps = this.disguiseProps.filter((prop) => !blockoutProps.includes(prop));
    blockoutProps.forEach((prop) => prop.dispose());

    // Sizes are target world heights rather than raw model multipliers. Kenney
    // OBJ files use a much smaller source unit than our 2.2-unit characters.
    const bench = await this.loadCc0Prop("benchCushion.obj", "gallery-bench-0", -5.3, -23.3, 1.35, 0);
    if (bench) {
      this.cloneCc0Prop(bench, "gallery-bench-1", 5.3, -23.3, Math.PI);
      this.cloneCc0Prop(bench, "gallery-bench-2", -4.8, -16.2, Math.PI / 2);
      this.cloneCc0Prop(bench, "gallery-bench-3", 4.8, -16.2, -Math.PI / 2);
    }
    const plant = await this.loadCc0Prop("plantSmall2.obj", "gallery-plant-0", -7.8, -14.2, 2.15, 0);
    if (plant) {
      this.cloneCc0Prop(plant, "gallery-plant-1", 7.8, -14.2, 0);
      this.cloneCc0Prop(plant, "gallery-plant-2", -7.8, -27.2, 0);
      this.cloneCc0Prop(plant, "gallery-plant-3", 7.8, -27.2, 0);
    }
    const lamp = await this.loadCc0Prop("lampRoundFloor.obj", "gallery-lamp-0", -6.8, -19.8, 3.25, 0);
    if (lamp) {
      this.cloneCc0Prop(lamp, "gallery-lamp-1", 6.8, -19.8, 0);
      this.cloneCc0Prop(lamp, "gallery-lamp-2", 0, -26.8, 0);
    }
    const shelf = await this.loadCc0Prop(
      "bookcaseOpenLow.obj", "gallery-display-shelf-0", 0, -28.1, 2.45, 0,
    );
    if (shelf) this.cloneCc0Prop(shelf, "gallery-display-shelf-1", 0, -12.1, Math.PI);
    await this.loadMuseumFurnitureCollection();
  }

  private roomFurnitureSlots(roomIndex: number): Array<{ x: number; z: number }> {
    const slots = [
      { x: -6.1, z: -5.4 }, { x: 0, z: -6.2 }, { x: 6.1, z: -5.4 },
      { x: -6.7, z: 0 }, { x: 6.7, z: 0 },
      { x: -6.1, z: 5.4 }, { x: 0, z: 6.2 }, { x: 6.1, z: 5.4 },
    ];
    if (!PracticeGame.PILLAR_ROOM_INDICES.has(roomIndex)) return slots;
    return slots.map(({ x, z }) => ({ x: x * 0.66, z: z * 0.66 }));
  }

  private async loadMuseumFurnitureCollection(): Promise<void> {
    const catalog: Array<[string, string, number]> = [
      ["chairCushion.obj", "museum-chair-cushion", 1.35],
      ["chairModernFrameCushion.obj", "museum-chair-modern", 1.45],
      ["benchCushionLow.obj", "museum-bench-low", 0.95],
      ["bookcaseOpen.obj", "museum-display-cabinet", 2.65],
      ["coatRackStanding.obj", "museum-coat-stand", 2.45],
      ["lampRoundTable.obj", "museum-table-lamp", 1.15],
      ["lampSquareFloor.obj", "museum-square-lamp", 3.05],
      ["loungeDesignChair.obj", "museum-lounge-chair", 1.45],
      ["loungeSofa.obj", "museum-lounge-sofa", 1.45],
      ["plantSmall1.obj", "museum-plant-leafy", 2.05],
      ["plantSmall3.obj", "museum-plant-tall", 2.2],
      ["pottedPlant.obj", "museum-plant-pot", 2.15],
      ["radio.obj", "museum-vintage-radio", 1.25],
      ["tableCoffee.obj", "museum-display-table", 1.15],
      ["tableCross.obj", "museum-cross-table", 1.4],
      ["televisionModern.obj", "museum-media-display", 1.85],
    ];
    const roomCenters = PracticeGame.ROOM_CENTERS.flatMap((z) =>
      PracticeGame.ROOM_CENTERS.map((x) => ({ x, z })));
    const furnitureCounts = [
      4, 5, 6, 4, 5,
      5, 6, 0, 6, 4,
      4, 6, 0, 6, 5,
      5, 7, 4, 6, 5,
      6, 4, 6, 5, 7,
    ];
    const sources = new Map<number, Mesh>();
    for (let roomIndex = 0; roomIndex < roomCenters.length; roomIndex += 1) {
      if (roomIndex === PracticeGame.GRAND_GALLERY_INDEX
        || roomIndex === PracticeGame.CENTRE_ROOM_INDEX) continue;
      const room = roomCenters[roomIndex];
      const slots = this.roomFurnitureSlots(roomIndex);
      const slotOrder = slots.map((_, index) => (index * 3 + roomIndex * 5) % slots.length);
      for (let slotIndex = 0; slotIndex < furnitureCounts[roomIndex]; slotIndex += 1) {
        const catalogIndex = (roomIndex * 5 + slotIndex * 3) % catalog.length;
        const [fileName, baseName, targetHeight] = catalog[catalogIndex];
        const slot = slots[slotOrder[slotIndex]];
        const rotation = (roomIndex * 1.37 + slotIndex * 0.83 + 0.31) % (Math.PI * 2);
        const name = `${baseName}-room-${roomIndex}-${slotIndex}`;
        const source = sources.get(catalogIndex);
        if (source) {
          this.cloneCc0Prop(source, name, room.x + slot.x, room.z + slot.z, rotation);
          continue;
        }
        const loaded = await this.loadCc0Prop(
          fileName, name, room.x + slot.x, room.z + slot.z, targetHeight, rotation,
        );
        if (loaded) sources.set(catalogIndex, loaded);
      }
    }
  }


  private async loadCc0Prop(
    fileName: string,
    name: string,
    x: number,
    z: number,
    targetHeight: number,
    rotation: number,
  ): Promise<Mesh | undefined> {
    try {
      const result = await SceneLoader.ImportMeshAsync(
        "",
        assetUrl("assets/museum/kenney/"),
        fileName,
        this.scene,
      );
      const parts = result.meshes.filter((mesh): mesh is Mesh =>
        mesh instanceof Mesh && mesh.getTotalVertices() > 0);
      const merged = Mesh.MergeMeshes(parts, true, true, undefined, true, true);
      if (!merged) return;
      merged.name = name;
      merged.computeWorldMatrix(true);
      const sourceBounds = merged.getBoundingInfo().boundingBox;
      const sourceHeight = Math.max(0.001, sourceBounds.maximumWorld.y - sourceBounds.minimumWorld.y);
      const scale = targetHeight / sourceHeight;
      merged.scaling.setAll(scale);
      merged.rotation.y = rotation;
      merged.position.set(x, 0, z);
      merged.computeWorldMatrix(true);
      // Place the actual bottom of every differently-authored OBJ on the floor.
      merged.position.y -= merged.getBoundingInfo().boundingBox.minimumWorld.y;
      merged.checkCollisions = true;
      merged.isPickable = false;
      this.disguiseProps.push(merged);
      return merged;
    } catch (error) {
      console.warn(`Could not load CC0 museum prop ${fileName}`, error);
      return;
    }
  }

  private cloneCc0Prop(source: Mesh, name: string, x: number, z: number, rotation: number): void {
    const clone = source.clone(name);
    if (!clone) return;
    clone.name = name;
    clone.position.set(x, source.position.y, z);
    clone.rotation.y = rotation;
    clone.checkCollisions = true;
    clone.isPickable = false;
    this.disguiseProps.push(clone);
  }


  private createPlayer(shadows: ShadowGenerator): void {
    this.playerRoot = new TransformNode("playerRoot", this.scene);
    this.playerRoot.position.set(0, 0, 4);

    // Movement and collision detection must happen on an unparented mesh.
    // Moving the visible body (which is parented to playerRoot) causes its local
    // translation to be cancelled when the root is synchronised.
    this.playerCollider = MeshBuilder.CreateCapsule("playerCollider", {
      height: 2.2,
      radius: 0.62,
      tessellation: 8,
    }, this.scene);
    this.playerCollider.position.set(0, 1.12, 4);
    this.playerCollider.ellipsoid = new Vector3(0.62, 1.1, 0.62);
    this.playerCollider.ellipsoidOffset = new Vector3(0, 0, 0);
    this.playerCollider.checkCollisions = true;
    this.playerCollider.isVisible = false;

    const bodyMaterial = new PBRMaterial("playerBodyMaterial", this.scene);
    bodyMaterial.albedoColor = new Color3(0.35, 0.92, 0.95);
    bodyMaterial.roughness = 0.4;

    this.playerBody = MeshBuilder.CreateCapsule("playerBody", {
      height: 2.2,
      radius: 0.62,
      tessellation: 16,
    }, this.scene);
    this.playerBody.parent = this.playerRoot;
    this.playerBody.position.y = 1.12;
    this.playerBody.material = bodyMaterial;
    this.playerBody.checkCollisions = false;
    shadows.addShadowCaster(this.playerBody);

    const visorMaterial = new PBRMaterial("visorMaterial", this.scene);
    visorMaterial.albedoColor = new Color3(0.035, 0.04, 0.11);
    visorMaterial.emissiveColor = new Color3(0.08, 0.13, 0.3);
    visorMaterial.metallic = 0.25;
    visorMaterial.roughness = 0.18;

    this.playerVisor = MeshBuilder.CreateSphere("visor", { diameter: 0.78, segments: 16 }, this.scene);
    this.playerVisor.parent = this.playerRoot;
    this.playerVisor.scaling.set(1.1, 0.62, 0.28);
    this.playerVisor.position.set(0, 1.48, -0.57);
    this.playerVisor.material = visorMaterial;
    shadows.addShadowCaster(this.playerVisor);
  }

  private attachInput(): void {
    if (this.inputAttached) return;
    this.inputAttached = true;
    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("keydown", (event) => {
      if (!this.localAlive
        && !this.spectatorPrivacyActive
        && ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat) this.cycleSpectatorRoom(event.code === "ArrowLeft" || event.code === "KeyA" ? -1 : 1);
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        event.preventDefault();
        this.input.add(event.code);
      }
      if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        this.toggleBlend();
      }
      if (event.code === "KeyF" && !event.repeat) {
        event.preventDefault();
        if (localRole === "blender" && this.bustTargetId) this.tryBust();
        else this.tryLift();
      }
      if (event.code === "KeyR" && !event.repeat) {
        event.preventDefault();
        this.tryReport();
      }
    });
    window.addEventListener("keyup", (event) => this.input.delete(event.code));
    blendButton.addEventListener("click", () => this.toggleBlend());
    bustButton.addEventListener("click", () => {
      if (this.bustTargetId) this.tryBust();
      else this.tryLift();
    });
    liftButton.addEventListener("click", () => this.tryLift());
    reportButton.addEventListener("click", () => this.tryReport());
    spectatorPrevRoom.addEventListener("click", () => this.cycleSpectatorRoom(-1));
    spectatorNextRoom.addEventListener("click", () => this.cycleSpectatorRoom(1));

    // The visible joystick is an HTML layer above the canvas on iPad. It needs
    // its own pointer handlers because those touches do not reach the canvas.
    moveStick.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      event.preventDefault();
      event.stopPropagation();
      this.movePointer = event.pointerId;
      this.updateTouchMove(event);
      moveStick.setPointerCapture(event.pointerId);
    });
    moveStick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.movePointer) return;
      event.preventDefault();
      event.stopPropagation();
      this.updateTouchMove(event);
    });
    const releaseJoystick = (event: PointerEvent) => {
      if (event.pointerId !== this.movePointer) return;
      event.preventDefault();
      event.stopPropagation();
      this.releaseMoveControl();
    };
    moveStick.addEventListener("pointerup", releaseJoystick);
    moveStick.addEventListener("pointercancel", releaseJoystick);
    moveStick.addEventListener("lostpointercapture", releaseJoystick);

    // The iPad look layer also sits above the canvas, so it owns its camera
    // pointer from start to finish. This works while stationary or moving.
    lookZone.addEventListener("pointerdown", (event) => {
      if (!this.localAlive || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
      event.preventDefault();
      event.stopPropagation();
      this.beginLookControl(event, lookZone);
    });
    lookZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointer) return;
      event.preventDefault();
      event.stopPropagation();
      this.updateLookControl(event);
    });
    const releaseTouchLook = (event: PointerEvent) => {
      if (event.pointerId !== this.lookPointer) return;
      event.preventDefault();
      event.stopPropagation();
      this.releaseLookControl();
    };
    lookZone.addEventListener("pointerup", releaseTouchLook);
    lookZone.addEventListener("pointercancel", releaseTouchLook);
    lookZone.addEventListener("lostpointercapture", releaseTouchLook);

    this.gameCanvas.addEventListener("pointerdown", (event) => {
      if (!this.localAlive) return;
      if (event.pointerType === "touch" && event.clientX < window.innerWidth * 0.48) {
        this.movePointer = event.pointerId;
        this.updateTouchMove(event);
      } else if (event.pointerType === "touch" || event.pointerType === "pen") {
        event.preventDefault();
        this.beginLookControl(event, this.gameCanvas);
      } else {
        // Desktop mouse camera input is handled by the native mouse event
        // lifecycle below. Keeping it separate avoids Chromium pointer-state
        // cancellation after keyboard movement stops.
        return;
      }
      this.gameCanvas.setPointerCapture(event.pointerId);
    });
    this.gameCanvas.addEventListener("pointermove", (event) => {
      if (event.pointerId === this.movePointer) {
        this.updateTouchMove(event);
      } else if (event.pointerId === this.lookPointer && !this.rightMouseLooking) {
        // Do not infer release from `event.buttons` here. Chromium/Edge can
        // report buttons=0 on the first captured move of a right-button drag,
        // especially just after the canvas is focused for the first round.
        // That used to cancel the drag immediately and made players click two
        // or three times before the camera responded.
        this.updateLookControl(event);
      }
    });
    const release = (event: PointerEvent) => {
      if (event.pointerId === this.movePointer) {
        this.releaseMoveControl();
      }
      if (event.pointerId === this.lookPointer) this.releaseLookControl();
    };
    this.gameCanvas.addEventListener("pointerup", release);
    this.gameCanvas.addEventListener("pointercancel", release);
    this.gameCanvas.addEventListener("lostpointercapture", (event) => {
      // Capture loss belongs to touch/pen. Mouse right-drag is intentionally
      // window-owned and must not be cancelled by a canvas capture transition.
      if (!this.rightMouseLooking) release(event);
    });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    // Fresh desktop camera control. One capture-phase window lifecycle owns
    // right-button dragging from press to release. It is independent of player
    // movement, canvas focus, pointer capture and any transparent HTML layer.
    window.addEventListener("mousedown", (event) => {
      if (event.button !== 2 || !this.localAlive || !this.running || gameScreen.classList.contains("hidden")) return;
      event.preventDefault();
      this.lookPointer = undefined;
      this.rightMouseLooking = true;
      this.pendingLookX = 0;
      this.pendingLookY = 0;
      this.lastLook = { x: event.clientX, y: event.clientY };
      this.lastManualCameraAt = performance.now();
      this.gameCanvas.focus({ preventScroll: true });
      this.gameCanvas.style.cursor = "grabbing";
      document.documentElement.style.cursor = "grabbing";
    }, { capture: true });

    window.addEventListener("mousemove", (event) => {
      if (!this.rightMouseLooking) return;
      event.preventDefault();

      const fallbackX = event.clientX - this.lastLook.x;
      const fallbackY = event.clientY - this.lastLook.y;
      const dx = event.movementX !== 0 || event.movementY !== 0 ? event.movementX : fallbackX;
      const dy = event.movementX !== 0 || event.movementY !== 0 ? event.movementY : fallbackY;

      this.queueLookDelta(dx, dy);
      this.lastLook = { x: event.clientX, y: event.clientY };
    }, { capture: true, passive: false });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 2 && this.rightMouseLooking) this.releaseLookControl();
    }, { capture: true });

    window.addEventListener("blur", () => {
      this.releaseMoveControl();
      this.releaseLookControl();
    });

    window.addEventListener("contextmenu", (event) => {
      if (this.running && !gameScreen.classList.contains("hidden")) event.preventDefault();
    }, { capture: true });

    window.addEventListener("auxclick", (event) => {
      if (event.button === 2 && this.running && !gameScreen.classList.contains("hidden")) {
        event.preventDefault();
      }
    }, { capture: true });
  }

  private beginLookControl(event: PointerEvent, captureTarget: HTMLElement): void {
    this.lookPointer = event.pointerId;
    this.rightMouseLooking = false;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    this.lastLook = { x: event.clientX, y: event.clientY };
    this.lastManualCameraAt = performance.now();
    captureTarget.setPointerCapture(event.pointerId);
  }

  private updateLookControl(event: PointerEvent): void {
    const samples = event.getCoalescedEvents?.() ?? [event];
    for (const sample of samples) {
      const dx = sample.clientX - this.lastLook.x;
      const dy = sample.clientY - this.lastLook.y;
      // Touch uses natural swipe direction: swipe up to look up and swipe down
      // to look down. Desktop right-mouse input keeps its existing inversion.
      this.queueLookDelta(dx, -dy);
      this.lastLook = { x: sample.clientX, y: sample.clientY };
    }
  }

  private queueLookDelta(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    // Clamp only impossible browser jumps; there is no drag threshold or delay.
    this.pendingLookX += Math.max(-120, Math.min(120, dx));
    this.pendingLookY += Math.max(-120, Math.min(120, dy));
    this.lastManualCameraAt = performance.now();
  }

  private applyQueuedCameraInput(): void {
    if (this.pendingLookX !== 0 || this.pendingLookY !== 0) {
      this.cameraAlpha -= this.pendingLookX * 0.008;
      // Mouse keeps inverted vertical dragging. Touch deltas are reversed in
      // updateLookControl so an upward swipe produces an upward camera look.
      this.cameraBeta = Math.max(
        this.camera.lowerBetaLimit ?? 0.72,
        Math.min(this.camera.upperBetaLimit ?? 1.35, this.cameraBeta + this.pendingLookY * 0.0052),
      );
      this.pendingLookX = 0;
      this.pendingLookY = 0;
    }
    this.applyCameraOrbit();
  }

  private applyCameraOrbit(): void {
    this.camera.alpha = this.cameraAlpha;
    this.camera.beta = this.cameraBeta;
  }

  private releaseMoveControl(): void {
    this.movePointer = undefined;
    this.touchMove = { x: 0, y: 0 };
    stickKnob.style.transform = "translate(0px, 0px)";
  }

  private releaseLookControl(): void {
    this.lookPointer = undefined;
    this.rightMouseLooking = false;
    this.gameCanvas.style.cursor = "";
    document.documentElement.style.cursor = "";
  }

  private updateTouchMove(event: PointerEvent): void {
    const rect = moveStick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const max = rect.width * 0.32;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    this.touchMove = { x: dx / max, y: dy / max };
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private update(dt: number): void {
    this.applyQueuedCameraInput();
    this.updateBlendTarget();
    if (this.room) this.updateSpectatorState(this.room);
    const keyboardX =
      (this.input.has("KeyD") || this.input.has("ArrowRight") ? 1 : 0) -
      (this.input.has("KeyA") || this.input.has("ArrowLeft") ? 1 : 0);
    const keyboardY =
      (this.input.has("KeyS") || this.input.has("ArrowDown") ? 1 : 0) -
      (this.input.has("KeyW") || this.input.has("ArrowUp") ? 1 : 0);
    const inputX = Math.max(-1, Math.min(1, keyboardX + this.touchMove.x));
    const inputY = Math.max(-1, Math.min(1, keyboardY + this.touchMove.y));
    const movementAllowed = (!this.room || this.room.state.phase === "game")
      && performance.now() >= this.movementSuppressedUntil;
    const horizontalOnlyTurn = this.localAlive
      && movementAllowed
      && Math.abs(inputX) > 0.08
      && Math.abs(inputY) <= 0.08;

    // A/D, Left/Right, or a horizontal-only joystick movement rotates the
    // camera around a stationary player. This is deliberately not player
    // movement, so it does not reveal a name that has already faded.
    if (horizontalOnlyTurn) {
      this.cameraAlpha -= inputX * PracticeGame.STATIONARY_CAMERA_TURN_SPEED * dt;
      this.lastManualCameraAt = performance.now();
      this.applyCameraOrbit();
    }

    const moving = this.localAlive
      && movementAllowed
      && !horizontalOnlyTurn
      && Math.hypot(inputX, inputY) > 0.08;

    if (moving) {
      // Use Babylon's real camera vectors instead of deriving them from alpha.
      // This keeps W/Up screen-forward and S/Down screen-backward at every
      // possible camera angle.
      const forward = this.camera.getForwardRay().direction.clone();
      forward.y = 0;
      forward.normalize();
      const right = Vector3.Cross(Vector3.Up(), forward).normalize();
      const direction = forward.scale(-inputY).add(right.scale(inputX)).normalize();
      const movement = direction.scale(5.2 * dt);
      this.moveWithSolidCollisions(movement);
      this.playerRoot.position.x = this.playerCollider.position.x;
      this.playerRoot.position.z = this.playerCollider.position.z;

      // The placeholder model faces local -Z, so add PI to the world heading.
      const desiredPlayerYaw = Math.atan2(direction.x, direction.z) + Math.PI;
      this.playerRoot.rotation.y = this.dampAngle(
        this.playerRoot.rotation.y,
        desiredPlayerYaw,
        13,
        dt,
      );

      // Gently bring the camera behind the direction of travel. Manual mouse or
      // touch camera movement takes priority for a moment, so the camera never
      // fights the player.
      const backpedalling = inputY > 0.08 && Math.abs(inputY) >= Math.abs(inputX);
      if (!backpedalling
        && !this.rightMouseLooking
        && this.lookPointer === undefined
        && performance.now() - this.lastManualCameraAt > 700) {
        const desiredCameraAlpha = Math.atan2(-direction.z, -direction.x);
        this.cameraAlpha = this.dampAngle(
          this.cameraAlpha,
          desiredCameraAlpha,
          2.8,
          dt,
        );
        this.applyCameraOrbit();
      }
      this.lastMovedAt = performance.now();
      this.labelOpacity = 1;
    } else if (performance.now() - this.lastMovedAt > 1500) {
      this.labelOpacity = Math.max(0, this.labelOpacity - dt * 2.5);
    }

    this.label.style.opacity = this.localAlive ? String(this.labelOpacity) : "0";
    // Update remote interpolation before using a remote seeker as the camera
    // target. Previously the spectator camera followed the avatar's prior
    // frame, then the avatar moved underneath it.
    this.updateMultiplayer(dt, moving);

    let cameraFocus = this.playerRoot.position;
    let cameraTarget = cameraFocus.add(new Vector3(
      0,
      this.disguised ? this.cameraTargetHeight : 1.35,
      0,
    ));
    const securityViewing = !this.localAlive && !this.spectatorPrivacyActive;
    if (securityViewing) {
      const securityView = this.securityCameraForRoom(this.spectatorRoomIndex);
      cameraFocus = securityView.center;
      cameraTarget = securityView.center.add(new Vector3(
        0,
        PracticeGame.SECURITY_CAMERA_TARGET_Y,
        0,
      ));
      this.camera.lowerBetaLimit = 0.62;
      this.camera.upperRadiusLimit = 14.5;
      this.camera.radius = PracticeGame.SECURITY_CAMERA_RADIUS;
      this.camera.fov = PracticeGame.SECURITY_CAMERA_FOV;
      this.cameraAlpha = securityView.alpha;
      this.cameraBeta = PracticeGame.SECURITY_CAMERA_BETA;
      // Grand Gallery has a decorative ceiling and overhead beams. CCTV is
      // physically mounted just below them; hide those overhead meshes only
      // for its feed so a camera can never render a solid ceiling close-up.
      const hideGalleryOverhead = this.spectatorRoomIndex === 7;
      this.securityOverheadMeshes.forEach((mesh) => {
        mesh.visibility = hideGalleryOverhead ? 0.015 : 1;
      });
      // Security feeds cut directly between fixed room cameras instead of
      // gliding through walls like a player-follow camera.
      this.camera.target.copyFrom(cameraTarget);
    } else {
      this.securityOverheadMeshes.forEach((mesh) => { mesh.visibility = 1; });
      this.camera.lowerBetaLimit = 0.82;
      this.camera.upperRadiusLimit = 11;
      this.camera.radius = Math.min(this.camera.radius, 8.5);
      this.camera.fov = 0.9;
      const cameraTargetBlend = 1 - Math.exp(-8 * dt);
      this.camera.target.x += (cameraTarget.x - this.camera.target.x) * cameraTargetBlend;
      this.camera.target.y += (cameraTarget.y - this.camera.target.y) * cameraTargetBlend;
      this.camera.target.z += (cameraTarget.z - this.camera.target.z) * cameraTargetBlend;
    }
    const activeMapRoom = securityViewing
      ? this.spectatorRoomIndex
      : this.roomIndexAt(this.playerRoot.position.x, this.playerRoot.position.z);
    roomNameBadge.textContent = PracticeGame.ROOM_NAMES[activeMapRoom];
    this.updateMuseumMap(activeMapRoom);
    // Reapply the persistent orbit after moving the focus point. This prevents
    // Babylon target updates from rebuilding and erasing manual mouse angles.
    this.applyCameraOrbit();
    // Force Babylon to refresh the camera position before wall rays are cast.
    // Otherwise occlusion can use the previous frame's camera position while
    // backing through a doorway, producing a one-frame visibility flash.
    this.camera.getViewMatrix(true);
    // Fade walls against the camera's actual smoothed target. Using the
    // player's unsmoothed destination while backing toward the camera made
    // doorway walls alternate between visible and transparent each frame.
    this.updateCameraOcclusion(this.camera.target, dt);
    if (this.localAlive) {
      this.positionWorldLabel(
        this.label,
        this.playerRoot.position.add(new Vector3(0, this.disguised ? this.cameraTargetHeight + 0.55 : 2.55, 0)),
      );
    }
    this.updateBustControl();
    this.updateLiftControl();
    this.updateReportControl();
  }

  private updateMultiplayer(dt: number, moving: boolean): void {
    const room = this.room;
    if (!room?.state) return;
    const players = roomPlayers(room);
    if (!players) return;
    const now = performance.now();
    const localPlayer = players.get(room.sessionId);
    if (localPlayer?.isLateSpectator && !this.localLateSpectator) {
      this.enterLateSpectatorMode();
      room.send("spectator-ready");
    } else if (this.localAlive && localPlayer?.alive === false) {
      this.handleBust(room.sessionId);
    }
    if (this.localAlive && room.state.phase === "game"
      && now >= this.movementSuppressedUntil && now - this.lastNetworkSend >= 66) {
      room.send("move", {
        x: this.playerRoot.position.x,
        y: this.playerRoot.position.y,
        z: this.playerRoot.position.z,
        rotation: this.playerRoot.rotation.y,
        moving,
      });
      this.lastNetworkSend = now;
    }

    const present = new Set<string>();
    players.forEach((player: any, sessionId: string) => {
      if (sessionId === room.sessionId || player.isLateSpectator) return;
      present.add(sessionId);
      let avatar = this.remotePlayers.get(sessionId);
      if (!avatar) {
        avatar = this.createRemotePlayer(sessionId, player.name, player.x, player.z);
        this.remotePlayers.set(sessionId, avatar);
      }
      avatar.target.set(player.x, 0, player.z);
      avatar.targetRotation = player.rotation;
      avatar.root.position = Vector3.Lerp(
        avatar.root.position,
        avatar.target,
        1 - Math.exp(-10 * dt),
      );
      avatar.root.rotation.y = this.dampAngle(avatar.root.rotation.y, avatar.targetRotation, 12, dt);
      avatar.collider.position.set(avatar.root.position.x, 1.12, avatar.root.position.z);
      avatar.label.textContent = String(player.name).toUpperCase();
      const concealed = !this.localAlive
        && (!this.spectatorConcealmentReady || this.spectatorConcealedPlayers.has(sessionId));
      if (concealed) {
        avatar.root.setEnabled(false);
        avatar.collider.setEnabled(false);
        avatar.label.style.opacity = "0";
        avatar.label.style.display = "none";
        return;
      }
      if (avatar.alive && player.alive === false) {
        this.handleBust(sessionId);
        return;
      }
      if (!player.alive) {
        avatar.label.style.display = "none";
        return;
      }
      avatar.root.setEnabled(true);
      avatar.collider.setEnabled(true);
      if (player.moving) {
        avatar.lastMovedAt = now;
        avatar.labelOpacity = 1;
      } else if (now - avatar.lastMovedAt > 1500) {
        avatar.labelOpacity = Math.max(0, avatar.labelOpacity - dt * 2.5);
      }
      avatar.label.style.opacity = String(avatar.labelOpacity);
      const stateDisguise = String(player.disguise ?? "");
      const eventDisguise = this.remoteDisguiseOverrides.get(sessionId);
      const visibleDisguise = eventDisguise === undefined ? stateDisguise : eventDisguise;
      // Once the schema patch catches the direct event, return to the state as
      // the long-term source of truth. Until then, preserve the newest event.
      if (eventDisguise !== undefined && eventDisguise === stateDisguise) {
        this.remoteDisguiseOverrides.delete(sessionId);
      }
      if (avatar.disguiseName !== visibleDisguise) {
        this.setRemoteDisguise(avatar, visibleDisguise);
      }
      let viewerPosition = this.playerRoot.position;
      if (!this.localAlive && !this.spectatorPrivacyActive) {
        viewerPosition = this.securityCameraForRoom(this.spectatorRoomIndex).center;
      }
      if (this.roomNameAt(viewerPosition.x, viewerPosition.z)
        !== this.roomNameAt(avatar.root.position.x, avatar.root.position.z)) {
        avatar.label.style.display = "none";
        return;
      }
      this.positionWorldLabel(
        avatar.label,
        avatar.root.position.add(new Vector3(0, avatar.labelHeight, 0)),
      );
    });
    for (const [sessionId, avatar] of this.remotePlayers) {
      if (!present.has(sessionId)) this.removeRemotePlayer(sessionId, avatar);
    }
    arenaSubtitle.textContent = `${Number(players.size ?? 0)} players connected`;
    this.updateFlags(room, dt);
    this.updateRubbish(room);
    this.updateCrimes(room, dt);
    this.updateCrimeRoomAlert(room);
    this.updateRoundHud(room);
    this.updateFlagSignal(room);
    this.updateMeetingClock(room);
  }

  private updateSpectatorState(room: Room<any>): void {
    const local = roomPlayers(room)?.get(room.sessionId);
    if (!local || local.alive) {
      this.spectatorPrivacyActive = false;
      privacyBlackout.classList.add("hidden");
      spectatorBadge.classList.add("hidden");
      spectatorControls.classList.add("hidden");
      securityCameraEffect.classList.add("hidden");
      gameScreen.classList.remove("security-camera-mode");
      return;
    }

    const remainingMs = Number(local.spectateUnlockAt ?? 0) - Date.now();
    const privacyActive = !local.isLateSpectator && remainingMs > 0;
    this.spectatorPrivacyActive = privacyActive;
    privacyBlackout.classList.toggle("hidden", !privacyActive);
    blackoutCountdown.textContent = String(Math.max(0, Math.ceil(remainingMs / 1000)));

    const securityActive = !privacyActive;
    spectatorBadge.classList.toggle("hidden", !securityActive);
    spectatorControls.classList.toggle("hidden", !securityActive);
    securityCameraEffect.classList.toggle("hidden", !securityActive);
    gameScreen.classList.toggle("security-camera-mode", securityActive);
    if (!securityActive) return;

    const roomName = PracticeGame.ROOM_NAMES[this.spectatorRoomIndex];
    spectatorName.textContent = roomName;
    spectatorRoomCount.textContent = `ROOM ${this.spectatorRoomIndex + 1} OF ${PracticeGame.ROOM_NAMES.length}`;
    securityChannel.textContent = `CAM ${String(this.spectatorRoomIndex + 1).padStart(2, "0")}`;
    bustedBanner.classList.add("hidden");
  }

  private updateFlags(room: Room<any>, dt: number): void {
    const present = new Set<string>();
    const flags = roomCollection(room, "flags");
    if (!flags) return;
    flags.forEach((flag: any, id: string) => {
      if (flag.found || !flag.revealed) return;
      present.add(id);
      let root = this.flagMeshes.get(id);
      if (!root) {
        root = this.createFlag(id, flag.x, flag.z);
        this.flagMeshes.set(id, root);
      }
      root.rotation.y += dt * 0.8;
      // Revealed flags hover above the inspected exhibit so they remain visible
      // after the lifted object settles back into place.
      root.position.y = 1.15 + Math.sin(performance.now() * 0.003 + flag.x) * 0.08;
    });
    for (const [id, root] of this.flagMeshes) {
      if (!present.has(id)) {
        root.dispose();
        this.flagMeshes.delete(id);
      }
    }
  }

  private updateRubbish(room: Room<any>): void {
    const present = new Set<string>();
    const rubbish = roomCollection(room, "rubbish");
    if (!rubbish) return;
    rubbish.forEach((item: any, id: string) => {
      if (item.collected) {
        this.rubbishCollectedOverrides.delete(id);
        return;
      }
      if (this.rubbishCollectedOverrides.has(id)) return;
      present.add(id);
      if (this.rubbishMeshes.has(id)) return;
      this.rubbishMeshes.set(id, this.createRubbish(id, item.x, item.z, Number(item.variant ?? 0)));
    });
    for (const [id, root] of this.rubbishMeshes) {
      if (!present.has(id)) {
        root.dispose();
        this.rubbishMeshes.delete(id);
      }
    }
  }

  private createRubbish(id: string, x: number, z: number, variant: number): TransformNode {
    const root = new TransformNode(id, this.scene);
    root.position.set(x, 0.08, z);
    root.rotation.y = ((x * 1.7 + z * 0.9 + variant) % 6.28 + 6.28) % 6.28;
    const paper = new PBRMaterial(`${id}-paper`, this.scene);
    paper.albedoColor = new Color3(0.92, 0.92, 0.88);
    paper.roughness = 0.94;
    paper.metallic = 0;
    const shadow = new StandardMaterial(`${id}-crease`, this.scene);
    shadow.diffuseColor = new Color3(0.58, 0.6, 0.62);
    shadow.alpha = 0.42;

    const shapes = [
      [[0, .20, 0, .55, .34, .48], [.25, .16, -.16, .36, .24, .3], [-.23, .14, .13, .32, .28, .35]],
      [[0, .18, 0, .62, .28, .42], [-.27, .17, -.08, .31, .3, .35], [.28, .13, .12, .28, .22, .4]],
      [[0, .17, 0, .5, .38, .54], [.22, .18, .2, .38, .25, .3], [-.2, .12, -.2, .34, .2, .36]],
      [[0, .19, 0, .57, .31, .5], [.3, .15, 0, .3, .26, .4], [-.28, .17, .05, .35, .22, .28]],
    ][Math.abs(variant) % 4];
    shapes.forEach(([partX, partY, partZ, scaleX, scaleY, scaleZ], partIndex) => {
      const piece = MeshBuilder.CreateIcoSphere(`${id}-paper-${partIndex}`, {
        radius: 0.48,
        subdivisions: 1,
        flat: true,
      }, this.scene);
      piece.parent = root;
      piece.position.set(partX, partY, partZ);
      piece.scaling.set(scaleX, scaleY, scaleZ);
      piece.rotation.set(
        (variant + partIndex * 1.7) * 0.43,
        (variant * 0.8 + partIndex) * 0.71,
        (variant + partIndex * 2.2) * 0.39,
      );
      piece.material = partIndex === 2 ? shadow : paper;
      piece.isPickable = false;
      piece.checkCollisions = false;
    });
    return root;
  }

  private createFlag(id: string, x: number, z: number): TransformNode {
    const root = new TransformNode(id, this.scene);
    root.position.set(x, 0, z);
    const poleMaterial = new StandardMaterial(`${id}-pole-material`, this.scene);
    poleMaterial.diffuseColor = new Color3(1, 0.82, 0.18);
    poleMaterial.emissiveColor = new Color3(0.35, 0.2, 0.02);
    const flagMaterial = new StandardMaterial(`${id}-banner-material`, this.scene);
    flagMaterial.diffuseColor = new Color3(0.55, 1, 0.18);
    flagMaterial.emissiveColor = new Color3(0.08, 0.24, 0.02);
    const pole = MeshBuilder.CreateCylinder(`${id}-pole`, {
      height: 1.1, diameter: 0.07, tessellation: 10,
    }, this.scene);
    pole.parent = root;
    pole.position.y = 0.55;
    pole.material = poleMaterial;
    const banner = MeshBuilder.CreateBox(`${id}-banner`, {
      width: 0.52, height: 0.34, depth: 0.06,
    }, this.scene);
    banner.parent = root;
    banner.position.set(0.25, 0.86, 0);
    banner.material = flagMaterial;
    const glow = MeshBuilder.CreateTorus(`${id}-glow`, {
      diameter: 0.72, thickness: 0.045, tessellation: 24,
    }, this.scene);
    glow.parent = root;
    glow.position.y = 0.08;
    glow.material = flagMaterial;
    return root;
  }

  private updateCrimes(room: Room<any>, dt: number): void {
    const present = new Set<string>();
    const crimes = roomCollection(room, "crimes");
    if (!crimes) return;
    crimes.forEach((crime: any, id: string) => {
      present.add(id);
      let root = this.crimeMeshes.get(id);
      if (!root) {
        root = this.createCrimeMarker(id, crime.x, crime.z);
        this.crimeMeshes.set(id, root);
      }
      root.rotation.y += dt * 0.65;
    });
    for (const [id, root] of this.crimeMeshes) {
      if (!present.has(id)) {
        root.dispose();
        this.crimeMeshes.delete(id);
      }
    }
  }

  private updateCrimeRoomAlert(room: Room<any>): void {
    const currentRoom = this.roomNameAt(this.playerRoot.position.x, this.playerRoot.position.z);
    if (!this.playerRoomName) {
      this.playerRoomName = currentRoom;
      return;
    }
    if (currentRoom === this.playerRoomName) return;
    this.playerRoomName = currentRoom;
    if (!this.localAlive || room.state.phase !== "game") return;

    let roomHasCrime = false;
    const crimes = roomCollection(room, "crimes");
    if (!crimes) return;
    crimes.forEach((crime: any) => {
      if (this.roomNameAt(crime.x, crime.z) === currentRoom) roomHasCrime = true;
    });
    if (!roomHasCrime) return;

    const now = performance.now();
    if (now - this.lastCrimeAlertAt < 1_500) return;
    this.lastCrimeAlertAt = now;
    this.crimeRoomAudio.pause();
    this.crimeRoomAudio.currentTime = 0;
    void this.crimeRoomAudio.play().catch(() => {
      // Gameplay audio can be blocked until the browser has received a gesture.
    });
  }

  private createCrimeMarker(id: string, x: number, z: number): TransformNode {
    const root = new TransformNode(id, this.scene);
    root.position.set(x, 0.05, z);
    const material = new StandardMaterial(`${id}-material`, this.scene);
    material.diffuseColor = new Color3(1, 0.18, 0.48);
    material.emissiveColor = new Color3(0.65, 0.04, 0.2);
    const ring = MeshBuilder.CreateTorus(`${id}-ring`, {
      diameter: 1.55, thickness: 0.13, tessellation: 28,
    }, this.scene);
    ring.parent = root;
    ring.material = material;
    const remnant = MeshBuilder.CreateSphere(`${id}-remnant`, {
      diameter: 0.62, segments: 10,
    }, this.scene);
    remnant.parent = root;
    remnant.position.y = 0.18;
    remnant.scaling.set(1.35, 0.28, 0.9);
    remnant.material = material;
    const beacon = MeshBuilder.CreateCylinder(`${id}-beacon`, {
      height: 1.6, diameterTop: 0.05, diameterBottom: 0.32, tessellation: 10,
    }, this.scene);
    beacon.parent = root;
    beacon.position.y = 0.9;
    beacon.material = material;
    return root;
  }

  private updateRoundHud(room: Room<any>): void {
    flagsCounter.textContent = `FLAGS ${room.state.flagsFound} / ${room.state.flagsRequired}`;
    const rubbishLeft = Math.max(0, Number(room.state.rubbishRequired ?? 0) - Number(room.state.rubbishCollected ?? 0));
    rubbishCounter.textContent = `${rubbishLeft} RUBBISH LEFT`;
    const finalFlagFrenzy = room.state.phase === "game"
      && room.state.flagsRequired - room.state.flagsFound === 1;
    flagsCounter.closest(".status-pill")?.classList.toggle("frenzy", finalFlagFrenzy);
    if (room.state.phase === "reveal") {
      const seconds = Math.max(0, Number(room.state.revealSecondsRemaining ?? 0));
      revealCountdown.textContent = `Round starts in ${seconds}`;
      roundTimer.textContent = this.formatTime(Number(room.state.roundSecondsRemaining ?? room.state.roundSeconds));
    } else if (room.state.phase === "game") {
      roundTimer.textContent = this.formatTime(Number(room.state.roundSecondsRemaining ?? 0));
    } else if (["discussion", "voting", "verdict"].includes(room.state.phase)) {
      roundTimer.textContent = "PAUSED";
    } else if (room.state.phase === "results") {
      roundTimer.textContent = "00:00";
    }
  }

  private updateFlagSignal(room: Room<any>): void {
    if (performance.now() < this.objectiveNoticeUntil) return;
    const local = roomPlayers(room)?.get(room.sessionId);
    const rubbishLeft = Math.max(
      0,
      Number(room.state.rubbishRequired ?? 0) - Number(room.state.rubbishCollected ?? 0),
    );
    const isActiveBlender = room.state.phase === "game"
      && localRole === "seeker"
      && Boolean(local?.alive)
      && !local?.isLateSpectator;
    const canSearch = isActiveBlender && rubbishLeft === 0;

    if (!canSearch) {
      const waitingForCleanup = isActiveBlender && rubbishLeft > 0;
      const replacementHint = waitingForCleanup
        ? "Clean up all rubbish to unlock flag signals."
        : "Your name fades when you stand still.";
      if (this.flagSignalState || hintText.textContent !== replacementHint) {
        hintText.textContent = replacementHint;
        this.flagSignalState = "";
        gameScreen.classList.remove("flag-signal-room", "flag-signal-hot");
      }
      return;
    }

    const playerRoom = this.roomIndexAt(this.playerRoot.position.x, this.playerRoot.position.z);
    let nearestDistance = Number.POSITIVE_INFINITY;
    const flags = roomCollection(room, "flags");
    if (!flags) return;
    flags.forEach((flag: any) => {
      if (flag.found) return;
      if (this.roomIndexAt(Number(flag.x), Number(flag.z)) !== playerRoom) return;
      nearestDistance = Math.min(
        nearestDistance,
        Math.hypot(this.playerRoot.position.x - Number(flag.x), this.playerRoot.position.z - Number(flag.z)),
      );
    });

    let nextSignal: string;
    if (!Number.isFinite(nearestDistance)) {
      nextSignal = "COLD - try another room.";
    } else if (nearestDistance <= 4.2) {
      nextSignal = "HOT - lift the nearest prop.";
    } else {
      nextSignal = "WARM - search this room.";
    }

    if (nextSignal !== this.flagSignalState) {
      hintText.textContent = nextSignal;
      this.flagSignalState = nextSignal;
    }
    const flagInRoom = Number.isFinite(nearestDistance);
    gameScreen.classList.toggle("flag-signal-room", flagInRoom);
    gameScreen.classList.toggle("flag-signal-hot", nearestDistance <= 4.2);
  }

  private updateMeetingClock(room: Room<any>): void {
    if (!["discussion", "voting", "verdict"].includes(room.state.phase)) return;
    meetingTimer.textContent = String(Math.max(0, Number(room.state.meetingSecondsRemaining ?? 0)));
  }

  private formatTime(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  private createRemotePlayer(sessionId: string, name: string, x: number, z: number): RemoteAvatar {
    const root = new TransformNode(`remote-${sessionId}`, this.scene);
    root.position.set(x, 0, z);
    const bodyMaterial = new PBRMaterial(`remote-body-${sessionId}`, this.scene);
    bodyMaterial.albedoColor = new Color3(0.95, 0.35, 0.78);
    bodyMaterial.roughness = 0.42;
    const body = MeshBuilder.CreateCapsule(`remote-body-${sessionId}`, {
      height: 2.2, radius: 0.62, tessellation: 12,
    }, this.scene);
    body.parent = root;
    body.position.y = 1.12;
    body.material = bodyMaterial;
    const visorMaterial = new PBRMaterial(`remote-visor-${sessionId}`, this.scene);
    visorMaterial.albedoColor = new Color3(0.035, 0.04, 0.11);
    visorMaterial.emissiveColor = new Color3(0.12, 0.2, 0.45);
    const visor = MeshBuilder.CreateSphere(`remote-visor-${sessionId}`, { diameter: 0.78 }, this.scene);
    visor.parent = root;
    visor.scaling.set(1.1, 0.62, 0.28);
    visor.position.set(0, 1.48, -0.57);
    visor.material = visorMaterial;
    const collider = MeshBuilder.CreateCapsule(`remote-collider-${sessionId}`, {
      height: 2.2, radius: 0.62, tessellation: 8,
    }, this.scene);
    collider.isVisible = false;
    collider.isPickable = false;
    collider.position.set(x, 1.12, z);
    this.remotePlayerColliders.push(collider);
    const label = document.createElement("div");
    label.className = "player-label remote-player-label";
    label.textContent = name.toUpperCase();
    remoteLabels.append(label);
    return {
      root, body, visor, collider, label,
      target: new Vector3(x, 0, z),
      targetRotation: 0,
      disguiseName: "",
      labelHeight: 2.55,
      lastMovedAt: performance.now(),
      labelOpacity: 1,
      alive: true,
    };
  }

  private positionWorldLabel(label: HTMLElement, worldPosition: Vector3): void {
    const viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
    const projected = Vector3.Project(
      worldPosition,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      viewport,
    );
    const canvasRect = this.gameCanvas.getBoundingClientRect();
    const screenX = canvasRect.left + projected.x * (canvasRect.width / this.engine.getRenderWidth());
    const screenY = canvasRect.top + projected.y * (canvasRect.height / this.engine.getRenderHeight());
    label.style.left = `${screenX}px`;
    label.style.top = `${screenY - 6}px`;
    label.style.display = projected.z > 0 && projected.z < 1 ? "" : "none";
  }

  private setRemoteDisguise(avatar: RemoteAvatar, disguiseName: string): void {
    avatar.disguiseMesh?.dispose();
    avatar.disguiseMesh = undefined;
    const source = disguiseName
      ? this.disguiseProps.find((prop) => prop.name === disguiseName)
      : undefined;
    avatar.disguiseName = source ? disguiseName : "";
    avatar.labelHeight = 2.55;
    avatar.body.setEnabled(!source);
    avatar.visor.setEnabled(!source);
    if (!source) return;
    const clone = source.clone(`remote-disguise-${disguiseName}`, avatar.root);
    if (clone) {
      clone.position.set(0, source.position.y, 0);
      clone.checkCollisions = false;
      clone.isPickable = false;
      avatar.disguiseMesh = clone;
      source.computeWorldMatrix(true);
      avatar.labelHeight = source.getBoundingInfo().boundingBox.maximumWorld.y + 0.3;
    }
  }

  private removeRemotePlayer(sessionId: string, avatar: RemoteAvatar): void {
    this.remotePlayers.delete(sessionId);
    this.remoteDisguiseOverrides.delete(sessionId);
    this.remotePlayerColliders = this.remotePlayerColliders.filter((mesh) => mesh !== avatar.collider);
    avatar.label.remove();
    avatar.root.dispose();
    avatar.collider.dispose();
  }

  private clearRemotePlayers(): void {
    for (const [sessionId, avatar] of this.remotePlayers) this.removeRemotePlayer(sessionId, avatar);
  }

  private clearFlags(): void {
    for (const root of this.flagMeshes.values()) root.dispose();
    this.flagMeshes.clear();
  }

  private clearRubbish(): void {
    for (const root of this.rubbishMeshes.values()) root.dispose();
    this.rubbishMeshes.clear();
    this.rubbishCollectedOverrides.clear();
  }

  private clearCrimes(): void {
    for (const root of this.crimeMeshes.values()) root.dispose();
    this.crimeMeshes.clear();
  }

  private updateBustControl(): void {
    const room = this.room;
    const visible = localRole === "blender" && this.localAlive && room?.state.phase === "game";
    bustButton.classList.toggle("hidden", !visible);
    this.bustTargetId = "";
    if (!visible || !room) return;
    const players = roomPlayers(room);
    if (!players) return;
    let nearestDistance = 3.35;
    players.forEach((player: any, sessionId: string) => {
      if (sessionId === room.sessionId || blenderTeammates.has(sessionId) || !player.alive) return;
      const distance = Math.hypot(
        this.playerRoot.position.x - player.x,
        this.playerRoot.position.z - player.z,
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        this.bustTargetId = sessionId;
      }
    });
    const finalFlagFrenzy = room.state.flagsRequired - room.state.flagsFound === 1;
    const cooldown = finalFlagFrenzy
      ? 0
      : Math.max(0, this.globalBustBlockedUntil - Date.now());
    const liftInProgress = performance.now() < this.liftLockedUntil;
    if (this.disguised && this.bustTargetId) {
      bustButton.disabled = cooldown > 0;
      bustButton.querySelector("span")!.textContent = cooldown > 0
        ? `BUST ${Math.ceil(cooldown / 1000)}`
        : "BUST";
    } else {
      bustButton.disabled = liftInProgress || !this.liftTargetId;
      bustButton.querySelector("span")!.textContent = liftInProgress ? "LIFTING" : "LIFT";
    }
  }

  private tryBust(): void {
    if (!this.bustTargetId || bustButton.disabled) return;
    this.room?.send("bust", this.bustTargetId);
  }

  private updateLiftControl(): void {
    const room = this.room;
    const eligible = this.localAlive && room?.state.phase === "game";
    liftButton.classList.toggle("hidden", !eligible);
    this.liftTargetId = "";
    if (!eligible) return;
    const currentRoom = this.roomNameAt(this.playerRoot.position.x, this.playerRoot.position.z);
    let nearestDistance = 3.1;
    for (const target of [...this.disguiseProps, ...this.paintingLiftables]) {
      if (!target.isEnabled()) continue;
      const position = target.getAbsolutePosition();
      if (this.roomNameAt(position.x, position.z) !== currentRoom) continue;
      const distance = Math.hypot(
        this.playerRoot.position.x - position.x,
        this.playerRoot.position.z - position.z,
      );
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      this.liftTargetId = target.name;
    }
    const players = room ? roomPlayers(room) : undefined;
    players?.forEach((player: any, sessionId: string) => {
      if (sessionId === room.sessionId || !player.alive
        || (player.moving && !player.isBot) || !player.disguise) return;
      const avatar = this.remotePlayers.get(sessionId);
      if (!avatar?.root.isEnabled() || !avatar.disguiseMesh?.isEnabled()) return;
      if (this.roomNameAt(avatar.root.position.x, avatar.root.position.z) !== currentRoom) return;
      const distance = Math.hypot(
        this.playerRoot.position.x - avatar.root.position.x,
        this.playerRoot.position.z - avatar.root.position.z,
      );
      if (distance >= nearestDistance) return;
      nearestDistance = distance;
      this.liftTargetId = `player:${sessionId}`;
    });
    const liftInProgress = performance.now() < this.liftLockedUntil;
    liftButton.disabled = liftInProgress || !this.liftTargetId;
    liftButton.querySelector("span")!.textContent = liftInProgress ? "LIFTING" : "LIFT";
    if (localRole === "blender") liftButton.classList.add("hidden");
  }

  private tryLift(): void {
    const activeButton = localRole === "blender" ? bustButton : liftButton;
    if (!this.liftTargetId || activeButton.disabled) return;
    const now = performance.now();
    if (now < this.liftLockedUntil || now - this.lastLiftAnimationAt < PracticeGame.LIFT_BLEND_LOCK_MS) return;
    this.lastLiftAnimationAt = now;
    this.liftLockedUntil = now + PracticeGame.LIFT_BLEND_LOCK_MS;
    activeButton.disabled = true;
    blendButton.disabled = true;
    this.animateLift(this.liftTargetId);
    this.room?.send("lift", this.liftTargetId);
  }

  private liftNodesFor(containerId: string): TransformNode[] {
    if (containerId.startsWith("player:")) {
      const playerId = containerId.slice("player:".length);
      const disguise = this.remotePlayers.get(playerId)?.disguiseMesh;
      return disguise ? [disguise] : [];
    }
    const prop = this.disguiseProps.find((candidate) => candidate.name === containerId);
    if (prop) return [prop];
    const painting = this.paintingLiftables.find((candidate) => candidate.name === containerId);
    if (!painting) return [];
    const index = containerId.slice("museum-art-".length);
    const frame = this.scene.getMeshByName(`museum-art-frame-${index}`);
    return frame ? [painting, frame] : [painting];
  }

  private animateLift(containerId: string): void {
    const nodes = this.liftNodesFor(containerId);
    if (nodes.length === 0) return;
    const startingHeights = nodes.map((node) => node.position.y);
    const startedAt = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = Math.min(1, (performance.now() - startedAt) / PracticeGame.LIFT_ANIMATION_MS);
      const liftHeight = Math.sin(elapsed * Math.PI) * 1.45;
      nodes.forEach((node, index) => {
        node.position.y = startingHeights[index] + liftHeight;
      });
      if (elapsed < 1) return;
      nodes.forEach((node, index) => {
        node.position.y = startingHeights[index];
      });
      this.scene.onBeforeRenderObservable.remove(observer);
    });
  }

  private flagPreviewPosition(containerId: string, x: number, z: number): Vector3 {
    if (!containerId.startsWith("museum-art-")) return new Vector3(x, 0.05, z);
    const roomIndex = this.roomIndexAt(x, z);
    const roomX = PracticeGame.ROOM_CENTERS[roomIndex % 5];
    const roomZ = PracticeGame.ROOM_CENTERS[Math.floor(roomIndex / 5)];
    const inwardX = roomX - x;
    const inwardZ = roomZ - z;
    const length = Math.max(0.001, Math.hypot(inwardX, inwardZ));
    // The private flag preview is anchored just inside the room rather than
    // parented to the moving painting. It therefore cannot jump upward,
    // clip into the frame or disappear while the painting is lifted.
    return new Vector3(
      x + (inwardX / length) * 1.25,
      0.05,
      z + (inwardZ / length) * 1.25,
    );
  }

  private showPrivateFlag(position: Vector3, collected: boolean): void {
    const flag = this.createFlag(`private-flag-${performance.now()}`, position.x, position.z);
    flag.position.y = 0.55;
    const startedAt = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = Math.min(1, (performance.now() - startedAt) / 1800);
      flag.position.y = 0.55 + Math.sin(elapsed * Math.PI) * 1.65;
      flag.scaling.setAll(0.45 + Math.sin(Math.min(1, elapsed * 3) * Math.PI / 2) * 0.55);
      flag.rotation.y += 0.06;
      if (elapsed < 1) return;
      this.scene.onBeforeRenderObservable.remove(observer);
      flag.dispose();
    });
    if (!collected) return;
    const sound = new Audio(assetUrl("assets/flag.mp3"));
    sound.volume = 0.9;
    void sound.play().catch(() => undefined);
  }

  private showFlagFoundCelebration(): void {
    const banner = document.createElement("div");
    banner.className = "flag-found-celebration";
    banner.innerHTML = "<strong>FLAG FOUND!</strong><span>Excellent searching!</span>";
    gameScreen.append(banner);
    banner.addEventListener("animationend", () => banner.remove(), { once: true });
  }

  private updateReportControl(): void {
    const room = this.room;
    const eligible = this.localAlive && room?.state.phase === "game";
    reportButton.classList.toggle("hidden", !eligible);
    this.reportTargetId = "";
    if (!eligible || !room) return;
    const crimes = roomCollection(room, "crimes");
    if (!crimes) return;
    let nearestDistance = 2.8;
    let victimName = "";
    crimes.forEach((crime: any, id: string) => {
      const distance = Math.hypot(this.playerRoot.position.x - crime.x, this.playerRoot.position.z - crime.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        this.reportTargetId = id;
        victimName = crime.victimName;
      }
    });
    reportButton.disabled = !this.reportTargetId;
    reportButton.classList.toggle("hidden", !this.reportTargetId);
    if (this.reportTargetId) blendMessage.textContent = `Report ${victimName}'s burst marker`;
  }

  private tryReport(): void {
    if (!this.reportTargetId || reportButton.disabled) return;
    this.room?.send("report", this.reportTargetId);
  }

  private animatePop(root: TransformNode, finished: () => void): void {
    const started = performance.now();
    let fragmentsCreated = false;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - started) / 360);
      if (progress < 0.25) {
        const squeeze = progress / 0.25;
        root.scaling.set(1 + squeeze * 0.16, 1 - squeeze * 0.22, 1 + squeeze * 0.16);
      } else if (progress < 0.62) {
        const swell = (progress - 0.25) / 0.37;
        root.scaling.set(1.16 + swell * 0.7, 0.78 + swell * 1.1, 1.16 + swell * 0.7);
      } else {
        if (!fragmentsCreated) {
          fragmentsCreated = true;
          this.createBurstFragments(root.position.clone());
        }
        const collapse = Math.max(0.03, 1 - (progress - 0.62) / 0.38);
        root.scaling.setAll(collapse * 1.86);
      }
      if (progress >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        finished();
      }
    });
  }

  private playPopSound(): void {
    const sound = new Audio(assetUrl("assets/bust.mp3"));
    sound.volume = 0.82;
    void sound.play().catch(() => {
      // Some browsers may still require a prior touch before playing audio.
    });
  }

  private createBurstFragments(origin: Vector3): void {
    const fragments: Array<{ mesh: Mesh; velocity: Vector3; spin: Vector3 }> = [];
    const colors = [
      new Color3(1, 0.22, 0.55),
      new Color3(0.45, 0.95, 1),
      new Color3(0.75, 1, 0.25),
      new Color3(1, 0.72, 0.18),
    ];
    for (let index = 0; index < 14; index += 1) {
      const fragment = MeshBuilder.CreateSphere(`bust-fragment-${index}`, {
        diameter: 0.16 + (index % 3) * 0.045,
        segments: 5,
      }, this.scene);
      const material = new StandardMaterial(`bust-fragment-material-${index}`, this.scene);
      material.diffuseColor = colors[index % colors.length];
      material.emissiveColor = colors[index % colors.length].scale(0.45);
      fragment.material = material;
      fragment.position = origin.add(new Vector3(0, 1.15, 0));
      const angle = (index / 14) * Math.PI * 2;
      const speed = 2.4 + (index % 4) * 0.42;
      fragments.push({
        mesh: fragment,
        velocity: new Vector3(Math.cos(angle) * speed, 2.1 + (index % 3) * 0.5, Math.sin(angle) * speed),
        spin: new Vector3(4 + index % 3, 5 + index % 4, 3 + index % 5),
      });
    }
    const started = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      const elapsed = (performance.now() - started) / 1000;
      for (const fragment of fragments) {
        fragment.velocity.y -= 7.5 * dt;
        fragment.mesh.position.addInPlace(fragment.velocity.scale(dt));
        fragment.mesh.rotation.addInPlace(fragment.spin.scale(dt));
        fragment.mesh.scaling.setAll(Math.max(0.01, 1 - elapsed / 0.78));
      }
      if (elapsed >= 0.78) {
        this.scene.onBeforeRenderObservable.remove(observer);
        fragments.forEach(({ mesh }) => {
          mesh.material?.dispose();
          mesh.dispose();
        });
      }
    });
  }

  private moveWithSolidCollisions(movement: Vector3): void {
    // Resolve each horizontal axis separately. This prevents tunnelling through
    // props while still allowing the player to slide naturally along edges.
    if (Math.abs(movement.x) > 0.0001) {
      const candidateX = this.playerCollider.position.x + movement.x;
      const candidateZ = this.playerCollider.position.z;
      if (!this.isPositionBlocked(candidateX, candidateZ)) {
        this.playerCollider.moveWithCollisions(new Vector3(movement.x, 0, 0));
      }
    }

    if (Math.abs(movement.z) > 0.0001) {
      const candidateX = this.playerCollider.position.x;
      const candidateZ = this.playerCollider.position.z + movement.z;
      if (!this.isPositionBlocked(candidateX, candidateZ)) {
        this.playerCollider.moveWithCollisions(new Vector3(0, 0, movement.z));
      }
    }
  }

  private updateCameraOcclusion(focus: Vector3, dt: number): void {
    if (!this.camera || this.cameraOccluders.length === 0) return;
    const toCamera = this.camera.position.subtract(focus);
    const distance = toCamera.length();
    if (distance < 0.01) return;
    const direction = toCamera.scale(1 / distance);
    const cameraRight = Vector3.Cross(Vector3.Up(), direction).normalize();
    const obstructing = new Set<Mesh>();

    // Cast a small fan of rays rather than one infinitely thin centre ray.
    // This catches wall edges and corners across wide and narrow screens.
    for (const offset of [-0.55, 0, 0.55]) {
      const origin = focus.add(cameraRight.scale(offset));
      const ray = new Ray(origin, this.camera.position.subtract(origin).normalize(), distance + 0.8);
      const hits = this.scene.multiPickWithRay(
        ray,
        (mesh) => this.cameraOccluders.includes(mesh as Mesh),
      ) ?? [];
      for (const hit of hits) {
        if (hit.hit && hit.pickedMesh) obstructing.add(hit.pickedMesh as Mesh);
      }
    }

    const now = performance.now();
    for (const wall of obstructing) this.wallOccludedUntil.set(wall, now + 950);
    for (const wall of this.cameraOccluders) {
      const targetVisibility = (this.wallOccludedUntil.get(wall) ?? 0) > now ? 0.035 : 1;
      const fadeSpeed = 1 - Math.exp(-(targetVisibility < wall.visibility ? 15 : 2.6) * dt);
      wall.visibility += (targetVisibility - wall.visibility) * fadeSpeed;
    }
  }

  private isPositionBlocked(x: number, z: number): boolean {
    const playerRadius = 0.68;

    for (const prop of this.disguiseProps) {
      if (!prop.isEnabled()) continue;
      prop.computeWorldMatrix(true);
      const bounds = prop.getBoundingInfo().boundingBox;
      const closestX = Math.max(bounds.minimumWorld.x, Math.min(x, bounds.maximumWorld.x));
      const closestZ = Math.max(bounds.minimumWorld.z, Math.min(z, bounds.maximumWorld.z));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < playerRadius * playerRadius) return true;
    }

    // Remote multiplayer characters are registered here when their meshes are
    // created. A circular footprint avoids players snagging on one another.
    for (const otherPlayer of this.remotePlayerColliders) {
      if (!otherPlayer.isEnabled()) continue;
      const dx = x - otherPlayer.position.x;
      const dz = z - otherPlayer.position.z;
      const combinedRadius = playerRadius + 0.68;
      const candidateDistanceSquared = dx * dx + dz * dz;
      if (candidateDistanceSquared < combinedRadius * combinedRadius) {
        // Network interpolation can briefly place two collision bodies inside
        // one another. Block movement toward the overlap, but always permit a
        // step that increases their distance so neither player becomes stuck.
        const currentDx = this.playerCollider.position.x - otherPlayer.position.x;
        const currentDz = this.playerCollider.position.z - otherPlayer.position.z;
        const currentDistanceSquared = currentDx * currentDx + currentDz * currentDz;
        if (candidateDistanceSquared <= currentDistanceSquared) return true;
      }
    }

    return false;
  }

  private updateBlendTarget(): void {
    if (this.room && this.room.state.phase !== "game") {
      this.setTargetProp(undefined);
      blendButton.disabled = true;
      return;
    }
    if (!this.localAlive) {
      this.setTargetProp(undefined);
      blendButton.disabled = true;
      blendLabel.textContent = "BLEND";
      blendMessage.textContent = "You were busted - watch the round";
      return;
    }
    const liftRemaining = this.liftLockedUntil - performance.now();
    if (liftRemaining > 0) {
      this.setTargetProp(undefined);
      blendButton.disabled = true;
      blendLabel.textContent = "BLEND";
      blendMessage.textContent = "Finish lifting before blending";
      return;
    }
    const cooldownRemaining = 850 - (performance.now() - this.lastBlendAt);
    if (this.disguised) {
      this.setTargetProp(undefined);
      blendButton.disabled = cooldownRemaining > 0;
      blendLabel.textContent = "UNBLEND";
      blendMessage.textContent = cooldownRemaining > 0
        ? "Disguise settling..."
        : "Press E or UNBLEND to return";
      return;
    }

    let nearest: Mesh | undefined;
    let nearestHighlight: Mesh | undefined;
    let copiedPlayerName = "";
    let nearestDistance = 3.2;
    for (const prop of this.disguiseProps) {
      const distance = Vector3.Distance(this.playerRoot.position, prop.position);
      if (distance < nearestDistance) {
        nearest = prop;
        nearestHighlight = prop;
        copiedPlayerName = "";
        nearestDistance = distance;
      }
    }
    for (const avatar of this.remotePlayers.values()) {
      if (!avatar.alive || !avatar.root.isEnabled() || !avatar.disguiseName || !avatar.disguiseMesh?.isEnabled()) continue;
      const source = this.disguiseProps.find((prop) => prop.name === avatar.disguiseName);
      if (!source) continue;
      const distance = Vector3.Distance(this.playerRoot.position, avatar.root.position);
      if (distance < nearestDistance) {
        nearest = source;
        nearestHighlight = avatar.disguiseMesh;
        copiedPlayerName = avatar.label.textContent ?? "player";
        nearestDistance = distance;
      }
    }
    this.setTargetProp(nearest, nearestHighlight);
    blendButton.disabled = !nearest || cooldownRemaining > 0;
    blendLabel.textContent = "BLEND";
    blendMessage.textContent = cooldownRemaining > 0
      ? "Blend recharging..."
      : nearest
        ? copiedPlayerName
          ? `Ready to copy ${copiedPlayerName}'s ${this.friendlyPropName(nearest)}`
          : `Ready to copy ${this.friendlyPropName(nearest)}`
        : "Move close to a prop to blend";
  }

  private setTargetProp(next: Mesh | undefined, highlight = next): void {
    if (this.targetProp === next && this.targetHighlight === highlight) return;
    if (this.targetHighlight) this.targetHighlight.renderOutline = false;
    this.targetProp = next;
    this.targetHighlight = highlight;
    if (this.targetHighlight) {
      this.targetHighlight.outlineColor = new Color3(0.7, 1, 0.2);
      this.targetHighlight.outlineWidth = 0.08;
      this.targetHighlight.renderOutline = true;
    }
  }

  private toggleBlend(): void {
    if (!this.localAlive || (this.room && this.room.state.phase !== "game")) return;
    if (performance.now() < this.liftLockedUntil) {
      blendButton.disabled = true;
      blendMessage.textContent = "Finish lifting before blending";
      return;
    }
    if (performance.now() - this.lastBlendAt < 850) return;
    if (this.disguised) {
      this.leaveDisguise();
      return;
    }
    if (!this.targetProp) {
      blendMessage.textContent = "Move closer to a glowing prop";
      return;
    }
    this.enterDisguise(this.targetProp);
  }

  private enterDisguise(source: Mesh): void {
    const clone = source.clone("playerDisguise", this.playerRoot);
    if (!clone) return;
    this.setTargetProp(undefined);
    clone.position.set(0, source.position.y, 0);
    clone.rotation.set(0, 0, 0);
    clone.checkCollisions = false;
    clone.isPickable = false;
    clone.renderOutline = false;
    clone.computeWorldMatrix(true);
    this.disguiseMesh = clone;
    this.playerBody.setEnabled(false);
    this.playerVisor.setEnabled(false);
    this.disguised = true;
    this.currentDisguiseName = source.name;
    this.room?.send("disguise", this.currentDisguiseName);
    this.lastBlendAt = performance.now();
    const halfHeight = clone.getBoundingInfo().boundingBox.extendSizeWorld.y;
    this.cameraTargetHeight = Math.max(0.7, Math.min(2.2, halfHeight * 1.15));
  }

  private leaveDisguise(): void {
    this.disguiseMesh?.dispose();
    this.disguiseMesh = undefined;
    this.playerBody.setEnabled(true);
    this.playerVisor.setEnabled(true);
    this.disguised = false;
    this.currentDisguiseName = "";
    this.room?.send("disguise", "");
    this.cameraTargetHeight = 1.35;
    this.lastBlendAt = performance.now();
  }

  private friendlyPropName(prop: Mesh): string {
    return prop.name.split("-")[0].replace("sarcophagus", "ancient display");
  }

  private cycleSpectatorRoom(direction: number): void {
    if (this.localAlive || this.spectatorPrivacyActive) return;
    const roomCount = PracticeGame.ROOM_NAMES.length;
    this.spectatorRoomIndex = (this.spectatorRoomIndex + direction + roomCount) % roomCount;
    securityCameraEffect.classList.remove("camera-switch");
    void securityCameraEffect.offsetWidth;
    securityCameraEffect.classList.add("camera-switch");
  }

  private securityCameraForRoom(index: number): { center: Vector3; alpha: number } {
    const safeIndex = Math.max(0, Math.min(PracticeGame.ROOM_NAMES.length - 1, index));
    const column = safeIndex % 5;
    const row = Math.floor(safeIndex / 5);
    const center = new Vector3(
      PracticeGame.ROOM_CENTERS[column],
      0,
      PracticeGame.ROOM_CENTERS[row],
    );
    const cornerAngles = [
      -Math.PI * 0.75,
      -Math.PI * 0.25,
      Math.PI * 0.75,
      Math.PI * 0.25,
    ];
    return {
      center,
      alpha: cornerAngles[(row + column * 2) % cornerAngles.length],
    };
  }

  private roomIndexAt(x: number, z: number): number {
    const column = Math.max(0, Math.min(4, Math.floor((x + 50) / 20)));
    const row = Math.max(0, Math.min(4, Math.floor((z + 50) / 20)));
    return row * 5 + column;
  }


  private roomNameAt(x: number, z: number): string {
    return PracticeGame.ROOM_NAMES[this.roomIndexAt(x, z)];
  }

  private dampAngle(current: number, target: number, speed: number, dt: number): number {
    const shortestDifference = Math.atan2(
      Math.sin(target - current),
      Math.cos(target - current),
    );
    return current + shortestDifference * (1 - Math.exp(-speed * dt));
  }
}
