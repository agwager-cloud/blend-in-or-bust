# Blend in or Bust v0.19.25 hotfix

Changed-files-only connection and Bust stability update.

## Fixes

- Prevents gameplay code from sending movement or action packets after the WebSocket has started closing.
- Adds a guarded send path for movement, Bust, Lift, Blend, voting, lobby settings and other room messages.
- Adds CORS headers to Colyseus matchmaking and reconnect responses used by the itch.io iframe.
- Reconnects the same player to the same match for up to 30 seconds instead of immediately returning to the start scene.
- Extends the server reconnection reservation to 45 seconds.
- Keeps a bot or pathfinding exception from terminating the room simulation and disconnecting every player.
- Protects the human Bust handler from an unexpected bot-state error.
- Clears a Busted bot's active navigation, pursuit and interaction state immediately.
- Shows a clear reconnecting message while the connection is restored.
- Retains the school-network rule: the browser performs no `/health` request.

## Deployment

This update changes both client and server files. Push it to GitHub so Render redeploys, then run `FIX_ITCH_UPLOAD.bat` and upload the newest v0.19.25 itch.io ZIP.
