# Loop Control (Video Section Loop)
## What does it do?
This extension loops user-specified sections of videos. Instead of looping just from the end back to the beginning of the video, you can loop between any two points. Create a gif-like effect just within your browser!

## Why?
Watching a cooking video/tricky guitar tutorial/play-of-the-game/awesome performance? Use Loop Control to only watch the parts you want.

## To-do
- [ ] Implement options page and settings
- [ ] On toggle off, remove event listener instead of checking for lc.settings.enabled in event listener
- [ ] Fix issue with constant buffering when section loop is short (<1 seconds)
- [ ] Implement hide controller
- [ ] Default loop start and end times
- [ ] Keybindings
- [ ] .addEventListener does not override current listeners, must manually remove them on toggle
- [ ] Set loop flag?

## Installation
### Firefox Temporary Add-on (For testing purposes)
1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. In Firefox, go to `about:debugging`
4. Click on This Firefox -> Load Temporary Add-on
5. Select `manifest.json` within the `loopcontrol-main` folder

### Chrome
1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. In Chrome, go to `chrome://extensions`
4. Enable Developer Mode
5. Click 'Load unpacked extension...'
6. Select the `loopcontrol-main` folder

## Credit
Huge thanks to [Video Speed Controller](https://github.com/igrigorik/videospeed) and the [Firefox fork](https://github.com/codebicycle/videospeed). It served as the inspiration for this project and its code is the foundation of this extension.

Icons are [Firefox Photon Icons](https://github.com/FirefoxUX/photon-icons).
