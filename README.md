# Ludo app shell

These files turn the Apps Script Ludo game into an installable Android app (PWA).
The game itself still runs from Apps Script. This folder only provides the icon,
full-screen window, splash screen, offline message, back-button support, screen
wake lock and vibration.

## Setup

1. In `index.html`, set `GAS_URL` to the web app's `/exec` address.
2. Upload every file in this folder to a free static host with HTTPS, for example
   GitHub Pages (new public repo, Add file > Upload files, then
   Settings > Pages > Deploy from branch `main`, folder `/root`).
3. In `Code.gs`, set `PUBLIC_URL` to the address of this site
   (for example `https://yourname.github.io/ludo/`) and redeploy the web app
   as a new version. WhatsApp room links will then open in the installed app.

## Install on a phone

Open the site in Chrome, then tap **Install app** (top-left of the home screen)
or Chrome menu > **Add to Home screen** > **Install**.

## Updating

Changes to `Code.gs` / `Index.html` reach phones as soon as you redeploy the
Apps Script version. Changes to this folder need a new upload; if you change
`sw.js`, bump `CACHE` (for example `ludo-shell-v2`).
