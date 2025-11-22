# Loop Control (Video Section Loop)
[![Firefox AMO](https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-129x45px.8041c789.png)](https://addons.mozilla.org/en-CA/firefox/addon/loopcontrol)

[![CI Status](https://github.com/aprestoes/loopcontrol/actions/workflows/CI.yml/badge.svg)](https://github.com/aprestoes/loopcontrol/actions/workflows/CI.yml)

## What It Does

**LoopControl** is a browser extension for Chrome and Firefox that lets you loop custom sections of videos - not just from the beginning to end. A controller overlays all videos, letting you set a start and end point for the loop.

## Why Use It?

- 🪶 Skip the fluff - loop just the part that you care about
- 🧑‍🍳 Master that recipe, riff, or dance move by repeating important sections
- 🔁 Turn any video segment into a gif-like loop
- ⌨️ Utilize the visual controller overlay or keybindings
- 🔥 Works on virtually any HTML5 video across Chrome and Firefox

## How?

All HTML5 videos will display a moveable and hideable controller that indicates if loops are currently toggled on or off. Here you can set the start and end times of the sections you want to loop.

![loopcontrol-example](https://user-images.githubusercontent.com/47873094/193581311-85428290-7c9f-4977-9e14-cbf74c44b748.gif)

You can also manually toggle LoopControl by right-clicking the video and selecting loop.

**Default Keybindings** (targets the last video controller you interacted with):
- <kbd>Q</kbd> - Set loop start
- <kbd>E</kbd> - Set loop end
- <kbd>R</kbd> - Toggle loop
- <kbd>H</kbd> - Hide controller

## Cross-platform Browser Support

Since 2024, Google deprecated Manifest V2 for Chrome extensions in favour of [Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3). So while Firefox supports both Manifest V2 and Manifest V3 extensions, Chrome will only support Manifest V3 moving forward. Among other changes, Manifest V3 was interfering with how Firefox prompted for required permissions. Therefore two different manifests exist in the `./manifests/` folder.

To switch manifest types before testing/building:
```BASH
npm run prepare:chrome # Copies Manifest V3
npm run prepare:firefox # Copies Manifest V2
```

## Installation

### Install from Addons.Mozilla.Org (AMO)

Install through the official Firefox Add-ons Web Store [link](https://addons.mozilla.org/en-CA/firefox/addon/loopcontrol/).

### Firefox Temporary Add-on (For testing purposes)

1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. Change into the directory with `cd loopcontrol`
4. Copy the proper manifest version for Firefox with `npm run prepare:firefox`
5. In Firefox, go to `about:debugging`
6. Click on This Firefox -> Load Temporary Add-on
7. Select `manifest.json` within the `loopcontrol-main` folder

### Chrome Temporary Add-on (For testing purposes)

1. Download this repo as a .zip file
2. Unzip the file. The folder is `loopcontrol-main`
3. Change into the directory with `cd loopcontrol`
4. Copy the proper manifest version for Chrome with `npm run prepare:chrome`
5. In Chrome, go to `chrome://extensions`
6. Enable Developer Mode in the top-right
7. Click 'Load unpacked extension...'
8. Select the `loopcontrol-main` folder

## Testing

1. Change into the project directory with `cd loopcontrol`
2. Install test dependencies with `npm install`
3. Run the automated Jest tests with `npm test`

## To-do

-   [ ] 48x48 and 128x128 logos for Chrome store

## Credit

Huge thanks to [Video Speed Controller](https://github.com/igrigorik/videospeed), the [Firefox fork](https://github.com/codebicycle/videospeed) (seemingly abandoned) and the more updated [gediminasel fork](https://github.com/gediminasel/videospeed-firefox) with a few helpful fixes. The loop UI and settings pages were adapted from these extensions.

Credit to Samplelib's [videos](https://samplelib.com/sample-mp4.html) for the test .mp4.

<a href="https://www.flaticon.com/free-icons/update" title="update icons">Extension icon created by Pixel perfect - Flaticon</a>

Mockup assets used in extension listings from [MockupDen](https://mockupden.com) and [Shaping Rain](https://shapingrain.com)
