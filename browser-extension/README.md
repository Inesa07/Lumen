# Lumen Focus (browser extension)

Blocks YouTube, games and social sites **only while a Lumen lesson is running** (not during breaks).
After the lesson everything opens again. If Lumen is closed in the middle of a lesson, the sites open
again after 90 seconds, so nothing stays blocked by mistake.

- `lumen-bridge.js` runs on the Lumen page and passes "lesson started / ended" to `background.js`.
- `background.js` turns the blocking on and off with `declarativeNetRequest` rules (Chrome applies them itself;
  the extension never reads the pages you visit).
- `blocked.html` is what a blocked site shows: Lumi with a book and "Back to your lesson!".
- `popup.html` shows whether a lesson is running and lets you edit the list (locked during a lesson).

Install (Chrome or Edge): Lumen → Settings → "Block distracting sites" → Download, unzip, open
`chrome://extensions`, turn on Developer mode, press "Load unpacked" and choose the `lumen-focus` folder.

After changing these files run `npm run extension` to rebuild `static/lumen-focus.zip`.
