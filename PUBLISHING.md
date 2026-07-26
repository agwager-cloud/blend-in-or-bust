# v0.19.24 publishing

1. Extract this hotfix over `C:\Projects\Blend` and replace the changed files.
2. Push to GitHub so Render deploys the server heartbeat and synchronized-round fixes.
3. After Render finishes, run `FIX_ITCH_UPLOAD.bat`.
4. Upload the newest `Blend-in-or-Bust-v0.19.24-itch*.zip` from the `release` folder to itch.io.

The packaging script preserves older ZIPs by adding a timestamp when required and verifies that the browser build contains no `/health` request.
