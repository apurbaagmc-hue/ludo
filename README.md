# Ludo

Family Ludo with no ads and no tracking. The game runs entirely on the phone;
Google Apps Script is used only for online rooms.

## Files

- `index.html` – the game. Set `API_URL` near the top to the Apps Script `/exec` URL.
- `engine.js` – the rules. Must match `LudoEngine()` in `Code.gs`.
- `sw.js` – stores the app on the phone so it opens instantly and works offline.
- `manifest.webmanifest`, `icon-*.png` – app name and icons for installing.
- `fonts/` – Baloo Da 2 (SIL Open Font License, see `fonts/OFL.txt`).

## Updating

Upload changed files to this repository. Phones get them on the second launch after
the upload (the first launch downloads them in the background). If you change the
list of files, also raise `CACHE` in `sw.js` (for example `ludo-v3`).

If you change the rules, change `engine.js` and `Code.gs` together and raise
`VERSION` in both, then redeploy the Apps Script web app as a new version.
