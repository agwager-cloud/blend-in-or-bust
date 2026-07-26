import { Client, Room, ServerError } from "colyseus";
import { CrimeState, FlagState, GameState, PlayerState, RubbishState } from "./state.js";
import { createRoomCode, registerRoom, unregisterRoom } from "./roomDirectory.js";

interface JoinOptions {
  name?: string;
  deviceId?: string;
}

interface MoveMessage {
  x: number;
  y: number;
  z: number;
  rotation: number;
  moving: boolean;
}

type BotPurpose = "roam" | "inspect" | "clean" | "pursue";

interface BotTarget {
  x: number;
  z: number;
  nextThinkAt: number;
  purpose: BotPurpose;
  propId?: string;
  targetId?: string;
}

export class BlendRoom extends Room<GameState> {
  private static readonly BOT_MOVE_SPEED = 5.2;
  private static readonly LIFT_BLEND_LOCK_MS = 1125;
  private static readonly GLOBAL_BUST_COOLDOWN_MS = 10_000;
  private static readonly BOT_PROP_INTERACT_RANGE = 3.1;
  private static readonly BOT_LIFT_COOLDOWN_MS = 4_800;
  private static readonly ROOM_CENTERS = [-40, -20, 0, 20, 40] as const;
  private static readonly CENTRE_ROOM_INDEX = 12;
  private static readonly GRAND_GALLERY_INDEX = 7;
  private static readonly PILLAR_ROOM_INDICES = new Set([1, 3, 5, 9, 15, 19, 21, 23]);
  maxClients = 24;
  state = new GameState();
  private roomCode = "";
  private deviceSessions = new Map<string, string>();
  // Reserve a device during authentication so two tabs attempting to join at
  // the same moment cannot both pass before onJoin records the first session.
  private deviceReservations = new Map<string, { sessionId: string; expiresAt: number }>();
  private sessionDevices = new Map<string, string>();
  // Names removed by the host stay blocked for the lifetime of this room.
  // Players may rejoin only after choosing a genuinely different name.
  private removedNameKeys = new Set<string>();
  private roles = new Map<string, "blender" | "seeker">();
  private lastLiftAt = new Map<string, number>();
  private liftLockedUntil = new Map<string, number>();
  private votes = new Map<string, string>();
  private roundSpawns = new Map<string, { x: number; y: number; z: number; rotation: number }>();
  private lastSpectatorConcealAt = new Map<string, number>();
  private pausedRoundRemaining = 0;
  private globalBustBlockedUntil = 0;
  // A second independent timestamp protects the shared cooldown from any
  // unrelated phase/reset code accidentally shortening the active Bust lock.
  private lastSuccessfulBustAt = Number.NEGATIVE_INFINITY;
  private botBustGraceRemainingMs = 60_000;
  private botTargets = new Map<string, BotTarget>();
  private botRoutes = new Map<string, Array<{ x: number; z: number }>>();
  private botFlagReadyAt = new Map<string, number>();
  // Public Blender bots share one round-wide flag quota. This keeps them useful
  // without allowing automated players to solve most of the human objective.
  private botFlagsFoundThisRound = 0;
  private botFlagFindLimit = 0;
  private botNextInspectAt = new Map<string, number>();
  private botLiftHistory = new Map<string, string[]>();
  private botPendingBlend = new Map<string, { propId: string; readyAt: number; shouldBlend: boolean }>();
  private botBustTargetSince = new Map<string, { targetId: string; since: number }>();
  // Keep a Buster bot committed to one victim long enough to navigate the
  // expanded museum and complete its visible stalking window. Without this,
  // the 1.35-second pursuit refresh could repeatedly choose a different nearby
  // Blender and reset the 2.4-second Bust preparation forever.
  private botPursuitLocks = new Map<string, { targetId: string; lockedUntil: number }>();
  private postMeetingMoveBlockedUntil = 0;
  // A round does not begin until every active human has both loaded the 3D
  // museum and acknowledged their private role. This prevents the timer from
  // expiring behind a loading screen and guarantees the host can move when the
  // arena becomes visible.
  private roundReadyClients = new Set<string>();
  private roleReadyClients = new Set<string>();
  private roundLoadingDeadline = 0;
  private static readonly ROUND_LOADING_TIMEOUT_MS = 120_000;
  private static readonly SYNCHRONIZED_REVEAL_MS = 4_000;

  onCreate(): void {
    this.roomCode = createRoomCode();
    this.state.roomCode = this.roomCode;
    registerRoom(this.roomCode, this.roomId);
    this.setMetadata({ roomCode: this.roomCode });
    this.setSimulationInterval(() => {
      try {
        this.updateRound();
      } catch (error) {
        // Keep one bot/pathing fault from disposing the entire room and
        // disconnecting every browser. Log it for Render while the next tick
        // continues normally.
        console.error(`[BlendRoom ${this.roomCode}] simulation tick failed`, error);
      }
    });
    this.onMessage("move", (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.alive || player.isLateSpectator || this.state.phase !== "game") return;
      if (Date.now() < this.postMeetingMoveBlockedUntil) return;
      player.x = this.safeNumber(message.x, player.x);
      player.y = this.safeNumber(message.y, player.y);
      player.z = this.safeNumber(message.z, player.z);
      player.rotation = this.safeNumber(message.rotation, player.rotation);
      player.moving = Boolean(message.moving);
      this.tryCollectFlag(client.sessionId, player);
      this.tryCollectRubbish(client.sessionId, player);
    });
    this.onMessage("disguise", (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.alive || this.state.phase !== "game") return;
      // Imported museum prop identifiers can exceed 24 characters. Truncating
      // them made the disguising player see the correct local clone while
      // remote clients could not find the shortened prop name and displayed
      // the normal player body instead.
      const disguise = typeof value === "string" ? value.slice(0, 96) : "";
      // A new disguise cannot begin while the inspected prop is still in its
      // lift animation. This server guard backs up the disabled client button
      // and prevents a fast key press or delayed packet from creating a
      // floating disguise.
      if (disguise && Date.now() < (this.liftLockedUntil.get(client.sessionId) ?? 0)) return;
      if (player.disguise === disguise) return;
      player.disguise = disguise;
      // Send an immediate reliable visual update as well as the schema patch.
      // The client reconciles back to schema state as soon as that patch lands.
      this.broadcast("disguise-changed", {
        sessionId: client.sessionId,
        disguise,
      });
    });
    this.onMessage("bust", (client, targetSessionId: unknown) => {
      try {
        const requestedTargetId = typeof targetSessionId === "string" ? targetSessionId : "";
        const reject = (reason: string) => client.send("bust-rejected", {
          targetSessionId: requestedTargetId,
          reason,
        });
        if (!requestedTargetId || this.state.phase !== "game") {
          reject("not-active");
          return;
        }
        const attacker = this.state.players.get(client.sessionId);
        const target = this.state.players.get(requestedTargetId);
        if (!attacker?.alive || !target?.alive) {
          reject("not-alive");
          return;
        }
        if (!attacker.disguise) {
          reject("not-disguised");
          return;
        }
        if (this.roles.get(client.sessionId) !== "blender" || this.roles.get(requestedTargetId) !== "seeker") {
          reject("invalid-target");
          return;
        }
        const now = Date.now();
        const distanceSquared = (attacker.x - target.x) ** 2 + (attacker.z - target.z) ** 2;
        if (distanceSquared > 3.35 ** 2) {
          reject("out-of-range");
          return;
        }
        // Claim the one shared Bust slot before changing the victim. Human and
        // bot Busters both pass through this same atomic server-side gate.
        if (!this.tryClaimGlobalBust(now)) {
          reject("cooldown");
          return;
        }
        target.alive = false;
        target.moving = false;
        target.disguise = "";
        target.spectateUnlockAt = now + 15_000;
        target.spectateTarget = "";
        if (target.isBot) this.clearBotRuntimeState(requestedTargetId);
        const crime = new CrimeState();
        crime.id = `crime-${now}-${requestedTargetId}`;
        crime.victimName = target.name;
        crime.x = target.x;
        crime.z = target.z;
        this.state.crimes.set(crime.id, crime);
        // Conceal every Buster before the Busted message changes the victim
        // into a spectator, preventing even a single rendered frame of the
        // attacker or another Buster from being visible.
        if (!target.isBot) this.sendSpectatorConcealment(requestedTargetId);
        this.broadcast("busted", {
          targetSessionId: requestedTargetId,
          attackerSessionId: client.sessionId,
          targetName: target.name,
        });
        this.checkTeamWin();
      } catch (error) {
        // A malformed bot/state edge case must never crash the room process.
        // Reject the action, keep the socket open and leave a useful Render log.
        console.error(`[BlendRoom ${this.roomCode}] Bust handler failed`, error);
        try {
          client.send("bust-rejected", {
            targetSessionId: typeof targetSessionId === "string" ? targetSessionId : "",
            reason: "server-error",
          });
        } catch {
          // The socket may already be closing; do not throw a second error.
        }
      }
    });
    this.onMessage("lift", (client, containerId: unknown) => {
      if (typeof containerId !== "string" || this.state.phase !== "game") return;
      const player = this.state.players.get(client.sessionId);
      if (!player?.alive || player.isBot) return;
      const liftedPlayerId = containerId.startsWith("player:")
        ? containerId.slice("player:".length)
        : "";
      if (liftedPlayerId) {
        const liftedPlayer = this.state.players.get(liftedPlayerId);
        if (!liftedPlayer?.alive || liftedPlayerId === client.sessionId
          || (liftedPlayer.moving && !liftedPlayer.isBot) || !liftedPlayer.disguise) return;
        if (Math.hypot(player.x - liftedPlayer.x, player.z - liftedPlayer.z) > 3.1) return;
        const now = Date.now();
        if (now - (this.lastLiftAt.get(client.sessionId) ?? 0) < 900) return;
        this.lastLiftAt.set(client.sessionId, now);
        this.liftLockedUntil.set(client.sessionId, now + BlendRoom.LIFT_BLEND_LOCK_MS);
        client.send("lifted", { containerId, flagId: "", by: player.name });
        return;
      }
      const container = this.museumLiftables().find((candidate) => candidate.id === containerId);
      if (!container) return;
      if (Math.hypot(player.x - container.x, player.z - container.z) > 3.1) return;
      const now = Date.now();
      if (now - (this.lastLiftAt.get(client.sessionId) ?? 0) < 900) return;
      this.lastLiftAt.set(client.sessionId, now);
      this.liftLockedUntil.set(client.sessionId, now + BlendRoom.LIFT_BLEND_LOCK_MS);
      const flag = [...this.state.flags.values()].find((candidate) =>
        !candidate.found && candidate.containerId === containerId);
      const seekerFoundFlag = Boolean(flag) && this.roles.get(client.sessionId) === "seeker";
      if (flag && seekerFoundFlag) {
        flag.found = true;
        this.state.flagsFound += 1;
      }
      client.send("lifted", {
        containerId,
        flagId: flag?.id ?? "",
        by: player.name,
        collected: seekerFoundFlag,
      });
      if (seekerFoundFlag) this.checkBlenderObjectiveWin();
    });
    this.onMessage("report", (client, crimeId: unknown) => {
      if (typeof crimeId !== "string" || this.state.phase !== "game") return;
      const reporter = this.state.players.get(client.sessionId);
      const crime = this.state.crimes.get(crimeId);
      if (!reporter?.alive || reporter.isBot || !crime) return;
      const distanceSquared = (reporter.x - crime.x) ** 2 + (reporter.z - crime.z) ** 2;
      if (distanceSquared > 2.8 ** 2) return;
      this.startMeeting(reporter.name);
    });
    this.onMessage("vote", (client, targetId: unknown) => {
      if (this.state.phase !== "voting" || typeof targetId !== "string") return;
      const voter = this.state.players.get(client.sessionId);
      if (!voter?.alive || voter.isBot || this.votes.has(client.sessionId)) return;
      const target = this.state.players.get(targetId);
      if (targetId !== "skip" && !target?.alive) return;
      this.votes.set(client.sessionId, targetId);
      this.state.votesCast = this.votes.size;
      if (this.votes.size >= this.eligibleVoters().length) this.resolveVote();
    });
    this.onMessage("round-ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (this.state.phase !== "loading" || !player?.alive || player.isBot || player.isLateSpectator) return;
      this.roundReadyClients.add(client.sessionId);
      this.tryBeginSynchronizedReveal();
    });
    this.onMessage("role-ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (this.state.phase !== "loading" || !player?.alive || player.isBot || player.isLateSpectator) return;
      this.roleReadyClients.add(client.sessionId);
      this.tryBeginSynchronizedReveal();
    });
    this.onMessage("spectator-ready", (client) => {
      const spectator = this.state.players.get(client.sessionId);
      if (!spectator?.isLateSpectator || spectator.alive || spectator.isBot) return;
      spectator.spectateUnlockAt = Date.now();
      spectator.spectateTarget = "security";
      this.sendSpectatorConcealment(client.sessionId);
      this.lastSpectatorConcealAt.set(client.sessionId, Date.now());
    });
    this.onMessage("settings", (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost || this.state.phase !== "lobby") return;
      this.applyLobbySettings(value);
    });
    this.onMessage("kick-player", (client, targetSessionId: unknown) => {
      if (typeof targetSessionId !== "string" || this.state.phase !== "lobby") return;
      const host = this.state.players.get(client.sessionId);
      const target = this.state.players.get(targetSessionId);
      if (!host?.isHost || !target || target.isHost || target.isBot) return;

      // Remember the normalized name before deleting the player. The ban lasts
      // for this room's lifetime, so the removed player must enter a different
      // name rather than immediately returning with different capitalization,
      // spacing, underscores or hyphens.
      this.removedNameKeys.add(this.nameKey(target.name));

      // Remove the lobby record before closing the socket. A server-forced
      // leave is reported to onLeave as an unexpected disconnect, which used
      // to start the ten-second reconnection window and leave a ghost name in
      // the host's lobby. Deleting all authoritative session data first makes
      // the player disappear from every lobby immediately and prevents that
      // stale record from being restored.
      this.removePlayerSession(targetSessionId);
      this.clients
        .find((candidate) => candidate.sessionId === targetSessionId)
        ?.leave(4001);
    });
    this.onMessage("start", (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost || this.state.phase !== "lobby") return;
      // Apply the settings carried by the Start click atomically before bots
      // and roles are created. This prevents a fast start from using the old
      // Testing Bots value while the separate settings message is still in flight.
      this.applyLobbySettings(value);
      this.startRound();
      // Keep the room joinable so students arriving after the start can enter
      // directly as security-camera spectators. Participant capacity is still
      // enforced separately in onAuth while the room is in the lobby.
    });
    this.onMessage("return-lobby", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost || this.state.phase !== "results") return;
      this.resetToLobby();
    });
  }

  onAuth(client: Client, options: JoinOptions): boolean {
    if (this.state.phase === "lobby") {
      const lobbyParticipants = [...this.state.players.values()]
        .filter((player) => !player.isBot && !player.isLateSpectator).length;
      if (lobbyParticipants >= 24) {
        throw new ServerError(
          403,
          "ROOM FULL - this room already has 24 players. Please host a new room for the additional students.",
        );
      }
    }
    const name = this.cleanName(options.name);
    if (this.removedNameKeys.has(this.nameKey(name))) {
      throw new ServerError(
        403,
        "That name was removed from this room. Enter a different name before rejoining.",
      );
    }

    const deviceId = this.cleanDeviceId(options.deviceId);
    if (!deviceId) throw new ServerError(400, "This device could not be identified.");

    const now = Date.now();
    this.pruneDeviceReservations(now);
    const existing = this.deviceSessions.get(deviceId);
    const reservation = this.deviceReservations.get(deviceId);
    if ((existing && existing !== client.sessionId)
      || (reservation && reservation.sessionId !== client.sessionId)) {
      throw new ServerError(
        409,
        "This device is already connected to this room. Close the other game tab or leave that account before joining again.",
      );
    }

    // Claim the device here, not later in onJoin. Colyseus may authenticate two
    // near-simultaneous tabs before either onJoin callback runs; this temporary
    // reservation makes the one-device/one-account rule atomic.
    this.deviceReservations.set(deviceId, {
      sessionId: client.sessionId,
      expiresAt: now + 15_000,
    });
    options.deviceId = deviceId;
    options.name = name;
    return true;
  }

  onJoin(client: Client, options: JoinOptions): void {
    const joiningInProgress = this.state.phase !== "lobby";
    const player = new PlayerState();
    player.name = options.name ?? "Player";
    player.isHost = !joiningInProgress && this.state.players.size === 0;
    player.isLateSpectator = joiningInProgress;

    if (joiningInProgress) {
      // Late arrivals have no body, role or interaction rights in the active
      // round. They enter the fixed room-camera system immediately.
      player.alive = false;
      player.moving = false;
      player.disguise = "";
      player.x = 0;
      player.y = 0;
      player.z = 0;
      player.rotation = 0;
      player.spectateUnlockAt = Date.now();
      player.spectateTarget = "security";
    } else {
      const participantIndex = [...this.state.players.values()]
        .filter((candidate) => !candidate.isBot && !candidate.isLateSpectator).length;
      this.assignSpawn(player, participantIndex);
    }

    this.state.players.set(client.sessionId, player);
    const deviceId = options.deviceId!;
    this.deviceReservations.delete(deviceId);
    this.deviceSessions.set(deviceId, client.sessionId);
    this.sessionDevices.set(client.sessionId, deviceId);
    client.send("room-info", { roomCode: this.roomCode });

    if (joiningInProgress) {
      client.send("late-spectator", { roomIndex: BlendRoom.CENTRE_ROOM_INDEX });
      this.sendSpectatorConcealment(client.sessionId);
      this.lastSpectatorConcealAt.set(client.sessionId, Date.now());
    }
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    // Host removals delete the authoritative player record before the socket is
    // closed. The device reservation/session still needs a defensive release
    // in case the connection ended between authentication and onJoin.
    if (!player) {
      this.releaseDeviceForSession(client.sessionId);
      return;
    }
    if (!consented) {
      try {
        await this.allowReconnection(client, 45);
        return;
      } catch {
        // Reconnection window expired.
      }
    }
    this.removePlayerSession(client.sessionId);
  }

  private removePlayerSession(sessionId: string): void {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    const wasHost = player.isHost;

    this.state.players.delete(sessionId);
    this.roles.delete(sessionId);
    this.votes.delete(sessionId);
    for (const [voterId, targetId] of this.votes) {
      if (targetId === sessionId) this.votes.delete(voterId);
    }
    this.state.votesCast = this.votes.size;
    this.lastLiftAt.delete(sessionId);
    this.liftLockedUntil.delete(sessionId);
    this.roundSpawns.delete(sessionId);
    this.lastSpectatorConcealAt.delete(sessionId);
    this.botTargets.delete(sessionId);
    this.botRoutes.delete(sessionId);
    this.botFlagReadyAt.delete(sessionId);
    this.botNextInspectAt.delete(sessionId);
    this.botLiftHistory.delete(sessionId);
    this.botPendingBlend.delete(sessionId);
    this.botBustTargetSince.delete(sessionId);
    this.botPursuitLocks.delete(sessionId);
    this.roundReadyClients.delete(sessionId);
    this.roleReadyClients.delete(sessionId);
    for (const [botId, pursuit] of this.botPursuitLocks) {
      if (pursuit.targetId === sessionId) this.botPursuitLocks.delete(botId);
    }

    this.releaseDeviceForSession(sessionId);

    if (wasHost) {
      const next = [...this.state.players.values()]
        .find((candidate) => !candidate.isBot && !candidate.isLateSpectator);
      if (next) next.isHost = true;
    }
    if (this.state.phase === "loading") this.tryBeginSynchronizedReveal();
  }

  onDispose(): void {
    unregisterRoom(this.roomCode);
  }

  private applyLobbySettings(value: unknown): void {
    if (typeof value !== "object" || !value) return;
    const settings = value as {
      roundSeconds?: unknown;
      blenderOverride?: unknown;
      botsEnabled?: unknown;
      balancedHumanRoles?: unknown;
    };
    const requestedRoundSeconds = Number(settings.roundSeconds);
    this.state.roundSeconds = [180, 240, 300].includes(requestedRoundSeconds)
      ? requestedRoundSeconds
      : this.state.roundSeconds;
    this.state.blenderOverride = this.clampInteger(
      settings.blenderOverride,
      0,
      6,
      this.state.blenderOverride,
    );
    this.state.botsEnabled = settings.botsEnabled === true;
    this.state.balancedHumanRoles = this.state.botsEnabled
      && settings.balancedHumanRoles === true;
  }

  private startRound(): void {
    this.removeBots();
    const humanSessionIds = [...this.state.players]
      .filter(([, player]) => !player.isBot && !player.isLateSpectator)
      .map(([sessionId]) => sessionId);
    if (humanSessionIds.length === 0) return;
    this.roles.clear();
    this.lastLiftAt.clear();
    this.liftLockedUntil.clear();
    this.botTargets.clear();
    this.botRoutes.clear();
    this.botFlagReadyAt.clear();
    this.botFlagsFoundThisRound = 0;
    this.botFlagFindLimit = 0;
    this.botNextInspectAt.clear();
    this.botLiftHistory.clear();
    this.botPendingBlend.clear();
    this.botBustTargetSince.clear();
    this.botPursuitLocks.clear();
    this.roundReadyClients.clear();
    this.roleReadyClients.clear();
    this.roundLoadingDeadline = 0;
    this.votes.clear();
    this.roundSpawns.clear();
    this.lastSpectatorConcealAt.clear();
    this.globalBustBlockedUntil = 0;
    this.lastSuccessfulBustAt = Number.NEGATIVE_INFINITY;
    this.botBustGraceRemainingMs = 60_000;
    this.postMeetingMoveBlockedUntil = 0;
    this.state.crimes.clear();
    humanSessionIds.forEach((sessionId, index) => {
      const player = this.state.players.get(sessionId)!;
      player.alive = true;
      player.disguise = "";
      player.moving = false;
      player.rotation = 0;
      player.spectateUnlockAt = 0;
      player.spectateTarget = "";
      this.assignSpawn(player, index);
    });
    if (this.state.botsEnabled) {
      this.addTestingBots(Math.min(8, Math.max(0, 24 - humanSessionIds.length)));
    }
    this.state.players.forEach((player, sessionId) => {
      if (player.isLateSpectator) return;
      this.roundSpawns.set(sessionId, {
        x: player.x,
        y: player.y,
        z: player.z,
        rotation: player.rotation,
      });
    });
    const participantIds = [...this.state.players]
      .filter(([, player]) => !player.isLateSpectator)
      .map(([sessionId]) => sessionId);
    const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
    // The expanded 25-room objective needs a smaller hidden team than the old
    // 18-room map. Automatic games now use roughly one Buster per 8-10 players,
    // while the host can still choose a higher manual count in the lobby.
    const automatic = participantIds.length <= 1 ? 0
      : participantIds.length <= 10 ? 1
        : participantIds.length <= 18 ? 2 : 3;
    const blenderCount = Math.min(
      Math.max(0, this.state.blenderOverride || automatic),
      Math.max(0, participantIds.length - 1),
    );
    // A solo human testing with bots receives an independent 50/50 role draw
    // each round. Swap that player into or out of the Blender section after
    // shuffling so the total role counts remain correct.
    if (this.state.botsEnabled && humanSessionIds.length === 1 && blenderCount > 0) {
      const humanId = humanSessionIds[0];
      const humanIndex = shuffled.indexOf(humanId);
      const shouldBeBlender = Math.random() < 0.5;
      if (shouldBeBlender && humanIndex >= blenderCount) {
        [shuffled[0], shuffled[humanIndex]] = [shuffled[humanIndex], shuffled[0]];
      } else if (!shouldBeBlender && humanIndex < blenderCount) {
        [shuffled[blenderCount], shuffled[humanIndex]] = [shuffled[humanIndex], shuffled[blenderCount]];
      }
    }
    // Optional classroom testing mode: when exactly two humans use bots, one
    // human is guaranteed to be a Blender and the other a Seeker. Which human
    // receives each role is randomised independently every round.
    if (
      this.state.botsEnabled
      && this.state.balancedHumanRoles
      && humanSessionIds.length === 2
      && blenderCount > 0
    ) {
      const blenderHuman = humanSessionIds[Math.random() < 0.5 ? 0 : 1];
      const seekerHuman = humanSessionIds.find((id) => id !== blenderHuman)!;
      const placeAt = (sessionId: string, targetIndex: number) => {
        const currentIndex = shuffled.indexOf(sessionId);
        if (currentIndex < 0 || currentIndex === targetIndex) return;
        [shuffled[targetIndex], shuffled[currentIndex]] = [shuffled[currentIndex], shuffled[targetIndex]];
      };
      placeAt(blenderHuman, 0);
      placeAt(seekerHuman, blenderCount);
    }
    shuffled.forEach((sessionId, index) => {
      const role = index < blenderCount ? "blender" : "seeker";
      this.roles.set(sessionId, role);
    });
    // Late CCTV viewers do not increase role counts or museum objectives.
    this.createFlags(this.flagCountForPlayers(participantIds.length));
    this.createRubbish(this.rubbishCountForPlayers(participantIds.length));
    // Choose one collective bot contribution for this round between 30% and
    // 40% of the flags. Once reached, bots keep cleaning and lifting decoy
    // props, but every remaining flag must be found by human Blenders.
    const minimumBotFlags = Math.max(1, Math.ceil(this.state.flagsRequired * 0.30));
    const maximumBotFlags = Math.max(1, Math.floor(this.state.flagsRequired * 0.40));
    const quotaFloor = Math.min(minimumBotFlags, maximumBotFlags);
    const quotaCeiling = Math.max(quotaFloor, maximumBotFlags);
    this.botFlagsFoundThisRound = 0;
    this.botFlagFindLimit = Math.min(
      Math.max(0, this.state.flagsRequired - 1),
      quotaFloor + Math.floor(Math.random() * (quotaCeiling - quotaFloor + 1)),
    );
    this.state.players.forEach((player, sessionId) => {
      if (!player.isLateSpectator) return;
      this.sendSpectatorConcealment(sessionId);
      this.lastSpectatorConcealAt.set(sessionId, Date.now());
    });
    this.state.flagsFound = 0;
    this.state.rubbishCollected = 0;
    this.state.winner = "";
    this.state.phase = "loading";
    this.state.revealEndsAt = 0;
    this.state.roundEndsAt = 0;
    this.state.revealSecondsRemaining = 0;
    this.state.roundSecondsRemaining = this.state.roundSeconds;
    this.state.meetingSecondsRemaining = 0;
    this.roundLoadingDeadline = Date.now() + BlendRoom.ROUND_LOADING_TIMEOUT_MS;

    // Send private roles only after the authoritative loading phase is active.
    // Players may acknowledge immediately while their museum continues loading;
    // the timer will not begin until both acknowledgements are complete.
    shuffled.forEach((sessionId) => {
      const role = this.roles.get(sessionId)!;
      this.clients.find((client) => client.sessionId === sessionId)?.send("role", {
        role,
        blenderCount,
        blenderTeammates: role === "blender"
          ? shuffled.slice(0, blenderCount).filter((id) => id !== sessionId)
          : [],
      });
    });
  }

  private activeHumanSessionIds(): string[] {
    return [...this.state.players]
      .filter(([, player]) => player.alive && !player.isBot && !player.isLateSpectator)
      .map(([sessionId]) => sessionId);
  }

  private tryBeginSynchronizedReveal(now = Date.now()): void {
    if (this.state.phase !== "loading") return;
    const humans = this.activeHumanSessionIds();
    if (humans.length === 0) return;
    const everyoneReady = humans.every((sessionId) =>
      this.roundReadyClients.has(sessionId) && this.roleReadyClients.has(sessionId));
    if (!everyoneReady && now < this.roundLoadingDeadline) return;
    this.beginSynchronizedReveal(now);
  }

  private beginSynchronizedReveal(now: number): void {
    if (this.state.phase !== "loading") return;
    this.state.phase = "reveal";
    this.state.revealEndsAt = now + BlendRoom.SYNCHRONIZED_REVEAL_MS;
    this.state.roundEndsAt = this.state.revealEndsAt + this.state.roundSeconds * 1000;
    this.state.revealSecondsRemaining = Math.ceil(BlendRoom.SYNCHRONIZED_REVEAL_MS / 1000);
    this.state.roundSecondsRemaining = this.state.roundSeconds;

    [...this.state.players]
      .filter(([, player]) => player.isBot)
      .forEach(([id], index) => {
        // Bot searching begins only after the synchronized reveal, so the
        // opening grace period and round timer are identical for every client.
        const firstFlagInspection = this.state.revealEndsAt + 10_000 + index * 1_500;
        this.botFlagReadyAt.set(id, firstFlagInspection);
        this.botNextInspectAt.set(id, this.state.revealEndsAt + 1_800 + index * 500);
      });
  }

  private updateRound(): void {
    const now = Date.now();
    if (this.state.phase === "loading") {
      this.tryBeginSynchronizedReveal(now);
    } else if (this.state.phase === "reveal" && now >= this.state.revealEndsAt) {
      this.state.phase = "game";
    } else if (this.state.phase === "game" && now >= this.state.roundEndsAt) {
      this.finishRound("blenders");
    }
    if (this.state.phase === "game" && now >= this.postMeetingMoveBlockedUntil) {
      this.updateBots(1 / 60, now);
    }
    this.updateSpectators(now);
    if (this.state.phase === "discussion" && now >= this.state.meetingEndsAt) {
      this.state.phase = "voting";
      this.state.meetingEndsAt = now + 20_000;
    } else if (this.state.phase === "voting" && now >= this.state.meetingEndsAt) {
      this.resolveVote();
    } else if (this.state.phase === "verdict" && now >= this.state.meetingEndsAt) {
      if (this.checkTeamWin()) return;
      // Block stale pre-meeting movement packets while every client applies
      // the authoritative round-start positions. A short repeated reset covers
      // clients that receive the phase patch just before the reset message.
      this.postMeetingMoveBlockedUntil = now + 800;
      this.resetAlivePlayersToRoundSpawns();
      this.state.phase = "game";
      this.state.roundEndsAt = now + this.pausedRoundRemaining;
      this.clock.setTimeout(() => {
        if (this.state.phase === "game") this.resetAlivePlayersToRoundSpawns();
      }, 220);
      this.state.verdictText = "";
      this.state.verdictRole = "";
      const oneFlagRemains = this.state.flagsRequired - this.state.flagsFound === 1;
      // Meetings provide a clean restart. Unless the final flag remains, all
      // Busters share a ten-second grace period after play resumes.
      this.startGlobalBustCooldown(now, oneFlagRemains);
    }
    this.syncAuthoritativeCountdowns(now);
  }

  private syncAuthoritativeCountdowns(now: number): void {
    this.state.revealSecondsRemaining = this.state.phase === "reveal"
      ? Math.max(0, Math.ceil((this.state.revealEndsAt - now) / 1000))
      : 0;
    if (this.state.phase === "loading" || this.state.phase === "reveal") {
      this.state.roundSecondsRemaining = this.state.roundSeconds;
    } else if (this.state.phase === "game") {
      this.state.roundSecondsRemaining = Math.max(0, Math.ceil((this.state.roundEndsAt - now) / 1000));
    } else if (["discussion", "voting", "verdict"].includes(this.state.phase)) {
      this.state.roundSecondsRemaining = Math.max(0, Math.ceil(this.pausedRoundRemaining / 1000));
    } else if (this.state.phase === "results" || this.state.phase === "lobby") {
      this.state.roundSecondsRemaining = 0;
    }
    this.state.meetingSecondsRemaining = ["discussion", "voting", "verdict"].includes(this.state.phase)
      ? Math.max(0, Math.ceil((this.state.meetingEndsAt - now) / 1000))
      : 0;
  }

  private startMeeting(reporterName: string): void {
    this.pausedRoundRemaining = Math.max(1_000, this.state.roundEndsAt - Date.now());
    this.state.players.forEach((player) => { player.moving = false; });
    this.state.crimes.clear();
    this.votes.clear();
    this.state.votesCast = 0;
    this.state.meetingNumber += 1;
    this.state.meetingReporter = reporterName;
    this.state.verdictText = "";
    this.state.verdictRole = "";
    this.state.phase = "discussion";
    this.state.meetingEndsAt = Date.now() + 15_000;
    this.state.roundSecondsRemaining = Math.max(1, Math.ceil(this.pausedRoundRemaining / 1000));
    this.state.meetingSecondsRemaining = 15;
  }

  private eligibleVoters(): string[] {
    return [...this.state.players]
      .filter(([, player]) => player.alive && !player.isBot)
      .map(([sessionId]) => sessionId);
  }

  private resolveVote(): void {
    if (this.state.phase !== "voting") return;
    const totals = new Map<string, number>();
    for (const targetId of this.votes.values()) {
      totals.set(targetId, (totals.get(targetId) ?? 0) + 1);
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    const tied = !top || (ranked[1]?.[1] ?? -1) === top[1] || top[0] === "skip";
    if (tied) {
      this.state.verdictText = top?.[0] === "skip" ? "The group chose to skip." : "The vote was tied. Nobody was removed.";
      this.state.verdictRole = "";
    } else {
      const target = this.state.players.get(top[0]);
      if (target) {
        target.alive = false;
        target.moving = false;
        target.disguise = "";
        target.spectateUnlockAt = Date.now();
        target.spectateTarget = "";
        const role = this.roles.get(top[0]) ?? "seeker";
        this.state.verdictText = `${target.name} was voted out.`;
        this.state.verdictRole = role;
        if (!target.isBot) this.sendSpectatorConcealment(top[0]);
        this.broadcast("ejected", { targetSessionId: top[0] });
      }
    }
    this.state.phase = "verdict";
    this.state.meetingEndsAt = Date.now() + 5_000;
  }

  private checkTeamWin(): boolean {
    const activeBlenders = [...this.roles].filter(([id, role]) =>
      role === "blender" && this.state.players.get(id)?.alive).length;
    const activeSeekers = [...this.roles].filter(([id, role]) =>
      role === "seeker" && this.state.players.get(id)?.alive).length;
    if (activeBlenders === 0) {
      this.finishRound("seekers");
      return true;
    }
    if (activeSeekers === 0) {
      this.finishRound("blenders");
      return true;
    }
    return false;
  }

  private tryCollectFlag(sessionId: string, player: PlayerState): void {
    if (this.roles.get(sessionId) !== "seeker") return;
    for (const flag of this.state.flags.values()) {
      if (flag.found || !flag.revealed) continue;
      const distanceSquared = (player.x - flag.x) ** 2 + (player.z - flag.z) ** 2;
      if (distanceSquared > 1.45 ** 2) continue;
      flag.found = true;
      this.state.flagsFound += 1;
      this.broadcast("flag-found", { id: flag.id, by: player.name });
      this.checkBlenderObjectiveWin();
      return;
    }
  }

  private tryCollectRubbish(sessionId: string, player: PlayerState): void {
    // The public Blender role uses the legacy internal "seeker" identifier.
    // Busters therefore walk straight over rubbish without removing it.
    if (this.roles.get(sessionId) !== "seeker" || this.state.phase !== "game") return;
    for (const rubbish of this.state.rubbish.values()) {
      if (rubbish.collected) continue;
      const distanceSquared = (player.x - rubbish.x) ** 2 + (player.z - rubbish.z) ** 2;
      if (distanceSquared > 1.55 ** 2) continue;
      rubbish.collected = true;
      this.state.rubbishCollected += 1;
      this.broadcast("rubbish-collected", { id: rubbish.id, by: player.name });
      this.checkBlenderObjectiveWin();
      return;
    }
  }

  private checkBlenderObjectiveWin(): void {
    if (
      this.state.flagsFound >= this.state.flagsRequired
      && this.state.rubbishCollected >= this.state.rubbishRequired
    ) this.finishRound("seekers");
  }


  private createFlags(count: number): void {
    this.state.flags.clear();

    const allLiftables = this.museumLiftables();
    const paintings = allLiftables.filter((candidate) => candidate.id.startsWith("museum-art-"));
    const floorProps = allLiftables.filter((candidate) => !candidate.id.startsWith("museum-art-"));
    const selected: Array<{ id: string; x: number; z: number }> = [];
    const usedIds = new Set<string>();
    const usedRooms = new Set<number>();

    const addFromPool = (
      pool: Array<{ id: string; x: number; z: number }>,
      targetTotal: number,
      preferUnusedRooms = true,
    ): void => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        if (selected.length >= targetTotal || usedIds.has(candidate.id)) continue;
        const roomIndex = this.roomIndexAt(candidate.x, candidate.z);
        if (preferUnusedRooms && usedRooms.has(roomIndex)) continue;
        selected.push(candidate);
        usedIds.add(candidate.id);
        usedRooms.add(roomIndex);
      }
      if (selected.length >= targetTotal || !preferUnusedRooms) return;
      addFromPool(pool, targetTotal, false);
    };

    // Between 30% and 40% of flags use framed paintings. The rest remain under
    // floor props, with unique rooms preferred so the museum search stays varied.
    const minimumPaintingFlags = Math.max(1, Math.ceil(count * 0.30));
    const maximumPaintingFlags = Math.max(1, Math.floor(count * 0.40));
    const paintingFloor = Math.min(minimumPaintingFlags, maximumPaintingFlags);
    const paintingCeiling = Math.max(paintingFloor, maximumPaintingFlags);
    const paintingTarget = Math.min(
      count,
      paintingFloor + Math.floor(Math.random() * (paintingCeiling - paintingFloor + 1)),
    );
    addFromPool(paintings, paintingTarget);
    addFromPool(floorProps, count);
    addFromPool(allLiftables, count);

    selected.slice(0, count).forEach((candidate, index) => {
      const flag = new FlagState();
      flag.id = `flag-${index}`;
      flag.containerId = candidate.id;
      flag.x = candidate.x;
      flag.z = candidate.z;
      flag.revealed = false;
      this.state.flags.set(flag.id, flag);
    });
    this.state.flagsRequired = Math.min(count, selected.length);
  }

  private createRubbish(count: number): void {
    this.state.rubbish.clear();
    const candidates = this.museumRubbishPositions();
    const candidatesByRoom = new Map<number, Array<{ x: number; z: number }>>();
    for (const candidate of candidates) {
      const roomIndex = this.roomIndexAt(candidate.x, candidate.z);
      const roomCandidates = candidatesByRoom.get(roomIndex) ?? [];
      roomCandidates.push(candidate);
      candidatesByRoom.set(roomIndex, roomCandidates);
    }

    // Spread reduced cleanup targets across the entire 5x5 museum rather than
    // forcing every small game to clear 25-35 pieces. The order alternates
    // centre, corners, edges and inner rooms, then rotates each round.
    const spreadOrder = [
      12, 0, 24, 4, 20, 2, 22, 10, 14,
      6, 8, 16, 18, 1, 3, 5, 9, 15, 19,
      21, 23, 7, 11, 13, 17,
    ];
    const shift = Math.floor(Math.random() * spreadOrder.length);
    let roomOrder = spreadOrder.map((_, index) => spreadOrder[(index + shift) % spreadOrder.length]);
    if (Math.random() < 0.5) roomOrder = roomOrder.reverse();

    const selected: Array<{ x: number; z: number }> = [];
    for (const roomIndex of roomOrder.slice(0, Math.min(count, 25))) {
      const roomCandidates = candidatesByRoom.get(roomIndex) ?? [];
      if (roomCandidates.length === 0) continue;
      selected.push(roomCandidates[Math.floor(Math.random() * roomCandidates.length)]);
    }

    const selectedKeys = new Set(selected.map(({ x, z }) => `${x.toFixed(2)},${z.toFixed(2)}`));
    const extras = candidates
      .filter(({ x, z }) => !selectedKeys.has(`${x.toFixed(2)},${z.toFixed(2)}`))
      .sort(() => Math.random() - 0.5);
    selected.push(...extras.slice(0, Math.max(0, count - selected.length)));

    selected.slice(0, count).forEach(({ x, z }, index) => {
      const rubbish = new RubbishState();
      rubbish.id = `rubbish-${index}`;
      rubbish.x = x;
      rubbish.z = z;
      rubbish.variant = index % 4;
      this.state.rubbish.set(rubbish.id, rubbish);
    });
    this.state.rubbishRequired = Math.min(count, selected.length);
  }

  private museumFurnitureSlots(roomIndex: number): Array<[number, number]> {
    const slots: Array<[number, number]> = [
      [-6.1, -5.4], [0, -6.2], [6.1, -5.4], [-6.7, 0],
      [6.7, 0], [-6.1, 5.4], [0, 6.2], [6.1, 5.4],
    ];
    if (!BlendRoom.PILLAR_ROOM_INDICES.has(roomIndex)) return slots;
    return slots.map(([x, z]): [number, number] => [x * 0.66, z * 0.66]);
  }


  private museumLiftables(): Array<{ id: string; x: number; z: number }> {
    const liftables: Array<{ id: string; x: number; z: number }> = [];
    const roomCenters = BlendRoom.ROOM_CENTERS.flatMap((z) =>
      BlendRoom.ROOM_CENTERS.map((x) => ({ x, z })));
    const catalogNames = [
      "museum-chair-cushion", "museum-chair-modern", "museum-bench-low",
      "museum-display-cabinet", "museum-coat-stand", "museum-table-lamp",
      "museum-square-lamp", "museum-lounge-chair", "museum-lounge-sofa",
      "museum-plant-leafy", "museum-plant-tall", "museum-plant-pot",
      "museum-vintage-radio", "museum-display-table", "museum-cross-table",
      "museum-media-display",
    ];
    const furnitureCounts = [
      4, 5, 6, 4, 5,
      5, 6, 0, 6, 4,
      4, 6, 0, 6, 5,
      5, 7, 4, 6, 5,
      6, 4, 6, 5, 7,
    ];
    for (let roomIndex = 0; roomIndex < roomCenters.length; roomIndex += 1) {
      const room = roomCenters[roomIndex];
      if (roomIndex !== BlendRoom.CENTRE_ROOM_INDEX) {
        liftables.push({
          id: roomIndex % 2 === 0 ? `fossil-exhibit-${roomIndex}` : `sculpture-exhibit-${roomIndex}`,
          x: room.x,
          z: room.z,
        });
      }
      if (roomIndex === BlendRoom.GRAND_GALLERY_INDEX || roomIndex === BlendRoom.CENTRE_ROOM_INDEX) continue;
      const slots = this.museumFurnitureSlots(roomIndex);
      const slotOrder = slots.map((_, index) => (index * 3 + roomIndex * 5) % slots.length);
      for (let slotIndex = 0; slotIndex < furnitureCounts[roomIndex]; slotIndex += 1) {
        const [offsetX, offsetZ] = slots[slotOrder[slotIndex]];
        const catalogIndex = (roomIndex * 5 + slotIndex * 3) % catalogNames.length;
        liftables.push({
          id: `${catalogNames[catalogIndex]}-room-${roomIndex}-${slotIndex}`,
          x: room.x + offsetX,
          z: room.z + offsetZ,
        });
      }
    }

    const galleryX = 0;
    const galleryZ = -20;
    [
      ["gallery-bench-0", -5.3, -3.3], ["gallery-bench-1", 5.3, -3.3],
      ["gallery-bench-2", -4.8, 3.8], ["gallery-bench-3", 4.8, 3.8],
      ["gallery-plant-0", -7.8, 5.8], ["gallery-plant-1", 7.8, 5.8],
      ["gallery-plant-2", -7.8, -7.2], ["gallery-plant-3", 7.8, -7.2],
      ["gallery-lamp-0", -6.8, 0.2], ["gallery-lamp-1", 6.8, 0.2],
      ["gallery-lamp-2", 0, -6.8], ["gallery-display-shelf-0", 0, -8.1],
      ["gallery-display-shelf-1", 0, 7.9],
    ].forEach(([id, x, z]) => liftables.push({
      id: String(id), x: galleryX + Number(x), z: galleryZ + Number(z),
    }));

    let paintingIndex = 0;
    roomCenters.forEach((room, roomIndex) => {
      if (roomIndex === BlendRoom.CENTRE_ROOM_INDEX) return;
      const sideSign = roomIndex % 2 === 0 ? -1 : 1;
      const westOffset = this.paintingOffsetForWall(roomIndex, "west");
      const eastOffset = this.paintingOffsetForWall(roomIndex, "east");
      liftables.push({
        id: `museum-art-${paintingIndex++}`,
        x: room.x - 9.66,
        z: room.z + sideSign * westOffset,
      });
      liftables.push({
        id: `museum-art-${paintingIndex++}`,
        x: room.x + 9.66,
        z: room.z - sideSign * eastOffset,
      });
    });
    return liftables;
  }

  private paintingOffsetForWall(roomIndex: number, side: "west" | "east"): number {
    const column = roomIndex % 5;
    const hasNeighbour = side === "west" ? column > 0 : column < 4;
    if (!hasNeighbour) return 5.8;
    const neighbourIndex = side === "west" ? roomIndex - 1 : roomIndex + 1;
    const doorWidth = roomIndex === BlendRoom.CENTRE_ROOM_INDEX
      || neighbourIndex === BlendRoom.CENTRE_ROOM_INDEX ? 12 : 7.2;
    const solidSegmentLength = (20 - doorWidth) / 2;
    return doorWidth / 2 + solidSegmentLength / 2;
  }


  private museumRubbishPositions(): Array<{ x: number; z: number }> {
    const offsets: Array<[number, number]> = [
      [-5.4, -5.2], [5.2, 5.1], [5.3, -4.9], [-5.1, 5.2],
      [0, -7.1], [0, 7.1], [-7.2, 0], [7.2, 0],
      [-3.2, 1.8], [3.3, -1.7], [1.8, 4.1], [-2.1, -4.0],
    ];
    const positions: Array<{ x: number; z: number }> = [];
    for (let roomIndex = 0; roomIndex < 25; roomIndex += 1) {
      const column = roomIndex % 5;
      const row = Math.floor(roomIndex / 5);
      const roomX = BlendRoom.ROOM_CENTERS[column];
      const roomZ = BlendRoom.ROOM_CENTERS[row];
      const start = (roomIndex * 5) % offsets.length;
      for (let offsetIndex = 0; offsetIndex < offsets.length; offsetIndex += 1) {
        const [offsetX, offsetZ] = offsets[(start + offsetIndex) % offsets.length];
        const x = roomX + offsetX;
        const z = roomZ + offsetZ;
        if (this.isMuseumBlocked(x, z)) continue;
        if (positions.some((item) => Math.hypot(item.x - x, item.z - z) < 2.2)) continue;
        positions.push({ x, z });
      }
    }
    return positions;
  }

  private flagCountForPlayers(players: number): number {
    if (players <= 3) return 3;
    if (players <= 5) return 4;
    if (players <= 10) return 5;
    if (players <= 15) return 6;
    if (players <= 20) return 7;
    return 8;
  }

  private rubbishCountForPlayers(players: number): number {
    // Extra paper balls make the cleanup objective visually present throughout
    // the 5x5 museum. The larger pickup radius and smarter Blender bots keep
    // the increased count achievable.
    if (players <= 3) return 14;
    if (players <= 5) return 18;
    if (players <= 10) return 24;
    if (players <= 15) return 28;
    if (players <= 20) return 32;
    return 36;
  }

  private finishRound(winner: "seekers" | "blenders"): void {
    if (this.state.phase === "results") return;
    this.state.winner = winner;
    this.state.phase = "results";
    this.state.revealSecondsRemaining = 0;
    this.state.roundSecondsRemaining = 0;
    this.state.meetingSecondsRemaining = 0;
    this.state.players.forEach((player) => { player.moving = false; });
    this.roundReadyClients.clear();
    this.roleReadyClients.clear();
    this.roundLoadingDeadline = 0;
  }

  private resetToLobby(): void {
    this.removeBots();
    this.roles.clear();
    this.votes.clear();
    this.roundSpawns.clear();
    this.lastSpectatorConcealAt.clear();
    this.globalBustBlockedUntil = 0;
    this.lastSuccessfulBustAt = Number.NEGATIVE_INFINITY;
    this.botFlagsFoundThisRound = 0;
    this.botFlagFindLimit = 0;
    this.botBustTargetSince.clear();
    this.botPursuitLocks.clear();
    this.roundReadyClients.clear();
    this.roleReadyClients.clear();
    this.roundLoadingDeadline = 0;
    this.state.flags.clear();
    this.state.rubbish.clear();
    this.state.crimes.clear();
    this.state.flagsFound = 0;
    this.state.flagsRequired = 0;
    this.state.rubbishCollected = 0;
    this.state.rubbishRequired = 0;
    this.state.revealEndsAt = 0;
    this.state.roundEndsAt = 0;
    this.state.revealSecondsRemaining = 0;
    this.state.roundSecondsRemaining = 0;
    this.state.meetingSecondsRemaining = 0;
    this.state.winner = "";
    this.state.meetingEndsAt = 0;
    this.state.meetingReporter = "";
    this.state.votesCast = 0;
    this.state.verdictText = "";
    this.state.verdictRole = "";
    this.postMeetingMoveBlockedUntil = 0;
    let participantCount = [...this.state.players.values()]
      .filter((player) => !player.isBot && !player.isLateSpectator).length;
    this.state.players.forEach((player) => {
      if (player.isBot) return;
      if (player.isLateSpectator && participantCount < 24) {
        player.isLateSpectator = false;
        participantCount += 1;
      }
      player.alive = !player.isLateSpectator;
      player.moving = false;
      player.disguise = "";
      player.spectateUnlockAt = player.isLateSpectator ? Date.now() : 0;
      player.spectateTarget = player.isLateSpectator ? "security" : "";
    });
    this.state.phase = "lobby";
    this.unlock();
  }

  private addTestingBots(count: number): void {
    const humanCount = [...this.state.players.values()]
      .filter((player) => !player.isBot && !player.isLateSpectator).length;
    for (let index = 0; index < count; index += 1) {
      const id = `bot-${index + 1}`;
      const bot = new PlayerState();
      bot.name = `Testing Bot ${index + 1}`;
      bot.isBot = true;
      this.assignSpawn(bot, humanCount + index);
      this.state.players.set(id, bot);
    }
  }

  private updateBots(dt: number, now: number): void {
    // Only active gameplay consumes the opening grace period. Meetings pause
    // bot movement and also pause this 60-second no-Bust window.
    this.botBustGraceRemainingMs = Math.max(0, this.botBustGraceRemainingMs - dt * 1000);
    const liftables = this.museumLiftables();

    for (const [sessionId, bot] of this.state.players) {
      if (!bot.isBot || !bot.alive) continue;
      const role = this.roles.get(sessionId) ?? "seeker";
      const remaining = this.state.flagsRequired - this.state.flagsFound;
      const botNumber = Number(sessionId.slice(4)) || 1;

      const pendingBlend = this.botPendingBlend.get(sessionId);
      if (pendingBlend && now >= pendingBlend.readyAt) {
        const source = liftables.find((prop) => prop.id === pendingBlend.propId);
        if (source && Math.hypot(bot.x - source.x, bot.z - source.z) <= BlendRoom.BOT_PROP_INTERACT_RANGE) {
          if (pendingBlend.shouldBlend) bot.disguise = source.id;
        }
        this.botPendingBlend.delete(sessionId);
      }
      if (pendingBlend && now < pendingBlend.readyAt) {
        bot.moving = false;
        continue;
      }

      let destination = this.botTargets.get(sessionId);
      if (destination) {
        const reachedWaypoint = Math.hypot(destination.x - bot.x, destination.z - bot.z) < 0.82;
        if (reachedWaypoint) {
          const route = this.botRoutes.get(sessionId) ?? [];
          const nextWaypoint = route.shift();
          if (nextWaypoint) {
            destination.x = nextWaypoint.x;
            destination.z = nextWaypoint.z;
            this.botRoutes.set(sessionId, route);
          } else {
            if (destination.purpose === "inspect" && destination.propId) {
              this.performBotInspection(
                sessionId,
                bot,
                role,
                destination.propId,
                liftables,
                now,
                remaining,
              );
            } else if (destination.purpose === "clean") {
              this.tryCollectRubbish(sessionId, bot);
            }
            this.botTargets.delete(sessionId);
            this.botRoutes.delete(sessionId);
            destination = undefined;
          }
        } else if (now >= destination.nextThinkAt) {
          this.botTargets.delete(sessionId);
          this.botRoutes.delete(sessionId);
          destination = undefined;
        }
      }

      if (this.botPendingBlend.has(sessionId)) {
        bot.moving = false;
        continue;
      }

      if (!destination) {
        let target: BotTarget | undefined;
        const mustActLikeSearcher = this.botBustGraceRemainingMs > 0;
        const readyToInspect = now >= (this.botNextInspectAt.get(sessionId) ?? 0);
        if (readyToInspect && bot.disguise && (mustActLikeSearcher || role === "seeker")) {
          bot.disguise = "";
        }

        // Public Blender bots periodically receive a purposeful hidden-flag
        // target. They still travel to the exact painting/prop and perform the
        // visible Lift animation, and they never collect the final flag.
        if (role === "seeker"
          && remaining > 1
          && this.botFlagsFoundThisRound < this.botFlagFindLimit
          && readyToInspect
          && now >= (this.botFlagReadyAt.get(sessionId) ?? Number.POSITIVE_INFINITY)) {
          target = this.chooseBotFlagTarget(sessionId, bot, liftables, now);
        }

        // Public Blenders help clean the museum as they search. Busters never
        // receive rubbish targets and cannot collect pieces by walking over them.
        if (!target && role === "seeker" && this.state.rubbishCollected < this.state.rubbishRequired) {
          target = this.chooseBotRubbishTarget(bot, now);
        }

        // During the opening 60 seconds every Buster behaves like a believable
        // searcher: it moves between varied props and visibly lifts them rather
        // than gravitating toward a stationary human Blender.
        if (!target && (mustActLikeSearcher || !bot.disguise || (role === "seeker" && readyToInspect))) {
          target = this.chooseBotPropTarget(
            sessionId,
            bot,
            liftables,
            now,
            role === "blender",
          );
        }

        if (!target && role === "blender" && this.botBustGraceRemainingMs <= 0 && bot.disguise) {
          target = this.chooseBotPursuitTarget(sessionId, bot, botNumber, now);
        }

        if (!target) target = this.chooseBotRoamTarget(bot, botNumber, now);
        const route = this.createBotRoute(bot, target.x, target.z);
        const firstWaypoint = route.shift();
        if (firstWaypoint) {
          target.x = firstWaypoint.x;
          target.z = firstWaypoint.z;
        }
        destination = target;
        this.botTargets.set(sessionId, destination);
        this.botRoutes.set(sessionId, route);
      }

      const dx = destination.x - bot.x;
      const dz = destination.z - bot.z;
      let steerX = dx;
      let steerZ = dz;
      for (const [otherId, other] of this.state.players) {
        if (otherId === sessionId || !other.alive) continue;
        const awayX = bot.x - other.x;
        const awayZ = bot.z - other.z;
        const separation = Math.hypot(awayX, awayZ);
        const humanClearance = other.isBot
          ? 2.8
          : destination.purpose === "pursue" ? 2.15 : (other.moving ? 3.25 : 4.1);
        if (separation <= 0.01) {
          const escapeAngle = (botNumber * 1.7) % (Math.PI * 2);
          steerX += Math.cos(escapeAngle) * 4.2;
          steerZ += Math.sin(escapeAngle) * 4.2;
        } else if (separation < humanClearance) {
          const strength = (humanClearance - separation) * (other.isBot ? 1.2 : 1.8);
          steerX += (awayX / separation) * strength;
          steerZ += (awayZ / separation) * strength;
        }
      }

      const distance = Math.max(0.001, Math.hypot(steerX, steerZ));
      const step = Math.min(distance, BlendRoom.BOT_MOVE_SPEED * dt);
      const previousX = bot.x;
      const previousZ = bot.z;
      const moved = this.moveBotWithLocalAvoidance(
        sessionId,
        bot,
        steerX / distance,
        steerZ / distance,
        step,
      );
      if (!moved) {
        this.botTargets.delete(sessionId);
        this.botRoutes.delete(sessionId);
      } else {
        bot.rotation = Math.atan2(bot.x - previousX, bot.z - previousZ) + Math.PI;
      }
      bot.moving = moved;
      if (moved) this.tryCollectRubbish(sessionId, bot);

      if (role === "blender") {
        const pursuitTargetId = destination?.purpose === "pursue"
          ? destination.targetId
          : this.botPursuitLocks.get(sessionId)?.targetId;
        this.tryBotBust(sessionId, bot, now, pursuitTargetId);
      }
    }
  }

  private chooseBotFlagTarget(
    sessionId: string,
    bot: PlayerState,
    liftables: Array<{ id: string; x: number; z: number }>,
    now: number,
  ): BotTarget | undefined {
    const liftableById = new Map(liftables.map((prop) => [prop.id, prop]));
    const history = this.botLiftHistory.get(sessionId) ?? [];
    const candidates = [...this.state.flags.values()]
      .filter((flag) => !flag.found && !flag.revealed)
      .map((flag) => liftableById.get(flag.containerId))
      .filter((prop): prop is { id: string; x: number; z: number } => Boolean(prop))
      .map((prop) => ({
        prop,
        distance: Math.hypot(prop.x - bot.x, prop.z - bot.z),
        recentlyLifted: history.includes(prop.id),
      }))
      .sort((a, b) => Number(a.recentlyLifted) - Number(b.recentlyLifted) || a.distance - b.distance)
      .slice(0, 4);
    if (candidates.length === 0) return undefined;
    const choice = candidates[Math.floor(Math.random() * Math.min(2, candidates.length))].prop;
    const approach = this.botApproachPoint(choice.x, choice.z, bot.x, bot.z);
    return {
      x: approach.x,
      z: approach.z,
      nextThinkAt: now + 20_000,
      purpose: "inspect",
      propId: choice.id,
    };
  }

  private chooseBotRubbishTarget(bot: PlayerState, now: number): BotTarget | undefined {
    const candidates = [...this.state.rubbish.values()]
      .filter((item) => !item.collected)
      .map((item) => ({ item, distance: Math.hypot(item.x - bot.x, item.z - bot.z) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
    if (candidates.length === 0) return undefined;
    const choice = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))].item;
    return { x: choice.x, z: choice.z, nextThinkAt: now + 14_000, purpose: "clean" };
  }

  private chooseBotPropTarget(
    sessionId: string,
    bot: PlayerState,
    liftables: Array<{ id: string; x: number; z: number }>,
    now: number,
    requireDisguisableProp = false,
  ): BotTarget | undefined {
    if (now < (this.botNextInspectAt.get(sessionId) ?? 0)) return undefined;
    const history = this.botLiftHistory.get(sessionId) ?? [];
    const candidates = liftables
      // A Buster cannot act until disguised. When it still needs a disguise,
      // ignore paintings because they can be lifted but cannot be copied.
      .filter((prop) => !requireDisguisableProp || !prop.id.startsWith("museum-art-"))
      .filter((prop) => !history.includes(prop.id))
      .map((prop) => ({ prop, distance: Math.hypot(prop.x - bot.x, prop.z - bot.z) }))
      .filter(({ distance }) => distance > 2.4)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 18);
    if (candidates.length === 0) {
      this.botLiftHistory.set(sessionId, []);
      return this.chooseBotPropTarget(
        sessionId,
        bot,
        liftables,
        now,
        requireDisguisableProp,
      );
    }
    const choice = candidates[Math.floor(Math.random() * Math.min(6, candidates.length))].prop;
    const approach = this.botApproachPoint(choice.x, choice.z, bot.x, bot.z);
    return {
      x: approach.x,
      z: approach.z,
      nextThinkAt: now + 18_000,
      purpose: "inspect",
      propId: choice.id,
    };
  }

  private botApproachPoint(propX: number, propZ: number, botX: number, botZ: number): { x: number; z: number } {
    const baseAngle = Math.atan2(botZ - propZ, botX - propX);
    for (const offset of [0, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const angle = baseAngle + offset;
      const x = propX + Math.cos(angle) * 2.15;
      const z = propZ + Math.sin(angle) * 2.15;
      if (!this.isMuseumBlocked(x, z)) return { x, z };
    }
    return { x: botX, z: botZ };
  }

  private performBotInspection(
    sessionId: string,
    bot: PlayerState,
    role: "blender" | "seeker",
    propId: string,
    liftables: Array<{ id: string; x: number; z: number }>,
    now: number,
    remaining: number,
  ): void {
    const prop = liftables.find((candidate) => candidate.id === propId);
    if (!prop || Math.hypot(bot.x - prop.x, bot.z - prop.z) > BlendRoom.BOT_PROP_INTERACT_RANGE) return;

    const history = this.botLiftHistory.get(sessionId) ?? [];
    history.push(propId);
    this.botLiftHistory.set(sessionId, history.slice(-5));
    this.botNextInspectAt.set(sessionId, now + BlendRoom.BOT_LIFT_COOLDOWN_MS);
    this.broadcast("bot-lift", { botSessionId: sessionId, containerId: propId });

    // A bot can only begin a disguise after reaching and lifting the exact prop
    // it copies. This removes the old random-object disguises in empty space.
    const canDisguiseAsProp = !propId.startsWith("museum-art-");
    const shouldBlend = canDisguiseAsProp && (role === "blender" || Math.random() < 0.28);
    this.botPendingBlend.set(sessionId, {
      propId,
      readyAt: now + BlendRoom.LIFT_BLEND_LOCK_MS,
      shouldBlend,
    });

    if (role === "seeker"
      && now >= (this.botFlagReadyAt.get(sessionId) ?? Infinity)
      && remaining > 1
      && this.botFlagsFoundThisRound < this.botFlagFindLimit) {
      const hiddenFlag = [...this.state.flags.values()].find((flag) =>
        !flag.found && !flag.revealed && flag.containerId === propId);
      if (hiddenFlag) {
        hiddenFlag.revealed = true;
        hiddenFlag.found = true;
        this.state.flagsFound += 1;
        this.botFlagsFoundThisRound += 1;
        this.botNextInspectAt.set(sessionId, now + 7_500);
        this.botFlagReadyAt.set(sessionId, now + 7_500);
        this.broadcast("flag-found", { id: hiddenFlag.id, by: bot.name });
        this.checkBlenderObjectiveWin();
      }
    }
  }

  private chooseBotPursuitTarget(
    sessionId: string,
    bot: PlayerState,
    botNumber: number,
    now: number,
  ): BotTarget | undefined {
    let lock = this.botPursuitLocks.get(sessionId);
    let chosenEntry: [string, PlayerState] | undefined;

    if (lock && lock.lockedUntil > now) {
      const lockedPlayer = this.state.players.get(lock.targetId);
      if (lockedPlayer?.alive && this.roles.get(lock.targetId) === "seeker") {
        chosenEntry = [lock.targetId, lockedPlayer];
      } else {
        this.botPursuitLocks.delete(sessionId);
        lock = undefined;
      }
    }

    if (!chosenEntry) {
      const candidates = [...this.state.players]
        .filter(([id, player]) => id !== sessionId && player.alive && this.roles.get(id) === "seeker")
        .map(([id, player]) => ({
          id,
          player,
          distance: Math.hypot(player.x - bot.x, player.z - bot.z),
        }))
        // Pursue the nearest viable Blenders rather than always preferring bot
        // victims. Randomising among the closest three keeps testing natural
        // while ensuring the lone automatic Buster does not cross the whole
        // 5x5 museum for a distant target.
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      if (candidates.length === 0) return undefined;
      const selected = candidates[(botNumber + Math.floor(now / 8_000)) % candidates.length];
      chosenEntry = [selected.id, selected.player];
      lock = { targetId: selected.id, lockedUntil: now + 9_000 };
      this.botPursuitLocks.set(sessionId, lock);
      this.botBustTargetSince.delete(sessionId);
    }

    const [targetId, chosen] = chosenEntry;
    const distanceToTarget = Math.hypot(chosen.x - bot.x, chosen.z - bot.z);
    // Once close enough to begin stalking, move directly to a stable point at
    // the edge of Bust range instead of circling to a new point every refresh.
    // This lets the same target remain in range for the required 2.4 seconds.
    const preferredDistance = distanceToTarget <= 4.4 ? 2.7 : 2.95;
    const angleFromTarget = Math.atan2(bot.z - chosen.z, bot.x - chosen.x);
    const fallbackAngle = botNumber * 1.83;
    const approachAngle = Number.isFinite(angleFromTarget) ? angleFromTarget : fallbackAngle;
    const x = chosen.x + Math.cos(approachAngle) * preferredDistance;
    const z = chosen.z + Math.sin(approachAngle) * preferredDistance;
    const target = this.isMuseumBlocked(x, z) ? { x: chosen.x, z: chosen.z } : { x, z };
    return {
      ...target,
      targetId,
      nextThinkAt: now + 900,
      purpose: "pursue",
    };
  }

  private chooseBotRoamTarget(bot: PlayerState, botNumber: number, now: number): BotTarget {
    const currentColumn = Math.max(0, Math.min(4, Math.floor((bot.x + 50) / 20)));
    const currentRow = Math.max(0, Math.min(4, Math.floor((bot.z + 50) / 20)));
    const targetColumn = (currentColumn + 1 + (botNumber % 3)) % 5;
    const targetRow = (currentRow + 2 + botNumber + Math.floor(now / 20_000)) % 5;
    return {
      x: BlendRoom.ROOM_CENTERS[targetColumn] + (botNumber % 2 ? 2.8 : -2.8),
      z: BlendRoom.ROOM_CENTERS[targetRow] + (botNumber % 2 ? -2.4 : 2.4),
      nextThinkAt: now + 12_000,
      purpose: "roam",
    };
  }


  private createBotRoute(
    bot: PlayerState,
    targetX: number,
    targetZ: number,
  ): Array<{ x: number; z: number }> {
    // A* over the server's real collision map lets bots route around exhibits,
    // pillars and furniture instead of repeatedly steering into the same prop.
    const grid = 1.25;
    const minX = -48.75;
    const minZ = -48.75;
    const columns = 79;
    const rows = 79;
    const key = (column: number, row: number) => `${column},${row}`;
    const point = (column: number, row: number) => ({
      x: minX + column * grid,
      z: minZ + row * grid,
    });
    const inside = (column: number, row: number) =>
      column >= 0 && column < columns && row >= 0 && row < rows;
    const walkable = (column: number, row: number) => {
      if (!inside(column, row)) return false;
      const candidate = point(column, row);
      return !this.isMuseumBlocked(candidate.x, candidate.z);
    };
    const nearestWalkable = (x: number, z: number) => {
      const originColumn = Math.max(0, Math.min(columns - 1, Math.round((x - minX) / grid)));
      const originRow = Math.max(0, Math.min(rows - 1, Math.round((z - minZ) / grid)));
      for (let radius = 0; radius <= 8; radius += 1) {
        for (let column = originColumn - radius; column <= originColumn + radius; column += 1) {
          for (let row = originRow - radius; row <= originRow + radius; row += 1) {
            if (
              Math.max(Math.abs(column - originColumn), Math.abs(row - originRow)) === radius
              && walkable(column, row)
            ) return { column, row };
          }
        }
      }
      return undefined;
    };
    const start = nearestWalkable(bot.x, bot.z);
    const goal = nearestWalkable(targetX, targetZ);
    if (!start || !goal) return [];

    const open = new Set([key(start.column, start.row)]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[key(start.column, start.row), 0]]);
    const fScore = new Map<string, number>([[
      key(start.column, start.row),
      Math.hypot(goal.column - start.column, goal.row - start.row),
    ]]);
    const coordinates = new Map<string, { column: number; row: number }>([[
      key(start.column, start.row),
      start,
    ]]);
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];
    const goalKey = key(goal.column, goal.row);
    let iterations = 0;
    while (open.size > 0 && iterations < columns * rows) {
      iterations += 1;
      let currentKey = "";
      let bestScore = Infinity;
      for (const candidateKey of open) {
        const score = fScore.get(candidateKey) ?? Infinity;
        if (score < bestScore) {
          bestScore = score;
          currentKey = candidateKey;
        }
      }
      if (currentKey === goalKey) {
        const reversed: Array<{ column: number; row: number }> = [];
        let cursor = currentKey;
        while (cursor) {
          const coordinate = coordinates.get(cursor);
          if (coordinate) reversed.push(coordinate);
          cursor = cameFrom.get(cursor) ?? "";
        }
        const raw = reversed.reverse().slice(1).map(({ column, row }) => point(column, row));
        // Remove unnecessary grid corners only when the complete segment is
        // clear, producing smooth natural paths through rooms and doorways.
        const smoothed: Array<{ x: number; z: number }> = [];
        let anchor = { x: bot.x, z: bot.z };
        for (let index = 0; index < raw.length; index += 1) {
          const next = raw[index];
          const after = raw[index + 1];
          if (!after || !this.botSegmentClear(anchor, after)) {
            smoothed.push(next);
            anchor = next;
          }
        }
        return smoothed;
      }
      open.delete(currentKey);
      const current = coordinates.get(currentKey)!;
      for (const [columnDelta, rowDelta] of directions) {
        const column = current.column + columnDelta;
        const row = current.row + rowDelta;
        if (!walkable(column, row)) continue;
        if (
          columnDelta !== 0
          && rowDelta !== 0
          && (!walkable(current.column + columnDelta, current.row)
            || !walkable(current.column, current.row + rowDelta))
        ) continue;
        const neighbourKey = key(column, row);
        const movementCost = columnDelta !== 0 && rowDelta !== 0 ? Math.SQRT2 : 1;
        const tentative = (gScore.get(currentKey) ?? Infinity) + movementCost;
        if (tentative >= (gScore.get(neighbourKey) ?? Infinity)) continue;
        cameFrom.set(neighbourKey, currentKey);
        coordinates.set(neighbourKey, { column, row });
        gScore.set(neighbourKey, tentative);
        fScore.set(
          neighbourKey,
          tentative + Math.hypot(goal.column - column, goal.row - row),
        );
        open.add(neighbourKey);
      }
    }
    return [];
  }

  private botSegmentClear(
    start: { x: number; z: number },
    end: { x: number; z: number },
  ): boolean {
    const distance = Math.hypot(end.x - start.x, end.z - start.z);
    const samples = Math.max(1, Math.ceil(distance / 0.45));
    for (let sample = 1; sample <= samples; sample += 1) {
      const amount = sample / samples;
      if (this.isMuseumBlocked(
        start.x + (end.x - start.x) * amount,
        start.z + (end.z - start.z) * amount,
      )) return false;
    }
    return true;
  }

  private moveBotWithLocalAvoidance(
    sessionId: string,
    bot: PlayerState,
    directionX: number,
    directionZ: number,
    step: number,
  ): boolean {
    const angles = [
      0,
      Math.PI / 6, -Math.PI / 6,
      Math.PI / 3, -Math.PI / 3,
      Math.PI / 2, -Math.PI / 2,
      (Math.PI * 2) / 3, -(Math.PI * 2) / 3,
      Math.PI,
    ];
    for (const angle of angles) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const moveX = directionX * cosine - directionZ * sine;
      const moveZ = directionX * sine + directionZ * cosine;
      // Look farther ahead than a single simulation step so bots turn before
      // pressing their collision radius fully into a wall or prop.
      const probeDistance = Math.max(0.72, step);
      const probeX = bot.x + moveX * probeDistance;
      const probeZ = bot.z + moveZ * probeDistance;
      if (this.isMuseumBlocked(probeX, probeZ)) continue;
      const nextX = bot.x + moveX * step;
      const nextZ = bot.z + moveZ * step;
      if (this.isPlayerBlocked(nextX, nextZ, sessionId)) continue;
      bot.x = nextX;
      bot.z = nextZ;
      return true;
    }
    return false;
  }

  private tryBotBust(
    sessionId: string,
    attacker: PlayerState,
    now: number,
    preferredTargetId?: string,
  ): void {
    if (this.botBustGraceRemainingMs > 0 || !attacker.disguise) {
      this.botBustTargetSince.delete(sessionId);
      return;
    }

    const oneFlagRemains = this.state.flagsRequired - this.state.flagsFound === 1;
    const blockedUntil = Math.max(
      this.globalBustBlockedUntil,
      this.lastSuccessfulBustAt + BlendRoom.GLOBAL_BUST_COOLDOWN_MS,
    );
    // A bot cannot silently prepare its next instant Bust during the shared
    // cooldown. It must visibly remain near a target after the lock expires.
    if (!oneFlagRemains && now < blockedUntil) {
      this.botBustTargetSince.delete(sessionId);
      return;
    }

    const preferred = preferredTargetId
      ? this.state.players.get(preferredTargetId)
      : undefined;
    const preferredInRange = preferredTargetId
      && preferred?.alive
      && this.roles.get(preferredTargetId) === "seeker"
      && Math.hypot(attacker.x - preferred.x, attacker.z - preferred.z) <= 3.35;
    const targetEntry: [string, PlayerState] | undefined = preferredInRange
      ? [preferredTargetId, preferred]
      : [...this.state.players]
        .filter(([id, player]) =>
          id !== sessionId
          && player.alive
          && this.roles.get(id) === "seeker"
          && Math.hypot(attacker.x - player.x, attacker.z - player.z) <= 3.35)
        .sort(([, a], [, b]) =>
          Math.hypot(attacker.x - a.x, attacker.z - a.z)
          - Math.hypot(attacker.x - b.x, attacker.z - b.z))[0];
    if (!targetEntry) {
      this.botBustTargetSince.delete(sessionId);
      return;
    }

    const [targetSessionId, target] = targetEntry;
    const tracked = this.botBustTargetSince.get(sessionId);
    if (!tracked || tracked.targetId !== targetSessionId) {
      this.botBustTargetSince.set(sessionId, { targetId: targetSessionId, since: now });
      return;
    }
    // Human players have reaction time and imperfect aim. Requiring a Buster
    // bot to stalk the same nearby target briefly removes its frame-perfect
    // advantage without reducing movement speed or the global cooldown.
    if (now - tracked.since < 2_400) return;
    if (!this.tryClaimGlobalBust(now)) return;
    this.botBustTargetSince.delete(sessionId);
    this.botPursuitLocks.delete(sessionId);

    target.alive = false;
    target.moving = false;
    target.disguise = "";
    target.spectateUnlockAt = now + 15_000;
    target.spectateTarget = "";
    const crime = new CrimeState();
    crime.id = `crime-${now}-${targetSessionId}`;
    crime.victimName = target.name;
    crime.x = target.x;
    crime.z = target.z;
    this.state.crimes.set(crime.id, crime);
    if (!target.isBot) this.sendSpectatorConcealment(targetSessionId);
    this.broadcast("busted", {
      targetSessionId,
      attackerSessionId: sessionId,
      targetName: target.name,
    });
    this.checkTeamWin();
  }

  private updateSpectators(now: number): void {
    for (const [sessionId, player] of this.state.players) {
      if (player.alive || player.isBot || now < player.spectateUnlockAt) continue;
      // "security" is a non-player sentinel. Spectators choose rooms locally
      // and never receive an active Seeker as a follow target.
      player.spectateTarget = "security";
      // Re-send concealment periodically so a reconnecting spectator cannot
      // miss the privacy message and briefly render a Blender.
      if (now - (this.lastSpectatorConcealAt.get(sessionId) ?? 0) >= 2_000) {
        this.sendSpectatorConcealment(sessionId);
        this.lastSpectatorConcealAt.set(sessionId, now);
      }
    }
  }

  private tryClaimGlobalBust(now: number): boolean {
    const oneFlagRemains = this.state.flagsRequired - this.state.flagsFound === 1;
    if (oneFlagRemains) {
      // Final-flag frenzy deliberately removes every Bust cooldown.
      this.globalBustBlockedUntil = 0;
      this.lastSuccessfulBustAt = Number.NEGATIVE_INFINITY;
      return true;
    }

    // Check both the explicit shared deadline and the timestamp of the most
    // recent successful Bust. This makes the lock resilient even if another
    // phase transition updates one of the values.
    const blockedUntil = Math.max(
      this.globalBustBlockedUntil,
      this.lastSuccessfulBustAt + BlendRoom.GLOBAL_BUST_COOLDOWN_MS,
    );
    if (now < blockedUntil) return false;

    // Claim immediately, before the victim is changed or broadcasts are sent,
    // so another bot in the same simulation tick cannot also Bust.
    this.lastSuccessfulBustAt = now;
    this.globalBustBlockedUntil = now + BlendRoom.GLOBAL_BUST_COOLDOWN_MS;
    this.broadcast("bust-cooldown", { durationMs: BlendRoom.GLOBAL_BUST_COOLDOWN_MS });
    return true;
  }

  private startGlobalBustCooldown(now: number, oneFlagRemains: boolean): void {
    if (oneFlagRemains) {
      this.globalBustBlockedUntil = 0;
      this.lastSuccessfulBustAt = Number.NEGATIVE_INFINITY;
      this.broadcast("bust-cooldown", { durationMs: 0 });
      return;
    }
    // Meetings always provide a fresh ten seconds of protected active play.
    // Do not alter lastSuccessfulBustAt here; the explicit deadline is the
    // authoritative post-meeting block.
    this.globalBustBlockedUntil = now + BlendRoom.GLOBAL_BUST_COOLDOWN_MS;
    this.broadcast("bust-cooldown", { durationMs: BlendRoom.GLOBAL_BUST_COOLDOWN_MS });
  }

  private resetAlivePlayersToRoundSpawns(): void {
    const positions: Record<string, { x: number; y: number; z: number; rotation: number }> = {};
    for (const [sessionId, player] of this.state.players) {
      if (!player.alive) continue;
      const spawn = this.roundSpawns.get(sessionId);
      if (!spawn) continue;
      player.x = spawn.x;
      player.y = spawn.y;
      player.z = spawn.z;
      player.rotation = spawn.rotation;
      player.moving = false;
      this.botTargets.delete(sessionId);
      this.botRoutes.delete(sessionId);
      positions[sessionId] = { ...spawn };
    }
    // Send the complete reset in one message so every client snaps all active
    // avatars to their original rooms before the meeting overlay disappears.
    this.broadcast("reset-positions", { positions });
  }

  private sendSpectatorConcealment(sessionId: string): void {
    const hiddenBlenders = [...this.roles]
      .filter(([, role]) => role === "blender")
      .map(([id]) => id);
    this.clients
      .find((client) => client.sessionId === sessionId)
      ?.send("spectator-conceal", { sessionIds: hiddenBlenders });
  }

  private clearBotRuntimeState(sessionId: string): void {
    this.botTargets.delete(sessionId);
    this.botRoutes.delete(sessionId);
    this.botFlagReadyAt.delete(sessionId);
    this.botNextInspectAt.delete(sessionId);
    this.botLiftHistory.delete(sessionId);
    this.botPendingBlend.delete(sessionId);
    this.botBustTargetSince.delete(sessionId);
    this.botPursuitLocks.delete(sessionId);
    this.liftLockedUntil.delete(sessionId);
    for (const [botId, pursuit] of this.botPursuitLocks) {
      if (pursuit.targetId === sessionId) this.botPursuitLocks.delete(botId);
    }
  }

  private removeBots(): void {
    for (const [sessionId, player] of this.state.players) {
      if (!player.isBot) continue;
      this.state.players.delete(sessionId);
      this.roles.delete(sessionId);
      this.botTargets.delete(sessionId);
      this.botRoutes.delete(sessionId);
      this.botFlagReadyAt.delete(sessionId);
      this.botNextInspectAt.delete(sessionId);
      this.botLiftHistory.delete(sessionId);
      this.botPendingBlend.delete(sessionId);
      this.botBustTargetSince.delete(sessionId);
      this.botPursuitLocks.delete(sessionId);
      this.liftLockedUntil.delete(sessionId);
      this.roundSpawns.delete(sessionId);
      this.lastSpectatorConcealAt.delete(sessionId);
    }
  }

  private isMuseumBlocked(x: number, z: number): boolean {
    const radius = 0.58;
    if (x < -49 + radius || x > 49 - radius || z < -49 + radius || z > 49 - radius) return true;

    const walls: Array<[number, number, number, number]> = [];
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
        const wide = leftIndex === BlendRoom.CENTRE_ROOM_INDEX || rightIndex === BlendRoom.CENTRE_ROOM_INDEX;
        addDoorWall(true, divider, BlendRoom.ROOM_CENTERS[row], wide ? 12 : 7.2);
      }
      for (let column = 0; column < 5; column += 1) {
        const topIndex = dividerIndex * 5 + column;
        const bottomIndex = topIndex + 5;
        const wide = topIndex === BlendRoom.CENTRE_ROOM_INDEX || bottomIndex === BlendRoom.CENTRE_ROOM_INDEX;
        addDoorWall(false, divider, BlendRoom.ROOM_CENTERS[column], wide ? 12 : 7.2);
      }
    }
    if (walls.some(([wallX, wallZ, width, depth]) =>
      Math.abs(x - wallX) < width / 2 + radius
      && Math.abs(z - wallZ) < depth / 2 + radius)) return true;

    const roomCenters = BlendRoom.ROOM_CENTERS.flatMap((roomZ) =>
      BlendRoom.ROOM_CENTERS.map((roomX) => ({ x: roomX, z: roomZ })));
    const furnitureCounts = [
      4, 5, 6, 4, 5,
      5, 6, 0, 6, 4,
      4, 6, 0, 6, 5,
      5, 7, 4, 6, 5,
      6, 4, 6, 5, 7,
    ];
    for (let roomIndex = 0; roomIndex < roomCenters.length; roomIndex += 1) {
      const room = roomCenters[roomIndex];
      if (roomIndex !== BlendRoom.CENTRE_ROOM_INDEX && Math.hypot(x - room.x, z - room.z) < 1.8) return true;
      if (roomIndex === BlendRoom.GRAND_GALLERY_INDEX || roomIndex === BlendRoom.CENTRE_ROOM_INDEX) continue;
      const furnitureSlots = this.museumFurnitureSlots(roomIndex);
      const slotOrder = furnitureSlots.map((_, index) =>
        (index * 3 + roomIndex * 5) % furnitureSlots.length);
      for (let slotIndex = 0; slotIndex < furnitureCounts[roomIndex]; slotIndex += 1) {
        const [offsetX, offsetZ] = furnitureSlots[slotOrder[slotIndex]];
        if (Math.hypot(x - (room.x + offsetX), z - (room.z + offsetZ)) < 1.55) return true;
      }
    }

    const galleryZ = -20;
    const galleryPieces: Array<[number, number, number]> = [
      [-5.3, galleryZ - 3.3, 1.6], [5.3, galleryZ - 3.3, 1.6],
      [-4.8, galleryZ + 3.8, 1.6], [4.8, galleryZ + 3.8, 1.6],
      [-7.8, galleryZ + 5.8, 1.2], [7.8, galleryZ + 5.8, 1.2],
      [-7.8, galleryZ - 7.2, 1.2], [7.8, galleryZ - 7.2, 1.2],
      [-6.8, galleryZ + 0.2, 0.9], [6.8, galleryZ + 0.2, 0.9],
      [0, galleryZ - 6.8, 0.9], [0, galleryZ - 8.1, 1.5], [0, galleryZ + 7.9, 1.5],
    ];
    if (galleryPieces.some(([propX, propZ, propRadius]) =>
      Math.hypot(x - propX, z - propZ) < propRadius + radius)) return true;

    return [...BlendRoom.PILLAR_ROOM_INDICES].some((roomIndex) => {
      const roomX = BlendRoom.ROOM_CENTERS[roomIndex % 5];
      const roomZ = BlendRoom.ROOM_CENTERS[Math.floor(roomIndex / 5)];
      return [-7.35, 7.35].some((offsetX) =>
        [-7.25, 7.25].some((offsetZ) =>
          Math.hypot(x - (roomX + offsetX), z - (roomZ + offsetZ)) < 0.9));
    });
  }


  private isPlayerBlocked(x: number, z: number, movingSessionId: string): boolean {
    for (const [sessionId, player] of this.state.players) {
      if (sessionId === movingSessionId || !player.alive) continue;
      if (Math.hypot(x - player.x, z - player.z) < 1.35) return true;
    }
    return false;
  }

  private assignSpawn(player: PlayerState, index: number): void {
    // Twenty-four players receive twenty-four different rooms in the 5x5 map.
    // The central rotunda is used first, followed by corners and then a spread
    // across the remaining galleries.
    const roomOrder = [
      12, 0, 24, 4, 20, 2, 22, 10, 14, 6, 8, 16,
      18, 1, 3, 5, 9, 15, 19, 21, 23, 7, 11, 13, 17,
    ];
    const roomIndex = roomOrder[index % roomOrder.length];
    const roomX = BlendRoom.ROOM_CENTERS[roomIndex % 5];
    const roomZ = BlendRoom.ROOM_CENTERS[Math.floor(roomIndex / 5)];
    const preferredOffsets: Array<[number, number]> = [
      [-3.2, 2.8], [3.3, -2.6], [0, 4.3], [0, -4.3], [-4.2, 0], [4.2, 0],
    ];
    const offset = preferredOffsets.find(([offsetX, offsetZ]) =>
      !this.isMuseumBlocked(roomX + offsetX, roomZ + offsetZ)) ?? [0, 0];
    player.x = roomX + offset[0];
    player.y = 0;
    player.z = roomZ + offset[1];
  }

  private roomIndexAt(x: number, z: number): number {
    const column = Math.max(0, Math.min(4, Math.floor((x + 50) / 20)));
    const row = Math.max(0, Math.min(4, Math.floor((z + 50) / 20)));
    return row * 5 + column;
  }


  private pruneDeviceReservations(now = Date.now()): void {
    for (const [deviceId, reservation] of this.deviceReservations) {
      if (reservation.expiresAt <= now) this.deviceReservations.delete(deviceId);
    }
  }

  private releaseDeviceForSession(sessionId: string): void {
    const deviceId = this.sessionDevices.get(sessionId);
    if (deviceId && this.deviceSessions.get(deviceId) === sessionId) {
      this.deviceSessions.delete(deviceId);
    }
    this.sessionDevices.delete(sessionId);
    for (const [reservedDeviceId, reservation] of this.deviceReservations) {
      if (reservation.sessionId === sessionId) this.deviceReservations.delete(reservedDeviceId);
    }
  }

  private nameKey(value: string): string {
    return value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .replace(/[\s_-]+/g, "");
  }

  private cleanName(value: unknown): string {
    if (typeof value !== "string") return "Player";
    const clean = value.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 16);
    return clean || "Player";
  }

  private safeNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  private clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(minimum, Math.min(maximum, Math.round(value)))
      : fallback;
  }

  private cleanDeviceId(value: unknown): string {
    return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "";
  }
}
