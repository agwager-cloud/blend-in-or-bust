# Blend in or Bust

**Hide. Deceive. Survive.**

Starter project for a responsive browser-based 3D multiplayer game.


## Version 0.19.14 — 60-Second Render Wake Connection

- Host and Join now keep retrying through a full 60-second free-Render wake window instead of failing on the first short matchmaking or WebSocket timeout.
- The start screen shows an accurate seconds-remaining message explaining that the free server may be asleep and is being woken through the normal game connection.
- Host, Join and local Explore buttons are disabled while a multiplayer connection is in progress, preventing duplicate rooms and overlapping attempts.
- Short failed attempts are retried automatically; only permanent errors such as room full, room not found, removed name or duplicate device are shown immediately.
- After 60 seconds, controls are restored with a clear message allowing the player to try again.
- No browser `/health` request was added; the school-network-safe direct multiplayer connection remains unchanged.
- Distributed as a changed-files-only hotfix without dependency installation or an npm build.

## Version 0.19.13 — School-network itch.io safeguard

- Confirmed the browser client connects directly to the configured multiplayer server and does not request `/health`.
- The itch.io packaging script now scans the built HTML, JavaScript and CSS and refuses to create an upload ZIP if `/health` appears in any browser file.
- Render may continue using `/health` as its own server-side health-check path; that check is not made by students’ devices.
- Do not add an HTTP health-check preflight before Colyseus connection attempts. Server wake and retry messaging must use the normal multiplayer connection path.

## Version 0.19.12 — TypeScript Build Fix

- Removed the obsolete private `addProps()` method left behind after the 5×5 museum prop system replaced it.
- Fixes TypeScript error `TS6133: 'addProps' is declared but its value is never read`.
- No gameplay, museum layout, server, Render or itch.io behaviour changed.

## Version 0.19.11 — Render and itch.io Publishing

- Added a root `render.yaml` Blueprint for a Singapore-region Node web service.
- Added the Render production WebSocket URL for the itch.io client build.
- Added `client/vite.config.ts` with relative asset paths required by itch.io.
- Added a PowerShell build script that creates an itch.io-ready ZIP with
  `index.html` at the archive root and validates the archive before completion.
- Added a detailed publishing guide and separate client/server build commands.
- No gameplay behaviour changed in this release.





## Version 0.19.10 — Stable Exterior-Wall Paintings

- Fixed paintings on the outside museum walls disappearing when a player moved
  close to them or lifted them. Exterior frames were almost embedded inside the
  thicker boundary-wall mesh, which caused unstable transparent-wall depth
  sorting whenever the camera faded that wall.
- Moved every frame a safe distance into its room and placed the portrait surface
  slightly in front of its frame, removing both wall clipping and frame/portrait
  depth fighting.
- Moved picture lights forward to remain aligned with the corrected painting
  positions.
- Kept paintings active while their Lift animation changes height so they cannot
  be incorrectly removed by view-frustum selection during the animation.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.9 — Phone Landscape Voting Layout

- Fixed the meeting and voting scene on short landscape phone screens, whose
  wide CSS viewport previously bypassed the portrait/mobile vote layout.
- The meeting panel now fills the available safe-area height and keeps its
  heading, countdown, vote list, Skip button and status message in separate
  non-overlapping rows.
- Player vote rows use a compact four-column layout on normal landscape phones
  and three columns on the narrowest devices.
- The player-name area scrolls independently when a large class is connected,
  so all names remain reachable without pushing the voting controls off-screen.
- Vote names remain readable with safe truncation for unusually long names.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.8 — Reliable Automatic Buster Bots

- Fixed automatic games with one Buster bot sometimes completing without a
  single Bust. At ten participants, Automatic correctly creates one Buster,
  but the bot could repeatedly swap nearby victims before finishing its
  required 2.4-second stalking window.
- Buster bots now lock onto one viable target for up to nine seconds while
  navigating and retain that target across rapid pursuit-path refreshes.
- The Bust preparation timer now follows the bot's chosen pursuit target
  instead of switching to whichever nearby player happens to be closest in a
  particular simulation frame.
- When close to a target, Buster bots approach a stable position inside Bust
  range rather than continually orbiting to new points.
- Buster bots that still need a disguise now inspect only copyable floor props,
  not paintings, so the opening search behaviour reliably produces a valid
  disguise before pursuit begins.
- Preserved the first 60 seconds without bot Busts, the shared ten-second
  global Bust cooldown, the ten-second post-meeting protection, and the
  no-cooldown final-flag exception.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.7 — Removed-Name Block and One Account per Device

- A name removed by the host is now blocked from rejoining that room for the
  remainder of the room's lifetime. Matching ignores capitalization, spaces,
  underscores and hyphens, so trivial spelling-format changes cannot restore
  the same removed name.
- The removed player's saved name is cleared on their device and the start
  screen explicitly asks them to choose a different name before rejoining.
- Added an atomic server-side device reservation during authentication. Two
  tabs opened on the same browser/device can no longer both pass authentication
  before the first account has been added to the lobby.
- An already-connected device receives a clear instruction to close its other
  game tab or leave that account before joining the room again.
- Device reservations are released safely after failed, removed, consented and
  expired-reconnection sessions so legitimate future joins are not locked out.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.6 — Immediate Lobby Removal

- Fixed removed players remaining as ghost entries in the multiplayer lobby.
- Host removal now deletes the player's authoritative server state and device
  session before closing their connection, so every connected lobby updates
  immediately.
- Server-forced removals no longer enter the normal ten-second reconnection
  window or restore the removed lobby record.
- Centralised player-session cleanup so role, vote, spawn, Lift, bot-target and
  device mappings cannot remain behind after a removal.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.


## Version 0.19.5 — Cleanup-Gated Signals and Human-Led Flag Search

- Flag signals remain completely unavailable while any rubbish is still in the
  museum. Active Blenders are told to finish cleaning first; the COLD, WARM and
  HOT signal system unlocks only when the rubbish counter reaches zero.
- Reduced painting-hidden flags from the previous 60% share to a randomized
  30-40% each round. The remaining flags are hidden beneath floor props, while
  unique-room placement remains preferred.
- Added one collective round-wide flag quota for all Blender bots. Bots can now
  find only approximately 30-40% of the round's flags in total and still never
  collect the final flag. After reaching the quota, they continue cleaning and
  performing believable Lift searches so human Blenders must complete the flag
  objective themselves.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.



## Version 0.19.4 — iPad Viewport Lock, Synced Timers and Smarter Museum Search

- Locked the active game screen against iPad Safari pinch zoom, double-tap zoom,
  browser panning and overscroll. The viewport is restored when gameplay starts,
  after orientation changes and if iOS reports an unexpected visual-viewport
  scale change. Multi-touch joystick, camera and action-button input remains
  handled by the game's Pointer Events.
- Replaced device-clock countdown calculations with server-authoritative
  remaining-second fields for the role reveal, round timer and meeting timer.
  Every connected screen now displays the same countdown value and reaches zero
  from the same server state transition.
- Corrected the Buster role instructions so they explicitly state that Busters
  cannot collect flags or rubbish. Only public Blenders receive flag signals.
- Simplified the Blender-only flag signal to exactly three states:
  **COLD — try another room**, **WARM — search this room**, and
  **HOT — lift the nearest prop**.
- Restored flags behind paintings while retaining some floor-prop variety.
  At least 60% of flags use framed paintings, with different rooms preferred.
  Private flag previews are anchored safely inside the room rather than attached
  to the moving painting, preventing jumping, clipping or disappearing during
  the Lift animation.
- Improved Blender bot flag searching. Bots begin purposeful searches earlier,
  route directly to the correct hidden container, visibly Lift it, announce
  successful finds, pause briefly, and never collect the final flag.
- Increased collectible rubbish to 14-36 pieces according to participant count,
  widened the pickup tolerance slightly and retained full-museum distribution.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.


## Version 0.19.3 — Full Classroom Lobby and Flag Finder Assistance

- Simplified the round-time menu to **3 minutes**, **4 minutes** and **5 minutes**.
  The 4-minute option no longer includes the extra “balanced” wording, and the
  server accepts only those three supported durations.
- Set the room connection capacity to 24 and added clear full-room messaging:
  **ROOM FULL — this room already has 24 players. Please host a new room for the
  additional students.** The lobby also shows an obvious full-room status when
  the 24th participant joins.
- Reworked the lobby player list for a full class. Desktop uses a compact
  three-column scrolling grid, medium screens use two columns and phones use one
  column. Long names truncate safely, while settings and Start/Leave controls
  remain accessible below the player list.
- Made flags easier to find without revealing the exact object immediately.
  Public Blenders receive a room-based flag signal: no signal in empty rooms,
  a general signal in the correct room, WARM when approaching the hiding area
  and HOT beside the likely prop.
- Flags now spawn beneath floor props rather than behind paintings, and each
  flag is placed in a different room whenever possible. This makes systematic
  searching practical across the 5x5 museum while still requiring players to
  Lift the correct object.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.2 — Clear Doorway Art and Near-Even Team Balance

- Repositioned every wall painting onto the centre of its actual solid wall
  segment. Standard entrances and the extra-wide Midnight Rotunda entrances now
  use different safe offsets, so frames and picture lights cannot hang across a
  doorway or float beyond the end of a wall. Client lift targets use the exact
  same corrected positions as the rendered paintings.
- Rebalanced automatic games for the larger 25-room museum. Automatic Busters
  now scale more gently: one for up to 10 participants, two for 11-18, and three
  for 19-24. Hosts can still select a higher manual count.
- Changed the balanced default round from three to four minutes while retaining
  two-, three- and five-minute host options.
- Reduced hidden flags to 3-8 and cleanup rubbish to 10-28 based on participant
  count. Rubbish remains spread across the full 5x5 museum rather than clustering
  in a few nearby rooms.
- Increased rubbish pickup tolerance so walking across a paper ball collects it
  reliably on touch devices and during network interpolation.
- Blender bots begin useful flag searching sooner and recover faster after a
  successful search.
- Buster bots must be disguised and remain close to the same target for 2.4
  seconds before Busting. They cannot prepare an instant attack during the shared
  cooldown and no longer prioritise human players over bot Blenders in tests.
- These changes target approximately even team outcomes over repeated matches;
  individual rounds remain dependent on player decisions, reports and voting.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.1 — Clear Bottom HUD, Reliable Meeting Respawns and Late CCTV Join

- Repositioned the instruction and room-name overlays into the open bottom-centre
  space between the museum map/joystick and the action buttons. Responsive
  reservations keep the two overlays centred and clear in desktop, landscape
  touch and narrow portrait layouts.
- Strengthened post-meeting respawns. The server now temporarily rejects stale
  pre-meeting movement packets, resets every surviving participant to their
  saved round-start position, and repeats the authoritative reset shortly after
  gameplay resumes. Clients also suppress movement transmission briefly while
  applying the reset.
- Rooms remain joinable after a round starts. New arrivals enter as dedicated
  security-camera spectators instead of receiving a locked-room error. They do
  not count as Active or Busted, cannot vote or interact, and can participate
  normally after the host returns everyone to the lobby for the next round.
- Late spectators immediately use CCTV mode and receive the same complete
  Buster concealment as eliminated spectators. Remote avatars remain hidden
  until the concealment list has been received, preventing a brief identity leak.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.19.0 — Museum Cleanup and 5×5 Expansion

- Expanded the museum from 18 rooms to 25 rooms arranged as a fixed 5×5 grid.
- Added the **Midnight Rotunda** in the exact centre. It has no paintings,
  extra-wide openings on all four sides, a floor medallion and a suspended
  illuminated centrepiece.
- Added seven newly named and fully decorated galleries. All 25 rooms use the
  same deterministic client/server furniture layout, collision data, hidden
  flag containers and fixed security-camera system.
- Added a semi-transparent 5×5 museum map. The current player room or selected
  CCTV room receives a yellow border; the map never rotates. Desktop and CCTV
  place it in the lower-left, while touch devices place it above the joystick.
- Added procedurally modelled crumpled-paper rubbish in four visual variants,
  spread across every room on the floor.
- Public **Blenders** automatically collect rubbish by walking over it. Public
  **Busters** cannot remove rubbish, even when standing directly on it.
- The top objective panel now shows flags found and rubbish remaining.
- Blenders must both find every flag and clean every piece of rubbish to finish
  the museum objective. Blender bots also navigate toward rubbish and help
  clean, while Buster bots ignore it.
- Increased the distributed spawn system and bot A* navigation map to cover the
  complete 100 × 100 museum.
- Distributed as a changed-files-only update without dependency installation
  or an npm build.

## Version 0.18.21 — Reliable Human Disguises and Clearer Roles

- Fixed human disguises appearing only on the disguising device. Imported prop
  identifiers can be longer than 24 characters; the server no longer truncates
  those identifiers before synchronising them to the other players.
- Added an immediate reliable disguise/unblend event that bridges the brief gap
  before the normal Colyseus state patch arrives. Remote clients reconcile back
  to the shared room state as soon as it catches up.
- Removed the ordinary room-name badge during security-camera viewing so it no
  longer appears behind the central CCTV room label.
- Renamed the player-facing roles throughout the lobby, role reveal, meeting,
  verdict and results screens:
  - Original **Seekers** are now **Blenders**: find flags, survive and report.
  - Original **Blenders** are now **Busters**: disguise, deceive and Bust.
- The original internal network role identifiers remain unchanged to preserve
  compatibility with the existing gameplay and server logic.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.18.20 — Reliable CCTV and Believable Bot Testing

- Lowered every fixed security-camera aim by another five degrees and moved the
  target below floor level so the camera remains under room ceilings while
  retaining a wide corner view. Grand Gallery ceiling and beam meshes are
  hidden only for its CCTV feed, preventing the blank close-up seen in that
  room without changing normal gameplay visuals.
- Added a third Testing Bots lobby option: **On — split 2 human roles**. With
  exactly two human players, one is guaranteed to be a Blender and the other a
  Seeker, while which human receives each role is randomised each round.
- Reworked opening Blender-bot behaviour. During the first 60 seconds they roam
  between varied nearby props, visibly lift them, avoid repeating their five
  most recent props and no longer target stationary human Seekers.
- Increased bot clearance around stationary humans and changed post-grace
  pursuit to offset/circling destinations instead of walking directly into a
  player's centre.
- Removed random remote disguises. Blender and Seeker bots can now begin a
  disguise only after reaching and lifting the exact nearby prop they copy.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.18.19 — Atomic Global Bust Lock and Wider CCTV Coverage

- Rebuilt successful Bust authorization around one atomic server-side gate used
  by both human and bot Blenders. As soon as any Blender Busts, every other
  Blender is rejected for ten seconds, including bots processed in the same
  simulation tick.
- Added a second last-successful-Bust timestamp so unrelated phase changes
  cannot accidentally shorten the shared cooldown. The one-flag frenzy remains
  the sole exception and removes all Bust cooldowns.
- Kept the separate ten-second protection after a report and the 60-second
  opening restriction for Blender bots.
- Raised the fixed security cameras farther into their room corners, pitched
  them farther downward and widened the lens so spectators can see more floor
  area with fewer blind spots beneath the cameras.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.18.18 — Touch HUD, Natural Swipe Look and Pillar-Safe Props

- Grouped the room badge and instruction overlays into a responsive bottom
  information stack. On iPad, phones and other touch devices it is centred in
  the clear space between the movement joystick and the action buttons in both
  portrait and landscape orientations.
- Very narrow portrait layouts use smaller controls and a vertical action-button
  stack so the centred information remains readable without overlapping the
  joystick, Lift/Bust, Blend or Report controls.
- Reversed vertical touch-look input only: swiping upward on the right side now
  looks upward and swiping downward looks downward. Desktop mouse behaviour is
  unchanged.
- Added deterministic pillar-room furniture slots with extra clearance from all
  four pillars. Client visuals, server collision checks and hidden-flag
  containers use the same adjusted positions so props cannot appear inside a
  pillar.
- Distributed as a changed-files-only hotfix without dependency installation or
  an npm build.

## Version 0.18.16 — Safe Lift/Blend, Fair Solo Roles and Smarter Bots

- Blend is disabled for the full Lift animation and the server rejects a new
  disguise until the lifted object has completely returned to its authored
  height, preventing floating player disguises.
- A solo human using Testing Bots now receives an independent 50/50 Seeker or
  Blender role draw each round instead of always being forced to Blender.
- Widened the connecting door openings in both the rendered museum and the
  server collision map so players and bots have more clearance between rooms.
- Bots continue to move at the same 5.2 world-units-per-second speed as human
  players, now using a finer A* navigation grid and local angled obstacle
  avoidance to move around props, walls and crowded doorways.
- Distributed as a changed-files-only hotfix without dependency installation
  or an npm build, as requested.

## Version 0.18.14 — Stationary Camera Turning, Stable Walls and HUD Reflow

- Left/Right, A/D, and horizontal-only joystick input now rotate the camera
  while the player remains stationary. This is not reported as movement, so a
  name that has faded stays hidden during camera rotation.
- Forward/back movement still moves normally, while backward movement no
  longer triggers automatic camera re-centring that could fight the camera.
- Wall transparency now follows the camera's actual smoothed focus point and
  uses a longer hold with a gentler restore, reducing doorway flashing and
  wall glitches while moving toward the camera.
- Lowered the default camera orbit by approximately 30 degrees so more of the
  museum ceiling is visible.
- Blender bots are server-blocked from Busting during the first 60 seconds of
  active gameplay in every round. Meetings pause this grace period.
- Moved the music toggle into the top HUD beside the Flags frame. On narrow
  portrait layouts it sits between Active Players and Flags.
- Moved the MOVE AND BE KNOWN card to the lower-left and placed the current
  room badge directly below it, with touch layouts lifted above the joystick.
- This release includes the unfinished v0.18.13 camera/wall and bot-grace
  changes and is distributed as a changed-files-only hotfix.

## Version 0.18.12 — Rebuilt Manual Camera and Private Timer HUD

- Removed the accumulated desktop camera-start implementations and replaced
  them with one clean window-level right-mouse drag lifecycle.
- Mouse and touch movement now queue raw look deltas and apply them inside the
  render loop, so camera input is immediate and independent of whether the
  player is moving or stationary.
- Camera orbit angles are stored separately and reapplied after the camera
  focus point moves. This prevents Babylon.js target tracking from rebuilding
  and erasing a player's manual rotation.
- Added inverted vertical camera control while preserving horizontal orbit,
  movement-relative steering, spectating and wall transparency.
- Removed the persistent SEEKER/BLENDER label beneath the round timer so a
  nearby student cannot identify another player's role from their HUD.
- Enlarged and centred the round timer inside the existing top HUD frame.
- This release is distributed as a changed-files-only hotfix.

## Version 0.18.11 — Immediate Arena Camera, Eight Bots and Crime Alert

- Replaced canvas-only desktop camera startup with one capture-phase right-drag
  lifecycle across the complete game arena. Transparent touch look layers and
  HUD elements can no longer swallow the first stationary right-click.
- Desktop camera rotation now applies on the first mouse movement whether the
  player is moving, stationary, disguised or spectating, and remains active
  outside the canvas until the right button is released.
- Added an idempotent input attachment guard so returning for another match
  cannot create duplicate camera listeners.
- Increased the optional local testing group from four bots to eight bots,
  subject to the existing 24-participant room limit.
- Bots now appear as valid meeting vote targets, while bots remain unable to
  report scenes or cast votes themselves.
- Added the supplied violin crime alert as gameplay audio. It plays once when
  an active player enters a room containing an unreported crime scene and does
  not loop while the player remains in that room.
- This release is distributed as a changed-files-only hotfix.

## Version 0.18.10 — Varied Rooms, Population HUD and Bot Roles

- Replaced the repeated four-furniture-plus-one-exhibit room pattern with
  deterministic varied layouts containing different numbers of furniture.
- Added eight well-spaced placement options and seeded free-angle rotations,
  giving Blenders less predictable hiding arrangements while keeping every
  multiplayer client visually consistent.
- Updated server collision and hidden-flag container locations to exactly
  match the new furniture layouts.
- Added live Active and Busted player counts to the top game HUD.
- Moved testing bots into the shared role assignment pool instead of assigning
  human roles first.
- A solo host using bots now receives Blender for reliable Blender testing;
  larger human lobbies continue to randomise roles across humans and bots.
- This release is distributed as a small changed-files-only hotfix.

## Version 0.18.9 — Native Stationary Mouse Camera Hotfix

- Confirmed that player-name fading only changes label opacity and does not
  block or delay camera movement.
- Completely separated desktop mouse camera input from touch Pointer Events.
- Desktop right-drag now uses native mousedown, window mousemove and mouseup,
  avoiding Chromium/Edge pointer cancellation after keyboard movement stops.
- Camera angle changes are applied directly on every mousemove with no
  stationary delay, pointer capture, pointer ID or movement-state dependency.
- Touch and pen continue using the responsive captured Pointer Event controls.
- Retained smart A* bots and all host lobby controls from version 0.18.8.

## Version 0.18.8 — Smart Bots and Lobby Controls Hotfix

- Replaced direct bot waypoint steering with A* navigation using the museum's
  real server collision map.
- Bots now plan around exhibits, furniture, fossils and pillars, then smooth
  their routes only across verified clear floor.
- Seeker bots deliberately select active players in other rooms as social
  destinations, helping bots move through the museum and interact.
- Added a host-only Testing Bots setting with Off as the default and an option
  to add four bots for local testing.
- Added responsive Remove buttons beside other human players for the host,
  allowing inappropriate names to be removed from the lobby.
- Removed players receive a clear message instead of attempting to reconnect.
- Retained full-speed bot movement and the stationary-camera capture fix.

## Version 0.18.7 — Stationary Camera Capture Hotfix

- Replaced desktop canvas pointer capture with window-level right-drag camera
  tracking, removing the browser capture race that cancelled stationary drags.
- Right-drag now remains active across the canvas and browser viewport until
  an actual pointer-up, pointer-cancel or browser focus loss.
- Kept touch and pen pointer capture for reliable full-screen tablet swipes.
- Retained the full-speed Seeker and Blender bots from version 0.18.6.

## Version 0.18.6 — Full-Speed Bots Hotfix

- Increased both Seeker and Blender bot movement from their deliberately slow
  testing speeds to the same 5.2 world units per second used by human players.
- Retained doorway-aware navigation, collision checks, room roaming and the
  reduced object-inspection frequency from version 0.18.5.
- Fixed first-round right-click camera dragging being cancelled by an
  unreliable Chromium/Edge `buttons=0` pointer-move event.
- Camera dragging now ends only on an explicit pointer-up, pointer-cancel,
  capture loss or browser focus loss.
- Added window-level release handling so the camera cannot remain stuck when
  the pointer is released outside the canvas.

## Version 0.18.5 — Bot Navigation and Responsive Camera Hotfix

- Added doorway-aware bot routes so bots regularly travel between the
  museum's rows and columns instead of remaining in their starting rooms.
- Reduced Seeker bot inspections and delayed their first flag search, making
  them spend more time roaming and less time lifting exhibits.
- One of the four local testing bots is now a disguised Blender that actively
  hunts Seekers and prioritises human targets when they are in range.
- Reduced the testing Blender's Bust cooldown to 6.5 seconds, and to 2.8
  seconds when only one flag remains.
- Mouse, pointer and touch camera input now responds immediately while the
  player is stationary and while spectating a stationary Seeker.
- Expanded the touch look zone across the full right half of the screen while
  retaining the action-button and interface layers above it.
- Added coalesced pointer handling for smoother high-frequency camera input.
- Increased wall-occlusion hysteresis and separated fade/restore speeds to
  reduce rapid wall flashing, wobble and visual tearing near doorways.

## Version 0.18.4 — Clear Entrances and Distributed Spawns Hotfix

- Removed all large physical room-name signs from museum entrances.
- Retained the centred room-name HUD badge and the coloured room lighting.
- Increased the server-validated and client-indicated Blender Bust range from
  2.75 to 3.35 world units.
- Replaced the central spawn grid with room-distributed spawning.
- The first eighteen participants start in eighteen different rooms.
- Players nineteen through twenty-four use separated second positions in six
  rooms, with a minimum starting separation of approximately 8.5 world units.
- Validated all twenty-four spawn points against museum walls, exhibits,
  furniture and pillars.

## Version 0.18.3 — Meeting Music and Repeat-Lift Animation Hotfix

- Added `leberch-dark-history-262605.mp3` as the dedicated discussion, voting
  and verdict soundtrack.
- Normal museum music pauses during a meeting, the meeting track restarts and
  loops, then the original museum track resumes from its paused position.
- Repeat lifting now starts the animation immediately on the inspecting
  player's device every time the button is pressed.
- Painting artwork and its frame lift together.
- Disguised players animate through their disguise mesh, preventing network
  position interpolation from cancelling the lift animation.
- Retained server-authoritative, private flag discovery results.

## Version 0.18.2 — Repeat Lift, Gallery and Music Hotfix

- Every museum object, painting and eligible disguised player can now be lifted
  repeatedly; players must remember which hiding places they have inspected.
- Added twelve illuminated paintings to previously empty solid rear walls,
  bringing the museum collection to forty-eight paintings while leaving
  doorways and central corridors unobstructed.
- Added five supplied historical background tracks at a soft 14% volume.
- Music plays in a shuffled queue, continues through the start, lobby, game and
  results screens, and avoids playing the same track twice in succession.
- Added a persistent responsive Music On/Off button to every screen. The mute
  preference is remembered on the device.
- Background music pauses during discussion, voting and verdict scenes, ready
  for the separate meeting music track planned for a later update.

## Version 0.18.1 — Private Lift and Flag Discovery Hotfix

- Lift results are now private: only the inspecting player sees an exhibit,
  painting or disguised player rise and sees what is hidden underneath.
- A Seeker immediately captures a concealed flag when the correct hiding place
  is lifted, removing the easy-to-miss second collection step.
- Flag discoveries show a temporary animated 3D flag, a responsive
  `FLAG FOUND!` celebration and play `flag.mp3`.
- Blenders can lift exhibits and paintings to convincingly fake a search, but
  cannot collect or remove concealed flags.
- A Blender's pink action button defaults to `LIFT` and switches to `BUST`
  beside a valid target.
- Stationary disguised human players and testing bots can be lifted like
  museum props.
- Inspection history is private per player instead of being shared globally.

## Version 0.18.0 — Lift and Hidden Flags

- Flags are now assigned server-side to random museum objects, fossils,
  sculptures or paintings and begin completely hidden.
- Added a server-authoritative Lift action restricted to living Seekers, with
  distance checks, inspection cooldown and one shared result for all clients.
- Objects and paintings animate upward when inspected; revealed flags hover
  visibly above the exhibit and must then be collected.
- Paintings are registered as interactable Lift targets.
- Added a responsive Lift button in the Bust button position, with the same
  colour, dimensions and keyboard shortcut.
- Blenders cannot Lift. During Bust cooldown their disabled action displays as
  Lift with the remaining cooldown.
- Testing bots can reveal and collect hidden flags after their existing delay,
  but still stop when one flag remains.
- Remote name tags are now visible only when the observed player and remote
  player occupy the same named museum room.

## Version 0.17.1 — Curated Placement and Bot Collision Hotfix

- Replaced the rotating clone-placement algorithm with four fixed, separated
  perimeter display positions per room.
- Reserved the Midnight Atrium as an uncluttered 24-player arrival hall and
  retained the Grand Gallery's bespoke layout.
- Added matching server-side collision footprints for furniture, fossil and
  sculpture mounts, pillars and Grand Gallery props.
- Bots now avoid every active player, not only other bots, and cannot step
  through exhibit collision footprints.
- Increased each room to two paintings, mounted on separate walls.
- Strengthened picture lights with brighter warm local illumination, specular
  highlights and emissive painting textures.

## Version 0.17.0 — Museum Exhibit Variety Pass

- Expanded the imported CC0 model collection from four to twenty assets.
- Added multiple upholstered and modern chairs, low benches, lounge seating,
  display cabinets, tables, floor and table lamps, plant varieties, coat
  stands, vintage radios and media displays.
- Distributed 96 additional modelled, blendable props throughout the eighteen
  rooms, using six orientations and placements for natural variety.
- Removed the obsolete procedural cone/prism exhibit generator entirely.
- Added eighteen blendable fossil or figurative sculpture exhibits, including
  mounted spines, ribs, skulls, plinths, heads, torsos and arms.
- Reduced wall art to one curated hero painting per room.
- Added warm emissive picture lights and local gallery glow above all eighteen
  paintings.
- Added four-column architectural treatments to six themed rooms while keeping
  doorways and movement lanes clear.

## Version 0.16.0 — Eighteen-Room Museum Expansion

- Tripled the museum from six rooms to eighteen across a 60 × 132 world.
- Added Maritime Hall, Natural History, Space Gallery, Royal Collection,
  Fossil Wing, Science Hall, World Cultures, Music Hall, Invention Lab,
  Arctic Gallery, Hall of Wonders and Modern Masters.
- Added 48 themed compound exhibits to the twelve new rooms and retained 20
  upgraded exhibits across the original side rooms.
- Removed the original primitive blockout props after artwork loading.
- Replaced bot cone/cube/orb disguises with modelled benches, plants, lamps and
  display shelving.
- Replaced the simplistic generated portraits and abstract panels with a
  high-resolution atlas of twelve original oil-painting-style artworks.
- Added 48 carefully mounted framed paintings across the 18 rooms without
  crossing door openings or wall boundaries.
- Expanded marble flooring, walls, signs, room-name detection, server collision,
  spawn positions, hidden flag sites and bot navigation to the larger map.

## Version 0.15.2 — Smooth Spectator Camera Hotfix

- Remote seeker interpolation is now frame-rate independent and updated before
  the spectator camera reads the followed position.
- Added a dedicated smoothed spectator camera anchor to absorb network update
  stepping without changing active-player camera controls.
- Privacy-blackout exits and server-selected spectator target changes now ease
  between positions instead of cutting or chasing a stale frame.
- Manual mouse and touch orbit remain independent while spectating.

## Version 0.15.1 — Sightline Transparency Hotfix

- Removed player-distance and camera-distance wall fading. A wall now becomes
  transparent only when it intersects the camera-to-player sightline.
- Repositioned Grand Gallery paintings so every complete frame remains within
  the solid wall section and no artwork overhangs a doorway.

## Version 0.15.0 — Full Museum Art and Camera Pass

- Added twenty new themed, blendable exhibits across the Ancient Exhibit,
  Neon Arcade, Sculpture Garden, Midnight Atrium and Gift Shop.
- Added relics, gems, arcade displays, topiary, fountains and gift displays,
  each with layered details and room-specific colour and lighting treatments.
- Extended the textured marble flooring treatment across all six rooms.
- Moved the initial camera to the player's side of the centre divider and
  performs wall visibility resolution before the first rendered frame.
- Removed orbit-camera wall collision pushing, which was responsible for
  visible corner shaking; walls now smoothly fade instead.
- Walls fade when either the camera or player is close, as well as when any of
  three visibility rays detects an obstruction.
- Uses frame-rate-independent exponential smoothing for camera targeting and
  wall opacity, and disables unnecessary pointer picking to reduce mobile
  frame-time spikes.

## Version 0.14.2 — Museum Scale and Visibility Hotfix

- Normalised imported OBJ models to target world heights so benches, plants,
  lamps and display shelves match the player and original prop scale.
- Expanded the Grand Gallery from seven imported props to thirteen varied,
  blendable furniture and decor positions.
- Added twelve original framed portrait artworks across all six museum rooms.
- Fixed double-sided rendering for the Grand Gallery artwork.
- Strengthened wall transparency with three camera rays plus near-wall
  detection, preventing the view from becoming trapped behind a solid wall.

## Version 0.14.1 — Grand Gallery Art Pass

- Windows/Vite hotfix: Babylon scene loaders now use the supported package
  entry point, fixing the `Failed to resolve import "@babylonjs/loaders/OBJ"`
  startup error.

## Version 0.14 — Grand Gallery Art Pass

- Began the stylised cinematic museum artwork milestone with a complete visual
  benchmark pass for the Grand Gallery.
- Added locally bundled CC0 1K marble and painted-plaster PBR materials from
  Poly Haven, including colour and DirectX normal maps.
- Added locally bundled CC0 museum furniture models from Kenney's Furniture Kit.
- Replaced the Gallery's temporary props with blendable modelled benches,
  plants, standing lamps and a display shelf.
- Player-to-player disguise copying works with the imported artwork.
- Added an ornate coffered ceiling, ivory columns, gold bases and capitals,
  ceiling beams and six framed original abstract artworks.
- Added Babylon.js OBJ/MTL loading with graceful fallbacks if an art asset fails
  to load.
- All third-party assets load locally and are documented in
  `client/public/assets/licenses/ASSET-MANIFEST.md`.
- The initial art download adds approximately 2 MB before normal web compression,
  keeping the benchmark suitable for iPads and phones.

## Version 0.13.4

- Nearby disguised players are now valid Blend targets.
- The copied player's visible shape receives the green targeting outline rather
  than highlighting the original museum prop elsewhere in the map.
- Copying a player applies the same underlying museum prop identity, dimensions
  and networked disguise to the local player.
- Multiple players can form convincing same-prop clusters by repeatedly copying
  one another.
- The contextual control identifies whose shape is ready to copy.
- Eliminated spectators still cannot target or reveal concealed Blenders.
- Existing player collision remains active so copied shapes cannot occupy the
  same physical position.

## Version 0.13.3

- Fixed Slow Bots disappearing when their disguise cycle requested prop IDs from
  the older arena that no longer existed in Midnight Museum.
- Bot disguises now use valid museum props: a gift crate, urn, atrium orb and
  display capsule.
- Added a defensive client fallback that keeps the normal character visible if
  any future disguise asset cannot be found.
- Added deterministic separation recovery when two bots occupy the exact same
  position.
- Busted remote-player name labels are now immediately removed from layout
  instead of remaining as partially faded floating text.
- Dead and spectator-concealed player labels remain hidden on subsequent state
  updates.

## Version 0.13.2

- Removed the camera-radius feedback loop that caused visible wobbling as wall
  occlusion changed.
- Wall transparency now eases at a slower rate and remains engaged for a short
  260 ms hold, preventing rapid flicker around corners and door frames.
- Eliminated players receive a private server-directed Blender concealment list.
- While spectating, every Blender is completely removed from the eliminated
  player's rendered view, including their character, disguise and name label.
- Concealed Blender collision representations are also disabled on the spectator
  client and concealment resets safely at the start of every new round.
- Active players never receive the private spectator concealment message.

## Version 0.13.1

- Added a continuous camera-to-player visibility ray for local players and
  spectators.
- Only wall panels blocking the current view fade to 12% visibility; their
  player, bot and camera collision remains fully active.
- Multiple walls fade together when the camera is caught around a doorway or
  room corner.
- The third-person camera now pulls in front of an obstructing wall and smoothly
  returns to its normal distance when the view is clear.
- Reduced the minimum camera radius so narrow museum spaces can recover instead
  of leaving the player hidden behind geometry.

## Version 0.13

- Replaced the open prototype arena with the much larger Midnight Museum.
- Added six colour-coded areas: Ancient Exhibit, Grand Gallery, Neon Arcade,
  Sculpture Garden, Midnight Atrium and Gift Shop.
- Added illuminated room signs, individual floor treatments, neon architectural
  trim, atmospheric museum lighting and a live room-name HUD.
- Added 31 varied disguise props including statues, urns, sarcophagi, benches,
  arcade cabinets, display cases, shelves, capsules, plinths and gift crates.
- Added internal walls, wide doorways, room-to-room routes and camera-safe
  collision throughout the museum.
- Flags are smaller, less luminous and selected from 25 concealed exhibit-edge
  positions spread across the full map.
- Slow Bots now wander between museum navigation points instead of travelling
  directly toward flags.
- Bots move at 0.38 units per second, wait at least 28–40 seconds before they may
  collect their first flag, and continue choosing detours most of the time.
- Added server-side museum wall collision for bot movement.
- When exactly one flag remains, the server and HUD activate Bust Frenzy and
  completely remove the Blender's normal ten-second Bust cooldown.

## Version 0.12.1

- Slow Bots now select different flag routes instead of travelling as a group.
- Added server-authoritative separation steering so nearby bots naturally fan out.
- A player Busted during the arena enters a server-timed 15-second privacy screen.
- The privacy screen obscures the arena and never reveals the Blender or spectator
  target while the Blender has time to move away.
- After the timer, the camera smoothly follows a randomly selected active Seeker,
  including a Slow Bot when appropriate.
- The spectator HUD clearly identifies the Seeker currently being watched.
- If that Seeker is later removed, the server automatically chooses another active
  Seeker without exposing private role information.
- Players removed by a vote enter spectator mode immediately.

## Version 0.12

- Blenders must now be actively disguised before the server accepts a Bust.
- Every Bust leaves a bright, non-graphic report marker with the victim's name.
- Nearby active humans receive REPORT controls; desktop also supports R.
- Reporting pauses movement, bots, flag collection and the remaining round time.
- Added a 15-second verbal discussion phase and 20-second private voting phase.
- Responsive voting cards support phones, iPads, laptops and large screens.
- Active humans may vote for a player or skip; choices cannot be changed.
- Busted players become silent spectators and cannot report or vote.
- Testing bots cannot report, participate in discussion or vote.
- Ties and leading skip votes remove nobody.
- A five-second verdict reveals whether the removed player was a Blender or Seeker.
- Seekers now also win when every Blender has been voted out.
- If both teams remain, the arena resumes with the exact paused time restored.

## Version 0.11.2

- Increased the validated Bust range from 2.1 to 2.75 metres.
- Added four clearly named Slow Bots for small multiplayer testing sessions.
- Testing bots are always Seekers, move at only 0.62 units per second, collect
  flags and periodically disguise as arena props.
- Bots stop moving and cannot collect whenever only one flag remains.
- Bots are removed on return to lobby and recreated fresh for the next round.
- Replaced the temporary generated pop with the supplied `bust.mp3`.
- Upgraded the synchronized Bust effect with squash, balloon expansion,
  collapse and colourful 3D burst fragments visible to every player.
- Testing bots can be targeted and Busted by Blenders.

## Version 0.11.1

- Added a server-authoritative Bust action for Blenders.
- BUST appears when an eligible Seeker is within 2.1 metres; desktop also uses F.
- Validates role, target, distance, active state and a 10-second cooldown.
- Added a balloon-style pop animation and short synthesized pop sound.
- Busted Seekers enter privacy-protected spectator mode for the remainder of the round.
- Blenders win when no active Seekers remain.
- Every new round now resets disguises, character visibility, scale, movement,
  active state, rotation and spawn position before role reveal.

## Version 0.11

- Added private server-assigned Blender and Seeker roles.
- Added a synchronized role-reveal phase before each round.
- Blender count scales automatically with the lobby, with a host override.
- Added 4–8 randomized glowing 3D flags based on player count.
- Flag collection is validated by the server and restricted to Seekers.
- Added a synchronized round timer with 2, 3 and 5 minute host options.
- Seekers win by finding every flag; Blenders win when time expires.
- Added shared flag progress, collection feedback and private role HUD.
- Added results overlays and a host-controlled return to the same lobby.
- Existing movement, camera, touch, blending, collisions and name fading remain.

## Version 0.10.2

- Player names now project from their real 3D head positions.
- Corrected render-pixel to CSS-pixel conversion on Retina/high-DPI screens.
- Local and remote labels remain directly above moving characters.
- Disguised players' labels adapt to the copied prop's height.

## Version 0.10.1

- Replaced the crowded radial spawn calculation with 24 safe spawn slots.
- Players now begin farther apart and clear of nearby arena props.
- Remote collision bodies appear immediately at their real server positions.
- Added overlap recovery so temporary network overlap can never trap movement.

## Version 0.10

- Added real Host Game and Join Game flows using shareable five-digit room codes.
- Added a responsive lobby with live player list, host badge, connection status,
  leave controls and host-only match start.
- Synchronises up to 24 players' position, rotation, names and prop disguises.
- Remote movement is smoothly interpolated and remote name labels follow the
  same 1.5-second stationary fade rule.
- Added player-to-player collision using the existing solid movement system.
- Added duplicate-device protection, a 10-second reconnection window and
  automatic host promotion when a host leaves.
- Room-code resolution works over HTTP, ready for separate itch.io and Render
  deployments through `VITE_SERVER_URL`.
- Retains the local practice option for movement testing without a server.

## Version 0.9

- Added deterministic solid collision footprints around every disguise prop.
- Players can no longer walk through crates, pots or orbs.
- Horizontal movement resolves on separate axes for natural edge sliding.
- Existing Babylon wall and camera collision remain active.
- Added the shared remote-player collision path for the multiplayer milestone.
- Collision logic is identical for keyboard, arrow-key and touchscreen movement.

## Version 0.8

- Added dedicated right-side iPad camera touch capture while stationary.
- Added a visible Blend button on desktop and touchscreen devices.
- Added E as the desktop Blend/Unblend shortcut.
- Detects and highlights the nearest valid prop.
- Added working transform and untransform gameplay.
- Player names retain their existing movement and stationary fade rules.
- Camera target height adapts to the copied prop.
- Added an 850 ms anti-spam Blend cooldown and contextual instructions.

## Version 0.7

- Fixed the iPad joystick overlay intercepting movement touches.
- Added dedicated pointer capture directly to the visible joystick.
- Joystick movement now continues when the thumb slides beyond its edge.
- Supports simultaneous left-thumb movement and right-thumb camera control.
- Resets movement reliably when a touch ends or is cancelled by iPadOS.

## Version 0.6

- Inverted vertical mouse and touchscreen camera controls.
- Added a dedicated collision radius to the third-person camera.
- Camera now moves closer to the player instead of passing through arena walls.
- Prevents walls and large props from completely hiding the player.
- Reduced near clipping for a stable close camera view.

## Version 0.5

- Right-click and drag now orbits the camera while the player is stationary.
- Right-click camera control is independent of keyboard movement.
- Releasing the right mouse button immediately ends camera control.
- Touchscreen players retain right-side swipe camera control while stationary.
- Auto-follow remains suspended during manual camera control.

## Version 0.4

- Movement now uses Babylon's actual camera forward and right vectors.
- W/Up always moves forward relative to the visible camera view.
- Corrected the placeholder character's visual facing direction.
- Added smooth character turning rather than instant 90-degree snapping.
- Added fluid damped camera follow behind the direction of travel.
- Manual mouse and touchscreen camera movement temporarily overrides auto-follow.

## Version 0.3

- Detects an existing local Blend server before starting.
- Reuses the existing server instead of producing an `EADDRINUSE` error.
- Detects when an unrelated program owns port 2567 and displays a clear message.
- Prevents repeated server restarts and repeated error stack traces.

## Version 0.2

- Fixed keyboard, arrow-key and touchscreen movement.
- Added a dedicated invisible player collision capsule.
- Kept the visible character and camera synchronised with the collision body.
- Preserved the 1.5-second stationary name fade.

## Technology

- Babylon.js, TypeScript and Vite client
- Colyseus and Node.js server
- Responsive HTML interface with keyboard, mouse and touch controls

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

The server health check is available at `http://localhost:2567/health`.

## Current milestone

- Responsive title screen using the supplied 1280×720 artwork
- Working five-digit Host/Join multiplayer lobby
- Playable 3D practice arena
- WASD/arrow-key movement and pointer-drag camera
- Dual-zone touch movement and camera controls
- Responsive phone, tablet and desktop HUD
- Live multiplayer room state, reconnection and host controls
- Networked movement, names, disguises and player collisions
