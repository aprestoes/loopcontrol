# Loop Control (Video Section Loop)

## What does it do?

This extension loops user-specified sections of videos AND audio (enabled in settings). Instead of looping just from the end back to the beginning of the video, you can loop between any two points. Create a gif-like effect just within your browser!

## Why?

Watching a cooking video/tricky guitar tutorial/play-of-the-game/awesome performance? Use Loop Control to only watch the parts you want.

## How?

All HTML5 videos will display a moveable and hideable controller that indicates if loops are currently toggled on or off. Here you can set the start and end times of the sections you want to loop.

![loopcontrol-example](https://user-images.githubusercontent.com/47873094/193581311-85428290-7c9f-4977-9e14-cbf74c44b748.gif)

You can also manually toggle LoopControl by right-clicking the video and selecting loop.

Default Keybindings (targets the last video controller you interacted with):
Q - Set loop start
E - Set loop end
R - Toggle loop
H - Hide controller

## Installation

### Firefox Temporary Add-on (For testing purposes)

1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. In Firefox, go to `about:debugging`
4. Click on This Firefox -> Load Temporary Add-on
5. Select `manifest.json` within the `loopcontrol-main` folder

### Chrome Temporary Add-on (For testing purposes)

1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. In Chrome, go to `chrome://extensions`
4. Enable Developer Mode in the top-right
5. Click 'Load unpacked extension...'
6. Select the `loopcontrol-main` folder

## To-do

-   [x] Implement options page and settings
-   [x] On toggle off, remove event listener instead of checking for lc.settings.enabled in event listener
-   [x] Fix issue with constant buffering when section loop is short (<1 seconds) (Restrict sections <1 secs for now?) -> Issue was with using Math.floor for times instead of the exact times. Exact behaviour _may_ differ depending on browser
-   [x] Implement hide controller
-   [ ] Setting for default loop start and end times
-   [x] Keybindings. Q and E to set start and end times.
-   [x] .addEventListener does not override current listeners, must manually remove them on toggle (Toggle off currently not removing listener)
-   [x] In some cases, cannot toggle loop, or loop continues even when toggled off
-   [x] In some cases, video loops a section a few times, then goes back to video start
-   [x] Set loop flag?
-   [x] Make separate setStart() and setEnd() functions
-   [x] Check if user sets/removes loop flag
-   [x] Youtube: on load, end indicator shown as NaN -> .addEventListener("loadedmetadata", ...)
-   [ ] Use intervals instead of event listener?
-   [ ] Remember video loop times
-   [ ] Switch to browser._ namespace for Firefox extension and chrome._ for Chrome
-   [ ] Switch to Manifest v3 once Firefox Stable implements it. Or make separate repo? Chrome Web Store only accept manifest v3.

## Credit

Huge thanks to [Video Speed Controller](https://github.com/igrigorik/videospeed), the [Firefox fork](https://github.com/codebicycle/videospeed) (seemingly abandoned) and the more updated [gediminasel fork](https://github.com/gediminasel/videospeed-firefox) with a few helpful fixes. It served as the inspiration for this project and its code is the foundation of this extension.

<a href="https://www.flaticon.com/free-icons/update" title="update icons">Extension icon created by Pixel perfect - Flaticon</a>
