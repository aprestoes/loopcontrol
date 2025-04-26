const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
const regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;
const isChrome = window.chrome ? true : false;

//TODO: if elements are siblings, assign key listener to video. If not, assign to parent
var lc = {
    settings: {
        logLevel: 2, //See log function below. Default: 2
        audioEnabled: false, //Enable for audio as well as video. Default: true
        //loopEverything: false
        startHidden: false,
        inSeconds: false, //Display labels in seconds or in MM:SS format
        enabled: true,
        controllerOpacity: 0.7, //Default 0.7
        keyBindings: [],
        //version: "0.0.1",
        offsetX: 0, //The controller offset from its default position along the x-axis
        offsetY: 0, //The controller offset from its default position along the y-axis
        blacklist: `\
            www.instagram.com
            twitter.com
            vine.co
            imgur.com
            teams.microsoft.com
            `.replace(regStrip, ""),
    },

    //Measured in seconds. The keys are video.currentSrc
    startTimes: {},
    endTimes: {},
    loopsEnabled: {}, //TODO: Potentially turn it to array that only has enabled videos

    lastInteracted: {}, //Holds a reference to the last interacted controller to target for keybindings

    // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
    mediaElements: [],
};

/* Log Levels:
  0. None
  1. Errors
  2. Warnings
  3. Info
  4. Debug
*/
function log(message, logLevel = 5) {
    let currentLevel = lc.settings.logLevel;

    if (currentLevel >= logLevel) {
        if (logLevel == 1) {
            console.log("ERROR: " + message);
        } else if (logLevel == 2) {
            console.log("WARNING: " + message);
        } else if (logLevel == 3) {
            console.log("INFO: " + message);
        } else if (logLevel == 4) {
            console.log("DEBUG: " + message);
        } else {
            console.log("UNDEFINED: " + message);
        }
    }
}

function runAction(action, value, e) {
    if (e) {
        //Set correct target depending on click or keypress
        var targetController = value ? value.div : e.target.getRootNode().host; //If keydown use lastInteracted
    }

    lc.mediaElements.forEach(function (v) {
        var controller = v.vsl.div;

        if (e && !(targetController == controller)) {
            return;
        }

        if (!v.classList.contains("vsl-cancelled")) {
            if (action === "blink") {
                log("Showing controller momentarily", 4);
                if (
                    controller.classList.contains("vsl-hidden") ||
                    controller.blinkTimeOut !== undefined
                ) {
                    tempShowController(controller);
                }
                return; //So it doesn't blink twice
            } else if (action === "set-start") {
                log("Setting loop start to: " + v.currentTime, 4);
                setStart(v, v.currentTime);
            } else if (action === "set-end") {
                log("Setting loop end to: " + v.currentTime, 4);
                setEnd(v, v.currentTime);
            } else if (action === "toggle-loop") {
                toggleLoop(v);
            } else if (action === "drag") {
                handleDrag(v, e);
            } else if (action === "toggle-controller") {
                log("Toggling controller", 4);
                controller.classList.add("vsl-manual");
                controller.classList.toggle("vsl-hidden");
            }

            if (action !== "blink") {
                //So it doesn't blink twice
                if (action !== "toggle-controller" && e.type === "keyup")
                    tempShowController(controller);

                lc.lastInteracted = v.vsl;
            }
        }
    });
}

function defineVideoController() {
    log("Defining video controller", 4);
    lc.videoController = function (target, parent) {
        log("Creating new video controller", 4);
        if (target.vsl) {
            return target.vsl;
        }

        lc.mediaElements.push(target);

        this.video = target;
        this.parent = target.parentElement || parent;

        //Set default values
        lc.startTimes[target.currentSrc] = 0;
        this.video.addEventListener("loadedmetadata", (event) => {
            //Only set the end time when the metadata is loaded. Otherwise it may be NaN
            lc.endTimes[target.currentSrc] = target.duration;
        });
        //lc.endTimes[target.currentSrc] = target.duration;
        lc.loopsEnabled[target.currentSrc] = false;

        //Default start and end time

        this.div = this.initControls();

        const previousSrcMap = new WeakMap();

        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    (mutation.attributeName === "src" ||
                        mutation.attributeName === "currentSrc")
                ) {
                    log("mutation of A/V element, src or currentSrc", 4);

                    var controller = this.div;
                    if (controller) {
                        if (!mutation.target.src && !mutation.target.currentSrc) {
                            controller.classList.add("vsl-nosource");
                        } else {
                            controller.classList.remove("vsl-nosource");
                        }
                    }

                    let video = mutation.target;
                    let newSrc = video.currentSrc;

                    let oldSrc = previousSrcMap.get(video);
                    if (oldSrc !== newSrc) {
                        log(`Source changed: ${oldSrc} ➜ ${newSrc}`, 4);

                        previousSrcMap.set(video, newSrc);

                        if (video.vsl) {
                            video.vsl.remove();
                            video.vsl = null;
                        }

                        video.addEventListener("loadedmetadata", function onLoad() {
                            video.removeEventListener("loadedmetadata", onLoad);
                            checkForVideo(video, video.parentNode, true);
                            if (lc.mediaElements.length > 0) {
                                lc.lastInteracted = lc.mediaElements[0].vsl;
                            }
                        });
                    }
                }
            });
        });

        observer.observe(target, {
            attributes: true,
            attributeFilter: ["src", "currentSrc"],
        });

        //This MutationObserver will be activated and disconnected in toggleLoop()
        this.loopFlagObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes" && mutation.attributeName === "loop") {
                    log("Loop flag manually toggled by user. Toggling LoopControl.", 3);
                    toggleLoop(target);
                }
            });
        });
        this.loopFlagObserver.observe(target, {
            attributeFilter: ["loop"],
        });
    };

    lc.videoController.prototype.remove = function () {
        resetStart(this.video); //Removes elements from arrays
        resetEnd(this.video);

        this.div.remove();
        this.video.removeEventListener("timeupdate", lc.handleLoop);
        this.video.loop = false;
        delete this.video.vsl;
        let idx = lc.mediaElements.indexOf(this.video);
        if (idx != -1) {
            lc.mediaElements.splice(idx, 1);
        }

        delete lc.loopsEnabled[this.video.currentSrc];
    };

    //Reset the controller -> mutation to a different video, reset loop and put controller to default values
    lc.videoController.prototype.reset = function () {
        let controller = document.getElementById("controller");
        let offsetRect = this.video.offsetParent?.getBoundingClientRect();
        controller.style.top = Math.max(rect.top - (offsetRect?.top || 0), 0) + lc.settings.offsetY + "px";
        controller.style.left = Math.max(rect.left - (offsetRect?.left || 0), 0) + lc.settings.offsetX + "px";

        resetStart(this.video); //Removes elements from arrays
        resetEnd(this.video);

        this.video.removeEventListener("timeupdate", lc.handleLoop);
        this.video.loop = false;

        delete lc.loopsEnabled[this.video.currentSrc];
    }

    lc.videoController.prototype.initControls = function () {
        log("Initializing controls", 4);
        const document = this.video.ownerDocument;

        const rect = this.video.getBoundingClientRect();
        // getBoundingClientRect is relative to the viewport; style coordinates
        // are relative to offsetParent, so we adjust for that here. offsetParent
        // can be null if the video has `display: none` or is not yet in the DOM.
        const offsetRect = this.video.offsetParent?.getBoundingClientRect();
        const top = Math.max(rect.top - (offsetRect?.top || 0), 0) + lc.settings.offsetY + "px";
        const left = Math.max(rect.left - (offsetRect?.left || 0), 0) + lc.settings.offsetX + "px";

        var wrapper = document.createElement("div");
        wrapper.classList.add("vsl-controller");

        if (!this.video.src && !this.video.currentSrc) {
            wrapper.classList.add("vsl-nosource");
        }

        if (lc.settings.startHidden) {
            wrapper.classList.add("vsl-hidden");
        }

        var shadow = wrapper.attachShadow({
            mode: "open",
        });

        var shadowURL = isChrome
            ? chrome.runtime.getURL("shadow.css")
            : browser.runtime.getURL("shadow.css");

        var shadowTemplate = `
        <style>
            @import "${shadowURL}";
        </style>
        <div id="controller" style="top:${top}; left:${left}; opacity:${lc.settings.controllerOpacity}">
            <span data-action="drag" class="draggable drag-indicator">OFF</span>
            <span id="controls">
                <button id="start-indicator" class="rw" data-action="set-start">Start</button>
                <span> to </span>
                <button id="end-indicator" class="rw" data-action="set-end">End</button>
                <button id="toggle-indicator" class="hide-button" data-action="toggle-loop">
                  OFF
                </button>
                <button id="hide-indicator" data-action="toggle-controller" class="hide-button">&times;</button>
            </span>
        </div>
        `;
        //class hide-button is hidden during blink

        shadow.innerHTML = shadowTemplate;
        shadow.querySelector(".draggable").addEventListener(
            "mousedown",
            (e) => {
                runAction(e.target.dataset["action"], false, e);
                e.stopPropagation();
            },
            true
        );

        shadow.querySelectorAll("button").forEach(function (button) {
            button.addEventListener(
                "click",
                (e) => {
                    runAction(e.target.dataset["action"], null, e);
                    e.stopPropagation();
                },
                true
            );
        });

        shadow
            .querySelector("#controller")
            .addEventListener("click", (e) => e.stopPropagation(), false);
        shadow
            .querySelector("#controller")
            .addEventListener("mousedown", (e) => e.stopPropagation(), false);

        this.startIndicator = shadow.querySelector("#start-indicator");
        this.endIndicator = shadow.querySelector("#end-indicator");

        this.toggleIndicator = shadow.querySelector("#toggle-indicator");
        this.dragIndicator = shadow.querySelector(".drag-indicator");

        var fragment = document.createDocumentFragment();
        fragment.appendChild(wrapper);

        switch (true) {
            case location.hostname == "www.amazon.com":
            case location.hostname == "www.reddit.com":
            case /hbogo\./.test(location.hostname):
                // insert before parent to bypass overlay
                this.parent.parentElement.insertBefore(fragment, this.parent);
                break;
            case location.hostname == "www.facebook.com":
                // this is a monstrosity but new FB design does not have *any*
                // semantic handles for us to traverse the tree, and deep nesting
                // that we need to bubble up from to get controller to stack correctly
                let p =
                    this.parent.parentElement.parentElement.parentElement.parentElement
                        .parentElement.parentElement.parentElement;
                p.insertBefore(fragment, p.firstChild);
                break;
            case location.hostname == "tv.apple.com":
                // insert before parent to bypass overlay
                this.parent.parentNode.insertBefore(
                    fragment,
                    this.parent.parentNode.firstChild
                );
                break;
            default:
                // Note: when triggered via a MutationRecord, it's possible that the
                // target is not the immediate parent. This appends the controller as
                // the first element of the target, which may not be the parent.
                this.parent.insertBefore(fragment, this.parent.firstChild);
        }

        log("Finished initializing controls", 4);
        return wrapper;
    };
}

function checkForVideo(node, parent, added, removal = false) {
    // Only proceed with supposed removal if node is missing from DOM
    if (!added && document.body.contains(node) && !removal) {
        return;
    }
    if (
        node.nodeName === "VIDEO" ||
        (node.nodeName === "AUDIO" && lc.settings.audioEnabled)
    ) {
        if (added) {
            if (!node.vsl) {
                node.vsl = new lc.videoController(node, parent);
            }
        } else {
            if (node.vsl) {
                node.vsl.remove();
                node.vsl = null;
            }
        }
    } else if (node.children != undefined) {
        for (var i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            checkForVideo(child, child.parentNode || parent, added);
        }
    }
}

function initNow(document) {
    log("initNow started", 4);

    if (
        !lc.settings.enabled ||
        !document.body ||
        document.body.classList.contains("vsl-initialized")
    ) {
        return;
    }

    document.body.classList.add("vsl-initialized");
    log("initNow: vsl-initialized added to document body", 4);

    if (document === window.document) {
        defineVideoController();
    } else {
        var link = document.createElement("link");
        var injectLink = isChrome
            ? chrome.runtime.getURL("inject.css")
            : browser.runtime.getURL("inject.css");
        link.href = injectLink;
        link.type = "text/css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }

    var docs = Array(document);
    try {
        if (inIframe()) {
            docs.push(window.top.document);
        }
    } catch (e) {}

    docs.forEach(function (doc) {
        //doc.querySelector("#vsl-controller").forEach(());
        doc.addEventListener(
            "keyup",
            function (event) {
                var keyCode = event.key;

                // Ignore if following modifier is active.
                if (
                    !event.getModifierState ||
                    event.getModifierState("Alt") ||
                    event.getModifierState("Control") ||
                    event.getModifierState("Fn") ||
                    event.getModifierState("Meta") ||
                    event.getModifierState("Hyper") ||
                    event.getModifierState("OS")
                ) {
                    log("Keydown event ignored due to active modifier: " + keyCode, 4);
                    return;
                }

                // Ignore keydown event if typing in an input box
                if (
                    event.target.nodeName === "INPUT" ||
                    event.target.nodeName === "TEXTAREA" ||
                    event.target.isContentEditable
                ) {
                    return false;
                }

                // Ignore keydown event if typing in a page without vsc
                if (!lc.mediaElements.length) {
                    return false;
                }

                log("Processing key event: " + keyCode, 4);

                var item = lc.settings.keyBindings.find((item) => item.key === keyCode);
                if (item) {
                    //Keys will only work on targeted video. Different behaviour from VSC
                    runAction(item.action, lc.lastInteracted, event);
                    if (item.force === "true") {
                        // disable websites key bindings
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }

                return false;
            },
            true
        );
    });

    var observer = new MutationObserver(function (mutations) {
        // Process the DOM nodes lazily
        requestIdleCallback(
            (_) => {
                mutations.forEach(function (mutation) {
                    switch (mutation.type) {
                        case "childList":
                            mutation.addedNodes.forEach(function (node) {
                                if (typeof node === "function") return;
                                checkForVideo(
                                    node,
                                    node.parentNode || mutation.target,
                                    true
                                );
                            });
                            mutation.removedNodes.forEach(function (node) {
                                if (typeof node === "function") return;
                                checkForVideo(
                                    node,
                                    node.parentNode || mutation.target,
                                    false
                                );
                            });
                            break;
                        case "attributes":
                            if (
                                (mutation.target.attributes["aria-hidden"] &&
                                    mutation.target.attributes["aria-hidden"].value ==
                                        "false") ||
                                mutation.target.nodeName === "APPLE-TV-PLUS-PLAYER"
                            ) {
                                var flattenedNodes = getShadow(document.body);
                                var nodes = flattenedNodes.filter(
                                    (x) => x.tagName == "VIDEO"
                                );
                                for (let node of nodes) {
                                    // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                                    if (
                                        node.vsl &&
                                        mutation.target.nodeName ===
                                            "APPLE-TV-PLUS-PLAYER"
                                    )
                                        continue;
                                    if (node.vsl) node.vsl.remove();
                                    checkForVideo(
                                        node,
                                        node.parentNode || mutation.target,
                                        true
                                    );
                                }
                            }
                            break;
                    }
                });
            },
            { timeout: 1000 }
        );
    });

    observer.observe(document, {
        attributeFilter: ["aria-hidden", "data-focus-method"],
        childList: true,
        subtree: true,
    });

    var mediaTags;
    if (lc.settings.audioEnabled) {
        mediaTags = document.querySelectorAll("video, audio");
    } else {
        mediaTags = document.querySelectorAll("video");
    }

    mediaTags.forEach(function (video) {
        video.vsl = new lc.videoController(video);
    });

    //console.log("Num mediatags: " + mediaTags.length);
    if (mediaTags.length > 0) {
        lc.lastInteracted = mediaTags[0].vsl;
    }

    //Loop through iframes and initialize as well
    var frameTags = document.getElementsByTagName("iframe");
    Array.prototype.forEach.call(frameTags, function (frame) {
        // Ignore frames we don't have permission to access (different origin).
        try {
            var childDocument = frame.contentDocument;
        } catch (e) {
            return;
        }
        initWhenReady(childDocument);
    });
}

//The function to be run. Initializes everything
function initWhenReady(document) {
    log("Started initWhenReady", 4);
    if (isBlacklisted()) {
        return;
    }

    window.addEventListener("load", () => {
        initNow(window.document);
    });

    if (document && document.readyState === "complete") {
        if (document.readyState === "complete") {
            initNow(document);
        } else {
            document.onreadystatechange = () => {
                if (document.readyState === "complete") {
                    initNow(document);
                }
            };
        }
    }
    log("initWhenReady completed", 4);
}

function setStart(video, loopStart) {
    let src = video.currentSrc;

    if (isNaN(loopStart) || (video.duration && loopStart === video.duration)) {
        log("Invalid start time", 2);
        resetStart(video);
        return;
    } else {
        loopStart = Number(loopStart);
        lc.startTimes[src] = loopStart;
        video.vsl.startIndicator.textContent = lc.settings.inSeconds
            ? Math.round(loopStart)
            : convertSecToMin(loopStart);
        log("Loop start set to " + loopStart, 4);
    }

    if (src in lc.endTimes) {
        if (loopStart > lc.endTimes[src]) {
            log("Loop starts cannot be after loop ends. Resetting section end.", 2);
            resetEnd(video);
        } else if (loopStart === lc.endTimes[src]) {
            log(
                "Loop starts and ends cannot be the exact same time. Resetting section end.",
                2
            );
            resetEnd(video);
        }
    }
}

function setEnd(video, loopEnd) {
    let src = video.currentSrc;

    if (isNaN(loopEnd) || loopEnd === 0) {
        //Loop cannot end at exactly 0
        log("Invalid end time", 2);
        resetEnd(video);
        return;
    } else {
        loopEnd = Number(loopEnd);
        lc.endTimes[src] = loopEnd >= video.duration ? video.duration - 0.05 : loopEnd;
        video.vsl.endIndicator.textContent = lc.settings.inSeconds
            ? Math.round(loopEnd)
            : convertSecToMin(loopEnd);
        log("Loop end set to " + loopEnd, 4);
    }

    if (src in lc.startTimes) {
        if (loopEnd < lc.startTimes[src]) {
            log("Loop ends cannot be before loop starts. Resetting section start.", 2);
            resetStart(video);
        } else if (loopEnd === lc.startTimes[src]) {
            log(
                "Loop starts and ends cannot be the exact same time. Resetting section end.",
                2
            );
            resetStart(video);
        }
    }
}

//Used if invalid start is inserted
function resetStart(video) {
    let src = video.currentSrc;
    //let idx = lc.startTimes.indexOf(src);
    if (src in lc.startTimes) {
        //lc.startTimes.splice(idx, 1);
        delete lc.startTimes[src]; //Frees memory and sets to undefined
        video.vsl.startIndicator.textContent = "Start";
        lc.loopsEnabled[src] = false;
    }
}

function resetEnd(video) {
    let src = video.currentSrc;
    //let idx = lc.endTimes.indexOf(src);
    if (src in lc.endTimes) {
        //lc.endTimes.splice(idx, 1);
        delete lc.endTimes[src];
        video.vsl.endIndicator.textContent = "End";
        lc.loopsEnabled[src] = false;
    }
}

function toggleLoop(video) {
    let src = video.currentSrc;
    log("Video is currently " + lc.loopsEnabled[src] + ", toggling", 3);

    if (lc.loopsEnabled[src]) {
        lc.loopsEnabled[src] = false;
        video.vsl.toggleIndicator.textContent = "OFF";
        video.vsl.dragIndicator.textContent = "OFF";
        //loop attribute and event listener handled in checkTime()
    } else {
        lc.loopsEnabled[src] = true;
        video.vsl.toggleIndicator.textContent = "ON";
        video.vsl.dragIndicator.textContent = "ON";
        video.addEventListener("timeupdate", (lc.handleLoop = checkTime.bind(video)));

        //video.vsl.loopFlagObserver.disconnect(); //Disconnect observer before toggling flag so it doesn't fire twice
        //Use loop tag instead of load() and play()
        //video.loop = true;

        //Checks if user manually toggles loop flag with right-click->loop then toggles LoopControl
        /*video.vsl.loopFlagObserver.observe(video, {
            attributeFilter: ["loop"],
        });*/
    }
}

//Is its own separate function so it can be used with removeEventListener() later
function checkTime() {
    let video = this;
    if (!lc.loopsEnabled[video.currentSrc]) {
        video.vsl.loopFlagObserver.disconnect();
        video.removeEventListener("timeupdate", lc.handleLoop);
        //video.loop = false;
        /*video.vsl.loopFlagObserver.observe(video, {
            attributeFilter: ["loop"],
        });*/
    } else if (
        video.currentTime >= lc.endTimes[video.currentSrc] ||
        video.currentTime < lc.startTimes[video.currentSrc]
    ) {
        video.currentTime = lc.startTimes[video.currentSrc];
        setTimeout(() => video.play(), 10); //Introduce an imperceptible delay so Chrome doesn't block it
    }
    //Loop back to beginning if the video is before the loop beginning or after the end
}

//Helper functions
function handleDrag(video, e) {
    const controller = video.vsl.div;
    const shadowController = controller.shadowRoot.querySelector("#controller");

    // Find nearest parent of same size as video parent.
    var parentElement = controller.parentElement;
    while (
        parentElement.parentNode &&
        parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
        parentElement.parentNode.offsetWidth === parentElement.offsetWidth
    ) {
        parentElement = parentElement.parentNode;
    }

    video.classList.add("vsl-dragging");
    shadowController.classList.add("dragging");

    const initialMouseXY = [e.clientX, e.clientY];
    const initialControllerXY = [
        parseInt(shadowController.style.left),
        parseInt(shadowController.style.top),
    ];

    const startDragging = (e) => {
        let style = shadowController.style;
        let dx = e.clientX - initialMouseXY[0];
        let dy = e.clientY - initialMouseXY[1];
        style.left = initialControllerXY[0] + dx + "px";
        style.top = initialControllerXY[1] + dy + "px";
    };

    const stopDragging = () => {
        parentElement.removeEventListener("mousemove", startDragging);
        parentElement.removeEventListener("mouseup", stopDragging);
        parentElement.removeEventListener("mouseleave", stopDragging);

        shadowController.classList.remove("dragging");
        video.classList.remove("vsl-dragging");
    };

    parentElement.addEventListener("mouseup", stopDragging);
    parentElement.addEventListener("mouseleave", stopDragging);
    parentElement.addEventListener("mousemove", startDragging);
}

function isBlacklisted() {
    let blacklisted = false;
    lc.settings.blacklist.split("\n").forEach((match) => {
        match = match.replace(regStrip, "");
        if (match.length == 0) {
            return;
        }

        if (match.startsWith("/")) {
            try {
                var parts = match.split("/");

                if (regEndsWithFlags.test(match)) {
                    var flags = parts.pop();
                    var regex = parts.slice(1).join("/");
                } else {
                    var flags = "";
                    var regex = match;
                }

                var regexp = new RegExp(regex, flags);
            } catch (err) {
                return;
            }
        } else {
            var regexp = new RegExp(escapeStringRegExp(match));
        }

        if (regexp.test(location.href)) {
            blacklisted = true;
            return;
        }
    });
    return blacklisted;
}

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function getShadow(parent) {
    let result = [];

    function getChild(parent) {
        if (parent.firstElementChild) {
            var child = parent.firstElementChild;
            do {
                result.push(child);
                getChild(child);
                if (child.shadowRoot) {
                    result.push(getShadow(child.shadowRoot));
                }

                child = child.nextElementSibling;
            } while (child);
        }
    }

    getChild(parent);
    return result.flat(Infinity);
}

function tempShowController(controller) {
    clearTimeout(controller.blinkTimeOut);

    let wasHidden = controller.classList.contains("vsl-hidden") ? true : false;

    if (wasHidden) controller.classList.remove("vsl-hidden");
    controller.shadowRoot
        .querySelector(
            //TODO: When blinking, don't show the toggle or close button
            "#controller #controls"
        )
        .classList.toggle("blinked-controls");
    controller.blinkTimeOut = setTimeout(() => {
        if (wasHidden) controller.classList.add("vsl-hidden"); //Make it hide again
        controller.blinkTimeOut = undefined;
        controller.shadowRoot
            .querySelector("#controller #controls")
            .classList.toggle("blinked-controls");
    }, 500);
}

function convertSecToMin(timeInSecs) {
    let tempDate = new Date(null);
    tempDate.setSeconds(Math.round(timeInSecs));

    return timeInSecs >= 3600
        ? tempDate.toISOString().substring(11, 19) //If over 1 hour, display hours in string
        : tempDate.toISOString().substring(14, 19);
}

function escapeStringRegExp(str) {
    let matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    return str.replace(matchOperatorsRe, "\\$&");
}

function initSettings(storage, isChrome) {
    let browserAPI = isChrome ? chrome : browser;
    lc.settings.keyBindings = storage.keyBindings; // Array

    log("Loaded settings: " + JSON.stringify(storage), 4);

    /*  DEFAULT KEYBINDINGS
        Q - Set start time
        E - Set end time
        T - Toggle loop
        H - Hide
    */

    if (storage.keyBindings.length == 0) {
        log("Keybindings not set, setting to defaults.", 3);
        lc.settings.keyBindings.push({
            action: "set-start",
            key: storage.setStartKeyCode || "q",
            value: 0,
            force: false,
            predefined: true,
        }); // default: Q
        lc.settings.keyBindings.push({
            action: "set-end",
            key: storage.setEndKeyCode || "e",
            value: 0,
            force: false,
            predefined: true,
        }); // default: E
        lc.settings.keyBindings.push({
            action: "toggle-loop",
            key: storage.toggleLoopKeyCode || "r",
            value: 0,
            force: false,
            predefined: true,
        }); // default: R
        lc.settings.keyBindings.push({
            action: "toggle-controller", //Show/hide controller
            key: storage.toggleControllerKeycode || "h",
            value: 0,
            force: false,
            predefined: true,
        }); // default: H

        browserAPI.storage.sync.set({
            keyBindings: lc.settings.keyBindings,
            //version: lc.settings.version,
            //loopEverything: lc.settings.loopEverything,
            inSeconds: lc.settings.inSeconds,
            audioEnabled: lc.settings.audioEnabled,
            startHidden: lc.settings.startHidden,
            enabled: lc.settings.enabled,
            controllerOpacity: lc.settings.controllerOpacity,
            blacklist: lc.settings.blacklist.replace(regStrip, ""),
            logLevel: lc.settings.logLevel,
            offsetX: lc.settings.offsetX,
            offsetY: lc.settings.offsetY
        });
    }
    lc.settings.inSeconds = Boolean(storage.inSeconds);
    lc.settings.audioEnabled = Boolean(storage.audioEnabled);
    lc.settings.enabled = Boolean(storage.enabled);
    lc.settings.startHidden = Boolean(storage.startHidden);
    lc.settings.controllerOpacity = Number(storage.controllerOpacity);
    lc.settings.blacklist = String(storage.blacklist);
    lc.settings.logLevel = Number(storage.logLevel);
    lc.settings.offsetX = Number(storage.offsetX);
    lc.settings.offsetY = Number(storage.offsetY);

    initWhenReady(document);
}

//Chrome uses callbacks while Firefox uses promises.
if (isChrome) {
    //Clear storage for testing
    //chrome.storage.sync.clear();

    chrome.storage.sync.get(lc.settings, function (storage) {
        initSettings(storage, true);
    });
} else {
    if (!browser) log("Unsupported browser. chrome and browser namespace not found.", 1); //Also doesn't have browser namespace

    browser.storage.sync.get(lc.settings).then((storage) => {
        initSettings(storage, false);
    });
}
