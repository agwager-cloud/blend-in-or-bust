# Publishing Blend in or Bust v0.19.13


## School-network connection rule

The itch.io browser client must **not** call `https://blend-in-or-bust-server.onrender.com/health` before connecting. It connects through the normal Colyseus multiplayer path instead.

Render's configured `Health Check Path: /health` may remain enabled because that request is made by Render infrastructure, not by the itch.io client or student devices. The packaging script validates that `/health` is absent from all browser build files before creating the itch.io ZIP.

## Expected production addresses

- Render service: `blend-in-or-bust-server`
- Render HTTP URL: `https://blend-in-or-bust-server.onrender.com`
- Production WebSocket URL: `wss://blend-in-or-bust-server.onrender.com`

If Render assigns a different URL, update `client/.env.production` and pass the
actual URL to `scripts/build-itch.ps1` before uploading to itch.io.

## Render server

Create a Render Blueprint from the repository's root `render.yaml`, or create a
Web Service manually with these settings:

- Runtime: Node
- Region: Singapore
- Branch: main
- Root Directory: blank
- Build Command: `npm ci && npm run build -w server`
- Start Command: `npm run start -w server`
- Health Check Path: `/health`
- Instance: Free
- Auto-Deploy: On Commit
- Environment variable: `NODE_VERSION=20.19.5`

After deployment, open:

`https://blend-in-or-bust-server.onrender.com/health`

It should return JSON containing `"ok": true`.

## itch.io client

Build only after the Render server URL is known:

```powershell
cd C:\Projects\Blend
powershell -ExecutionPolicy Bypass -File .\scripts\build-itch.ps1 -RenderUrl "https://blend-in-or-bust-server.onrender.com"
```

Upload:

`release\Blend-in-or-Bust-v0.19.13-itch.zip`

The build script verifies that `index.html` is at the root of the ZIP.
