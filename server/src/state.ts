import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") name = "Player";
  @type("boolean") isHost = false;
  @type("boolean") connected = true;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("number") rotation = 0;
  @type("boolean") moving = false;
  @type("string") disguise = "";
  @type("boolean") alive = true;
  @type("boolean") isBot = false;
  @type("boolean") isLateSpectator = false;
  @type("number") spectateUnlockAt = 0;
  @type("string") spectateTarget = "";
}

export class FlagState extends Schema {
  @type("string") id = "";
  @type("string") containerId = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("boolean") revealed = false;
  @type("boolean") found = false;
  @type("boolean") challengeActive = false;
  @type("string") challengerSessionId = "";
}

export class RubbishState extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") variant = 0;
  @type("boolean") collected = false;
}

export class CrimeState extends Schema {
  @type("string") id = "";
  @type("string") victimName = "";
  @type("number") x = 0;
  @type("number") z = 0;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: FlagState }) flags = new MapSchema<FlagState>();
  @type({ map: RubbishState }) rubbish = new MapSchema<RubbishState>();
  @type({ map: CrimeState }) crimes = new MapSchema<CrimeState>();
  @type("string") phase = "lobby";
  @type("string") roomCode = "";
  @type("number") flagsFound = 0;
  @type("number") flagsRequired = 0;
  @type("number") rubbishCollected = 0;
  @type("number") rubbishRequired = 0;
  @type("number") roundSeconds = 240;
  @type("number") blenderOverride = 0;
  @type("boolean") botsEnabled = false;
  @type("boolean") balancedHumanRoles = false;
  @type("number") revealEndsAt = 0;
  @type("number") roundEndsAt = 0;
  @type("number") revealSecondsRemaining = 0;
  @type("number") roundSecondsRemaining = 0;
  @type("number") meetingSecondsRemaining = 0;
  @type("string") winner = "";
  @type("number") meetingEndsAt = 0;
  @type("number") meetingNumber = 0;
  @type("string") meetingReporter = "";
  @type("number") votesCast = 0;
  @type("string") verdictText = "";
  @type("string") verdictRole = "";
}
