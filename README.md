# Blend in or Bust v0.19.24 hotfix

Changed-files-only stability update.

## Fixes

- The lobby button now reads **START MATCH**.
- A round now stays in an authoritative **loading** phase until every active human has:
  - finished loading the 3D museum; and
  - acknowledged their private BUSTER or BLENDER role.
- The role card remains above the loading screen and sends a private ready confirmation when the player presses **I UNDERSTAND - CONTINUE**.
- The round timer is not consumed while the museum is loading.
- Once everyone is ready, all devices receive the same four-second reveal countdown and the gameplay timer starts together.
- Player movement is enabled when the server enters the gameplay phase.
- Colyseus heartbeat tolerance is extended for the first Babylon museum build, preventing slow phones, iPads and laptops from being disconnected while their browser is busy loading assets.
- Existing testing-bot and role settings are preserved.

## Deployment

This update changes both client and server files. Push it to GitHub so Render redeploys, then run `FIX_ITCH_UPLOAD.bat` and upload the newest v0.19.24 itch.io ZIP.

No browser `/health` request is added.
