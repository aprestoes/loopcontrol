var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
const isChrome = window.chrome ? true : false;

var lcDefaults = {
    audioEnabled: false, // default: false
    startHidden: false, // default: false
    inSeconds: false,
    enabled: true, // default enabled
    controllerOpacity: 0.7, // default: 0.3
    logLevel: 2,
    offsetX: 0,
    offsetY: 0,
    keyBindings: [
        { action: "set-start", key: "q", value: 0, force: false, predefined: true }, // Q
        { action: "set-end", key: "e", value: 0, force: false, predefined: true }, //E
        { action: "toggle-loop", key: "r", value: 0, force: false, predefined: true }, //R
        {
            action: "toggle-controller",
            key: "h",
            value: 0,
            force: false,
            predefined: true,
        }, //H
    ],
    blacklist: `www.instagram.com
    twitter.com
    vine.co
    imgur.com
    teams.microsoft.com
  `.replace(regStrip, ""),
};

var keyBindings = [];
var currentLogLevel;

/* Log Levels:
  0. None
  1. Errors
  2. Warnings
  3. Info
  4. Debug
*/
function log(message, logLevel = 5) {
    let currentLevel = logLevel;

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

function recordKeyPress(e) {
    if (
        (e.key >= "0" && e.key <= "9") || // Numbers 0-9
        (e.key >= "a" && e.key <= "z") // Letters A-Z
    ) {
        e.target.value = e.key;
        e.target.key = e.key;

        e.preventDefault();
        e.stopPropagation();
    } else if (e.key === "Backspace") {
        // Clear input when backspace pressed
        e.target.value = "";
    } else if (e.key === "Escape") {
        // When esc clicked, clear input
        e.target.value = "null";
        e.target.key = null;
    }
}

function inputFilterNumbersOnly(e) {
    var char = e.key;
    if (!/[\d\.]$/.test(char) || !/^\d+(\.\d*)?$/.test(e.target.value + char)) {
        e.preventDefault();
        e.stopPropagation();
    }
}

function inputFocus(e) {
    e.target.value = "";
}

function inputBlur(e) {
    e.target.value = e.target.key;
}

function updateShortcutInputText(inputId, key) {
    document.getElementById(inputId).value = key;
    document.getElementById(inputId).key = key;
}

function updateCustomShortcutInputText(inputItem, key) {
    inputItem.value = key;
    inputItem.key = key;
}

// List of custom actions for which customValue should be disabled
var customActionsNoValues = ["toggle-controller", "set-start", "set-end", "toggle-loop"];

function createKeyBindings(item) {
    const action = item.querySelector(".customDo").value;
    const key = item.querySelector(".customKey").key;
    //const value = Number(item.querySelector(".customValue").value);
    const force = item.querySelector(".customForce").value;
    const predefined = !!item.id; //item.id ? true : false;
    const value = 0;

    keyBindings.push({
        action: action,
        key: key,
        value: value,
        force: force,
        predefined: predefined,
    });
}

// Validates settings before saving
function validate() {
    var valid = true;
    var status = document.getElementById("status");
    var blacklist = document.getElementById("blacklist");

    blacklist.value.split("\n").forEach((match) => {
        match = match.replace(regStrip, "");

        if (match.startsWith("/")) {
            try {
                var parts = match.split("/");

                if (parts.length < 3) throw "invalid regex";

                var flags = parts.pop();
                var regex = parts.slice(1).join("/");

                var regexp = new RegExp(regex, flags);
            } catch (err) {
                status.textContent =
                    'Error: Invalid blacklist regex: "' +
                    match +
                    '". Unable to save. Try wrapping it in foward slashes.';
                valid = false;
                return;
            }
        }
    });
    return valid;
}

// Saves options to chrome.storage
function save_options() {
    if (validate() === false) {
        return;
    }
    keyBindings = [];
    Array.from(document.querySelectorAll(".customs")).forEach((item) =>
        createKeyBindings(item)
    ); // Remove added shortcuts

    log("Saving options", 3);

    //var loopEverything = document.getElementById("loopEverything").checked;
    var inSeconds = document.getElementById("inSeconds").checked;
    var audioEnabled = document.getElementById("audioEnabled").checked;
    var enabled = document.getElementById("enabled").checked;
    var startHidden = document.getElementById("startHidden").checked;
    var controllerOpacity = Number(document.getElementById("controllerOpacity").value);
    var blacklist = document.getElementById("blacklist").value;
    var logLevel = Number(document.getElementById("loggingLevel").value);
    var offsetX = Number(document.getElementById("offset-x").value);
    var offsetY = Number(document.getElementById("offset-y").value);

    //Reset keycodes
    let keySettings = [
        "setStartKeyCode",
        "setEndKeyCode",
        "toggleLoopKeyCode",
        "toggleControllerKeyCode",
    ];

    let currentSettings = {
        audioEnabled: audioEnabled,
        enabled: enabled,
        inSeconds: inSeconds,
        startHidden: startHidden,
        controllerOpacity: controllerOpacity,
        keyBindings: keyBindings,
        blacklist: blacklist.replace(regStrip, ""),
        logLevel: logLevel,
        offsetX: offsetX,
        offsetY: offsetY
    };

    log("Saving the following settings: " + JSON.stringify(currentSettings), 3);

    let showStatus = function () {
        // Update status to let user know options were saved.
        var status = document.getElementById("status");
        status.textContent = "Options saved. Reload pages.";
        setTimeout(function () {
            status.textContent = "";
        }, 1000);
    };

    if (isChrome) {
        log("Is a Chrome browser", 3);
        chrome.storage.sync.remove(keySettings);
        chrome.storage.sync.set(currentSettings, function () {
            showStatus();
        });
    } else {
        log("Is a Firefox browser", 3);
        browser.storage.sync
            .remove(keySettings)
            .then(function () {
                return browser.storage.sync.set(currentSettings);
            })
            .then(function () {
                showStatus();
            })
            .catch(function (error) {
                console.error("Could not save settings: ", error);
            });
    }
}

// Restores options from chrome.storage
function restore_options() {
    chrome.storage.sync.get(lcDefaults, function (storage) {
        document.getElementById("inSeconds").checked = storage.inSeconds;
        //document.getElementById("loopEverything").checked = storage.loopEverything;
        document.getElementById("audioEnabled").checked = storage.audioEnabled;
        document.getElementById("enabled").checked = storage.enabled;
        document.getElementById("startHidden").checked = storage.startHidden;
        document.getElementById("controllerOpacity").value = storage.controllerOpacity;
        document.getElementById("blacklist").value = storage.blacklist;
        document.querySelector("#loggingLevel").value = storage.logLevel;
        document.getElementById("offset-x").value = storage.offsetX;
        document.getElementById("offset-y").value = storage.offsetY;
        currentLogLevel = storage.logLevel;

        for (let i in storage.keyBindings) {
            var item = storage.keyBindings[i];
            if (item.predefined) {
                //do predefined ones because their value needed for overlay
                // document.querySelector("#" + item["action"] + " .customDo").value = item["action"];
                /*if (customActionsNoValues.includes(item["action"]))
                    document.querySelector(
                        "#" + item["action"] + " .customValue"
                    ).disabled = true;*/

                updateCustomShortcutInputText(
                    document.querySelector("#" + item["action"] + " .customKey"),
                    item["key"]
                );
                //document.querySelector("#" + item["action"] + " .customValue").value =
                //item["value"];
                document.querySelector("#" + item["action"] + " .customForce").value =
                    item["force"];
            } else {
                // new ones
                add_shortcut();
                const dom = document.querySelector(".customs:last-of-type");
                dom.querySelector(".customDo").value = item["action"];

                //if (customActionsNoValues.includes(item["action"]))
                //dom.querySelector(".customValue").disabled = true;

                updateCustomShortcutInputText(
                    dom.querySelector(".customKey"),
                    item["key"]
                );
                //dom.querySelector(".customValue").value = item["value"];
                dom.querySelector(".customForce").value = item["force"];
            }
        }
    });
}

function restore_defaults() {
    chrome.storage.sync.set(lcDefaults, function () {
        restore_options();
        document.querySelectorAll(".removeParent").forEach((button) => button.click()); // Remove added shortcuts
        // Update status to let user know options were saved.
        var status = document.getElementById("status");
        status.textContent = "Default options restored";
        setTimeout(function () {
            status.textContent = "";
        }, 1000);
    });
}

function toggle_experimental() {
    document
        .querySelectorAll(".experimental")
        .forEach((item) => {
            if (item.style.display === "inline-block" || item.style.display === "") {
                item.style.display = "none";
            } else {
                item.style.display = "inline-block";
            }
        });
}

document.addEventListener("DOMContentLoaded", function () {
    restore_options();

    document.getElementById("save").addEventListener("click", save_options);
    //document.getElementById("add").addEventListener("click", add_shortcut);
    document.getElementById("restore").addEventListener("click", restore_defaults);
    document.getElementById("experimental").addEventListener("click", toggle_experimental);

    function eventCaller(event, className, funcName) {
        if (event.target.classList && !event.target.classList.contains(className)) {
            return;
        }
        funcName(event);
    }

    /*document.addEventListener("keypress", (event) => {
        eventCaller(event, "customValue", inputFilterNumbersOnly);
    });*/
    document.addEventListener("focus", (event) => {
        eventCaller(event, "customKey", inputFocus);
    });
    document.addEventListener("blur", (event) => {
        eventCaller(event, "customKey", inputBlur);
    });
    document.addEventListener("keydown", (event) => {
        eventCaller(event, "customKey", recordKeyPress);
    });
    document.addEventListener("click", (event) => {
        eventCaller(event, "removeParent", function () {
            event.target.parentNode.remove();
        });
    });

    //Listeners for offsets
    document.getElementById("offset-x").addEventListener("input", (event) => {
        document.getElementById("offset-x-label").innerText = Number(document.getElementById("offset-x").value);
    });

    document.getElementById("offset-y").addEventListener("input", (event) => {
        document.getElementById("offset-y-label").innerText = Number(document.getElementById("offset-y").value);
    });
});
