# v0.20.0 publishing

1. Extract the v0.20.0 hotfix over your Blend In or Bust project and replace the changed files, or use the full-source ZIP.
2. Push the server changes to GitHub first so Render deploys the live Maths challenge protocol.
3. Wait until the Render deploy is live.
4. Double-click `BUILD_ITCH_v0.20.0.bat` (or run the commands in `DEPLOY_v0.20.0.txt`).
5. Upload `release\Blend-in-or-Bust-v0.20.0-itch.zip` to itch.io.

The packaging script verifies relative itch.io asset paths and checks that the browser source/build does not perform a `/health` preflight.
